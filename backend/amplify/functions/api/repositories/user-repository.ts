import { GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { db, tableName } from '../config/dynamo';
import type { Identity, Item } from '../types/http';

export async function getOrCreateUser(identity: Identity): Promise<Item> {
  const key = { pk: `USER#${identity.id}`, sk: 'PROFILE' };
  const existing = await db.send(new GetCommand({ TableName: tableName, Key: key }));
  if (existing.Item) return existing.Item as Item;
  const item: Item = { ...key, userId: identity.id, email: identity.email, name: identity.name, lifetimePoints: 0, onboarded: false };
  try {
    await db.send(new PutCommand({ TableName: tableName, Item: item, ConditionExpression: 'attribute_not_exists(pk)' }));
  } catch (error) {
    if (!(error instanceof Error) || error.name !== 'ConditionalCheckFailedException') throw error;
    const concurrent = await db.send(new GetCommand({ TableName: tableName, Key: key }));
    if (concurrent.Item) return concurrent.Item as Item;
    throw error;
  }
  return item;
}

export async function saveUserProfile(identity: Identity, profile: Record<string, unknown>) {
  const item = { pk: `USER#${identity.id}`, sk: 'PROFILE', userId: identity.id, email: identity.email, ...profile };
  await db.send(new PutCommand({ TableName: tableName, Item: item }));
  return item;
}
