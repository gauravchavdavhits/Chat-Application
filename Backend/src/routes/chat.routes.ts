import { Router } from 'express';
import { getConversationMessages, uploadFile } from '../controllers/chat.controller';
import { upload } from '../config/upload';
import { requireAuth } from '../middlewares/auth.middleware';
import { uploadLimiter, apiLimiter } from '../middlewares/rateLimiter.middleware';

const router = Router();

router.use(apiLimiter);

/**
 * @swagger
 * tags:
 *   name: Chat
 *   description: Chat messages and file uploads
 */

/**
 * @swagger
 * /api/chat/messages/{conversationId}:
 *   get:
 *     summary: Get message history for a conversation or between two users
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: string
 *         description: Either a Group ID or a User ID to fetch one-on-one messages with
 *     responses:
 *       200:
 *         description: List of messages
 *       401:
 *         description: Unauthorized
 */
router.get('/messages/:conversationId', requireAuth, getConversationMessages);

/**
 * @swagger
 * /api/chat/upload:
 *   post:
 *     summary: Upload an image, audio, or document attachment
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: File uploaded successfully, returns file URL and metadata
 *       400:
 *         description: No file uploaded or invalid format
 */
router.post('/upload', requireAuth, uploadLimiter, upload.single('file'), uploadFile);

export default router;
