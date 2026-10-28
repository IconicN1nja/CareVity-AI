import { ApiRouter } from './router';
import { monthlyTwin, pointsHistory, pointsSummary } from '../controllers/points-controller';

export function registerPointsRoutes(router: ApiRouter) {
  router.get('/api/v1/points/summary', pointsSummary);
  router.get('/api/v1/points/history', pointsHistory);
  router.get('/api/v1/digital-twin/monthly', monthlyTwin);
}
