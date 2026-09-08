import { Router } from 'express';
import { updateSettings, clearChatHistory } from '../controllers/settings.controller';
import { requireAuth } from '../middlewares/auth.middleware';
import { apiLimiter } from '../middlewares/rateLimiter.middleware';

const router = Router();

router.use(apiLimiter);

router.put('/update/:userId', requireAuth, updateSettings);
router.post('/clear-chat/:userId', requireAuth, clearChatHistory);

export default router;

