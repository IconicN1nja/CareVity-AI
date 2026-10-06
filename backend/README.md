# CareVity AI MVP – Backend Service

A unified, robust Express TypeScript backend implementing all 7 core MVP specifications for **CareVity AI**.

---

## 🚀 Features Implemented

1. **User Onboarding & BMI Baseline**
   - Calculates server-authoritative BMI (`weight / height²`).
   - Categorizes into `<18.5` (Underweight), `18.5-24.9` (Normal), `25-29.9` (Overweight), `>=30` (Obese).
   - Strict range & sanity bounds validation for age, height, and weight.

2. **The Core 3 Daily Tasks**
   - **Step Quest:** 5,000 steps daily threshold (`+10 pts` upon completion, idempotent).
   - **Sleep Curfew:** 10:30 PM – 6:00 AM window (`+10 pts` success, `-10 pts` violation/failure).
   - **Hydration Flow:** 4,000 ml incremental intake (`+10 pts` on hitting goal, floor at 0 ml).
   - Real-time biological benefit cards (GLUT-4 activation, Stage 3 sleep glymphatic detox, plasma volume optimization).

3. **3 Rotating Daily Challenges**
   - Deterministic date-hashed rotation from the pre-built 10-challenge bank.
   - `+10 pts` on completion, `-10 pts` on missed/failed.

4. **Authoritative Gamified Scoring & Ledger**
   - Idempotent transaction ledger (`userId#date#action`). Duplicate requests never double-award points.
   - Points floor at 0.
   - Authoritative points summary and event history endpoints.

5. **Monthly Digital Twin Avatar**
   - Real-time fluid progress computation: `(completed - failed) / (daysElapsedInMonth * 6) * 100%`.
   - Returns dynamic biological health benefit status messages.

6. **Voice AI Health Coach (Sarvam AI + Strict Medical Safety Boundary)**
   - Powered by Sarvam AI with rule-based fallback when offline / unconfigured.
   - **Non-negotiable Medical Boundary:** Blocks queries about pain, symptoms, fever, diagnoses, prescription drugs, or dosages with mandatory medical disclaimers.
   - Supports both `/api/v1/ai/coach` and `/askAI` (compatible with Expo frontend and Cloud Function payloads).

7. **Social Competition Leaderboards**
   - **Squad Arena:** Create private squads with 6-character room codes (e.g. `VITY-7732`), join via code, and view live ranked podiums.
   - **Local Grid:** Regional district ranking (`userRank`, total participants, leaderboard array).

8. **Automatic Day-Rollover Close-out**
   - Past pending tasks/challenges automatically close out to `FAILED` / `MISSED` with penalty on subsequent user requests without requiring external cron daemons.

---

## 🛠️ Quickstart

### Prerequisites
- Node.js >= 18.0.0
- npm >= 9.0.0

### Installation
```bash
cd CareVity-AI-mvp/backend
npm install
```

### Environment Configuration
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Configure Sarvam (optional; offline fallback coaching is active if omitted):
```env
PORT=4000
NODE_ENV=development
SARVAM_API_KEY=...
SARVAM_MODEL=sarvam-105b
COGNITO_USER_POOL_ID=...
COGNITO_CLIENT_ID=...
DEFAULT_TIMEZONE=Asia/Kolkata
```

### Running Locally
```bash
# Start in development mode with live watch
npm run dev

# Or build and run production bundle
npm run build
npm start
```

### Running Tests
```bash
npm test
```

---

## 📡 API Reference Summary

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/v1/health` | Service health status check |
| `GET` | `/api/v1/users/me` | Fetch authenticated user profile |
| `POST` | `/api/v1/users/me/onboarding` | Biological assessment onboarding (computes BMI) |
| `GET` | `/api/v1/tasks/today` | Fetch the 3 Core Tasks for today |
| `POST` | `/api/v1/tasks/step-quest/progress` | Submit step count progress |
| `POST` | `/api/v1/tasks/sleep-curfew/result` | Submit sleep curfew result |
| `POST` | `/api/v1/tasks/hydration` | Log incremental hydration ml |
| `GET` | `/api/v1/challenges/today` | Get today's 3 rotating daily challenges |
| `POST` | `/api/v1/challenges/:id/complete` | Complete a challenge (+10 pts) |
| `POST` | `/api/v1/challenges/:id/miss` | Mark challenge missed (-10 pts) |
| `GET` | `/api/v1/points/summary` | Get lifetime points total |
| `GET` | `/api/v1/points/history` | Get score event audit history |
| `GET` | `/api/v1/digital-twin/monthly` | Get monthly digital twin % & benefit card |
| `POST` | `/api/v1/ai/coach` or `/askAI` | Voice AI Health Coach interaction |
| `POST` | `/api/v1/squads` or `/generateSquadRoom` | Create a squad / generate 6-char room code |
| `POST` | `/api/v1/squads/join` | Join a squad using 6-char room code |
| `GET` | `/api/v1/squads/:id/leaderboard` | View squad ranking & podium |
| `GET` | `/api/v1/leaderboard/local` | View local district grid leaderboard |

---

## 📱 Frontend Integration (Expo App)

To point the Expo mobile app to this backend:
1. In `CareVity-AI-mvp/carevity/.env`:
   ```env
   EXPO_PUBLIC_API_URL=http://<YOUR_LOCAL_IP>:4000
   ```
2. For device testing (physical phone with Expo Go), replace `localhost` with your machine's LAN IP (e.g. `http://192.168.1.10:4000`).
