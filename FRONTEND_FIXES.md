# CareVity AI Frontend Fixes

This is an MVP handoff list for the frontend. The backend is now the source of truth for onboarding, tasks, challenges, points, digital-twin progress, AI responses, squads, and leaderboards.

## Already implemented

The following frontend changes have already been completed and should be preserved:

- Added `carevity/lib/api.ts` as the shared backend API client.
- API requests obtain the Cognito access token with `fetchAuthSession()` and send it as a Bearer token.
- Added support for `EXPO_PUBLIC_API_URL`.
- Kept compatibility with existing URLs ending in `/askAI` or `/api/v1`.
- Updated `aiService.ts` to call the backend `/askAI` endpoint with authentication.
- Removed direct client-side point awarding from the voice coach flow.
- Updated `VoiceContext` to refresh server scores after an AI request.
- Added `try/finally` cleanup so the voice UI does not remain stuck in the listening state.
- Updated assessment to call:

  ```text
  POST /api/v1/users/me/onboarding
  ```

- Assessment now sends `name`, `age`, `heightCm`, `weightKg`, and `locality`.
- Assessment stores the server-calculated BMI and BMI label locally for display/context.
- Added locality to the assessment form.
- Removed dynamic `require()` calls from assessment.
- Updated `ScoreContext` to load points and monthly progress from:

  ```text
  GET /api/v1/points/summary
  GET /api/v1/digital-twin/monthly
  ```

- Removed local `AsyncStorage` score calculations from `ScoreContext`.
- Updated core tasks to load task state from:

  ```text
  GET /api/v1/tasks/today
  ```

- Updated step progress to call:

  ```text
  POST /api/v1/tasks/step-quest/progress
  ```

- Updated sleep verification to call:

  ```text
  POST /api/v1/tasks/sleep-curfew/result
  ```

- Updated hydration logging to call:

  ```text
  POST /api/v1/tasks/hydration
  ```

- Added historical step-count initialization and server synchronization.
- Updated challenges to load the backend’s deterministic daily challenge list.
- Updated challenge completion to call:

  ```text
  POST /api/v1/challenges/:id/complete
  ```

- Removed random challenge replacement behavior.
- Replaced the mock leaderboard rows with backend local leaderboard data.
- Added squad join flow using:

  ```text
  POST /api/v1/squads/join
  GET /api/v1/squads/:id/leaderboard
  ```

- Added six-character room-code validation before squad joining.
- Excluded `carevity/functions` from the frontend TypeScript project.
- Frontend TypeScript now passes.
- Frontend lint errors were fixed; only five non-blocking warnings remain.

## Backend URLs required by the frontend

### Base URL configuration

The frontend should use one base URL and append endpoint paths itself:

```env
EXPO_PUBLIC_API_URL=http://<BACKEND_HOST>:4000
```

For a local physical-device test:

```env
EXPO_PUBLIC_API_URL=http://192.168.1.10:4000
```

Replace `192.168.1.10` with the development computer's LAN IP. The device and computer must be on the same network.

For a deployed backend, use the deployed HTTPS base URL:

```env
EXPO_PUBLIC_API_URL=https://<BACKEND_DOMAIN>
```

Do not include `/askAI` or `/api/v1` in `EXPO_PUBLIC_API_URL`.

### Current deployed AWS URL

The repository contains this deployed Amplify API Gateway URL:

```text
https://cvnco5g0y3.execute-api.eu-north-1.amazonaws.com/prod
```

Use this exact frontend configuration for the currently deployed AI endpoint:

```env
EXPO_PUBLIC_API_URL=https://cvnco5g0y3.execute-api.eu-north-1.amazonaws.com/prod
```

The deployed AI endpoint is:

```text
POST https://cvnco5g0y3.execute-api.eu-north-1.amazonaws.com/prod/askAI
```

The deployed Cognito configuration is:

```env
EXPO_PUBLIC_AWS_REGION=eu-north-1
EXPO_PUBLIC_COGNITO_USER_POOL_ID=eu-north-1_CcohNUoDj
EXPO_PUBLIC_COGNITO_APP_CLIENT_ID=6vrqmvd8kcmpquui2m6hitq2n0
```

**Important MVP limitation:** this deployed API Gateway currently exposes the Amplify `askAI` Lambda route only. The full Express MVP routes (`/api/v1/users/me`, tasks, challenges, points, squads, and leaderboards) are implemented in `backend/src/server.ts`, but are not confirmed to be deployed at this public URL. To use the complete backend-integrated MVP, deploy the Express backend and replace `EXPO_PUBLIC_API_URL` with that deployment's base URL. Until then, the exact public URL above can be used for the deployed AI coach only.

### Required endpoint URLs

If the base URL is:

```text
https://<BACKEND_DOMAIN>
```

the frontend endpoint URLs are:

| Purpose | Method | URL |
|---|---:|---|
| Health check | `GET` | `https://<BACKEND_DOMAIN>/api/v1/health` |
| Current user profile | `GET` | `https://<BACKEND_DOMAIN>/api/v1/users/me` |
| Complete onboarding | `POST` | `https://<BACKEND_DOMAIN>/api/v1/users/me/onboarding` |
| Get today's tasks | `GET` | `https://<BACKEND_DOMAIN>/api/v1/tasks/today` |
| Update steps | `POST` | `https://<BACKEND_DOMAIN>/api/v1/tasks/step-quest/progress` |
| Submit sleep result | `POST` | `https://<BACKEND_DOMAIN>/api/v1/tasks/sleep-curfew/result` |
| Log hydration | `POST` | `https://<BACKEND_DOMAIN>/api/v1/tasks/hydration` |
| Get today's challenges | `GET` | `https://<BACKEND_DOMAIN>/api/v1/challenges/today` |
| Complete a challenge | `POST` | `https://<BACKEND_DOMAIN>/api/v1/challenges/:id/complete` |
| Mark a challenge missed | `POST` | `https://<BACKEND_DOMAIN>/api/v1/challenges/:id/miss` |
| Get lifetime points | `GET` | `https://<BACKEND_DOMAIN>/api/v1/points/summary` |
| Get points history | `GET` | `https://<BACKEND_DOMAIN>/api/v1/points/history` |
| Get monthly digital twin | `GET` | `https://<BACKEND_DOMAIN>/api/v1/digital-twin/monthly` |
| AI coach | `POST` | `https://<BACKEND_DOMAIN>/api/v1/ai/coach` |
| AI compatibility alias | `POST` | `https://<BACKEND_DOMAIN>/askAI` |
| Create a squad | `POST` | `https://<BACKEND_DOMAIN>/api/v1/squads` |
| Create squad compatibility alias | `POST` | `https://<BACKEND_DOMAIN>/generateSquadRoom` |
| Join a squad | `POST` | `https://<BACKEND_DOMAIN>/api/v1/squads/join` |
| Leave a squad | `POST` | `https://<BACKEND_DOMAIN>/api/v1/squads/:id/leave` |
| Get squad details | `GET` | `https://<BACKEND_DOMAIN>/api/v1/squads/:id` |
| Get squad leaderboard | `GET` | `https://<BACKEND_DOMAIN>/api/v1/squads/:id/leaderboard` |
| Get local leaderboard | `GET` | `https://<BACKEND_DOMAIN>/api/v1/leaderboard/local` |

Replace `:id` with the actual challenge or squad ID.

### Authentication requirements

- Send the Cognito access token on protected requests:

  ```http
  Authorization: Bearer <COGNITO_ACCESS_TOKEN>
  ```

- `carevity/lib/api.ts` already attaches this header through `fetchAuthSession()`.
- Do not send the Cognito client secret or Sarvam API key to the frontend.
- The AI endpoint also requires authentication in the deployed backend.

### Backend provider URL

Sarvam is called server-side only:

```text
https://api.sarvam.ai/v1/chat/completions
```

The frontend must never call this URL directly. The frontend calls `/api/v1/ai/coach` or `/askAI`, and the backend adds the Sarvam authorization.

## Priority 1: Functional fixes

### 1. Verify the API environment configuration

- Use `EXPO_PUBLIC_API_URL` as the frontend backend URL.
- It should point to the backend base URL without `/askAI` or `/api/v1`.
- Local example:

  ```env
  EXPO_PUBLIC_API_URL=http://192.168.1.10:4000
  ```

- Do not put `SARVAM_API_KEY`, OpenAI keys, or any other provider secret in the frontend `.env`.
- Verify that the physical device can reach the computer's LAN IP.

Relevant files:

- `carevity/.env`
- `carevity/lib/api.ts`
- `carevity/lib/aiService.ts`

### 2. Handle expired sessions and API authentication errors

- `carevity/lib/api.ts` obtains the Cognito access token.
- Add a consistent user-facing response for:
  - `401`: session expired or user is not authenticated
  - `403`: user is not allowed to access the resource
  - `503`: backend authentication is not configured
  - network failures
- On `401`, sign the user out and redirect to the login screen instead of only logging the error.
- Avoid exposing raw backend error details in production UI.

### 3. Add loading, empty, and error states to every API-backed screen

The following screens currently need visible request states:

- `carevity/app/(root)/assessment.tsx`
- `carevity/app/(root)/(drawer)/core-tasks.tsx`
- `carevity/app/(root)/(drawer)/challenges.tsx`
- `carevity/app/(root)/(drawer)/leaderboard.tsx`
- `carevity/app/(root)/(drawer)/dashboard.tsx`

Each screen should show:

- Initial loading indicator
- Retry action after a failed request
- Empty state when the backend returns no records
- Disabled buttons while a mutation is in progress
- Success/error toast after mutations

### 4. Finish dashboard backend integration

The dashboard should load the backend’s monthly digital-twin response instead of deriving progress from local assumptions.

Use:

```text
GET /api/v1/points/summary
GET /api/v1/digital-twin/monthly
```

Display at least:

- `progressPercentage`
- `completedTasks`
- `failedTasks`
- `latestHealthBenefit`
- `lifetimePoints`

Remove the hard-coded `/180` calculation from:

- `carevity/app/(root)/(drawer)/dashboard.tsx`

### 5. Refresh server state when returning to a screen

Use the screen focus lifecycle so stale task/challenge/leaderboard data is refreshed after navigation.

Examples:

- Refresh tasks when `core-tasks.tsx` gains focus.
- Refresh challenges when `challenges.tsx` gains focus.
- Refresh rankings when `leaderboard.tsx` gains focus.
- Refresh points and digital-twin data when `dashboard.tsx` gains focus.

Do not rely only on the initial `useEffect`.

### 6. Improve task mutation behavior

In `core-tasks.tsx`:

- Keep the server response as the authoritative task state.
- Do not allow repeated sleep submissions after completion.
- Show a clear message when a task is already completed, failed, or expired.
- Handle pedometer permission denial.
- Handle devices where the pedometer is unavailable.
- Stop the pedometer subscription on unmount.
- Prevent duplicate step requests while a previous request is pending.
- If historical step count is unavailable, fall back safely and tell the user that tracking is limited.

### 7. Add squad creation

The current leaderboard screen supports joining a squad, but the UI should also allow creating one.

Use:

```text
POST /api/v1/squads
```

Request body:

```json
{
  "name": "My Squad"
}
```

Display the returned six-character `roomCode` with a copy/share action.

Relevant file:

- `carevity/app/(root)/(drawer)/leaderboard.tsx`

### 8. Improve squad joining UX

- Validate that the room code is exactly six characters before submitting.
- Normalize input to uppercase.
- Show backend errors such as invalid code or already joined.
- Persist the joined `squadId` locally or reload it from a backend-backed source.
- After joining, load and display the squad leaderboard.
- Add a leave-squad action using:

  ```text
  POST /api/v1/squads/:id/leave
  ```

### 9. Route users based on real authentication and onboarding state

The splash screen currently always redirects to `/entry`.

Update the startup flow to:

1. Check the Cognito session.
2. If unauthenticated, route to `/entry`.
3. If authenticated, call:

   ```text
   GET /api/v1/users/me
   ```

4. Route onboarded users to the dashboard.
5. Route authenticated users without onboarding to assessment.

Relevant file:

- `carevity/app/splash.tsx`

### 10. Implement forgot-password flow

The `Forgot password?` control on the login screen currently does nothing.

Implement the Cognito flow using the appropriate Amplify Auth APIs:

- Start reset
- Enter verification code
- Set new password
- Show success and error states

Relevant file:

- `carevity/app/(auth)/login.tsx`

## Priority 2: Data and UX consistency

### 11. Remove stale local score state

The backend is authoritative for points. Do not store or calculate lifetime points independently in `AsyncStorage`.

Keep only presentation/cache data locally if needed. Never use local storage as the source for:

- Lifetime points
- Monthly completed count
- Task completion
- Challenge completion
- Leaderboard ranking

Relevant files:

- `carevity/context/ScoreContext.tsx`
- `carevity/context/VoiceContext.tsx`

### 12. Make onboarding data consistent with the backend

- The backend requires:
  - `name`
  - `age`
  - `heightCm`
  - `weightKg`
  - `locality`
- The frontend currently collects gender and activity level but does not send or store them server-side.
- Either remove those fields from the MVP UI or explicitly document them as not yet used.
- Add client-side range validation matching the backend:
  - Age: `5-120`
  - Height: `50-250 cm`
  - Weight: `20-300 kg`

Relevant file:

- `carevity/app/(root)/assessment.tsx`

### 13. Improve AI request behavior

In `carevity/lib/aiService.ts` and `VoiceContext.tsx`:

- Add a request timeout.
- Show a user-facing error state instead of only logging errors.
- Do not silently present the fallback response as if it came from Sarvam.
- Disable the send button while a request is active.
- Ensure `Speech.speak()` is only called when the response contains non-empty `text`.
- Keep `text` as the required response field.
- Do not award or deduct points directly from the AI response on the client.

### 14. Add pull-to-refresh where useful

Add refresh controls to:

- Dashboard
- Core tasks
- Challenges
- Leaderboard

The refresh action should re-fetch server state and update the screen without requiring a full app restart.

### 15. Improve accessibility

Add accessibility labels and hints to:

- Password visibility buttons
- Submit buttons
- Hydration logging control
- Sleep verification control
- Squad join/create controls
- Leaderboard tabs
- AI send button

Also ensure:

- Text remains readable in dark mode.
- Buttons have visible disabled states.
- Touch targets are large enough for mobile use.

## Priority 3: Code quality and lint

### 16. Resolve remaining lint warnings

Current frontend lint has no errors but still reports five warnings:

- Unused `Alert` import:
  - `carevity/app/(root)/change-password.tsx`
- Missing `router` dependency:
  - `carevity/app/splash.tsx`
- Unused `withTiming` import:
  - `carevity/components/ui/LiquidTwin.tsx`
- Unused `LinearGradient` import:
  - `carevity/components/ui/LiquidTwin.tsx`
- Missing `fillHeight` dependency:
  - `carevity/components/ui/LiquidTwin.tsx`

Run:

```bash
cd carevity
npm run lint
```

### 17. Keep frontend TypeScript isolated from Firebase functions

The frontend `tsconfig.json` now excludes `carevity/functions`. Keep it that way unless the functions project is intentionally converted into a workspace with its own dependency resolution.

Run:

```bash
cd carevity
npx tsc --noEmit
```

### 18. Replace broad `any` types in touched files

Prioritize:

- API response types
- Task and challenge models
- Leaderboard models
- Error handling
- Navigation props

Prefer shared interfaces/types over repeated inline shapes.

## Required verification before handoff

Run all of the following:

```bash
cd carevity
npx tsc --noEmit
npm run lint
```

Manual test checklist:

- Sign up and verify an account.
- Log in with an existing account.
- Restart the app while signed in.
- Complete onboarding.
- Confirm onboarding data appears from the backend.
- Log hydration and verify points update.
- Reach the step goal and verify only one award is issued.
- Complete a challenge and reload the screen.
- Join a squad and view rankings.
- Create a squad and share its room code.
- Test an expired session.
- Test backend unavailable/offline behavior.
- Ask the AI coach a normal habit question.
- Ask the AI coach a medical-symptom question and verify the safety response is spoken correctly.
