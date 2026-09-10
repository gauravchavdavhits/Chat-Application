import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { UserModel } from '../models/user.model';
import { MessageModel } from '../models/message.model';
import { CallModel } from '../models/call.model';
import { redisCache } from '../config/redis';

// Get user by ID
export const getUserById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    if (typeof userId !== 'string' || !mongoose.Types.ObjectId.isValid(userId)) {
      res.status(404).json({ success: false, message: 'Invalid user ID or user not found' });
      return;
    }

    const cacheKey = `user:${userId}`;

    // 1. Check Redis Cache first
    const cachedUser = await redisCache.get(cacheKey);
    if (cachedUser) {
      res.status(200).json({ success: true, data: cachedUser, source: 'cache' });
      return;
    }

    // 2. Fetch from MongoDB
    const user = await UserModel.findById(userId).select('-password').lean();
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    // 3. Save in Redis (TTL: 10 minutes)
    await redisCache.set(cacheKey, user, 600);

    res.status(200).json({ success: true, data: user });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Search users by username (exact or partial match)
export const searchUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const query = (req.query.username || req.query.q) as string;
    if (!query) {
      res.status(400).json({ success: false, message: 'Search query is required' });
      return;
    }

    const users = await UserModel.find({
      username: { $regex: query, $options: 'i' },
    }).select('-password').lean();

    res.status(200).json({
      success: true,
      count: users.length,
      data: users,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get all registered users from MongoDB
export const getAllUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const cacheKey = 'users:all';

    // 1. Check Redis Cache first
    const cachedUsers = await redisCache.get(cacheKey);
    if (cachedUsers) {
      res.status(200).json({
        success: true,
        count: cachedUsers.length,
        data: cachedUsers,
        source: 'cache',
      });
      return;
    }

    // 2. Query MongoDB
    const users = await UserModel.find().select('-password').sort({ createdAt: -1 }).lean();

    // 3. Cache in Redis (TTL: 3 minutes)
    await redisCache.set(cacheKey, users, 180);

    res.status(200).json({
      success: true,
      count: users.length,
      data: users,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update user avatar
export const updateAvatar = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.body.userId || (req as any).user?.userId;
    const avatar = req.body.avatar || req.body.avatarUrl;
    if (!userId || !avatar) {
      res.status(400).json({ success: false, message: 'UserId and avatar URL are required' });
      return;
    }

    const user = await UserModel.findByIdAndUpdate(
      userId,
      { avatar },
      { new: true }
    ).select('-password').lean();

    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    // Invalidate Redis user cache
    await redisCache.del(`user:${userId}`);
    await redisCache.del('users:all');

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update user profile (username, email)
export const updateProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.body.userId || (req as any).user?.userId;
    const { username, email } = req.body;
    if (!userId || !username || !email) {
      res.status(400).json({ success: false, message: 'UserId, username, and email are required' });
      return;
    }

    const trimmedUsername = username.trim();
    const trimmedEmail = email.trim().toLowerCase();

    // Check if username or email is already in use by another user
    const existing = await UserModel.findOne({
      _id: { $ne: userId },
      $or: [{ username: trimmedUsername }, { email: trimmedEmail }]
    }).lean();

    if (existing) {
      if (existing.username.toLowerCase() === trimmedUsername.toLowerCase()) {
        res.status(400).json({ success: false, message: 'Username is already taken' });
        return;
      }
      if (existing.email.toLowerCase() === trimmedEmail) {
        res.status(400).json({ success: false, message: 'Email is already taken' });
        return;
      }
    }

    const existingUser = await UserModel.findById(userId);
    if (!existingUser) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    const emailChanged = existingUser.email.toLowerCase() !== trimmedEmail;

    existingUser.username = trimmedUsername;
    existingUser.email = trimmedEmail;
    if (emailChanged) {
      existingUser.isEmailVerified = false;
    }
    await existingUser.save();

    const userObj = existingUser.toObject();
    delete userObj.password;

    // Invalidate Redis user cache
    await redisCache.del(`user:${userId}`);
    await redisCache.del('users:all');

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: userObj,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Send Email Verification OTP
export const sendEmailOtp = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.body.userId || (req as any).user?.userId;
    const email = req.body.email || (req as any).user?.email;
    if (!userId || !email) {
      res.status(400).json({ success: false, message: 'UserId and email are required' });
      return;
    }

    const user = await UserModel.findById(userId);
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry

    user.emailOtp = otp;
    user.emailOtpExpires = expires;
    await user.save();

    // Send email using Nodemailer
    const { sendVerificationOtpEmail } = await import('../services/email.service');
    await sendVerificationOtpEmail(email, otp, user.username);

    res.status(200).json({
      success: true,
      message: `Verification code sent to ${email}`,
    });
  } catch (error: any) {
    console.error('Error in sendEmailOtp:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to send verification email. Please check SMTP settings.',
    });
  }
};

// Verify Email OTP
export const verifyEmailOtp = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.body.userId || (req as any).user?.userId;
    const { otp } = req.body;
    if (!userId || !otp) {
      res.status(400).json({ success: false, message: 'UserId and OTP are required' });
      return;
    }

    const user = await UserModel.findById(userId);
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    if (!user.emailOtp || !user.emailOtpExpires) {
      res.status(400).json({ success: false, message: 'No OTP requested or code expired. Please request a new code.' });
      return;
    }

    if (new Date() > new Date(user.emailOtpExpires)) {
      user.emailOtp = undefined;
      user.emailOtpExpires = undefined;
      await user.save();
      res.status(400).json({ success: false, message: 'Verification code has expired. Please request a new code.' });
      return;
    }

    if (user.emailOtp.trim() !== String(otp).trim()) {
      res.status(400).json({ success: false, message: 'Invalid verification code. Please check your email.' });
      return;
    }

    // Mark as verified and clear OTP
    user.isEmailVerified = true;
    user.emailOtp = undefined;
    user.emailOtpExpires = undefined;
    await user.save();

    const userObj = user.toObject();
    delete userObj.password;

    res.status(200).json({
      success: true,
      message: 'Email verified successfully!',
      data: userObj,
    });
  } catch (error: any) {
    console.error('Error in verifyEmailOtp:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};



// Get recent chat users for a specific user (including recent calls)
export const getRecentChatUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = String(req.params.userId || '');
    if (!userId) {
      res.status(400).json({ success: false, message: 'UserId is required' });
      return;
    }

    const isMongoId = mongoose.Types.ObjectId.isValid(userId);
    const userObjectId = isMongoId ? new mongoose.Types.ObjectId(userId) : null;

    // 1. Find all active messages where this user is sender or receiver (not deleted for this user)
    const messages = await MessageModel.find({
      $or: [{ senderId: userId }, { receiverId: userId }],
      deletedFor: { $ne: userId },
    }).sort({ createdAt: -1 }).lean().catch(() => []);

    // 2. Find all calls involving this user
    const callFilter = userObjectId
      ? { $or: [{ callerId: userObjectId }, { receiverId: userObjectId }] }
      : { $or: [{ callerId: userId }, { receiverId: userId }] };

    const calls = await CallModel.find(callFilter)
      .sort({ createdAt: -1 })
      .lean()
      .catch(() => []);

    const recentChatsMap = new Map<string, any>();

    // Process messages
    messages.forEach((msg: any) => {
      const otherUserId = msg.senderId === userId ? msg.receiverId : msg.senderId;
      if (otherUserId && otherUserId !== 'all' && !recentChatsMap.has(otherUserId)) {
        recentChatsMap.set(otherUserId, {
          lastMessage: msg.isDeletedForEveryone ? "🚫 This message was deleted" : (msg.message || 'File attached'),
          lastMessageTime: msg.createdAt,
        });
      }
    });

    // Process calls (compare with message time or add if no message exists)
    calls.forEach((call: any) => {
      const callerIdStr = call.callerId?.toString();
      const receiverIdStr = call.receiverId?.toString();
      const otherUserId = callerIdStr === userId ? receiverIdStr : callerIdStr;

      if (otherUserId) {
        const isOutgoing = callerIdStr === userId;
        const callLabel = `${call.callType === 'video' ? 'Video' : 'Voice'} call (${isOutgoing ? 'Outgoing' : 'Incoming'})`;
        const callTime = call.createdAt || call.endedAt || call.startedAt;

        if (!recentChatsMap.has(otherUserId)) {
          recentChatsMap.set(otherUserId, {
            lastMessage: callLabel,
            lastMessageTime: callTime,
          });
        } else {
          const existing = recentChatsMap.get(otherUserId);
          if (new Date(callTime).getTime() > new Date(existing.lastMessageTime).getTime()) {
            recentChatsMap.set(otherUserId, {
              lastMessage: callLabel,
              lastMessageTime: callTime,
            });
          }
        }
      }
    });

    const recentUsers = await UserModel.find({
      _id: { $in: Array.from(recentChatsMap.keys()) }
    }).select('-password').lean();

    const data = recentUsers.map((user: any) => ({
      user,
      lastMessage: recentChatsMap.get(user._id.toString())?.lastMessage,
      lastMessageTime: recentChatsMap.get(user._id.toString())?.lastMessageTime,
    }));

    // Sort the combined data based on lastMessageTime descending
    data.sort((a, b) => new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime());

    res.status(200).json({
      success: true,
      count: data.length,
      data,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
