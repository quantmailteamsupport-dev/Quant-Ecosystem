// ============================================================================
// QuantSync - Webhooks Routes
// ============================================================================

import { Router } from '../../../packages/server/src/router';
import { webhooksController } from '../controllers/webhooks-controller';

const router = new Router('/api/webhooks');

router.get('/', webhooksController.list);
router.post('/', webhooksController.register);
router.put('/:id', webhooksController.update);
router.delete('/:id', webhooksController.remove);
router.get('/:id/deliveries', webhooksController.getDeliveries);
router.post('/:id/deliveries/:deliveryId/retry', webhooksController.retryDelivery);
router.post('/:id/rotate-secret', webhooksController.rotateSecret);
router.get('/rate-limit', webhooksController.getRateLimit);

export { router as webhooksRoutes };
export default router;
