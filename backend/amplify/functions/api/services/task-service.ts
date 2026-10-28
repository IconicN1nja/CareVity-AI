import { GetCommand, PutCommand, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { db, tableName } from '../config/dynamo';
import { awardOnce } from '../repositories/points-repository';

const definitions = [['STEP_QUEST', 'Step Quest', 5000], ['SLEEP_CURFEW', 'Sleep Curfew', 1], ['HYDRATION_FLOW', 'Hydration Flow', 4000]] as const;

export async function todayTasks(userId: string, day: string) {
  const result = await db.send(new QueryCommand({ TableName: tableName, KeyConditionExpression: 'pk = :pk AND begins_with(sk, :prefix)', ExpressionAttributeValues: { ':pk': `USER#${userId}`, ':prefix': `TASK#${day}#` } }));
  if (result.Items?.length) return result.Items;
  const items = definitions.map(([taskId, title, target]) => ({ pk: `USER#${userId}`, sk: `TASK#${day}#${taskId}`, taskId, title, target, progress: 0, status: 'PENDING', pointsAwarded: 0, date: day }));
  for (const item of items) {
    try {
      await db.send(new PutCommand({ TableName: tableName, Item: item, ConditionExpression: 'attribute_not_exists(pk)' }));
    } catch (error) {
      if (!(error instanceof Error) || error.name !== 'ConditionalCheckFailedException') throw error;
    }
  }
  const initialized = await db.send(new QueryCommand({ TableName: tableName, KeyConditionExpression: 'pk = :pk AND begins_with(sk, :prefix)', ExpressionAttributeValues: { ':pk': `USER#${userId}`, ':prefix': `TASK#${day}#` } }));
  return initialized.Items || items;
}

export async function updateSteps(userId: string, day: string, steps: number) {
  const complete = steps >= 5000;
  await db.send(new UpdateCommand({ TableName: tableName, Key: { pk: `USER#${userId}`, sk: `TASK#${day}#STEP_QUEST` }, UpdateExpression: 'SET progress = :progress, #status = :status', ExpressionAttributeNames: { '#status': 'status' }, ExpressionAttributeValues: { ':progress': Math.min(steps, 200000), ':status': complete ? 'COMPLETED' : 'PENDING' } }));
  if (complete) await awardOnce(userId, day, 'STEP_QUEST', 10, 'Completed Step Quest');
  return { taskId: 'STEP_QUEST', progress: steps, status: complete ? 'COMPLETED' : 'PENDING' };
}

export async function updateHydration(userId: string, day: string, amountMl: number) {
  const key = { pk: `USER#${userId}`, sk: `TASK#${day}#HYDRATION_FLOW` };
  const old = await db.send(new GetCommand({ TableName: tableName, Key: key }));
  const total = Math.min(4000, Number(old.Item?.progress || 0) + amountMl);
  const complete = total >= 4000;
  await db.send(new UpdateCommand({ TableName: tableName, Key: key, UpdateExpression: 'SET progress = :progress, #status = :status', ExpressionAttributeNames: { '#status': 'status' }, ExpressionAttributeValues: { ':progress': total, ':status': complete ? 'COMPLETED' : 'PENDING' } }));
  if (complete) await awardOnce(userId, day, 'HYDRATION_FLOW', 10, 'Completed Hydration Flow');
  return { currentTotalMl: total, status: complete ? 'COMPLETED' : 'PENDING' };
}

export async function updateSleep(userId: string, day: string, input: { screenUsedAfterCurfew: boolean; idleUntilMorning: boolean }) {
  const complete = !input.screenUsedAfterCurfew && input.idleUntilMorning;
  await db.send(new UpdateCommand({ TableName: tableName, Key: { pk: `USER#${userId}`, sk: `TASK#${day}#SLEEP_CURFEW` }, UpdateExpression: 'SET #status = :status, progress = :progress', ExpressionAttributeNames: { '#status': 'status' }, ExpressionAttributeValues: { ':status': complete ? 'COMPLETED' : 'FAILED', ':progress': complete ? 1 : 0 } }));
  await awardOnce(userId, day, 'SLEEP_CURFEW', complete ? 10 : -10, complete ? 'Completed Sleep Curfew' : 'Failed Sleep Curfew');
  return { taskId: 'SLEEP_CURFEW', status: complete ? 'COMPLETED' : 'FAILED' };
}
