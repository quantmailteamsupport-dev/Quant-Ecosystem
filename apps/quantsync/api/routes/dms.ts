// ============================================================================
// QuantSync - DMs Routes
// ============================================================================

import { Router } from '../../../packages/server/src/router';
import { dmsController } from '../controllers/dms-controller';

const router = new Router('/api/messages');

router.get('/conversations', dmsController.getConversations);
router.get('/conversations/:id', dmsController.getConversation);
router.post('/conversations', dmsController.createConversation);
router.post('/send', dmsController.sendMessage);
router.get('/conversations/:id/messages', dmsController.getMessages);
router.post('/conversations/:id/read', dmsController.markAsRead);
router.get('/requests', dmsController.getRequests);
router.post('/requests/:id/accept', dmsController.acceptRequest);
router.post('/requests/:id/decline', dmsController.declineRequest);
router.post('/groups', dmsController.createGroup);
router.post('/conversations/:id/pin', dmsController.pinConversation);
router.post('/conversations/:id/mute', dmsController.muteConversation);
router.delete('/messages/:id', dmsController.deleteMessage);

export { router as dmsRoutes };
export default router;
