import { getIdentity } from '../middleware/auth';
import { parseBody } from '../middleware/body';
import { dayKey } from '../utils/date';
import type { ApiEvent } from '../types/http';

export function requestContext(event: ApiEvent) {
  return { identity: getIdentity(event), input: parseBody(event), day: dayKey() };
}
