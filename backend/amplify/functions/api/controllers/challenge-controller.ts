import { requestContext } from '../routes/context';
import { todayChallenges, setChallenge } from '../services/challenge-service';
import { ok } from '../utils/response';
import type { ApiEvent } from '../types/http';

export async function getTodayChallenges(event: ApiEvent) {
  const { identity, day } = requestContext(event);
  return ok({ challenges: await todayChallenges(identity.id, day) });
}

export async function updateChallenge(event: ApiEvent, params: Record<string, string>) {
  const { identity, day } = requestContext(event);
  return ok({ challenge: await setChallenge(identity.id, day, params.id, params.action === 'complete') });
}
