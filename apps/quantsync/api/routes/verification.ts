// ============================================================================
// QuantSync - Verification Routes
// ============================================================================

import { Router } from '../../../packages/server/src/router';
import { verificationController } from '../controllers/verification-controller';

const router = new Router('/api/verification');

router.get('/status', verificationController.getStatus);
router.get('/eligibility', verificationController.getEligibility);
router.get('/requirements', verificationController.getRequirements);
router.post('/apply', verificationController.apply);
router.get('/applications', verificationController.getPendingApplications);
router.post('/applications/:id/review', verificationController.reviewApplication);
router.post('/revoke/:userId', verificationController.revokeBadge);

export { router as verificationRoutes };
export default router;
