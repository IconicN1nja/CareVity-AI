import { hydrationInput, sleepInput, stepsInput } from '../schemas/input';
import { requestContext } from '../routes/context';
import { todayTasks, updateHydration, updateSleep, updateSteps } from '../services/task-service';
import { ok } from '../utils/response';
import type { ApiEvent } from '../types/http';

export async function getTodayTasks(event: ApiEvent) {
  const { identity, day } = requestContext(event);
  return ok({ tasks: await todayTasks(identity.id, day) });
}

export async function saveSteps(event: ApiEvent) {
  const { identity, day, input } = requestContext(event);
  return ok({ task: await updateSteps(identity.id, day, stepsInput.parse(input).steps) });
}

export async function saveHydration(event: ApiEvent) {
  const { identity, day, input } = requestContext(event);
  return ok(await updateHydration(identity.id, day, hydrationInput.parse(input).amountMl));
}

export async function saveSleep(event: ApiEvent) {
  const { identity, day, input } = requestContext(event);
  return ok({ task: await updateSleep(identity.id, day, sleepInput.parse(input)) });
}
