import { runtime } from '../config/runtime';

export function dayKey(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: runtime.DEFAULT_TIMEZONE }).format(new Date());
}
