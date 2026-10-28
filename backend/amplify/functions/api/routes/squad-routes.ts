import { ApiRouter } from './router';
import { create, details, join, leave, leaderboard, local } from '../controllers/squad-controller';

export function registerSquadRoutes(router: ApiRouter) {
  router.get('/api/v1/leaderboard/local', local);
  router.post('/api/v1/squads', create);
  router.post('/generateSquadRoom', create);
  router.post('/api/v1/squads/join', join);
  router.get('/api/v1/squads/:id', details);
  router.post('/api/v1/squads/:id/leave', leave);
  router.get('/api/v1/squads/:id/leaderboard', leaderboard);
}
