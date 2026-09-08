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

router.get('/stats', requireAuth, getMonitoringStats);
router.post('/snapshot', requireAuth, saveScreenshot);
router.get('/snapshots/:userId', requireAuth, getUserScreenshots);
router.delete('/snapshots/:id', requireAuth, deleteScreenshot);

export default router;
