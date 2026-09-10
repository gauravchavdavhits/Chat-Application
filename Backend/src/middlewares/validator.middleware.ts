import { Request, Response, NextFunction } from 'express';
import validator from 'validator';
import { HttpStatus } from '../constants/httpStatus';
import { sendError } from '../utils/response';

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

// Validation Regex Constants
export const USERNAME_REGEX = /^[a-zA-Z0-9_.]+$/;
// Minimum 8 chars, at least 1 uppercase or lowercase letter, 1 number, and 1 special character
export const PASSWORD_REGEX = /^(?=.*[a-zA-Z])(?=.*\d)(?=.*[@$!%*?&#^()_+={}\[\]:;<>,.?/~\\-]).{8,64}$/;
export const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

/**
 * Validate user registration request body
 */
export const validateRegister = (req: Request, res: Response, next: NextFunction): void => {
  const { username, email, password } = req.body;

  // 1. Username
  if (!username || typeof username !== 'string') {
    sendError(res, 'Username is required.', HttpStatus.BAD_REQUEST);
    return;
  }
  const trimmedUser = username.trim();
  if (trimmedUser.length < 3) {
    sendError(res, 'Username must be at least 3 characters.', HttpStatus.BAD_REQUEST);
    return;
  }
  if (trimmedUser.length > 25) {
    sendError(res, 'Username cannot exceed 25 characters.', HttpStatus.BAD_REQUEST);
    return;
  }
  if (!USERNAME_REGEX.test(trimmedUser)) {
    sendError(res, 'Username can only contain letters, numbers, dots, and underscores.', HttpStatus.BAD_REQUEST);
    return;
  }

  // 2. Email
  if (!email || typeof email !== 'string') {
    sendError(res, 'Email address is required.', HttpStatus.BAD_REQUEST);
    return;
  }
  const trimmedEmail = email.trim();
  if (!EMAIL_REGEX.test(trimmedEmail) || !validator.isEmail(trimmedEmail)) {
    sendError(res, 'Please enter a valid email address (e.g. user@example.com).', HttpStatus.BAD_REQUEST);
    return;
  }

  // 3. Password
  if (!password || typeof password !== 'string') {
    sendError(res, 'Password is required.', HttpStatus.BAD_REQUEST);
    return;
  }
  if (password.length < 8) {
    sendError(res, 'Password must be at least 8 characters long.', HttpStatus.BAD_REQUEST);
    return;
  }
  if (password.length > 64) {
    sendError(res, 'Password cannot exceed 64 characters.', HttpStatus.BAD_REQUEST);
    return;
  }
  if (!PASSWORD_REGEX.test(password)) {
    sendError(
      res,
      'Password must contain at least one letter, one number, and one special character.',
      HttpStatus.BAD_REQUEST
    );
    return;
  }

  next();
};

/**
 * Validate login request body
 */
export const validateLogin = (req: Request, res: Response, next: NextFunction): void => {
  const { email, password } = req.body;

  if (!email || typeof email !== 'string') {
    sendError(res, 'Email address is required.', HttpStatus.BAD_REQUEST);
    return;
  }

  const trimmedEmail = email.trim();
  if (!EMAIL_REGEX.test(trimmedEmail) || !validator.isEmail(trimmedEmail)) {
    sendError(res, 'Please enter a valid email address.', HttpStatus.BAD_REQUEST);
    return;
  }

  if (!password || typeof password !== 'string' || !password.trim()) {
    sendError(res, 'Password is required.', HttpStatus.BAD_REQUEST);
    return;
  }

  next();
};
