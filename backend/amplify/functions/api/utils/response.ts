import type { ApiResult } from '../types/http';

export const response = (statusCode: number, body: unknown): ApiResult => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': process.env.CORS_ORIGIN || '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  },
  body: JSON.stringify(body),
});

export const ok = (data: unknown, statusCode = 200) => response(statusCode, { success: true, data });
export const fail = (status: number, code: string, message: string) => response(status, { success: false, error: { code, message } });
