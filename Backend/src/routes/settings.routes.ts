import { Router } from 'express';
import { updateSettings, clearChatHistory } from '../controllers/settings.controller';
import { requireAuth } from '../middlewares/auth.middleware';
import { apiLimiter } from '../middlewares/rateLimiter.middleware';

const router = Router();

router.use(apiLimiter);

/**
 * @swagger
 * tags:
 *   name: Settings
 *   description: User preferences and chat management
 */

/**
 * @swagger
 * /api/settings/update/{userId}:
 *   put:
 *     summary: Update notification and appearance settings
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               theme:
 *                 type: string
 *                 enum: [light, dark, system]
 *               notificationsEnabled:
 *                 type: boolean
 *               soundEnabled:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Settings updated successfully
 */
router.put('/update/:userId', requireAuth, updateSettings);

/**
 * @swagger
 * /api/settings/clear-chat/{userId}:
 *   post:
 *     summary: Clear chat message history for a user
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Chat history cleared
 */
router.post('/clear-chat/:userId', requireAuth, clearChatHistory);

export default router;
