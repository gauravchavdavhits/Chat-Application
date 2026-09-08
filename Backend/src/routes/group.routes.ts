import { Router } from 'express';
import { createGroup, getUserGroups, updateGroup, leaveGroup } from '../controllers/group.controller';
import { requireAuth } from '../middlewares/auth.middleware';
import { apiLimiter } from '../middlewares/rateLimiter.middleware';

const router = Router();

router.use(apiLimiter);

router.post('/', requireAuth, createGroup);
router.get('/my-groups/:userId', requireAuth, getUserGroups);
router.put('/:groupId', requireAuth, updateGroup);
router.post('/:groupId/leave', requireAuth, leaveGroup);

export default router;

