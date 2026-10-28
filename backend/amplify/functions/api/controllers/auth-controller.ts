import { requestContext } from '../routes/context';
import { session } from '../services/user-service';
import { ok } from '../utils/response';
import type { ApiEvent } from '../types/http';

export async function authSession(event: ApiEvent) {
  return ok(await session(requestContext(event).identity));
}
