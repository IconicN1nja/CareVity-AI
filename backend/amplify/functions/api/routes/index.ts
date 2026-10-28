import { ApiRouter } from './router';
import { registerAiRoutes } from './ai-routes';
import { registerAuthRoutes } from './auth-routes';
import { registerChallengeRoutes } from './challenge-routes';
import { registerPointsRoutes } from './points-routes';
import { registerSquadRoutes } from './squad-routes';
import { registerTaskRoutes } from './task-routes';
import { registerUserRoutes } from './user-routes';

export function createApiRouter() {
  const router = new ApiRouter();
  registerAuthRoutes(router);
  registerUserRoutes(router);
  registerTaskRoutes(router);
  registerChallengeRoutes(router);
  registerPointsRoutes(router);
  registerSquadRoutes(router);
  registerAiRoutes(router);
  return router;
}
