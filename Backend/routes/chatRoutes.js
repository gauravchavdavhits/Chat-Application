import express from 'express';
import { getMessages, sendMessage, clearChatHistory } from '../controllers/chatController.js';

const router = express.Router();

router.get('/messages/:conversationId', getMessages);
router.post('/messages', sendMessage);
router.post('/clear-chat/:userId', clearChatHistory);

export default router;
