import type { ApiEvent } from '../types/http';

export function parseBody(event: ApiEvent): Record<string, unknown> {
  try {
    if (!event.body) return {};
    const raw = event.isBase64Encoded ? Buffer.from(event.body, 'base64').toString('utf8') : event.body;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('BAD_JSON');
    return parsed as Record<string, unknown>;
  } catch {
    throw new Error('BAD_JSON');
  }
}
