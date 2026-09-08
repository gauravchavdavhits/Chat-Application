import { Router } from 'express';
import { 
  searchUsers, 
  getAllUsers, 
  updateAvatar, 
  updateProfile, 
  getRecentChatUsers, 
  getUserById,
  sendEmailOtp,
  verifyEmailOtp
} from '../controllers/user.controller';
import { requireAuth } from '../middlewares/auth.middleware';
import { apiLimiter } from '../middlewares/rateLimiter.middleware';

const router = Router();

// Apply rate limiter to all user endpoints
router.use(apiLimiter);

router.get('/search', requireAuth, searchUsers);
router.get('/all', requireAuth, getAllUsers);
router.post('/avatar', requireAuth, updateAvatar);
router.put('/profile', requireAuth, updateProfile);
router.post('/send-otp', requireAuth, sendEmailOtp);
router.post('/verify-otp', requireAuth, verifyEmailOtp);
router.get('/recent/:userId', requireAuth, getRecentChatUsers);
router.get('/:userId', requireAuth, getUserById);

export default router;

