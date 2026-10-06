/**
 * CareVity AI MVP – Unified Single-File Backend
 * Primary Source of Truth: CareVity AI MVP (V1) Core Product Specifications
 *
 * Features Implemented:
 * 1. User Onboarding & Server-side BMI Baseline (<18.5, 18.5-24.9, 25-29.9, >=30)
 * 2. The Core 3 Daily Tasks (Step Quest 5,000 | Sleep Curfew 10:30PM-6AM | Hydration 4L)
 * 3. The 3 Rotating Daily Challenges (12:00 AM Midnight Reset from pre-built bank)
 * 4. Gamified Scoring Engine (+10 completion, -10 missed/failed, Idempotent transactions)
 * 5. Monthly Digital Twin (Fluid progress 0%-100% & Real-Time Body Benefit Cards)
 * 6. Voice AI Health Coach (Sarvam AI with strict Medical Safety Boundary)
 * 7. Social Competition Leaderboards (Squad Arena with 6-char room code & Local Grid)
 *
 * NOTE ON STYLE: this file favors explicit if/else and plain for-loops over
 * ternaries, chained short-circuit tricks, and nested array-method chains,
 * even where a shorter one-liner exists — the goal is that each step of the
 * logic can be read on its own line rather than decoded from one expression.
 *
 * CHANGELOG (bugfix pass):
 * - awardPoints() return value is now respected everywhere; a task/challenge's
 *   status and pointsAwarded only change when points were actually (idempotently)
 *   granted, instead of blindly flipping state regardless of the ledger result.
 * - Added day-rollover close-out (closeOutPastPending) so PENDING tasks/challenges
 *   from a prior date resolve to FAILED/MISSED (with penalty) instead of hanging
 *   forever. Step Quest and Hydration can now actually fail, and Sleep Curfew no
 *   longer stays PENDING past its window if the client never reports a result.
 * - Onboarding now validates age/height/weight are finite numbers within sane
 *   bounds instead of silently producing NaN BMI values.
 * - Hydration progress is floored at 0 (a negative amountMl can no longer reduce
 *   already-logged progress).
 * - Digital Twin monthly percentage now uses (days elapsed this month * 6) as the
 *   denominator instead of a flat 30*6, so early-month scores aren't artificially low.
 * - Switched the live coach integration to Sarvam AI.
 * - Production authentication verifies Cognito JWTs; mock authentication is
 *   available only in tests or when explicitly enabled for local demos.
 */

import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import crypto from "crypto";
import dotenv from "dotenv";
import { CognitoJwtVerifier } from "aws-jwt-verify";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json({ limit: "32kb" }));

// ==========================================
// 1. CONSTANTS & DOMAIN RULES (FROM PDF)
// ==========================================
export const CORE_TASK_POINTS = 10;
export const TASK_PENALTY_POINTS = -10;
export const STEP_GOAL = 5000;
export const SLEEP_START = "22:30"; // 10:30 PM
export const SLEEP_END = "06:00";   // 6:00 AM
export const HYDRATION_GOAL_ML = 4000; // 4 L target
export const DEFAULT_TIMEZONE =
  process.env.DEFAULT_TIMEZONE || "Asia/Kolkata";
const MAX_STEP_PROGRESS = 200_000;
const MAX_HYDRATION_DELTA_ML = 20_000;
const ALLOW_MOCK_AUTH =
  process.env.NODE_ENV === "test" || process.env.ALLOW_MOCK_AUTH === "true";

const cognitoVerifier =
  process.env.COGNITO_USER_POOL_ID && process.env.COGNITO_CLIENT_ID
    ? CognitoJwtVerifier.create({
        userPoolId: process.env.COGNITO_USER_POOL_ID,
        tokenUse: "access",
        clientId: process.env.COGNITO_CLIENT_ID,
      })
    : null;

export enum BMILabel {
  UNDERWEIGHT = "Underweight",
  NORMAL = "Normal",
  OVERWEIGHT = "Overweight",
  OBESE = "Obese",
}

// Pre-built Challenge Bank (PDF Section 3)
export const PREDEFINED_CHALLENGES = [
  {
    id: "CHAL_FOCUS_SPRINT",
    title: "The Focus Sprint",
    category: "Digital Detox",
    desc: "Keep social media app usage below 2 hours today.",
  },
  {
    id: "CHAL_NO_FRIED_FOOD",
    title: "Zero Fried Food",
    category: "Nutrition",
    desc: "Eat zero oily or fried food today to reduce systemic inflammation.",
  },
  {
    id: "CHAL_SCREEN_FREE_DINNER",
    title: "Screen-Free Dinner",
    category: "Mindfulness",
    desc: "Eat dinner screen-free for optimal mindful digestion.",
  },
  {
    id: "CHAL_POST_MEAL_WALK",
    title: "Post-Meal Walk",
    category: "Fitness",
    desc: "Walk 1,000 steps immediately after lunch or dinner.",
  },
  {
    id: "CHAL_DESK_MOBILITY",
    title: "Desk Mobility Reset",
    category: "Mobility",
    desc: "Complete 3 rounds of torso twists and neck stretches.",
  },
  {
    id: "CHAL_NO_LATE_CAFFEINE",
    title: "No Caffeine After 2 PM",
    category: "Sleep",
    desc: "Clear adenosine receptors to preserve slow-wave sleep.",
  },
  {
    id: "CHAL_SUNLIGHT_SYNC",
    title: "Morning Sun Sync",
    category: "Circadian",
    desc: "Get 10-15 minutes of natural morning sunlight.",
  },
  {
    id: "CHAL_BOX_BREATHING",
    title: "4x4 Box Breathing",
    category: "Mindfulness",
    desc: "Perform 4 minutes of 4-second box breathing to calm the nervous system.",
  },
  {
    id: "CHAL_PLANK_BURST",
    title: "Core Strength Hold",
    category: "Fitness",
    desc: "Hold two 45-second planks to build transverse abdominal support.",
  },
  {
    id: "CHAL_COLD_RINSE",
    title: "Cold Shower Rinse",
    category: "Recovery",
    desc: "End shower with 30-60 seconds of cold water for vagal nerve activation.",
  },
];

// Scientific Biological Benefits (PDF Section 5 & 6)
export const HEALTH_BENEFITS: Record<string, string> = {
  STEP_QUEST:
    "Consistent walking activates skeletal GLUT-4 glucose transporters, optimizes cardiovascular circulation, and elevates mitochondrial density.",
  SLEEP_CURFEW:
    "Locking down by 10:30 PM allows cerebrospinal fluid to flush metabolic toxins via the glymphatic system and facilitates deep Stage 3 cellular repair.",
  HYDRATION_FLOW:
    "Maintaining 4L hydration expands plasma volume, relieves renal filtration load, and enhances cellular osmoregulation.",
};

// ==========================================
// 2. IN-MEMORY MVP DATA STORE (ZERO CONFIG)
// ==========================================
interface UserProfile {
  userId: string;
  name: string;
  email: string;
  age: number;
  heightCm: number;
  weightKg: number;
  bmi: number;
  bmiLabel: BMILabel;
  locality: string;
  district: string;
  lifetimePoints: number;
  onboarded: boolean;
}

interface TaskItem {
  taskId: string;
  userId: string;
  date: string;
  title: string;
  status: "PENDING" | "COMPLETED" | "FAILED" | "MISSED";
  progress: number;
  target: number;
  pointsAwarded: number;
  completedAt?: string;
  failedAt?: string;
}

interface ChallengeItem {
  challengeId: string;
  userId: string;
  date: string;
  title: string;
  category: string;
  description?: string;
  difficulty?: string;
  status: "PENDING" | "COMPLETED" | "MISSED";
  pointsAwarded: number;
}

interface SquadItem {
  squadId: string;
  name: string;
  roomCode: string;
  ownerId: string;
  members: { userId: string; name: string; lifetimePoints: number }[];
}

const db = {
  users: new Map<string, UserProfile>(),
  tasks: new Map<string, TaskItem>(),
  challenges: new Map<string, ChallengeItem[]>(),
  transactions: new Set<string>(), // Idempotency keys: userId#date#action
  squads: new Map<string, SquadItem>(),
  roomCodes: new Map<string, string>(), // roomCode -> squadId
};

// Seed demo users for local leaderboard testing
db.users.set("demo-user-1", {
  userId: "demo-user-1",
  name: "Isha N.",
  email: "isha@carevity.ai",
  age: 22,
  heightCm: 165,
  weightKg: 54,
  bmi: 19.8,
  bmiLabel: BMILabel.NORMAL,
  locality: "Rajgangpur",
  district: "Rajgangpur District Network",
  lifetimePoints: 840,
  onboarded: true,
});
db.users.set("demo-user-2", {
  userId: "demo-user-2",
  name: "Alex B.",
  email: "alex@carevity.ai",
  age: 25,
  heightCm: 178,
  weightKg: 72,
  bmi: 22.7,
  bmiLabel: BMILabel.NORMAL,
  locality: "Rajgangpur",
  district: "Rajgangpur District Network",
  lifetimePoints: 620,
  onboarded: true,
});

// ==========================================
// 3. UTILITIES & BUSINESS LOGIC
// ==========================================
function getLocalDate(tz: string = DEFAULT_TIMEZONE): string {
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(
      new Date()
    );
  } catch {
    return new Date().toISOString().split("T")[0];
  }
}

/** Number of calendar days elapsed so far in the current local month (1-indexed). */
function daysElapsedInMonth(tz: string = DEFAULT_TIMEZONE): number {
  const today = getLocalDate(tz); // e.g. "2026-09-18"
  const parts = today.split("-");  // ["2026", "09", "18"]
  const day = Number(parts[2]);

  // Fall back to 1 if something about the date string didn't parse cleanly,
  // so we never divide by zero later on.
  if (Number.isFinite(day) && day > 0) {
    return day;
  }
  return 1;
}

function calculateBMI(
  heightCm: number,
  weightKg: number
): { bmi: number; bmiLabel: BMILabel } {
  // Step 1: convert height from centimetres to metres
  const heightM = heightCm / 100;

  // Step 2: BMI formula = weight (kg) / height (m)²
  const bmiRaw = weightKg / (heightM * heightM);

  // Step 3: round to 1 decimal place
  const bmi = Math.round(bmiRaw * 10) / 10;

  // Step 4: classify
  let bmiLabel: BMILabel;

  if (bmi < 18.5) {
    bmiLabel = BMILabel.UNDERWEIGHT;
  } else if (bmi < 25) {
    bmiLabel = BMILabel.NORMAL;
  } else if (bmi < 30) {
    bmiLabel = BMILabel.OVERWEIGHT;
  } else {
    bmiLabel = BMILabel.OBESE;
  }

  return { bmi, bmiLabel };
}

function generateRoomCode(): string {
  // Characters chosen so codes are easy to read aloud/type: no 0/O or 1/I mixups.
  const chars = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  let code = "";

  while (db.roomCodes.has(code) || code.length !== 6) {
    code = "";
    const randomBytes = crypto.randomBytes(6);
    for (let i = 0; i < 6; i++) {
      const randomIndex = randomBytes[i] % chars.length;
      code = code + chars[randomIndex];
    }
  }

  return code;
}

function isValidDateString(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().startsWith(value);
}

function getRequestedDate(value: unknown): string | null {
  if (value === undefined || value === null || value === "") {
    return getLocalDate();
  }
  if (typeof value !== "string" || !isValidDateString(value)) {
    return null;
  }
  return value;
}

function rejectInvalidDate(
  value: unknown,
  res: Response
): string | null {
  const date = getRequestedDate(value);
  if (!date) {
    res.status(400).json({
      success: false,
      error: { code: "BAD_REQUEST", message: "date must use YYYY-MM-DD format" },
    });
    return null;
  }
  if (date > getLocalDate()) {
    res.status(400).json({
      success: false,
      error: { code: "BAD_REQUEST", message: "future dates are not allowed" },
    });
    return null;
  }
  return date;
}

function rejectNonCurrentDate(value: unknown, res: Response): string | null {
  const date = rejectInvalidDate(value, res);
  if (!date) {
    return null;
  }
  if (date !== getLocalDate()) {
    res.status(400).json({
      success: false,
      error: { code: "BAD_REQUEST", message: "activity must be recorded for today" },
    });
    return null;
  }
  return date;
}

/**
 * Attempts to award (or penalise) points idempotently.
 * Returns true only if this call actually mutated the ledger (i.e. the
 * idempotency key was not already used). Callers MUST check this return
 * value before mutating task/challenge status or pointsAwarded — otherwise
 * a duplicate call would silently re-flip state without a matching
 * ledger entry.
 */
function awardPoints(
  userId: string,
  points: number,
  idempotencyKey: string
): boolean {
  if (db.transactions.has(idempotencyKey)) {
    return false; // Already processed — duplicate blocked
  }

  db.transactions.add(idempotencyKey);

  const user = db.users.get(userId);
  if (user) {
    let newTotal = user.lifetimePoints + points;
    if (newTotal < 0) {
      newTotal = 0;
    }
    user.lifetimePoints = newTotal;
  }

  return true;
}

function getOrCreateUser(
  userId: string,
  email: string = `${userId}@carevity.ai`,
  name?: string
): UserProfile {
  let user = db.users.get(userId);

  if (!user) {
    let defaultName = userId.split("@")[0];
    if (name) {
      defaultName = name;
    }

    user = {
      userId,
      email,
      name: defaultName,
      age: 22,
      heightCm: 175,
      weightKg: 70,
      bmi: 22.9,
      bmiLabel: BMILabel.NORMAL,
      locality: "Rajgangpur",
      district: "Rajgangpur District Network",
      lifetimePoints: 0,
      onboarded: false,
    };
    db.users.set(userId, user);
  }

  return user;
}

function initDailyTasks(userId: string, date: string): TaskItem[] {
  const taskDefinitions = [
    { id: "STEP_QUEST", title: "Step Quest", target: STEP_GOAL },
    { id: "SLEEP_CURFEW", title: "Sleep Curfew", target: 1 },
    { id: "HYDRATION_FLOW", title: "Hydration Flow", target: HYDRATION_GOAL_ML },
  ];

  const items: TaskItem[] = [];

  for (const def of taskDefinitions) {
    const key = `${userId}#${date}#${def.id}`;
    let task = db.tasks.get(key);

    if (!task) {
      task = {
        taskId: def.id,
        userId,
        date,
        title: def.title,
        status: "PENDING",
        progress: 0,
        target: def.target,
        pointsAwarded: 0,
      };
      db.tasks.set(key, task);
    }

    items.push(task);
  }

  return items;
}

function initDailyChallenges(userId: string, date: string): ChallengeItem[] {
  const key = `${userId}#${date}`;
  let challenges = db.challenges.get(key);

  if (!challenges) {
    // Turn the date string into a deterministic number so today's picks are the
    // same for every user (global challenge rotation), and change automatically
    // once the date rolls over.
    let hash = 0;
    for (let i = 0; i < date.length; i++) {
      hash = hash * 31 + date.charCodeAt(i);
    }

    const remainingChallenges = [...PREDEFINED_CHALLENGES];
    const picked: ChallengeItem[] = [];

    for (let i = 0; i < 3; i++) {
      let index = (hash + i * 17) % remainingChallenges.length;
      if (index < 0) {
        index = index + remainingChallenges.length;
      }

      const chosen = remainingChallenges.splice(index, 1)[0];
      picked.push({
        challengeId: chosen.id,
        userId,
        date,
        title: chosen.title,
        category: chosen.category,
        description: chosen.desc,
        difficulty: "Daily",
        status: "PENDING",
        pointsAwarded: 0,
      });
    }

    challenges = picked;
    db.challenges.set(key, challenges);
  }

  return challenges;
}

/**
 * Lazily resolves any PENDING task/challenge that belongs to a date strictly
 * before "today" into a terminal FAILED/MISSED state, applying the penalty
 * exactly once via the idempotent ledger. This is what lets Step Quest and
 * Hydration actually "fail" (previously they could only ever reach
 * COMPLETED), and what stops Sleep Curfew from hanging forever if the
 * client never calls /sleep-curfew/result before the day rolls over.
 *
 * Called opportunistically whenever we touch a user's tasks/challenges, so
 * no cron/scheduler is required for the MVP.
 */
function closeOutPastPending(userId: string, today: string = getLocalDate()) {
  for (const task of db.tasks.values()) {
    if (task.userId !== userId) {
      continue;
    }
    if (task.status !== "PENDING") {
      continue;
    }
    if (task.date >= today) {
      continue; // only close out strictly past days
    }

    const key = `${userId}#${task.date}#${task.taskId}#EXPIRED`;
    const awarded = awardPoints(userId, TASK_PENALTY_POINTS, key);
    if (awarded) {
      task.status = "FAILED";
      task.pointsAwarded = TASK_PENALTY_POINTS;
      task.failedAt = new Date().toISOString();
    }
  }

  for (const [challengeKey, challenges] of db.challenges.entries()) {
    if (!challengeKey.startsWith(`${userId}#`)) {
      continue;
    }

    for (const c of challenges) {
      if (c.status !== "PENDING") {
        continue;
      }
      if (c.date >= today) {
        continue;
      }

      const key = `${userId}#${c.date}#${c.challengeId}#EXPIRED`;
      const awarded = awardPoints(userId, TASK_PENALTY_POINTS, key);
      if (awarded) {
        c.status = "MISSED";
        c.pointsAwarded = TASK_PENALTY_POINTS;
      }
    }
  }
}

// ==========================================
// 4. AUTHENTICATION MIDDLEWARE
// ==========================================
interface AuthenticatedRequest extends Request {
  user?: { userId: string; email: string; name?: string };
}

const getBearerToken = (req: Request): string | null => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return null;
  }
  const parts = authHeader.trim().split(/\s+/);
  if (parts.length !== 2 || parts[0].toLowerCase() !== "bearer" || !parts[1]) {
    return null;
  }
  return parts[1];
};

const authMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const token = getBearerToken(req);
  if (!token) {
    res.status(401).json({
      success: false,
      error: {
        code: "UNAUTHORIZED",
        message: "A valid Bearer token is required",
      },
    });
    return;
  }

  try {
    let userId = "";
    let email = "";
    let userName: string | undefined;

    if (cognitoVerifier) {
      const payload = await cognitoVerifier.verify(token);
      userId = String(payload.sub);
      email =
        typeof payload.email === "string"
          ? payload.email
          : `${userId}@carevity.ai`;
      if (typeof payload.username === "string") {
        userName = payload.username;
      }
    } else if (ALLOW_MOCK_AUTH) {
      userId = token;
      userName = token.split("-")[0];
      email = `${userId}@carevity.ai`;
    } else {
      res.status(503).json({
        success: false,
        error: {
          code: "AUTH_NOT_CONFIGURED",
          message:
            "Cognito authentication is not configured. Set COGNITO_USER_POOL_ID and COGNITO_CLIENT_ID.",
        },
      });
      return;
    }

    if (!userId) {
      res.status(401).json({
        success: false,
        error: { code: "UNAUTHORIZED", message: "Invalid identity" },
      });
      return;
    }

    req.user = {
      userId,
      email,
      name: userName,
    };

    getOrCreateUser(req.user.userId, req.user.email, req.user.name);
    closeOutPastPending(req.user.userId);
    next();
  } catch (error) {
    console.error("[CareVity] Authentication failed:", error);
    res.status(401).json({
      success: false,
      error: { code: "UNAUTHORIZED", message: "Invalid or expired token" },
    });
  }
};

export const optionalAuthMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  let userId = "guest-user";
  let userName = "User";

  if (authHeader) {
    const token = getBearerToken(req);
    if (!token) {
      res.status(401).json({
        success: false,
        error: { code: "UNAUTHORIZED", message: "Invalid Bearer token" },
      });
      return;
    }
    try {
      if (cognitoVerifier) {
        const payload = await cognitoVerifier.verify(token);
        userId = String(payload.sub);
        if (typeof payload.username === "string") {
          userName = payload.username;
        }
      } else if (ALLOW_MOCK_AUTH) {
        userId = token;
        userName = token.split("-")[0];
      } else {
        res.status(503).json({
          success: false,
          error: {
            code: "AUTH_NOT_CONFIGURED",
            message: "Cognito authentication is not configured",
          },
        });
        return;
      }
    } catch (error) {
      console.error("[CareVity] Optional authentication failed:", error);
      res.status(401).json({
        success: false,
        error: { code: "UNAUTHORIZED", message: "Invalid or expired token" },
      });
      return;
    }
  } else {
    const ctxName =
      req.body?.userContext?.name ||
      req.body?.data?.userContext?.name ||
      req.body?.creatorName ||
      req.body?.data?.creatorName;
    if (typeof ctxName === "string" && ctxName.trim()) {
      userName = ctxName.trim();
      userId = `user-${userName.toLowerCase().replace(/[^a-z0-9]/g, "")}`;
    }
  }

  req.user = {
    userId,
    email: `${userId}@carevity.ai`,
    name: userName,
  };

  getOrCreateUser(req.user.userId, req.user.email, req.user.name);
  closeOutPastPending(req.user.userId);
  next();
};

// ==========================================
// 5. CORE API ENDPOINTS (THE 7 MVP FEATURES)
// ==========================================

// Health Check
app.get("/api/v1/health", (_req, res) => {
  res.json({ status: "HEALTHY", timestamp: new Date().toISOString() });
});

// ──────────────────────────────────────────
// Feature 1: User Profile & Server-Authoritative Onboarding
// ──────────────────────────────────────────

app.get(
  "/api/v1/users/me",
  authMiddleware,
  (req: AuthenticatedRequest, res: Response) => {
    const user = getOrCreateUser(
      req.user!.userId,
      req.user!.email,
      req.user!.name
    );
    res.json({ success: true, data: { user } });
  }
);

app.post(
  "/api/v1/users/me/onboarding",
  authMiddleware,
  (req: AuthenticatedRequest, res: Response) => {
    const { name, age, heightCm, weightKg, locality } = req.body;

    const isNameGiven = typeof name === "string" && name.trim().length > 0;
    const isLocalityGiven =
      typeof locality === "string" && locality.trim().length > 0;
    const areRequiredFieldsPresent =
      isNameGiven &&
      isLocalityGiven &&
      age !== undefined &&
      heightCm !== undefined &&
      weightKg !== undefined;

    if (!areRequiredFieldsPresent) {
      res.status(400).json({
        success: false,
        error: {
          code: "BAD_REQUEST",
          message: "All biological assessment fields are required",
        },
      });
      return;
    }

    const ageNum = Number(age);
    const heightNum = Number(heightCm);
    const weightNum = Number(weightKg);

    const isValidAge =
      Number.isFinite(ageNum) && ageNum >= 5 && ageNum <= 120;
    const isValidHeight =
      Number.isFinite(heightNum) && heightNum >= 50 && heightNum <= 250;
    const isValidWeight =
      Number.isFinite(weightNum) && weightNum >= 20 && weightNum <= 300;

    if (!isValidAge || !isValidHeight || !isValidWeight) {
      res.status(400).json({
        success: false,
        error: {
          code: "BAD_REQUEST",
          message:
            "age (5-120), heightCm (50-250), and weightKg (20-300) must be valid numbers within range",
        },
      });
      return;
    }

    const { bmi, bmiLabel } = calculateBMI(heightNum, weightNum);
    const user = getOrCreateUser(req.user!.userId);

    user.name = name.trim();
    user.age = ageNum;
    user.heightCm = heightNum;
    user.weightKg = weightNum;
    user.bmi = bmi;
    user.bmiLabel = bmiLabel;
    user.locality = locality.trim();
    user.district = `${locality.trim()} District Network`;
    user.onboarded = true;

    res.json({ success: true, data: { user, bmi, bmiLabel } });
  }
);

// ──────────────────────────────────────────
// Feature 2: The Core 3 Daily Tasks
// ──────────────────────────────────────────

app.get(
  "/api/v1/tasks/today",
  authMiddleware,
  (req: AuthenticatedRequest, res: Response) => {
    const date = rejectInvalidDate(req.query.date, res);
    if (!date) {
      return;
    }

    const tasks = initDailyTasks(req.user!.userId, date);
    res.json({ success: true, data: { tasks, date } });
  }
);

// Step Quest – update step count
app.post(
  "/api/v1/tasks/step-quest/progress",
  authMiddleware,
  (req: AuthenticatedRequest, res: Response) => {
    const { steps } = req.body;
    const date = rejectNonCurrentDate(req.body.date, res);
    if (!date) {
      return;
    }

    const userId = req.user!.userId;
    initDailyTasks(userId, date);
    const task = db.tasks.get(`${userId}#${date}#STEP_QUEST`)!;

    let incomingSteps = Number(steps);
    if (!Number.isFinite(incomingSteps) || incomingSteps < 0) {
      incomingSteps = 0;
    }

    // Step count only moves forward (pedometer is cumulative)
    if (incomingSteps > MAX_STEP_PROGRESS) {
      incomingSteps = MAX_STEP_PROGRESS;
    }

    if (task.status === "COMPLETED" || task.status === "FAILED") {
      res.json({ success: true, data: { task, isNewlyCompleted: false } });
      return;
    }

    if (incomingSteps > task.progress) {
      task.progress = incomingSteps;
    }

    let isNewlyCompleted = false;

    if (task.progress >= STEP_GOAL) {
      const awarded = awardPoints(
        userId,
        CORE_TASK_POINTS,
        `${userId}#${date}#STEP_QUEST#COMPLETION`
      );

      if (awarded) {
        task.status = "COMPLETED";
        task.pointsAwarded = CORE_TASK_POINTS;
        task.completedAt = new Date().toISOString();
        isNewlyCompleted = true;
      }
    }

    let benefit: { title: string; text: string } | undefined = undefined;
    if (isNewlyCompleted) {
      benefit = {
        title: "Cardiovascular Fitness",
        text: HEALTH_BENEFITS.STEP_QUEST,
      };
    }

    res.json({
      success: true,
      data: {
        task,
        isNewlyCompleted,
        benefit,
      },
    });
  }
);

// Sleep Curfew – client reports whether curfew was honoured
app.post(
  "/api/v1/tasks/sleep-curfew/result",
  authMiddleware,
  (req: AuthenticatedRequest, res: Response) => {
    const { screenUsedAfterCurfew, idleUntilMorning } = req.body;
    const date = rejectNonCurrentDate(req.body.date, res);
    if (!date) {
      return;
    }

    const userId = req.user!.userId;
    initDailyTasks(userId, date);
    const task = db.tasks.get(`${userId}#${date}#SLEEP_CURFEW`)!;

    // Already resolved — return current state and exit early
    if (task.status === "COMPLETED" || task.status === "FAILED") {
      res.json({ success: true, data: { task, status: task.status } });
      return;
    }

    const curfewWasSuccessful =
      !screenUsedAfterCurfew && idleUntilMorning === true;

    if (curfewWasSuccessful) {
      const awarded = awardPoints(
        userId,
        CORE_TASK_POINTS,
        `${userId}#${date}#SLEEP_CURFEW#COMPLETION`
      );

      if (awarded) {
        task.status = "COMPLETED";
        task.progress = 1;
        task.pointsAwarded = CORE_TASK_POINTS;
        task.completedAt = new Date().toISOString();
      }
    } else {
      const awarded = awardPoints(
        userId,
        TASK_PENALTY_POINTS,
        `${userId}#${date}#SLEEP_CURFEW#FAILURE`
      );

      if (awarded) {
        task.status = "FAILED";
        task.pointsAwarded = TASK_PENALTY_POINTS;
        task.failedAt = new Date().toISOString();
      }
    }

    res.json({ success: true, data: { task, status: task.status } });
  }
);

// Hydration Flow – log incremental water intake
app.post(
  "/api/v1/tasks/hydration",
  authMiddleware,
  (req: AuthenticatedRequest, res: Response) => {
    const { amountMl } = req.body;
    const date = rejectNonCurrentDate(req.body.date, res);
    if (!date) {
      return;
    }

    const userId = req.user!.userId;
    initDailyTasks(userId, date);
    const task = db.tasks.get(`${userId}#${date}#HYDRATION_FLOW`)!;

    // A negative amountMl (bad client, bad actor) must never reduce
    // already-logged progress, so we treat anything negative as 0.
    let delta = Number(amountMl);
    if (!Number.isFinite(delta) || delta < 0) {
      delta = 0;
    }

    if (delta > MAX_HYDRATION_DELTA_ML) {
      delta = MAX_HYDRATION_DELTA_ML;
    }

    if (task.status === "COMPLETED" || task.status === "FAILED") {
      res.json({
        success: true,
        data: { task, currentTotalMl: task.progress, isNewlyCompleted: false },
      });
      return;
    }

    task.progress = task.progress + delta;
    if (task.progress < 0) {
      task.progress = 0;
    }

    let isNewlyCompleted = false;

    if (task.progress >= HYDRATION_GOAL_ML) {
      const awarded = awardPoints(
        userId,
        CORE_TASK_POINTS,
        `${userId}#${date}#HYDRATION_FLOW#COMPLETION`
      );

      if (awarded) {
        task.status = "COMPLETED";
        task.pointsAwarded = CORE_TASK_POINTS;
        task.completedAt = new Date().toISOString();
        isNewlyCompleted = true;
      }
    }

    let benefit: { title: string; text: string } | undefined = undefined;
    if (isNewlyCompleted) {
      benefit = {
        title: "Plasma Volume Optimisation",
        text: HEALTH_BENEFITS.HYDRATION_FLOW,
      };
    }

    res.json({
      success: true,
      data: {
        task,
        currentTotalMl: task.progress,
        isNewlyCompleted,
        benefit,
      },
    });
  }
);

// ──────────────────────────────────────────
// Feature 3: The 3 Rotating Daily Challenges
// ──────────────────────────────────────────

app.get(
  "/api/v1/challenges/today",
  authMiddleware,
  (req: AuthenticatedRequest, res: Response) => {
    const date = rejectInvalidDate(req.query.date, res);
    if (!date) {
      return;
    }

    const challenges = initDailyChallenges(req.user!.userId, date);
    res.json({ success: true, data: { challenges, date } });
  }
);

app.post(
  "/api/v1/challenges/:id/complete",
  authMiddleware,
  (req: AuthenticatedRequest, res: Response) => {
    const date = rejectNonCurrentDate(req.body.date, res);
    if (!date) {
      return;
    }

    const userId = req.user!.userId;
    const challengeId = req.params.id;
    const challenges = initDailyChallenges(userId, date);

    let target: ChallengeItem | null = null;
    for (const c of challenges) {
      if (c.challengeId === challengeId) {
        target = c;
      }
    }

    if (!target) {
      res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: "Challenge not found for today" },
      });
      return;
    }

    if (target.status !== "COMPLETED") {
      const awarded = awardPoints(
        userId,
        CORE_TASK_POINTS,
        `${userId}#${date}#${challengeId}#COMPLETION`
      );

      if (awarded) {
        target.status = "COMPLETED";
        target.pointsAwarded = CORE_TASK_POINTS;
      }
    }

    res.json({ success: true, data: { challenge: target } });
  }
);

app.post(
  "/api/v1/challenges/:id/miss",
  authMiddleware,
  (req: AuthenticatedRequest, res: Response) => {
    const date = rejectNonCurrentDate(req.body.date, res);
    if (!date) {
      return;
    }

    const userId = req.user!.userId;
    const challengeId = req.params.id;
    const challenges = initDailyChallenges(userId, date);

    let target: ChallengeItem | null = null;
    for (const c of challenges) {
      if (c.challengeId === challengeId) {
        target = c;
      }
    }

    if (!target) {
      res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: "Challenge not found for today" },
      });
      return;
    }

    if (target.status !== "MISSED" && target.status !== "COMPLETED") {
      const awarded = awardPoints(
        userId,
        TASK_PENALTY_POINTS,
        `${userId}#${date}#${challengeId}#MISSED`
      );

      if (awarded) {
        target.status = "MISSED";
        target.pointsAwarded = TASK_PENALTY_POINTS;
      }
    }

    res.json({ success: true, data: { challenge: target } });
  }
);

// ──────────────────────────────────────────
// Feature 4: Authoritative Lifetime Points & History
// ──────────────────────────────────────────

app.get(
  "/api/v1/points/summary",
  authMiddleware,
  (req: AuthenticatedRequest, res: Response) => {
    const user = getOrCreateUser(req.user!.userId);
    res.json({
      success: true,
      data: {
        userId: user.userId,
        lifetimePoints: user.lifetimePoints,
      },
    });
  }
);

app.get(
  "/api/v1/points/history",
  authMiddleware,
  (req: AuthenticatedRequest, res: Response) => {
    let limit = Number(req.query.limit);
    if (!Number.isFinite(limit) || limit <= 0) {
      limit = 50;
    }
    if (limit > 100) {
      limit = 100;
    }

    // In-memory MVP: return task + challenge events as the history ledger.
    const userId = req.user!.userId;
    const events: object[] = [];

    for (const task of db.tasks.values()) {
      if (task.userId !== userId) {
        continue;
      }
      if (task.status === "COMPLETED") {
        events.push({
          type: "TASK_COMPLETE",
          taskId: task.taskId,
          title: task.title,
          points: task.pointsAwarded,
          date: task.date,
          timestamp: task.completedAt,
        });
      } else if (task.status === "FAILED") {
        events.push({
          type: "TASK_FAILED",
          taskId: task.taskId,
          title: task.title,
          points: task.pointsAwarded,
          date: task.date,
          timestamp: task.failedAt,
        });
      }
    }

    for (const challengeList of db.challenges.values()) {
      for (const c of challengeList) {
        if (c.userId !== userId) {
          continue;
        }
        if (c.status === "COMPLETED") {
          events.push({
            type: "CHALLENGE_COMPLETE",
            challengeId: c.challengeId,
            title: c.title,
            points: c.pointsAwarded,
            date: c.date,
          });
        } else if (c.status === "MISSED") {
          events.push({
            type: "CHALLENGE_MISSED",
            challengeId: c.challengeId,
            title: c.title,
            points: c.pointsAwarded,
            date: c.date,
          });
        }
      }
    }

    // Sort newest first, cap at limit
    events.sort((a: any, b: any) => {
      const aDate = a.date || "";
      const bDate = b.date || "";
      return bDate.localeCompare(aDate);
    });

    res.json({
      success: true,
      data: { history: events.slice(0, limit), total: events.length },
    });
  }
);

// ──────────────────────────────────────────
// Feature 5: The Monthly Digital Twin
// ──────────────────────────────────────────

app.get(
  "/api/v1/digital-twin/monthly",
  authMiddleware,
  (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.userId;
    const currentMonth = getLocalDate().substring(0, 7); // "YYYY-MM"

    // Count completed vs failed tasks this month
    let completed = 0;
    let failed = 0;

    for (const t of db.tasks.values()) {
      if (t.userId === userId && t.date.startsWith(currentMonth)) {
        if (t.status === "COMPLETED") {
          completed = completed + 1;
        } else if (t.status === "FAILED") {
          failed = failed + 1;
        }
      }
    }

    for (const list of db.challenges.values()) {
      for (const c of list) {
        if (c.userId === userId && c.date.startsWith(currentMonth)) {
          if (c.status === "COMPLETED") {
            completed = completed + 1;
          } else if (c.status === "MISSED") {
            failed = failed + 1;
          }
        }
      }
    }

    // Use days elapsed so far this month (not a flat 30) so early-month
    // progress isn't artificially deflated. 6 eligible items/day: 3 core
    // tasks + 3 rotating challenges.
    const totalEligibleThisMonth = daysElapsedInMonth() * 6;

    let netScore = completed - failed;
    if (netScore < 0) {
      netScore = 0;
    }

    let progressPercentage = Math.round(
      (netScore / totalEligibleThisMonth) * 100
    );
    if (progressPercentage > 100) {
      progressPercentage = 100;
    }

    let latestHealthBenefit =
      "Start completing your 3 constants and rotating challenges to fill your digital twin!";
    if (completed > 0) {
      latestHealthBenefit = `You have completed ${completed} pillars! Your heart elasticity and plasma volume are steadily optimizing your physical avatar.`;
    }

    res.json({
      success: true,
      data: {
        month: currentMonth,
        completedTasks: completed,
        failedTasks: failed,
        progressPercentage,
        latestHealthBenefit,
      },
    });
  }
);

// ──────────────────────────────────────────
// Feature 6: Voice AI Health Coach
// (Server-Side Sarvam AI, Strict Medical Safety Boundary)
// ──────────────────────────────────────────

app.post(
  ["/api/v1/ai/coach", "/askAI"],
  optionalAuthMiddleware,
  async (req: AuthenticatedRequest, res: Response) => {
    // Support both direct body and Firebase-style { data: { ... } } envelope
    let userMessage = req.body?.userMessage ?? req.body?.userInput;
    let context = req.body?.context ?? req.body?.userContext;
    if (req.body?.data) {
      userMessage = req.body.data.userMessage ?? req.body.data.userInput;
      context = req.body.data.context ?? req.body.data.userContext;
    }

    if (!userMessage || typeof userMessage !== "string") {
      res.status(400).json({
        success: false,
        error: {
          code: "BAD_REQUEST",
          message: "userMessage (or userInput) is required",
        },
      });
      return;
    }

    const user = getOrCreateUser(req.user!.userId);
    const lower = userMessage.toLowerCase();

    // ── Strict Medical Safety Boundary (Non-Negotiable) ──
    const mentionsMedicalSymptom =
      lower.includes("chest") ||
      lower.includes("pain") ||
      lower.includes("symptom") ||
      lower.includes("fever") ||
      lower.includes("diagnose");

    if (mentionsMedicalSymptom) {
      res.json({
        success: true,
        data: {
          reply: `${user.name}, I am your lifestyle habit coach, not a medical professional. I cannot evaluate medical symptoms or diagnose illnesses. Please consult a licensed physician or emergency medical provider immediately.`,
          text: `${user.name}, I am your lifestyle habit coach, not a medical professional. I cannot evaluate medical symptoms or diagnose illnesses. Please consult a licensed physician or emergency medical provider immediately.`,
          safetyDisclaimer:
            "CareVity is a wellness coach. Consult a physician for medical diagnosis.",
        },
      });
      return;
    }

    const mentionsMedication =
      lower.includes("dosage") ||
      lower.includes("paracetamol") ||
      lower.includes("medicine") ||
      lower.includes("prescribe");

    if (mentionsMedication) {
      res.json({
        success: true,
        data: {
          reply:
            "I cannot prescribe or recommend pharmaceutical medications or dosages. Please speak with a licensed doctor or pharmacist.",
          text: "I cannot prescribe or recommend pharmaceutical medications or dosages. Please speak with a licensed doctor or pharmacist.",
          safetyDisclaimer: "CareVity cannot prescribe medication.",
        },
      });
      return;
    }

    // ── Live Sarvam AI call if an API key is configured ──
    const sarvamKey = process.env.SARVAM_API_KEY;

    if (sarvamKey) {
      try {
        let modelName = process.env.SARVAM_MODEL;
        if (!modelName) {
          modelName = "sarvam-105b";
        }

        let systemPrompt = `You are CareVity, a lifestyle and habit coach. User: ${user.name}, BMI: ${user.bmi} (${user.bmiLabel}). Explain safe habit benefits and motivate the user. Never diagnose, prescribe, or recommend medication. For symptoms, tell the user to contact a licensed clinician or emergency services. Keep under 100 words.`;
        if (context) {
          systemPrompt =
            systemPrompt + `\nAdditional context: ${JSON.stringify(context)}`;
        }

        const response = await fetch("https://api.sarvam.ai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${sarvamKey}`,
          },
          body: JSON.stringify({
            model: modelName,
            temperature: 0.6,
            max_tokens: 200,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userMessage },
            ],
          }),
        });

        if (!response.ok) {
          throw new Error(`Sarvam AI returned HTTP ${response.status}`);
        }

        const data = (await response.json()) as {
          choices?: { message?: { content?: string } }[];
        };
        let replyText = "";
        for (const choice of data.choices || []) {
          if (choice.message?.content) {
            replyText = replyText + choice.message.content;
          }
        }
        replyText = replyText.trim();
        if (!replyText) {
          throw new Error("Sarvam AI returned an empty response");
        }

        res.json({
          success: true,
          data: { reply: replyText.trim(), text: replyText.trim() },
        });
        return;
      } catch (err) {
        console.error(
          "Sarvam AI call failed, falling back to rule-based coach",
          err
        );
      }
    }

    // ── Offline / Fallback coaching ──
    let reply = `Phenomenal work pushing your daily health habits, ${user.name}! Prioritizing your 5,000 steps, 10:30 PM sleep curfew, and 4L hydration strengthens your cardiovascular circulation and cellular hydration.`;
    let pointTrigger = 0;

    if (
      lower.includes("samosa") ||
      lower.includes("fried") ||
      lower.includes("junk")
    ) {
      reply =
        "Deep-fried foods spike blood glucose and trigger inflammation. Let's hydrate with water and balance it with clean fuel for dinner!";
      pointTrigger = -10;
    } else if (lower.includes("water") || lower.includes("hydrate")) {
      reply =
        "Hitting your 4L hydration goal maximizes blood plasma volume, relieving liver and kidney stress. Keep it up!";
      pointTrigger = 10;
    } else if (lower.includes("desk") || lower.includes("sluggish")) {
      reply =
        "Sitting for 4 hours restricts blood flow and drops your metabolic rate. Stand up now. Do 10 torso twists and 20 air squats!";
    }

    res.json({
      success: true,
      data: { reply, text: reply, pointTrigger },
    });
  }
);

// ──────────────────────────────────────────
// Feature 7: Social Competition Leaderboards (Squad Arena & Local Grid)
// ──────────────────────────────────────────

// Create a new squad (supports both REST /api/v1/squads and Firebase /generateSquadRoom)
app.post(
  ["/api/v1/squads", "/generateSquadRoom"],
  authMiddleware,
  (req: AuthenticatedRequest, res: Response) => {
    const rawName =
      req.body?.name ??
      req.body?.squadName ??
      req.body?.data?.name ??
      req.body?.data?.squadName;

    const name = rawName ? String(rawName).trim() : "CareVity Squad";

    if (name.length < 3) {
      res.status(400).json({
        success: false,
        error: {
          code: "BAD_REQUEST",
          message: "Squad name must be at least 3 characters",
        },
      });
      return;
    }

    const user = getOrCreateUser(req.user!.userId, req.user!.email, req.user!.name);
    const squadId = `squad_${Date.now()}`;
    const roomCode = generateRoomCode();

    const squad: SquadItem = {
      squadId,
      name,
      roomCode,
      ownerId: user.userId,
      members: [
        {
          userId: user.userId,
          name: user.name,
          lifetimePoints: user.lifetimePoints,
        },
      ],
    };

    db.squads.set(squadId, squad);
    db.roomCodes.set(roomCode, squadId);

    res.status(201).json({
      success: true,
      data: { squad, roomCode },
    });
  }
);

// Join a squad via room code
app.post(
  "/api/v1/squads/join",
  authMiddleware,
  (req: AuthenticatedRequest, res: Response) => {
    const { roomCode } = req.body;

    if (!roomCode || String(roomCode).trim().length !== 6) {
      res.status(400).json({
        success: false,
        error: {
          code: "BAD_REQUEST",
          message: "Room code must be exactly 6 characters",
        },
      });
      return;
    }

    const code = String(roomCode).trim().toUpperCase();
    const squadId = db.roomCodes.get(code);

    if (!squadId) {
      res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: "Invalid room code" },
      });
      return;
    }

    const squad = db.squads.get(squadId)!;
    const user = getOrCreateUser(req.user!.userId);

    let alreadyMember = false;
    for (const m of squad.members) {
      if (m.userId === user.userId) {
        alreadyMember = true;
      }
    }

    if (!alreadyMember) {
      squad.members.push({
        userId: user.userId,
        name: user.name,
        lifetimePoints: user.lifetimePoints,
      });
    }

    res.json({
      success: true,
      data: {
        member: { squadId, userId: user.userId, roomCode: code },
        alreadyMember,
      },
    });
  }
);

// Leave a squad
app.post(
  "/api/v1/squads/:id/leave",
  authMiddleware,
  (req: AuthenticatedRequest, res: Response) => {
    const squad = db.squads.get(req.params.id);

    if (!squad) {
      res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: "Squad not found" },
      });
      return;
    }

    const userId = req.user!.userId;
    let isMember = false;
    for (const member of squad.members) {
      if (member.userId === userId) {
        isMember = true;
        break;
      }
    }
    if (!isMember) {
      res.status(403).json({
        success: false,
        error: { code: "FORBIDDEN", message: "You are not a squad member" },
      });
      return;
    }

    const remainingMembers = [];
    for (const m of squad.members) {
      if (m.userId !== userId) {
        remainingMembers.push(m);
      }
    }
    squad.members = remainingMembers;

    res.json({ success: true, data: { left: true } });
  }
);

// Get squad details
app.get(
  "/api/v1/squads/:id",
  authMiddleware,
  (req: AuthenticatedRequest, res: Response) => {
    const squad = db.squads.get(req.params.id);

    if (!squad) {
      res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: "Squad not found" },
      });
      return;
    }

    let isMember = false;
    for (const member of squad.members) {
      if (member.userId === req.user!.userId) {
        isMember = true;
        break;
      }
    }
    if (!isMember) {
      res.status(403).json({
        success: false,
        error: { code: "FORBIDDEN", message: "You are not a squad member" },
      });
      return;
    }

    res.json({ success: true, data: { squad } });
  }
);

// Squad leaderboard
app.get(
  "/api/v1/squads/:id/leaderboard",
  authMiddleware,
  (req: AuthenticatedRequest, res: Response) => {
    const squad = db.squads.get(req.params.id);

    if (!squad) {
      res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: "Squad not found" },
      });
      return;
    }

    let isMember = false;
    for (const member of squad.members) {
      if (member.userId === req.user!.userId) {
        isMember = true;
        break;
      }
    }
    if (!isMember) {
      res.status(403).json({
        success: false,
        error: { code: "FORBIDDEN", message: "You are not a squad member" },
      });
      return;
    }

    // Refresh live lifetime points before ranking
    const rankings: {
      userId: string;
      name: string;
      points: number;
      isCurrentUser: boolean;
      rank: number;
    }[] = [];

    for (const m of squad.members) {
      const liveUser = db.users.get(m.userId);

      let displayName = m.name;
      let displayPoints = m.lifetimePoints;
      if (liveUser) {
        displayName = liveUser.name;
        displayPoints = liveUser.lifetimePoints;
      }

      rankings.push({
        userId: m.userId,
        name: displayName,
        points: displayPoints,
        isCurrentUser: m.userId === req.user!.userId,
        rank: 1, // placeholder, fixed up below after sorting
      });
    }

    rankings.sort((a, b) => b.points - a.points);

    for (let i = 0; i < rankings.length; i++) {
      rankings[i].rank = i + 1;
    }

    const podium = rankings.slice(0, 3);

    res.json({
      success: true,
      data: {
        squadId: squad.squadId,
        squadName: squad.name,
        roomCode: squad.roomCode,
        podium,
        rankings,
      },
    });
  }
);

// Local district leaderboard
app.get(
  "/api/v1/leaderboard/local",
  authMiddleware,
  (req: AuthenticatedRequest, res: Response) => {
    const user = getOrCreateUser(req.user!.userId);

    let district = user.district;
    if (!district) {
      district = "Rajgangpur District Network";
    }

    // Gather all users in the same district (or same locality as a fallback)
    const localUsers: UserProfile[] = [];
    for (const u of db.users.values()) {
      if (u.district === district || u.locality === user.locality) {
        localUsers.push(u);
      }
    }

    localUsers.sort((a, b) => b.lifetimePoints - a.lifetimePoints);

    const rankings: {
      rank: number;
      userId: string;
      name: string;
      lifetimePoints: number;
      locality: string;
      isCurrentUser: boolean;
    }[] = [];
    let userRank = 1;

    for (let i = 0; i < localUsers.length; i++) {
      const u = localUsers[i];
      const rank = i + 1;

      if (u.userId === user.userId) {
        userRank = rank;
      }

      rankings.push({
        rank,
        userId: u.userId,
        name: u.name,
        lifetimePoints: u.lifetimePoints,
        locality: u.locality,
        isCurrentUser: u.userId === user.userId,
      });
    }

    res.json({
      success: true,
      data: {
        district,
        locality: user.locality,
        userRank,
        totalParticipants: rankings.length,
        rankings,
      },
    });
  }
);

// ==========================================
// 6. GLOBAL ERROR HANDLER
// ==========================================
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error("[CareVity] Unhandled error:", err);
  res.status(500).json({
    success: false,
    error: {
      code: "INTERNAL_ERROR",
      message: "An unexpected error occurred",
    },
  });
});

// 404 – route not found
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: {
      code: "NOT_FOUND",
      message: "Route not found",
    },
  });
});

// ==========================================
// 7. BOOT SERVER
// ==========================================
if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => {
    console.log(`\n======================================================`);
    console.log(`  CareVity AI MVP Backend (Unified Single-File Service)`);
    console.log(`  Listening on: http://localhost:${PORT}/api/v1`);
    console.log(`  Health:       http://localhost:${PORT}/api/v1/health`);
    console.log(`======================================================\n`);
  });
}

export default app;
