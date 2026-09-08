import { Request, Response, NextFunction } from 'express';
import validator from 'validator';

/**
 * Sanitize strings in req.body against XSS and malicious script tags
 */
export const sanitizeRequestBody = (req: Request, res: Response, next: NextFunction): void => {
  if (req.body && typeof req.body === 'object') {
    for (const key of Object.keys(req.body)) {
      if (typeof req.body[key] === 'string') {
        // Escape harmful script tags while preserving typical chat text
        req.body[key] = validator.escape(req.body[key].trim());
      }
    }
  }
  next();
};

/**
 * Validate user registration request body
 */
export const validateRegister = (req: Request, res: Response, next: NextFunction): void => {
  const { username, email, password } = req.body;

  if (!username || typeof username !== 'string' || username.trim().length < 3) {
    res.status(400).json({ success: false, message: 'Username must be at least 3 characters long.' });
    return;
  }

  if (username.trim().length > 30) {
    res.status(400).json({ success: false, message: 'Username cannot exceed 30 characters.' });
    return;
  }

  if (!email || !validator.isEmail(email)) {
    res.status(400).json({ success: false, message: 'Please provide a valid email address.' });
    return;
  }

  if (!password || typeof password !== 'string' || password.length < 6) {
    res.status(400).json({ success: false, message: 'Password must be at least 6 characters long.' });
    return;
  }

  next();
};

/**
 * Validate login request body
 */
export const validateLogin = (req: Request, res: Response, next: NextFunction): void => {
  const { email, password } = req.body;

  if (!email || !validator.isEmail(email)) {
    res.status(400).json({ success: false, message: 'Please provide a valid email address.' });
    return;
  }

  if (!password || typeof password !== 'string') {
    res.status(400).json({ success: false, message: 'Please enter your password.' });
    return;
  }

  next();
};
