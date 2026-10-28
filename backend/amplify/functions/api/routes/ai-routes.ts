import { ApiRouter } from './router';
import { coaching } from '../controllers/ai-controller';

export function registerAiRoutes(router: ApiRouter) {
  router.post('/api/v1/ai/coach', coaching);
  router.post('/askAI', coaching);
}
