import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { ZodError } from 'zod';
import { createApiRouter } from './routes';
import { fail } from './utils/response';

const router = createApiRouter();

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: { 'Access-Control-Allow-Origin': process.env.CORS_ORIGIN || '*', 'Access-Control-Allow-Headers': 'Content-Type,Authorization', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS' }, body: '' };
    const path = (event.path || '/').replace(/\/$/, '') || '/';
    const matched = router.match(event.httpMethod, path);
    if (!matched) return fail(404, 'NOT_FOUND', 'Route not found');
    return await matched.handler(event, matched.params);
  } catch (cause) {
    if (cause instanceof Error && cause.message === 'BAD_JSON') return fail(400, 'BAD_REQUEST', 'Request body must be valid JSON');
    if (cause instanceof Error && cause.message === 'UNAUTHORIZED') return fail(401, 'UNAUTHORIZED', 'A valid Cognito access token is required');
    if (cause instanceof Error && cause.message === 'FORBIDDEN') return fail(403, 'FORBIDDEN', 'You are not allowed to access this resource');
    if (cause instanceof Error && cause.message === 'AI_NOT_CONFIGURED') return fail(503, 'AI_NOT_CONFIGURED', 'AI coach is not configured');
    if (cause instanceof Error && cause.message === 'AI_PROVIDER_ERROR') return fail(502, 'AI_PROVIDER_ERROR', 'AI provider is unavailable');
    if (cause instanceof ZodError) return fail(400, 'VALIDATION_ERROR', cause.issues[0]?.message || 'Request validation failed');
    console.error('[CareVity API]', cause);
    return fail(500, 'INTERNAL_ERROR', 'An unexpected error occurred');
  }
}
