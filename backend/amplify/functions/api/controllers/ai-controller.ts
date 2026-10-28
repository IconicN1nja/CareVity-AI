import { coachInput } from '../schemas/input';
import { requestContext } from '../routes/context';
import { coach } from '../services/ai-service';
import { ok } from '../utils/response';
import type { ApiEvent } from '../types/http';

export async function coaching(event: ApiEvent) {
  const { identity, input } = requestContext(event);
  const values = coachInput.parse(input);
  return ok(await coach(identity.name, values.userMessage || values.userInput || ''));
}
