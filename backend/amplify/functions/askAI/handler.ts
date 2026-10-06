/**
 * CareVity AI - askAI Lambda
 * Hosts the Voice AI Health Coach API behind an API Gateway REST endpoint.
 *
 * Mirrors /askAI from backend/src/server.ts (Feature 6) without the in-memory
 * store: it reads the user profile from the request's userContext envelope and
 * calls Sarvam AI's Chat Completions API directly so the bundle stays dependency
 * free. Includes the strict Medical Safety Boundary and the rule-based offline
 * fallback.
 */

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";

interface UserContext {
  name?: string;
  bmi?: string;
  bmiLabel?: string;
}

interface AskAIRequestBody {
  userInput?: string;
  userMessage?: string;
  userContext?: UserContext;
  context?: UserContext;
  data?: {
    userInput?: string;
    userMessage?: string;
    userContext?: UserContext;
    context?: UserContext;
  };
}

function getUserContext(body: AskAIRequestBody): UserContext {
  if (body.data?.userContext) {
    return body.data.userContext;
  }
  if (body.data?.context) {
    return body.data.context;
  }
  if (body.userContext) {
    return body.userContext;
  }
  return body.context || {};
}

function getInput(body: AskAIRequestBody): string | undefined {
  if (body.data?.userInput) {
    return body.data.userInput;
  }
  if (body.data?.userMessage) {
    return body.data.userMessage;
  }
  return body.userInput || body.userMessage;
}

function jsonResult(
  statusCode: number,
  payload: unknown
): APIGatewayProxyResult {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
    body: JSON.stringify(payload),
  };
}

export async function handler(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  let body: AskAIRequestBody = {};

  try {
    if (event.body) {
      body = JSON.parse(event.body) as AskAIRequestBody;
    }
  } catch {
    return jsonResult(400, {
      success: false,
      error: {
        code: "BAD_REQUEST",
        message: "Request body must be valid JSON",
      },
    });
  }

  const userMessage = getInput(body);
  if (!userMessage || typeof userMessage !== "string") {
    return jsonResult(400, {
      success: false,
      error: {
        code: "BAD_REQUEST",
        message: "userMessage (or userInput) is required",
      },
    });
  }

  const ctx = getUserContext(body);
  const userName = ctx.name || "User";
  const userBmi = ctx.bmi || "22.9";
  const userBmiLabel = ctx.bmiLabel || "Normal";

  const lower = userMessage.toLowerCase();

  // ── Strict Medical Safety Boundary (Non-Negotiable) ──
  const mentionsMedicalSymptom =
    lower.includes("chest") ||
    lower.includes("pain") ||
    lower.includes("symptom") ||
    lower.includes("fever") ||
    lower.includes("diagnose");

  if (mentionsMedicalSymptom) {
    const text = `${userName}, I am your lifestyle habit coach, not a medical professional. I cannot evaluate medical symptoms or diagnose illnesses. Please consult a licensed physician or emergency medical provider immediately.`;
    return jsonResult(200, {
      success: true,
      data: {
        reply: text,
        text,
        safetyDisclaimer:
          "CareVity is a wellness coach. Consult a physician for medical diagnosis.",
      },
    });
  }

  const mentionsMedication =
    lower.includes("dosage") ||
    lower.includes("paracetamol") ||
    lower.includes("medicine") ||
    lower.includes("prescribe");

  if (mentionsMedication) {
    const text =
      "I cannot prescribe or recommend pharmaceutical medications or dosages. Please speak with a licensed doctor or pharmacist.";
    return jsonResult(200, {
      success: true,
      data: {
        reply: text,
        text,
        safetyDisclaimer: "CareVity cannot prescribe medication.",
      },
    });
  }

  // ── Live Sarvam AI call if an API key is configured ──
  const sarvamKey = process.env.SARVAM_API_KEY;
  if (sarvamKey) {
    try {
      let modelName = process.env.SARVAM_MODEL;
      if (!modelName) {
        modelName = "sarvam-105b";
      }

      let systemPrompt = `You are CareVity, a lifestyle and habit coach. User: ${userName}, BMI: ${userBmi} (${userBmiLabel}). You explain biological benefits of habits (GLUT-4, sleep detox, plasma volume) and motivate the user. You NEVER diagnose or prescribe. Keep under 100 words.`;

      const response = await fetch(
        "https://api.sarvam.ai/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + sarvamKey,
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
        }
      );

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

      if (replyText) {
        return jsonResult(200, {
          success: true,
          data: { reply: replyText, text: replyText },
        });
      }
    } catch (err) {
      console.error(
        "Sarvam AI call failed, falling back to rule-based coach",
        err
      );
    }
  }

  // ── Offline / Fallback coaching ──
  let reply = `Phenomenal work pushing your daily health habits, ${userName}! Prioritizing your 5,000 steps, 10:30 PM sleep curfew, and 4L hydration strengthens your cardiovascular circulation and cellular hydration.`;
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

  return jsonResult(200, {
    success: true,
    data: { reply, text: reply, pointTrigger },
  });
}
