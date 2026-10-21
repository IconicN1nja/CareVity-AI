import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand, QueryCommand, ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import crypto from 'node:crypto';

const db = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const table = process.env.CAREVITY_TABLE_NAME;
const date = () => new Intl.DateTimeFormat('en-CA', { timeZone: process.env.DEFAULT_TIMEZONE || 'Asia/Kolkata' }).format(new Date());
const response = (statusCode: number, body: unknown): APIGatewayProxyResult => ({ statusCode, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type,Authorization', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS' }, body: JSON.stringify(body) });
const ok = (data: unknown) => response(200, { success: true, data });
const fail = (status: number, code: string, message: string) => response(status, { success: false, error: { code, message } });

async function identity(event: APIGatewayProxyEvent) {
  const authorizer = event.requestContext.authorizer as Record<string, unknown> | undefined;
  const nestedClaims = authorizer?.claims;
  const values =
    nestedClaims && typeof nestedClaims === 'object'
      ? (nestedClaims as Record<string, string>)
      : (authorizer as Record<string, string> | undefined);
  if (!values?.sub) throw new Error('UNAUTHORIZED');
  return { id: values.sub, email: values.email || `${values.sub}@carevity.ai`, name: values.username || values['cognito:username'] || 'User' };
}
function body(event: APIGatewayProxyEvent) { try { return event.body ? JSON.parse(event.isBase64Encoded ? Buffer.from(event.body, 'base64').toString() : event.body) : {}; } catch { throw new Error('BAD_JSON'); } }
async function user(id: string, fallback: { email: string; name: string }) {
  const key = { pk: `USER#${id}`, sk: 'PROFILE' };
  const existing = await db.send(new GetCommand({ TableName: table, Key: key }));
  if (existing.Item) return existing.Item;
  const item = { ...key, userId: id, email: fallback.email, name: fallback.name, lifetimePoints: 0, onboarded: false };
  await db.send(new PutCommand({ TableName: table, Item: item }));
  return item;
}
async function points(id: string) { const result = await db.send(new GetCommand({ TableName: table, Key: { pk: `USER#${id}`, sk: 'PROFILE' } })); return Number(result.Item?.lifetimePoints || 0); }
async function award(id: string, action: string, delta: number, day: string) {
  const marker = { pk: `USER#${id}`, sk: `IDEMP#${day}#${action}` };
  const seen = await db.send(new GetCommand({ TableName: table, Key: marker }));
  if (seen.Item) return false;
  await db.send(new PutCommand({ TableName: table, Item: { ...marker, delta, createdAt: new Date().toISOString() } }));
  await db.send(new UpdateCommand({ TableName: table, Key: { pk: `USER#${id}`, sk: 'PROFILE' }, UpdateExpression: 'SET lifetimePoints = if_not_exists(lifetimePoints, :zero) + :delta', ExpressionAttributeValues: { ':zero': 0, ':delta': delta } }));
  return true;
}
async function tasks(id: string, day: string) {
  const result = await db.send(new QueryCommand({ TableName: table, KeyConditionExpression: 'pk = :pk AND begins_with(sk, :prefix)', ExpressionAttributeValues: { ':pk': `USER#${id}`, ':prefix': `TASK#${day}#` } }));
  const current = result.Items || [];
  if (current.length) return current;
  const items = [
    ['STEP_QUEST', 'Step Quest', 5000], ['SLEEP_CURFEW', 'Sleep Curfew', 1], ['HYDRATION_FLOW', 'Hydration Flow', 4000],
  ].map(([taskId, title, target]) => ({ pk: `USER#${id}`, sk: `TASK#${day}#${taskId}`, taskId, title, target, progress: 0, status: 'PENDING', pointsAwarded: 0, date: day }));
  for (const item of items) await db.send(new PutCommand({ TableName: table, Item: item }));
  return items;
}
const challengeBank = ['Focus Sprint', 'Zero Fried Food', 'Screen-Free Dinner', 'Post-Meal Walk', 'Desk Mobility Reset', 'No Caffeine After 2 PM', 'Morning Sun Sync', '4x4 Box Breathing', 'Core Strength Hold', 'Cold Shower Rinse'];
async function challenges(id: string, day: string) {
  const result = await db.send(new QueryCommand({ TableName: table, KeyConditionExpression: 'pk = :pk AND begins_with(sk, :prefix)', ExpressionAttributeValues: { ':pk': `USER#${id}`, ':prefix': `CHALLENGE#${day}#` } }));
  if ((result.Items || []).length) return result.Items || [];
  const seed = [...day].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const items = [0, 1, 2].map((offset) => { const challengeId = `CHAL_${(seed + offset) % challengeBank.length}`; return { pk: `USER#${id}`, sk: `CHALLENGE#${day}#${challengeId}`, challengeId, title: challengeBank[(seed + offset) % challengeBank.length], date: day, status: 'PENDING', pointsAwarded: 0 }; });
  for (const item of items) await db.send(new PutCommand({ TableName: table, Item: item }));
  return items;
}
export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  if (event.httpMethod === 'OPTIONS') return response(204, {});
  try {
    if (!table) return fail(503, 'DATABASE_NOT_CONFIGURED', 'DynamoDB is not configured');
    const who = await identity(event); const current = await user(who.id, who); const path = (event.path || '/').replace(/\/$/, ''); const method = event.httpMethod; const input = body(event); const day = date();
    if (method === 'GET' && path === '/api/v1/health') return ok({ status: 'HEALTHY', timestamp: new Date().toISOString() });
    if (method === 'GET' && path === '/api/v1/users/me') return ok({ user: current });
    if (method === 'POST' && path === '/api/v1/users/me/onboarding') {
      const name = typeof input.name === 'string' ? input.name.trim() : ''; const locality = typeof input.locality === 'string' ? input.locality.trim() : ''; const age = Number(input.age); const heightCm = Number(input.heightCm); const weightKg = Number(input.weightKg);
      if (!name || !locality || ![age, heightCm, weightKg].every(Number.isFinite)) return fail(400, 'BAD_REQUEST', 'All biological assessment fields are required');
      if (age < 13 || age > 120 || heightCm < 100 || heightCm > 250 || weightKg < 20 || weightKg > 300) return fail(400, 'VALIDATION_ERROR', 'Age, height, or weight is outside the supported range');
      const bmi = Number((weightKg / Math.pow(heightCm / 100, 2)).toFixed(1)); const bmiLabel = bmi < 18.5 ? 'Underweight' : bmi < 25 ? 'Normal' : bmi < 30 ? 'Overweight' : 'Obese'; const updated = { ...current, name, locality, age, heightCm, weightKg, bmi, bmiLabel, onboarded: true };
      await db.send(new PutCommand({ TableName: table, Item: { pk: `USER#${who.id}`, sk: 'PROFILE', ...updated } })); return ok({ user: updated });
    }
    if (method === 'GET' && path === '/api/v1/tasks/today') return ok({ tasks: await tasks(who.id, day) });
    if (method === 'POST' && path === '/api/v1/tasks/step-quest/progress') { const value = Number(input.steps); if (!Number.isFinite(value) || value < 0) return fail(400, 'BAD_REQUEST', 'steps must be a non-negative number'); const complete = value >= 5000; await db.send(new UpdateCommand({ TableName: table, Key: { pk: `USER#${who.id}`, sk: `TASK#${day}#STEP_QUEST` }, UpdateExpression: 'SET progress = :progress, #status = :status', ExpressionAttributeNames: { '#status': 'status' }, ExpressionAttributeValues: { ':progress': Math.min(value, 200000), ':status': complete ? 'COMPLETED' : 'PENDING' } })); if (complete) await award(who.id, 'STEP_QUEST', 10, day); return ok({ task: { taskId: 'STEP_QUEST', progress: value, status: complete ? 'COMPLETED' : 'PENDING' } }); }
    if (method === 'POST' && path === '/api/v1/tasks/hydration') { const amount = Number(input.amountMl); if (!Number.isFinite(amount) || amount < 0 || amount > 20000) return fail(400, 'BAD_REQUEST', 'amountMl must be between 0 and 20000'); const key = { pk: `USER#${who.id}`, sk: `TASK#${day}#HYDRATION_FLOW` }; const old = await db.send(new GetCommand({ TableName: table, Key: key })); const total = Math.min(4000, Number(old.Item?.progress || 0) + amount); const complete = total >= 4000; await db.send(new UpdateCommand({ TableName: table, Key: key, UpdateExpression: 'SET progress = :progress, #status = :status', ExpressionAttributeNames: { '#status': 'status' }, ExpressionAttributeValues: { ':progress': total, ':status': complete ? 'COMPLETED' : 'PENDING' } })); if (complete) await award(who.id, 'HYDRATION_FLOW', 10, day); return ok({ currentTotalMl: total, status: complete ? 'COMPLETED' : 'PENDING' }); }
    if (method === 'POST' && path === '/api/v1/tasks/sleep-curfew/result') { const success = input.screenUsedAfterCurfew === false && input.idleUntilMorning === true; await db.send(new UpdateCommand({ TableName: table, Key: { pk: `USER#${who.id}`, sk: `TASK#${day}#SLEEP_CURFEW` }, UpdateExpression: 'SET #status = :status, progress = :progress', ExpressionAttributeNames: { '#status': 'status' }, ExpressionAttributeValues: { ':status': success ? 'COMPLETED' : 'FAILED', ':progress': success ? 1 : 0 } })); await award(who.id, 'SLEEP_CURFEW', success ? 10 : -10, day); return ok({ task: { taskId: 'SLEEP_CURFEW', status: success ? 'COMPLETED' : 'FAILED' } }); }
    if (method === 'GET' && path === '/api/v1/challenges/today') return ok({ challenges: await challenges(who.id, day) });
    const challengeMatch = path.match(/^\/api\/v1\/challenges\/([^/]+)\/(complete|miss)$/); if (method === 'POST' && challengeMatch) { const id = challengeMatch[1]; const complete = challengeMatch[2] === 'complete'; const key = { pk: `USER#${who.id}`, sk: `CHALLENGE#${day}#${id}` }; const existing = await db.send(new GetCommand({ TableName: table, Key: key })); if (!existing.Item) return fail(404, 'NOT_FOUND', 'Challenge not found'); const delta = complete ? 10 : -10; await db.send(new UpdateCommand({ TableName: table, Key: key, UpdateExpression: 'SET #status = :status, pointsAwarded = :points', ExpressionAttributeNames: { '#status': 'status' }, ExpressionAttributeValues: { ':status': complete ? 'COMPLETED' : 'MISSED', ':points': delta } })); await award(who.id, `CHALLENGE#${id}`, delta, day); return ok({ challenge: { ...existing.Item, status: complete ? 'COMPLETED' : 'MISSED', pointsAwarded: delta } }); }
    if (method === 'GET' && path === '/api/v1/points/summary') return ok({ lifetimePoints: await points(who.id) });
    if (method === 'GET' && path === '/api/v1/points/history') { const result = await db.send(new QueryCommand({ TableName: table, KeyConditionExpression: 'pk = :pk AND begins_with(sk, :prefix)', ExpressionAttributeValues: { ':pk': `USER#${who.id}`, ':prefix': 'POINT#' }, ScanIndexForward: false, Limit: 50 })); return ok({ events: result.Items || [] }); }
    if (method === 'GET' && path === '/api/v1/digital-twin/monthly') { const result = await db.send(new QueryCommand({ TableName: table, KeyConditionExpression: 'pk = :pk AND begins_with(sk, :prefix)', ExpressionAttributeValues: { ':pk': `USER#${who.id}`, ':prefix': 'POINT#' }, Select: 'COUNT' })); return ok({ completedTasks: result.Count || 0, progressPercentage: Math.min(100, Math.round(Number(result.Count || 0) / 180 * 100)) }); }
    if (method === 'GET' && path === '/api/v1/leaderboard/local') { const result = await db.send(new ScanCommand({ TableName: table, FilterExpression: 'sk = :profile', ExpressionAttributeValues: { ':profile': 'PROFILE' } })); const rankings = (result.Items || []).sort((a, b) => Number(b.lifetimePoints || 0) - Number(a.lifetimePoints || 0)).map((item, index) => ({ rank: index + 1, name: item.name, lifetimePoints: Number(item.lifetimePoints || 0), isCurrentUser: item.userId === who.id })); const currentRecord = current as Record<string, unknown>; const locality = typeof currentRecord.locality === 'string' ? currentRecord.locality : ''; return ok({ rankings, district: locality ? `${locality} District Network` : 'Local District', userRank: rankings.find((item) => item.isCurrentUser)?.rank || null, totalParticipants: rankings.length }); }
    if (method === 'POST' && (path === '/api/v1/squads' || path === '/generateSquadRoom')) {
      const squadId = crypto.randomUUID();
      const roomCode = crypto.randomBytes(3).toString('hex').toUpperCase();
      const squad = { pk: `SQUAD#${squadId}`, sk: 'META', squadId, roomCode, name: typeof input.squadName === 'string' ? input.squadName : 'CareVity Squad', ownerId: who.id, members: [{ userId: who.id, name: who.name, lifetimePoints: await points(who.id) }] };
      await db.send(new PutCommand({ TableName: table, Item: squad }));
      await db.send(new PutCommand({ TableName: table, Item: { pk: `ROOM#${roomCode}`, sk: 'SQUAD', squadId } }));
      return ok({ squad, roomCode });
    }
    if (method === 'POST' && path === '/api/v1/squads/join') {
      const roomCode = typeof input.roomCode === 'string' ? input.roomCode.trim().toUpperCase() : '';
      const room = await db.send(new GetCommand({ TableName: table, Key: { pk: `ROOM#${roomCode}`, sk: 'SQUAD' } }));
      if (!room.Item) return fail(404, 'NOT_FOUND', 'Squad room not found');
      const key = { pk: `SQUAD#${room.Item.squadId}`, sk: 'META' };
      const squad = await db.send(new GetCommand({ TableName: table, Key: key }));
      if (!squad.Item) return fail(404, 'NOT_FOUND', 'Squad not found');
      const members = Array.isArray(squad.Item.members) ? squad.Item.members : [];
      if (!members.some((member: { userId?: string }) => member.userId === who.id)) members.push({ userId: who.id, name: who.name, lifetimePoints: await points(who.id) });
      await db.send(new UpdateCommand({ TableName: table, Key: key, UpdateExpression: 'SET members = :members', ExpressionAttributeValues: { ':members': members } }));
      return ok({ member: { squadId: room.Item.squadId }, squad: { ...squad.Item, members } });
    }
    const squadMatch = path.match(/^\/api\/v1\/squads\/([^/]+)\/leaderboard$/);
    if (method === 'GET' && squadMatch) {
      const squad = await db.send(new GetCommand({ TableName: table, Key: { pk: `SQUAD#${squadMatch[1]}`, sk: 'META' } }));
      if (!squad.Item) return fail(404, 'NOT_FOUND', 'Squad not found');
      const rankings = (Array.isArray(squad.Item.members) ? squad.Item.members : []).sort((a: { lifetimePoints?: number }, b: { lifetimePoints?: number }) => Number(b.lifetimePoints || 0) - Number(a.lifetimePoints || 0)).map((member: { userId: string; name: string; lifetimePoints?: number }, index: number) => ({ rank: index + 1, name: member.name, points: Number(member.lifetimePoints || 0), isCurrentUser: member.userId === who.id }));
      return ok({ squad: squad.Item, rankings });
    }
    if (method === 'POST' && path === '/api/v1/ai/coach') {
      const message = typeof input.userMessage === 'string' ? input.userMessage : typeof input.userInput === 'string' ? input.userInput : '';
      if (!message) return fail(400, 'BAD_REQUEST', 'userMessage (or userInput) is required');
      const lower = message.toLowerCase();
      if (['pain', 'chest', 'symptom', 'fever', 'diagnose', 'medicine', 'dosage', 'prescribe'].some((term) => lower.includes(term))) return ok({ reply: `${who.name}, I am a lifestyle habit coach, not a medical professional. I cannot evaluate symptoms or prescribe medication. Please consult a licensed physician or emergency provider.`, text: `${who.name}, I am a lifestyle habit coach, not a medical professional. I cannot evaluate symptoms or prescribe medication. Please consult a licensed physician or emergency provider.` });
      return ok({ reply: `Keep going, ${who.name}! Consistent steps, sleep, hydration, and mindful nutrition strengthen your daily health foundation.`, text: `Keep going, ${who.name}! Consistent steps, sleep, hydration, and mindful nutrition strengthen your daily health foundation.` });
    }
    return fail(404, 'NOT_FOUND', 'Route not found');
  } catch (cause) { if (cause instanceof Error && cause.message === 'BAD_JSON') return fail(400, 'BAD_REQUEST', 'Request body must be valid JSON'); if (cause instanceof Error && cause.message === 'UNAUTHORIZED') return fail(401, 'UNAUTHORIZED', 'A valid Cognito access token is required'); if (cause instanceof Error && cause.message === 'AUTH_NOT_CONFIGURED') return fail(503, 'AUTH_NOT_CONFIGURED', 'Cognito authentication is not configured'); console.error('[CareVity API]', cause); return fail(500, 'INTERNAL_ERROR', 'An unexpected error occurred'); }
}
