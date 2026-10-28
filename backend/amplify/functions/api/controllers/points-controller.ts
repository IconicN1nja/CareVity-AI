import { currentPoints, pointHistory } from '../repositories/points-repository';
import { requestContext } from '../routes/context';
import { ok } from '../utils/response';
import type { ApiEvent } from '../types/http';

export async function pointsSummary(event: ApiEvent) {
  return ok({ lifetimePoints: await currentPoints(requestContext(event).identity.id) });
}

export async function pointsHistory(event: ApiEvent) {
  return ok({ events: await pointHistory(requestContext(event).identity.id) });
}

export async function monthlyTwin(event: ApiEvent) {
  const history = await pointHistory(requestContext(event).identity.id);
  const completedTasks = history.filter((event) => Number(event.delta) > 0).length;
  return ok({
    completedTasks,
    failedTasks: history.filter((event) => Number(event.delta) < 0).length,
    progressPercentage: Math.min(100, Math.round(completedTasks / 180 * 100)),
    latestHealthBenefit: history[0]?.description || null,
  });
}
