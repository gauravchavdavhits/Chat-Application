import { Router } from 'express';
import { getConversationMessages, uploadFile } from '../controllers/chat.controller';
import { upload } from '../config/upload';
import { requireAuth } from '../middlewares/auth.middleware';
import { uploadLimiter, apiLimiter } from '../middlewares/rateLimiter.middleware';

const router = Router();

router.use(apiLimiter);

router.get('/messages/:conversationId', requireAuth, getConversationMessages);
router.post('/upload', requireAuth, uploadLimiter, upload.single('file'), uploadFile);

export default router;

