import { Router } from 'express';
import { registerUser, loginUser, logoutUser, refreshTokenHandler } from '../controllers/auth.controller';
import { authLimiter } from '../middlewares/rateLimiter.middleware';
import { validateRegister, validateLogin } from '../middlewares/validator.middleware';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: User authentication and session management
 */

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     description: Creates a new user account. Returns only essential user info. Tokens are NOT returned here; the user must log in to obtain tokens.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - email
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *                 example: testuser123
 *               email:
 *                 type: string
 *                 format: email
 *                 example: testuser123@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: Test@1234
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *               success:
 *                 type: boolean
 *                 example: true
 *               message:
 *                 type: string
 *                 example: Registration successful. Please sign in.
 *               data:
 *                 type: object
 *                 properties:
 *                   _id:
 *                     type: string
 *                     example: 66e0123456789abcdef01234
 *                   username:
 *                     type: string
 *                     example: testuser123
 *                   email:
 *                     type: string
 *                     example: testuser123@example.com
 *                   isEmailVerified:
 *                     type: boolean
 *                     example: false
 *                   createdAt:
 *                     type: string
 *                     format: date-time
 *                     example: 2026-09-10T12:00:00.000Z
 *       400:
 *         description: Validation error or user already exists
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Username is already taken
 */
router.post('/register', authLimiter, validateRegister, registerUser);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login user and obtain session tokens
 *     description: Authenticates user credentials and returns session tokens (accessToken, refreshToken) and user profile.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: testuser123@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: Test@1234
 *     responses:
 *       200:
 *         description: Login successful, returns user profile and auth tokens
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Login successful
 *                 data:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                       example: 66e0123456789abcdef01234
 *                     username:
 *                       type: string
 *                       example: testuser123
 *                     email:
 *                       type: string
 *                       example: testuser123@example.com
 *                     isOnline:
 *                       type: boolean
 *                       example: true
 *                     avatar:
 *                       type: string
 *                       example: https://api.dicebear.com/7.x/avataaars/svg?seed=testuser123
 *                 token:
 *                   type: string
 *                   example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *                 accessToken:
 *                   type: string
 *                   example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *                 refreshToken:
 *                   type: string
 *                   example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *       400:
 *         description: Missing email or password
 *       401:
 *         description: Invalid email or password
 */
router.post('/login', authLimiter, validateLogin, loginUser);

/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     summary: Refresh access token using refresh token
 *     tags: [Auth]
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 description: Optional refresh token string if not sent via cookie
 *     responses:
 *       200:
 *         description: Successfully generated new access token
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Token refreshed successfully
 *                 token:
 *                   type: string
 *                 accessToken:
 *                   type: string
 *                 refreshToken:
 *                   type: string
 *       401:
 *         description: Refresh token missing or expired
 */
router.post('/refresh', refreshTokenHandler);

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Logout user and invalidate session cookies
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: User logged out successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Logged out successfully
 */
router.post('/logout', logoutUser);

export default router;
