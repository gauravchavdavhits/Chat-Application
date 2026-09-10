import { Router } from 'express';
import {
  saveScreenshot,
  getUserScreenshots,
  deleteScreenshot,
  getMonitoringStats,
} from '../controllers/monitoring.controller';
import { requireAuth } from '../middlewares/auth.middleware';
import { apiLimiter } from '../middlewares/rateLimiter.middleware';

const router = Router();

router.use(apiLimiter);

/**
 * @swagger
 * tags:
 *   name: Monitoring
 *   description: Monitoring, stats, and screen snapshots
 */

/**
 * @swagger
 * /api/monitoring/stats:
 *   get:
 *     summary: Retrieve server and user monitoring statistics
 *     tags: [Monitoring]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Monitoring statistics
 */
router.get('/stats', requireAuth, getMonitoringStats);

/**
 * @swagger
 * /api/monitoring/snapshot:
 *   post:
 *     summary: Save a screen snapshot
 *     tags: [Monitoring]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - image
 *             properties:
 *               image:
 *                 type: string
 *                 description: Base64 data URL or image string
 *     responses:
 *       201:
 *         description: Snapshot saved successfully
 */
router.post('/snapshot', requireAuth, saveScreenshot);

/**
 * @swagger
 * /api/monitoring/snapshots/{userId}:
 *   get:
 *     summary: Get screen snapshots for a user
 *     tags: [Monitoring]
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
 *         description: List of user snapshots
 */
router.get('/snapshots/:userId', requireAuth, getUserScreenshots);

/**
 * @swagger
 * /api/monitoring/snapshots/{id}:
 *   delete:
 *     summary: Delete a screen snapshot by ID
 *     tags: [Monitoring]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Snapshot deleted successfully
 */
router.delete('/snapshots/:id', requireAuth, deleteScreenshot);

export default router;
