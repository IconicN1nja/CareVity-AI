import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { runtime } from './runtime';

export const db = DynamoDBDocumentClient.from(new DynamoDBClient({}));
export const tableName = runtime.CAREVITY_TABLE_NAME;
