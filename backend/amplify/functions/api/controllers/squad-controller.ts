import { joinSquadInput, squadInput } from '../schemas/input';
import { requestContext } from '../routes/context';
import { createSquad, joinSquad, leaveSquad, localLeaderboard, squadDetails, squadLeaderboard } from '../services/squad-service';
import { fail, ok } from '../utils/response';
import type { ApiEvent } from '../types/http';

export async function create(event: ApiEvent) {
  const { identity, input } = requestContext(event);
  const values = squadInput.parse(input);
  return ok(await createSquad(identity.id, values.squadName || values.name || 'CareVity Squad', identity.name), 201);
}

export async function join(event: ApiEvent) {
  const { identity, input } = requestContext(event);
  return ok(await joinSquad(identity.id, identity.name, joinSquadInput.parse(input).roomCode));
}

export async function details(_event: ApiEvent, params: Record<string, string>) {
  const squad = await squadDetails(params.id);
  return squad ? ok({ squad }) : fail(404, 'NOT_FOUND', 'Squad not found');
}

export async function leave(event: ApiEvent, params: Record<string, string>) {
  return ok(await leaveSquad(requestContext(event).identity.id, params.id));
}

export async function leaderboard(event: ApiEvent, params: Record<string, string>) {
  const context = requestContext(event);
  return ok(await squadLeaderboard(context.identity.id, params.id));
}

export async function local(event: ApiEvent) {
  return ok(await localLeaderboard(requestContext(event).identity.id));
}
