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

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: User profiles, searching, and verification
 */

/**
 * @swagger
 * /api/users/all:
 *   get:
 *     summary: Get all active registered users
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all users
 *       401:
 *         description: Unauthorized
 */
router.get('/all', requireAuth, getAllUsers);

/**
 * @swagger
 * /api/users/search:
 *   get:
 *     summary: Search users by query string (username)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: username
 *         schema:
 *           type: string
 *         required: true
 *         example: test
 *         description: Search query for username
 *     responses:
 *       200:
 *         description: List of matching users
 *       400:
 *         description: Search query is required
 *       401:
 *         description: Unauthorized
 */
router.get('/search', requireAuth, searchUsers);

/**
 * @swagger
 * /api/users/avatar:
 *   post:
 *     summary: Update user profile avatar URL
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - avatarUrl
 *             properties:
 *               userId:
 *                 type: string
 *                 description: Optional user ID if authenticated with Bearer token
 *               avatarUrl:
 *                 type: string
 *                 example: https://api.dicebear.com/7.x/avataaars/svg?seed=Felix
 *     responses:
 *       200:
 *         description: Avatar updated successfully
 */
router.post('/avatar', requireAuth, updateAvatar);

/**
 * @swagger
 * /api/users/profile:
 *   put:
 *     summary: Update user profile details
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - email
 *             properties:
 *               userId:
 *                 type: string
 *                 description: Optional user ID if authenticated with Bearer token
 *               username:
 *                 type: string
 *                 example: new_username
 *               email:
 *                 type: string
 *                 example: new_email@example.com
 *     responses:
 *       200:
 *         description: Profile updated successfully
 */
router.put('/profile', requireAuth, updateProfile);

/**
 * @swagger
 * /api/users/send-otp:
 *   post:
 *     summary: Send OTP code to user email
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               userId:
 *                 type: string
 *                 description: Optional if authenticated with Bearer token
 *               email:
 *                 type: string
 *                 format: email
 *                 example: testuser123@example.com
 *     responses:
 *       200:
 *         description: OTP sent successfully
 */
router.post('/send-otp', requireAuth, sendEmailOtp);

/**
 * @swagger
 * /api/users/verify-otp:
 *   post:
 *     summary: Verify email OTP code
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - otp
 *             properties:
 *               userId:
 *                 type: string
 *                 description: Optional if authenticated with Bearer token
 *               otp:
 *                 type: string
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: OTP verified successfully
 */
router.post('/verify-otp', requireAuth, verifyEmailOtp);

/**
 * @swagger
 * /api/users/recent/{userId}:
 *   get:
 *     summary: Get recent chat contacts for a user
 *     tags: [Users]
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
 *         description: List of recent chat contacts
 */
router.get('/recent/:userId', requireAuth, getRecentChatUsers);

/**
 * @swagger
 * /api/users/{userId}:
 *   get:
 *     summary: Get user details by user ID
 *     tags: [Users]
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
 *         description: User information
 *       404:
 *         description: User not found
 */
router.get('/:userId', requireAuth, getUserById);

export default router;
