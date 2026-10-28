import { ApiRouter } from './router';
import { getTodayTasks, saveHydration, saveSleep, saveSteps } from '../controllers/task-controller';

export function registerTaskRoutes(router: import('./router').ApiRouter) {
  router.get('/api/v1/tasks/today', getTodayTasks);
  router.post('/api/v1/tasks/step-quest/progress', saveSteps);
  router.post('/api/v1/tasks/hydration', saveHydration);
  router.post('/api/v1/tasks/sleep-curfew/result', saveSleep);
}
