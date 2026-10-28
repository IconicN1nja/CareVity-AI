import { ApiRouter } from './router';
import { authSession } from '../controllers/auth-controller';

export function registerAuthRoutes(router: ApiRouter) {
  router.get('/api/v1/auth/session', authSession);
  router.get('/api/v1/auth/me', authSession);
}
