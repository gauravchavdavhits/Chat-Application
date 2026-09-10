import { Request, Response } from 'express';
import { UserModel } from '../models/user.model';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt';
import { HttpStatus } from '../constants/httpStatus';
import { sendSuccess, sendError } from '../utils/response';

export const registerUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
      sendError(res, 'Please provide username, email and password', HttpStatus.BAD_REQUEST);
      return;
    }

    const existingUsername = await UserModel.findOne({ username: username.trim() });
    if (existingUsername) {
      sendError(res, 'Username is already taken', HttpStatus.BAD_REQUEST);
      return;
    }

    const existingEmail = await UserModel.findOne({ email: email.toLowerCase().trim() });
    if (existingEmail) {
      sendError(res, 'Email is already registered', HttpStatus.BAD_REQUEST);
      return;
    }

    const user = await UserModel.create({
      username: username.trim(),
      email: email.toLowerCase().trim(),
      password,
      isOnline: false,
    });

    sendSuccess(
      res,
      {
        _id: user._id,
        username: user.username,
        email: user.email,
        isEmailVerified: user.isEmailVerified,
        createdAt: user.createdAt,
      },
      'Registration successful. Please sign in.',
      HttpStatus.CREATED
    );
  } catch (error: any) {
    sendError(res, error.message, HttpStatus.INTERNAL_SERVER_ERROR);
  }
};

export const loginUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      sendError(res, 'Please enter email and password', HttpStatus.BAD_REQUEST);
      return;
    }

    const user = await UserModel.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      sendError(res, 'Invalid email or password', HttpStatus.UNAUTHORIZED);
      return;
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      sendError(res, 'Invalid email or password', HttpStatus.UNAUTHORIZED);
      return;
    }

    // If user previously had a plain text password, migrate it to hashed format automatically
    if (user.password && !user.password.startsWith('$2a$') && !user.password.startsWith('$2b$') && !user.password.startsWith('$2y$')) {
      user.password = password; // triggers pre('save') bcrypt hash hook
    }

    user.isOnline = true;
    await user.save();

    const tokenPayload = {
      userId: user._id.toString(),
      email: user.email,
      username: user.username,
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    // Set Access Token cookie
    res.cookie('auth_token', accessToken, {
      httpOnly: false,
      secure: false,
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000, // 15 minutes
      path: '/',
    });

    // Set Refresh Token cookie
    res.cookie('refresh_token', refreshToken, {
      httpOnly: false,
      secure: false,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/',
    });

    sendSuccess(res, {
      _id: user._id,
      username: user.username,
      email: user.email,
      isOnline: user.isOnline,
      avatar: user.avatar,
      settings: user.settings,
    }, 'Login successful', HttpStatus.OK, {
      token: accessToken,
      accessToken,
      refreshToken,
    });
  } catch (error: any) {
    sendError(res, error.message, HttpStatus.INTERNAL_SERVER_ERROR);
  }
};

export const refreshTokenHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const refreshToken = req.cookies?.refresh_token || req.body?.refreshToken || req.headers['x-refresh-token'];
    if (!refreshToken) {
      sendError(res, 'Refresh token not found', HttpStatus.UNAUTHORIZED);
      return;
    }

    const decoded = verifyRefreshToken(refreshToken);
    const user = await UserModel.findById(decoded.userId);
    if (!user) {
      sendError(res, 'User not found or inactive', HttpStatus.UNAUTHORIZED);
      return;
    }

    const tokenPayload = {
      userId: user._id.toString(),
      email: user.email,
      username: user.username,
    };

    const newAccessToken = generateAccessToken(tokenPayload);
    const newRefreshToken = generateRefreshToken(tokenPayload);

    res.cookie('auth_token', newAccessToken, {
      httpOnly: false,
      secure: false,
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000,
      path: '/',
    });

    res.cookie('refresh_token', newRefreshToken, {
      httpOnly: false,
      secure: false,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    });

    sendSuccess(res, undefined, undefined, HttpStatus.OK, {
      token: newAccessToken,
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });
  } catch (error: any) {
    sendError(res, 'Invalid or expired refresh token', HttpStatus.UNAUTHORIZED);
  }
};

export const logoutUser = async (req: Request, res: Response): Promise<void> => {
  try {
    res.clearCookie('auth_token', { path: '/' });
    res.clearCookie('refresh_token', { path: '/' });
    sendSuccess(res, null, 'Logged out successfully', HttpStatus.OK);
  } catch (error: any) {
    sendError(res, error.message, HttpStatus.INTERNAL_SERVER_ERROR);
  }
};
