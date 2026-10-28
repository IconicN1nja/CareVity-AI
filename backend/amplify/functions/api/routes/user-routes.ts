import { ApiRouter } from './router';
import { currentUser, saveOnboarding } from '../controllers/user-controller';

export function registerUserRoutes(router: ApiRouter) {
  router.get('/api/v1/users/me', currentUser);
  router.post('/api/v1/users/me/onboarding', saveOnboarding);
}
