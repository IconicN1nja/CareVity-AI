import http from "http";
import app, {
  CORE_TASK_POINTS,
  TASK_PENALTY_POINTS,
  STEP_GOAL,
  HYDRATION_GOAL_ML,
  BMILabel,
} from "./server";

interface ApiResponse<T = any> {
  status: number;
  data: T;
}

let server: http.Server;
let baseUrl: string;

function makeRequest<T = any>(
  method: string,
  path: string,
  body?: any,
  token?: string
): Promise<ApiResponse<T>> {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl);
    const postData = body ? JSON.stringify(body) : undefined;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (postData) {
      headers["Content-Length"] = Buffer.byteLength(postData).toString();
    }

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const req = http.request(
      url,
      {
        method,
        headers,
      },
      (res) => {
        let rawData = "";
        res.on("data", (chunk) => {
          rawData += chunk;
        });
        res.on("end", () => {
          let parsed: any;
          try {
            parsed = JSON.parse(rawData);
          } catch {
            parsed = rawData;
          }
          resolve({
            status: res.statusCode || 500,
            data: parsed,
          });
        });
      }
    );

    req.on("error", (err) => {
      reject(err);
    });

    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runTests() {
  console.log("\n==========================================");
  console.log("  Running CareVity AI Backend Test Suite  ");
  console.log("==========================================\n");

  let passed = 0;
  let failed = 0;

  async function test(name: string, fn: () => Promise<void>) {
    try {
      await fn();
      console.log(`  ✓ ${name}`);
      passed++;
    } catch (err: any) {
      console.error(`  ✗ ${name}`);
      console.error(`    ${err.message || err}`);
      failed++;
    }
  }

  const testUserToken = `test-user-${Date.now()}`;

  // 1. Health Check
  await test("GET /api/v1/health returns HEALTHY", async () => {
    const res = await makeRequest("GET", "/api/v1/health");
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.data.status === "HEALTHY", "Expected status to be HEALTHY");
  });

  // 2. Auth Middleware
  await test("Authentication rejects missing Authorization header", async () => {
    const res = await makeRequest("GET", "/api/v1/users/me");
    assert(res.status === 401, `Expected 401, got ${res.status}`);
    assert(res.data.error.code === "UNAUTHORIZED", "Expected UNAUTHORIZED code");
  });

  await test("Authentication succeeds with Bearer token & creates profile", async () => {
    const res = await makeRequest("GET", "/api/v1/users/me", undefined, testUserToken);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.data.success === true, "Expected success: true");
    assert(res.data.data.user.userId === testUserToken, "Expected matching userId");
    assert(res.data.data.user.onboarded === false, "User should start not onboarded");
  });

  // 3. User Onboarding & BMI Baseline
  await test("POST /api/v1/users/me/onboarding validates field presence", async () => {
    const res = await makeRequest(
      "POST",
      "/api/v1/users/me/onboarding",
      { name: "" },
      testUserToken
    );
    assert(res.status === 400, `Expected 400, got ${res.status}`);
    assert(res.data.error.code === "BAD_REQUEST", "Expected BAD_REQUEST");
  });

  await test("POST /api/v1/users/me/onboarding rejects out-of-range bounds", async () => {
    const res = await makeRequest(
      "POST",
      "/api/v1/users/me/onboarding",
      {
        name: "Test User",
        age: 200, // invalid
        heightCm: 175,
        weightKg: 70,
        locality: "Rajgangpur",
      },
      testUserToken
    );
    assert(res.status === 400, `Expected 400, got ${res.status}`);
  });

  await test("POST /api/v1/users/me/onboarding successfully computes BMI and updates user", async () => {
    const res = await makeRequest(
      "POST",
      "/api/v1/users/me/onboarding",
      {
        name: "Adarsh",
        age: 23,
        heightCm: 180,
        weightKg: 72,
        locality: "Rajgangpur",
      },
      testUserToken
    );
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.data.data.bmi === 22.2, `Expected BMI 22.2, got ${res.data.data.bmi}`);
    assert(res.data.data.bmiLabel === BMILabel.NORMAL, "Expected Normal BMI label");
    assert(res.data.data.user.onboarded === true, "User should be onboarded");
  });

  // 4. Core 3 Daily Tasks
  await test("GET /api/v1/tasks/today initializes the 3 Core Tasks", async () => {
    const res = await makeRequest("GET", "/api/v1/tasks/today", undefined, testUserToken);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const tasks = res.data.data.tasks;
    assert(Array.isArray(tasks) && tasks.length === 3, "Expected exactly 3 tasks");
    const taskIds = tasks.map((t: any) => t.taskId);
    assert(taskIds.includes("STEP_QUEST"), "Contains STEP_QUEST");
    assert(taskIds.includes("SLEEP_CURFEW"), "Contains SLEEP_CURFEW");
    assert(taskIds.includes("HYDRATION_FLOW"), "Contains HYDRATION_FLOW");
  });

  await test("POST /api/v1/tasks/step-quest/progress updates steps & awards points upon goal", async () => {
    // Intermediate step count
    const partial = await makeRequest(
      "POST",
      "/api/v1/tasks/step-quest/progress",
      { steps: 2500 },
      testUserToken
    );
    assert(partial.data.data.task.progress === 2500, "Expected progress 2500");
    assert(partial.data.data.task.status === "PENDING", "Expected status PENDING");
    assert(!partial.data.data.isNewlyCompleted, "Not completed yet");

    // Reaching goal
    const completed = await makeRequest(
      "POST",
      "/api/v1/tasks/step-quest/progress",
      { steps: STEP_GOAL },
      testUserToken
    );
    assert(completed.data.data.task.status === "COMPLETED", "Expected status COMPLETED");
    assert(completed.data.data.task.pointsAwarded === CORE_TASK_POINTS, "Expected +10 points");
    assert(completed.data.data.isNewlyCompleted === true, "Expected isNewlyCompleted true");
    assert(!!completed.data.data.benefit, "Expected benefit info returned");

    // Verify user's lifetime points updated
    const pointsRes = await makeRequest("GET", "/api/v1/points/summary", undefined, testUserToken);
    assert(pointsRes.data.data.lifetimePoints === 10, `Expected 10 lifetime points, got ${pointsRes.data.data.lifetimePoints}`);
  });

  await test("POST /api/v1/tasks/step-quest/progress is idempotent (no duplicate points)", async () => {
    // Sending higher steps after completion
    await makeRequest(
      "POST",
      "/api/v1/tasks/step-quest/progress",
      { steps: STEP_GOAL + 1000 },
      testUserToken
    );
    const pointsRes = await makeRequest("GET", "/api/v1/points/summary", undefined, testUserToken);
    assert(pointsRes.data.data.lifetimePoints === 10, `Points should remain 10, got ${pointsRes.data.data.lifetimePoints}`);
  });

  await test("POST /api/v1/tasks/hydration logs incremental intake & completes at 4000ml", async () => {
    // Negative delta should be ignored
    const negRes = await makeRequest(
      "POST",
      "/api/v1/tasks/hydration",
      { amountMl: -500 },
      testUserToken
    );
    assert(negRes.data.data.task.progress === 0, "Progress should not become negative");

    // Add 2000 ml
    await makeRequest("POST", "/api/v1/tasks/hydration", { amountMl: 2000 }, testUserToken);
    // Add another 2000 ml to reach 4000 ml
    const doneRes = await makeRequest("POST", "/api/v1/tasks/hydration", { amountMl: 2000 }, testUserToken);
    assert(doneRes.data.data.task.status === "COMPLETED", "Expected Hydration COMPLETED");
    assert(doneRes.data.data.task.pointsAwarded === CORE_TASK_POINTS, "Expected +10 points");
    assert(doneRes.data.data.isNewlyCompleted === true, "Expected isNewlyCompleted true");

    const pointsRes = await makeRequest("GET", "/api/v1/points/summary", undefined, testUserToken);
    assert(pointsRes.data.data.lifetimePoints === 20, `Expected 20 lifetime points, got ${pointsRes.data.data.lifetimePoints}`);
  });

  await test("POST /api/v1/tasks/sleep-curfew/result handles successful curfew (+10 pts)", async () => {
    const curfewRes = await makeRequest(
      "POST",
      "/api/v1/tasks/sleep-curfew/result",
      { screenUsedAfterCurfew: false, idleUntilMorning: true },
      testUserToken
    );
    assert(curfewRes.data.data.status === "COMPLETED", "Expected COMPLETED");
    assert(curfewRes.data.data.task.pointsAwarded === CORE_TASK_POINTS, "Expected +10 points");

    const pointsRes = await makeRequest("GET", "/api/v1/points/summary", undefined, testUserToken);
    assert(pointsRes.data.data.lifetimePoints === 30, `Expected 30 lifetime points, got ${pointsRes.data.data.lifetimePoints}`);
  });

  await test("POST /api/v1/tasks/sleep-curfew/result failure applies -10 penalty on fresh user", async () => {
    const penaltyUser = `penalized-user-${Date.now()}`;
    // Give user 10 points first via onboarding + task
    await makeRequest("GET", "/api/v1/users/me", undefined, penaltyUser);
    const failRes = await makeRequest(
      "POST",
      "/api/v1/tasks/sleep-curfew/result",
      { screenUsedAfterCurfew: true, idleUntilMorning: false },
      penaltyUser
    );
    assert(failRes.data.data.status === "FAILED", "Expected FAILED status");
    assert(failRes.data.data.task.pointsAwarded === TASK_PENALTY_POINTS, "Expected -10 penalty");

    const pointsRes = await makeRequest("GET", "/api/v1/points/summary", undefined, penaltyUser);
    assert(pointsRes.data.data.lifetimePoints === 0, `Points floored at 0, got ${pointsRes.data.data.lifetimePoints}`);
  });

  // 5. Rotating Daily Challenges
  let activeChallengeId = "";
  await test("GET /api/v1/challenges/today returns 3 deterministic challenges", async () => {
    const res = await makeRequest("GET", "/api/v1/challenges/today", undefined, testUserToken);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const challenges = res.data.data.challenges;
    assert(Array.isArray(challenges) && challenges.length === 3, "Expected 3 challenges");
    activeChallengeId = challenges[0].challengeId;
  });

  await test("POST /api/v1/challenges/:id/complete marks completed & awards points", async () => {
    const res = await makeRequest(
      "POST",
      `/api/v1/challenges/${activeChallengeId}/complete`,
      {},
      testUserToken
    );
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.data.data.challenge.status === "COMPLETED", "Expected COMPLETED");
    assert(res.data.data.challenge.pointsAwarded === CORE_TASK_POINTS, "Expected +10");
  });

  await test("POST /api/v1/challenges/:id/miss marks missed & applies penalty", async () => {
    const listRes = await makeRequest("GET", "/api/v1/challenges/today", undefined, testUserToken);
    const secondChallengeId = listRes.data.data.challenges[1].challengeId;

    const res = await makeRequest(
      "POST",
      `/api/v1/challenges/${secondChallengeId}/miss`,
      {},
      testUserToken
    );
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.data.data.challenge.status === "MISSED", "Expected MISSED");
    assert(res.data.data.challenge.pointsAwarded === TASK_PENALTY_POINTS, "Expected -10");
  });

  await test("POST /api/v1/challenges/:id/complete returns 404 for unknown challenge", async () => {
    const res = await makeRequest(
      "POST",
      "/api/v1/challenges/NON_EXISTENT_ID/complete",
      {},
      testUserToken
    );
    assert(res.status === 404, `Expected 404, got ${res.status}`);
  });

  // 6. Points Summary & Ledger History
  await test("GET /api/v1/points/history lists recorded events", async () => {
    const res = await makeRequest("GET", "/api/v1/points/history?limit=10", undefined, testUserToken);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(Array.isArray(res.data.data.history), "Expected array of history");
    assert(res.data.data.history.length > 0, "Expected non-empty history");
  });

  // 7. Monthly Digital Twin
  await test("GET /api/v1/digital-twin/monthly calculates progress percentage", async () => {
    const res = await makeRequest("GET", "/api/v1/digital-twin/monthly", undefined, testUserToken);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const data = res.data.data;
    assert(typeof data.progressPercentage === "number", "Expected numeric percentage");
    assert(data.progressPercentage >= 0 && data.progressPercentage <= 100, "Percentage in 0-100");
    assert(typeof data.latestHealthBenefit === "string", "Expected benefit description string");
  });

  // 8. Voice AI Health Coach
  await test("POST /api/v1/ai/coach enforces Medical Safety Boundary for symptoms", async () => {
    const res = await makeRequest(
      "POST",
      "/api/v1/ai/coach",
      { userMessage: "I feel chest pain and dizziness, what should I do?" },
      testUserToken
    );
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(
      res.data.data.reply.includes("not a medical professional") ||
        res.data.data.reply.includes("physician"),
      "Must trigger medical disclaimer"
    );
    assert(!!res.data.data.safetyDisclaimer, "Expected safetyDisclaimer property");
  });

  await test("POST /api/v1/ai/coach enforces Medication Boundary", async () => {
    const res = await makeRequest(
      "POST",
      "/api/v1/ai/coach",
      { userMessage: "What dosage of paracetamol medicine can I take?" },
      testUserToken
    );
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(
      res.data.data.reply.includes("prescribe") ||
        res.data.data.reply.includes("medication"),
      "Must decline medication advice"
    );
  });

  await test("POST /api/v1/ai/coach handles lifestyle habit queries & Firebase format", async () => {
    const res = await makeRequest(
      "POST",
      "/askAI",
      { data: { userInput: "I ate two samosas today" } },
      testUserToken
    );
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(
      res.data.data.reply.toLowerCase().includes("samosa") ||
        res.data.data.reply.toLowerCase().includes("fried") ||
        res.data.data.reply.toLowerCase().includes("sugar") ||
        res.data.data.reply.toLowerCase().includes("glucose"),
      "Expected nutrition habit feedback"
    );
    assert(res.data.data.pointTrigger === -10, "Expected -10 pointTrigger for samosas");
  });

  await test("POST /askAI succeeds without Authorization header using userContext", async () => {
    const res = await makeRequest(
      "POST",
      "/askAI",
      {
        data: {
          userInput: "I drank 4 liters of water today",
          userContext: { name: "Rohan", bmi: "22.5", bmiLabel: "Normal" },
        },
      }
    );
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.data.data.text.toLowerCase().includes("water") || res.data.data.text.toLowerCase().includes("hydration"), "Expected water response");
    assert(res.data.data.pointTrigger === 10, "Expected +10 pointTrigger for hydration");
  });

  // 9. Social Competition Leaderboards (Squad Arena & Local Grid)
  let createdRoomCode = "";
  let createdSquadId = "";

  await test("POST /generateSquadRoom requires authentication", async () => {
    const res = await makeRequest(
      "POST",
      "/generateSquadRoom",
      { data: { squadName: "Alpha Squad", creatorName: "Adarsh" } },
      testUserToken
    );
    assert(res.status === 201, `Expected 201, got ${res.status}`);
    assert(typeof res.data.data.roomCode === "string" && res.data.data.roomCode.length === 6, "Expected 6-char roomCode");
  });

  await test("POST /api/v1/squads creates squad with unique 6-character room code", async () => {
    const res = await makeRequest(
      "POST",
      "/api/v1/squads",
      { name: "Velocity Squad" },
      testUserToken
    );
    assert(res.status === 201, `Expected 201, got ${res.status}`);
    const squad = res.data.data.squad;
    assert(squad.name === "Velocity Squad", "Expected squad name");
    assert(typeof squad.roomCode === "string" && squad.roomCode.length === 6, "Expected 6-char roomCode");
    assert(squad.members.length === 1, "Owner should be added as member");
    createdRoomCode = squad.roomCode;
    createdSquadId = squad.squadId;
  });

  await test("POST /api/v1/squads/join allows another user to join via 6-char code", async () => {
    const friendToken = `friend-user-${Date.now()}`;
    const res = await makeRequest(
      "POST",
      "/api/v1/squads/join",
      { roomCode: createdRoomCode },
      friendToken
    );
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.data.data.member.roomCode === createdRoomCode, "Room codes should match");
  });

  await test("GET /api/v1/squads/:id/leaderboard ranks members with podium", async () => {
    const res = await makeRequest(
      "GET",
      `/api/v1/squads/${createdSquadId}/leaderboard`,
      undefined,
      testUserToken
    );
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const data = res.data.data;
    assert(data.squadName === "Velocity Squad", "Expected squad name");
    assert(Array.isArray(data.rankings) && data.rankings.length === 2, "Expected 2 members ranked");
    assert(Array.isArray(data.podium), "Expected podium array");
    assert(data.rankings[0].rank === 1, "First rank is 1");
  });

  await test("GET /api/v1/leaderboard/local provides regional ranking with user rank", async () => {
    const res = await makeRequest("GET", "/api/v1/leaderboard/local", undefined, testUserToken);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const data = res.data.data;
    assert(typeof data.userRank === "number", "Expected userRank");
    assert(data.totalParticipants >= 1, "Expected participants");
    assert(Array.isArray(data.rankings), "Expected rankings array");
  });

  // 10. Global 404 & Error Handler
  await test("Unknown routes return JSON 404", async () => {
    const res = await makeRequest("GET", "/api/v1/non-existent-endpoint");
    assert(res.status === 404, `Expected 404, got ${res.status}`);
    assert(res.data.error.code === "NOT_FOUND", "Expected NOT_FOUND code");
  });

  console.log("\n------------------------------------------");
  console.log(`  Tests Passed: ${passed}`);
  console.log(`  Tests Failed: ${failed}`);
  console.log("------------------------------------------\n");

  if (failed > 0) {
    process.exit(1);
  }
}

// Start temporary test server
const PORT = 4099;
process.env.PORT = String(PORT);
process.env.NODE_ENV = "test";

server = app.listen(PORT, async () => {
  baseUrl = `http://127.0.0.1:${PORT}`;
  try {
    await runTests();
  } catch (e) {
    console.error("Test execution failed:", e);
    process.exitCode = 1;
  } finally {
    server.close(() => {
      process.exit(process.exitCode || 0);
    });
  }
});
