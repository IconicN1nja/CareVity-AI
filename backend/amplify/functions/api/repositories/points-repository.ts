import { GetCommand, QueryCommand, TransactWriteCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { db, tableName } from '../config/dynamo';

export async function currentPoints(userId: string) {
  const result = await db.send(new GetCommand({ TableName: tableName, Key: { pk: `USER#${userId}`, sk: 'PROFILE' } }));
  return Number(result.Item?.lifetimePoints || 0);
}

export async function awardOnce(userId: string, day: string, action: string, delta: number, description: string) {
  const marker = { pk: `USER#${userId}`, sk: `IDEMP#${day}#${action}` };
  const event = { pk: `USER#${userId}`, sk: `POINT#${Date.now()}#${action}`, userId, date: day, action, delta, description, createdAt: new Date().toISOString() };
  try {
    await db.send(new TransactWriteCommand({
      TransactItems: [
        { Put: { TableName: tableName, Item: marker, ConditionExpression: 'attribute_not_exists(pk)' } },
        { Put: { TableName: tableName, Item: event } },
        { Update: { TableName: tableName, Key: { pk: `USER#${userId}`, sk: 'PROFILE' }, UpdateExpression: 'SET lifetimePoints = if_not_exists(lifetimePoints, :zero) + :delta', ExpressionAttributeValues: { ':zero': 0, ':delta': delta } } },
      ],
    }));
    return true;
  } catch (error) {
    if (error instanceof Error && error.name === 'TransactionCanceledException') return false;
    throw error;
  }
}

export async function pointHistory(userId: string) {
  const result = await db.send(new QueryCommand({ TableName: tableName, KeyConditionExpression: 'pk = :pk AND begins_with(sk, :prefix)', ExpressionAttributeValues: { ':pk': `USER#${userId}`, ':prefix': 'POINT#' }, ScanIndexForward: false, Limit: 50 }));
  return result.Items || [];
}

export async function profilePointsUpdate(userId: string, delta: number) {
  return db.send(new UpdateCommand({ TableName: tableName, Key: { pk: `USER#${userId}`, sk: 'PROFILE' }, UpdateExpression: 'SET lifetimePoints = if_not_exists(lifetimePoints, :zero) + :delta', ExpressionAttributeValues: { ':zero': 0, ':delta': delta } }));
}
