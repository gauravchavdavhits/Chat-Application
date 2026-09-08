import { Router } from 'express';
import { getUserCallHistory, getConversationCallHistory } from '../controllers/call.controller';
import { requireAuth } from '../middlewares/auth.middleware';
import { apiLimiter } from '../middlewares/rateLimiter.middleware';

const router = Router();

router.use(apiLimiter);

router.get('/history/:userId', requireAuth, getUserCallHistory);
router.get('/conversation/:user1Id/:user2Id', requireAuth, getConversationCallHistory);

export default router;


