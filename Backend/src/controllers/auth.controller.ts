import { Request, Response } from 'express';
import { UserModel } from '../models/user.model';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt';

export const registerUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
      res.status(400).json({ success: false, message: 'Please provide username, email and password' });
      return;
    }

    const existingUsername = await UserModel.findOne({ username: username.trim() });
    if (existingUsername) {
      res.status(400).json({ success: false, message: 'Username is already taken' });
      return;
    }

    const existingEmail = await UserModel.findOne({ email: email.toLowerCase().trim() });
    if (existingEmail) {
      res.status(400).json({ success: false, message: 'Email is already registered' });
      return;
    }

    const user = await UserModel.create({
      username: username.trim(),
      email: email.toLowerCase().trim(),
      password,
      isOnline: true,
    });

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

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      token: accessToken,
      accessToken,
      refreshToken,
      data: {
        _id: user._id,
        username: user.username,
        email: user.email,
        isOnline: user.isOnline,
        avatar: user.avatar,
        settings: user.settings,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const loginUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ success: false, message: 'Please enter email and password' });
      return;
    }

    const user = await UserModel.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      res.status(401).json({ success: false, message: 'Invalid email or password' });
      return;
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      res.status(401).json({ success: false, message: 'Invalid email or password' });
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

    res.status(200).json({
      success: true,
      message: 'Login successful',
      token: accessToken,
      accessToken,
      refreshToken,
      data: {
        _id: user._id,
        username: user.username,
        email: user.email,
        isOnline: user.isOnline,
        avatar: user.avatar,
        settings: user.settings,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const refreshTokenHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const refreshToken = req.cookies?.refresh_token || req.body?.refreshToken || req.headers['x-refresh-token'];
    if (!refreshToken) {
      res.status(401).json({ success: false, message: 'Refresh token not found' });
      return;
    }

    const decoded = verifyRefreshToken(refreshToken);
    const user = await UserModel.findById(decoded.userId);
    if (!user) {
      res.status(401).json({ success: false, message: 'User not found or inactive' });
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

    res.status(200).json({
      success: true,
      token: newAccessToken,
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });
  } catch (error: any) {
    res.status(401).json({ success: false, message: 'Invalid or expired refresh token' });
  }
};

export const logoutUser = async (req: Request, res: Response): Promise<void> => {
  try {
    res.clearCookie('auth_token', { path: '/' });
    res.clearCookie('refresh_token', { path: '/' });
    res.status(200).json({ success: true, message: 'Logged out successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

