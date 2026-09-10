import { Router } from 'express';
import { createGroup, getUserGroups, updateGroup, leaveGroup } from '../controllers/group.controller';
import { requireAuth } from '../middlewares/auth.middleware';
import { apiLimiter } from '../middlewares/rateLimiter.middleware';

const router = Router();

router.use(apiLimiter);

/**
 * @swagger
 * tags:
 *   name: Groups
 *   description: Group chat creation and member management
 */

/**
 * @swagger
 * /api/groups:
 *   post:
 *     summary: Create a new group chat
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 example: Tech Team Discussion
 *               description:
 *                 type: string
 *               members:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: List of user IDs to include in the group
 *     responses:
 *       201:
 *         description: Group created successfully
 */
router.post('/', requireAuth, createGroup);

/**
 * @swagger
 * /api/groups/my-groups/{userId}:
 *   get:
 *     summary: Get all groups a user belongs to
 *     tags: [Groups]
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
 *         description: List of groups
 */
router.get('/my-groups/:userId', requireAuth, getUserGroups);

/**
 * @swagger
 * /api/groups/{groupId}:
 *   put:
 *     summary: Update group information or participants
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: groupId
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
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               members:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Group updated successfully
 */
router.put('/:groupId', requireAuth, updateGroup);

/**
 * @swagger
 * /api/groups/{groupId}/leave:
 *   post:
 *     summary: Leave a group chat
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Left group successfully
 */
router.post('/:groupId/leave', requireAuth, leaveGroup);

export default router;
