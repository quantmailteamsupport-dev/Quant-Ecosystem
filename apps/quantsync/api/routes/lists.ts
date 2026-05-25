// ============================================================================
// QuantSync - Lists Routes
// ============================================================================

import { Router } from '../../../packages/server/src/router';
import { listsController } from '../controllers/lists-controller';

const router = new Router('/api/lists');

router.get('/', listsController.getUserLists);
router.post('/', listsController.createList);
router.get('/following', listsController.getFollowingLists);
router.get('/discover', listsController.discoverLists);
router.get('/:id', listsController.getList);
router.put('/:id', listsController.updateList);
router.delete('/:id', listsController.deleteList);
router.get('/:id/posts', listsController.getListTimeline);
router.get('/:id/members', listsController.getMembers);
router.post('/:id/members', listsController.addMember);
router.delete('/:id/members/:memberId', listsController.removeMember);
router.post('/:id/follow', listsController.followList);
router.post('/:id/pin', listsController.pinList);

export { router as listsRoutes };
export default router;
