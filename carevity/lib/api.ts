import { fetchAuthSession } from 'aws-amplify/auth';

const configuredUrl =
  process.env.EXPO_PUBLIC_API_URL ||
  process.env.EXPO_PUBLIC_AWS_API_URL ||
  process.env.AWS_API_URL ||
  'http://localhost:4000';

export const API_BASE_URL = configuredUrl.replace(/\/(askAI|api\/v1)\/?$/, '');

export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  error?: { code?: string; message?: string };
}

async function getAccessToken(): Promise<string | undefined> {
  const session = await fetchAuthSession();
  return session.tokens?.accessToken?.toString();
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  if (!API_BASE_URL) {
    throw new Error('Backend URL is not configured');
  }

  const token = await getAccessToken();
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });
  const payload = (await response.json()) as ApiEnvelope<T>;
  if (!response.ok || payload.success === false) {
    throw new Error(payload.error?.message || `Backend request failed (${response.status})`);
  }
  return payload.data;
}

export function apiGet<T>(path: string): Promise<T> {
  return apiRequest<T>(path);
}

export function apiPost<T>(path: string, body?: unknown): Promise<T> {
  return apiRequest<T>(path, {
    method: 'POST',
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}
