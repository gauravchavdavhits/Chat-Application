import { Router } from 'express';
import { registerUser, loginUser, logoutUser, refreshTokenHandler } from '../controllers/auth.controller';
import { authLimiter } from '../middlewares/rateLimiter.middleware';
import { validateRegister, validateLogin } from '../middlewares/validator.middleware';

const router = Router();

router.post('/register', authLimiter, validateRegister, registerUser);
router.post('/login', authLimiter, validateLogin, loginUser);
router.post('/refresh', refreshTokenHandler);
router.post('/logout', logoutUser);

export default router;

