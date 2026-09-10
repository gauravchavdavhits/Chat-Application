import { Router } from 'express';
import { getUserCallHistory, getConversationCallHistory } from '../controllers/call.controller';
import { requireAuth } from '../middlewares/auth.middleware';
import { apiLimiter } from '../middlewares/rateLimiter.middleware';

const router = Router();

router.use(apiLimiter);

/**
 * @swagger
 * tags:
 *   name: Calls
 *   description: Audio and video call records and history
 */

/**
 * @swagger
 * /api/calls/history/{userId}:
 *   get:
 *     summary: Retrieve call history for a user
 *     tags: [Calls]
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
 *         description: List of call history logs
 */
router.get('/history/:userId', requireAuth, getUserCallHistory);

/**
 * @swagger
 * /api/calls/conversation/{user1Id}/{user2Id}:
 *   get:
 *     summary: Retrieve call history between two specific users
 *     tags: [Calls]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: user1Id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: user2Id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of call logs between the two users
 */
router.get('/conversation/:user1Id/:user2Id', requireAuth, getConversationCallHistory);

export default router;
