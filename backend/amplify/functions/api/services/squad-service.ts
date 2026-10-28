import crypto from 'node:crypto';
import { GetCommand, PutCommand, ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { db, tableName } from '../config/dynamo';
import { currentPoints } from '../repositories/points-repository';

export async function createSquad(userId: string, name: string, userName: string) {
  const squadId = crypto.randomUUID();
  const roomCode = crypto.randomBytes(3).toString('hex').toUpperCase();
  const squad = { pk: `SQUAD#${squadId}`, sk: 'META', squadId, roomCode, name, ownerId: userId, members: [{ userId, name: userName, lifetimePoints: await currentPoints(userId) }] };
  await db.send(new PutCommand({ TableName: tableName, Item: squad }));
  await db.send(new PutCommand({ TableName: tableName, Item: { pk: `ROOM#${roomCode}`, sk: 'SQUAD', squadId }, ConditionExpression: 'attribute_not_exists(pk)' }));
  return { squad, roomCode };
}

export async function joinSquad(userId: string, userName: string, roomCode: string) {
  const room = await db.send(new GetCommand({ TableName: tableName, Key: { pk: `ROOM#${roomCode}`, sk: 'SQUAD' } }));
  if (!room.Item) throw new Error('NOT_FOUND');
  const key = { pk: `SQUAD#${String(room.Item.squadId)}`, sk: 'META' };
  const squad = await db.send(new GetCommand({ TableName: tableName, Key: key }));
  if (!squad.Item) throw new Error('NOT_FOUND');
  const members = Array.isArray(squad.Item.members) ? squad.Item.members : [];
  if (!members.some((member) => typeof member === 'object' && member !== null && (member as { userId?: string }).userId === userId)) {
    members.push({ userId, name: userName, lifetimePoints: await currentPoints(userId) });
    await db.send(new UpdateCommand({ TableName: tableName, Key: key, UpdateExpression: 'SET members = :members', ExpressionAttributeValues: { ':members': members } }));
  }
  return { member: { squadId: room.Item.squadId }, squad: { ...squad.Item, members } };
}

export async function squadDetails(squadId: string) {
  const result = await db.send(new GetCommand({ TableName: tableName, Key: { pk: `SQUAD#${squadId}`, sk: 'META' } }));
  return result.Item;
}

export async function leaveSquad(userId: string, squadId: string) {
  const squad = await squadDetails(squadId);
  if (!squad) throw new Error('NOT_FOUND');
  const members = Array.isArray(squad.members) ? squad.members.filter((member) => typeof member !== 'object' || member === null || (member as { userId?: string }).userId !== userId) : [];
  await db.send(new UpdateCommand({ TableName: tableName, Key: { pk: `SQUAD#${squadId}`, sk: 'META' }, UpdateExpression: 'SET members = :members', ExpressionAttributeValues: { ':members': members } }));
  return { left: true };
}

export async function squadLeaderboard(userId: string, squadId: string) {
  const squad = await squadDetails(squadId);
  if (!squad) throw new Error('NOT_FOUND');
  const members = Array.isArray(squad.members) ? squad.members : [];
  if (!members.some((member) => typeof member === 'object' && member !== null && (member as { userId?: string }).userId === userId)) throw new Error('FORBIDDEN');
  const rankings = members.map((member) => member as { userId: string; name: string; lifetimePoints?: number }).sort((a, b) => Number(b.lifetimePoints || 0) - Number(a.lifetimePoints || 0)).map((member, index) => ({ rank: index + 1, name: member.name, points: Number(member.lifetimePoints || 0), isCurrentUser: member.userId === userId }));
  return { squad, rankings };
}

export async function localLeaderboard(userId: string) {
  const result = await db.send(new ScanCommand({ TableName: tableName, FilterExpression: 'sk = :profile', ExpressionAttributeValues: { ':profile': 'PROFILE' } }));
  const rankings = (result.Items || []).sort((a, b) => Number(b.lifetimePoints || 0) - Number(a.lifetimePoints || 0)).map((item, index) => ({ rank: index + 1, name: String(item.name || item.email || 'User'), lifetimePoints: Number(item.lifetimePoints || 0), isCurrentUser: item.userId === userId }));
  return { rankings, district: 'Local District', userRank: rankings.find((item) => item.isCurrentUser)?.rank || null, totalParticipants: rankings.length };
}
