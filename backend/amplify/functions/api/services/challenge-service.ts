import { GetCommand, PutCommand, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { db, tableName } from '../config/dynamo';
import { awardOnce } from '../repositories/points-repository';

const bank = ['Focus Sprint', 'Zero Fried Food', 'Screen-Free Dinner', 'Post-Meal Walk', 'Desk Mobility Reset', 'No Caffeine After 2 PM', 'Morning Sun Sync', '4x4 Box Breathing', 'Core Strength Hold', 'Cold Shower Rinse'];

export async function todayChallenges(userId: string, day: string) {
  const existing = await db.send(new QueryCommand({ TableName: tableName, KeyConditionExpression: 'pk = :pk AND begins_with(sk, :prefix)', ExpressionAttributeValues: { ':pk': `USER#${userId}`, ':prefix': `CHALLENGE#${day}#` } }));
  if (existing.Items?.length) return existing.Items;
  const seed = [...day].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const items = [0, 1, 2].map((offset) => {
    const index = (seed + offset) % bank.length;
    const challengeId = `CHAL_${index}`;
    return { pk: `USER#${userId}`, sk: `CHALLENGE#${day}#${challengeId}`, challengeId, title: bank[index], category: 'Daily Habit', description: bank[index], date: day, status: 'PENDING', pointsAwarded: 0 };
  });
  for (const item of items) {
    try {
      await db.send(new PutCommand({ TableName: tableName, Item: item, ConditionExpression: 'attribute_not_exists(pk)' }));
    } catch (error) {
      if (!(error instanceof Error) || error.name !== 'ConditionalCheckFailedException') throw error;
    }
  }
  const initialized = await db.send(new QueryCommand({ TableName: tableName, KeyConditionExpression: 'pk = :pk AND begins_with(sk, :prefix)', ExpressionAttributeValues: { ':pk': `USER#${userId}`, ':prefix': `CHALLENGE#${day}#` } }));
  return initialized.Items || items;
}

export async function setChallenge(userId: string, day: string, challengeId: string, complete: boolean) {
  const key = { pk: `USER#${userId}`, sk: `CHALLENGE#${day}#${challengeId}` };
  const existing = await db.send(new GetCommand({ TableName: tableName, Key: key }));
  if (!existing.Item) throw new Error('NOT_FOUND');
  const delta = complete ? 10 : -10;
  await db.send(new UpdateCommand({ TableName: tableName, Key: key, UpdateExpression: 'SET #status = :status, pointsAwarded = :points', ExpressionAttributeNames: { '#status': 'status' }, ExpressionAttributeValues: { ':status': complete ? 'COMPLETED' : 'MISSED', ':points': delta } }));
  await awardOnce(userId, day, `CHALLENGE#${challengeId}`, delta, `${complete ? 'Completed' : 'Missed'} ${String(existing.Item.title || 'challenge')}`);
  return { ...existing.Item, status: complete ? 'COMPLETED' : 'MISSED', pointsAwarded: delta };
}
