import { onboardingInput } from '../schemas/input';
import { onboard, session } from '../services/user-service';
import { requestContext } from '../routes/context';
import { ok } from '../utils/response';
import type { ApiEvent } from '../types/http';

export async function currentUser(event: ApiEvent) {
  return ok({ user: (await session(requestContext(event).identity)).user });
}

export async function saveOnboarding(event: ApiEvent) {
  const context = requestContext(event);
  return ok(await onboard(context.identity, onboardingInput.parse(context.input)));
}
