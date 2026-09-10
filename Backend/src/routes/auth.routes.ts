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
 *       400:
 *         description: Validation error or user already exists
 */
router.post('/register', authLimiter, validateRegister, registerUser);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login user and obtain JWT tokens
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
 *         description: Login successful, returns user object and tokens
 *       401:
 *         description: Invalid email or password
 */
router.post('/login', authLimiter, validateLogin, loginUser);

/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     summary: Refresh access token using refresh token or cookie
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
 *                 description: Optional refresh token string (if not using cookie)
 *     responses:
 *       200:
 *         description: Successfully generated new access token
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
 */
router.post('/logout', logoutUser);

export default router;
