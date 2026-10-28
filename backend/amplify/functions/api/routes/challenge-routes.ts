import { ApiRouter } from './router';
import { getTodayChallenges, updateChallenge } from '../controllers/challenge-controller';

export function registerChallengeRoutes(router: ApiRouter) {
  router.get('/api/v1/challenges/today', getTodayChallenges);
  router.post('/api/v1/challenges/:id/:action', updateChallenge);
}
