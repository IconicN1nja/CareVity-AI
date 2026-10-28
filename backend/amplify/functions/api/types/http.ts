import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

export type ApiEvent = APIGatewayProxyEvent;
export type ApiResult = APIGatewayProxyResult;
export type Item = Record<string, unknown> & { pk: string; sk: string };
export type Identity = { id: string; email: string; name: string };
