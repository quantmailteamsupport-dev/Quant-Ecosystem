// ============================================================================
// QuantSync - Analytics Routes
// ============================================================================

import { Router } from '../../../packages/server/src/router';
import { analyticsController } from '../controllers/analytics-controller';

const router = new Router('/api/analytics');

router.get('/overview', analyticsController.getOverview);
router.get('/metrics', analyticsController.getMetrics);
router.get('/top-posts', analyticsController.getTopPosts);
router.get('/demographics', analyticsController.getDemographics);
router.get('/heatmap', analyticsController.getHeatmap);
router.get('/posts/:id', analyticsController.getPostAnalytics);
router.post('/track/impression', analyticsController.trackImpression);
router.post('/track/engagement', analyticsController.trackEngagement);

export { router as analyticsRoutes };
export default router;
