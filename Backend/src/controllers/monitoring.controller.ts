import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { ScreenshotModel } from '../models/screenshot.model';
import { UserModel } from '../models/user.model';
import { logger } from '../utils/logger';
import { getConnectedOnlineUserIds } from '../sockets/chat.socket';
import { HttpStatus } from '../constants/httpStatus';
import { sendSuccess, sendError } from '../utils/response';

// Upload Base64 or Binary Screenshot
export const saveScreenshot = async (req: Request, res: Response): Promise<void> => {
  try {
    const targetUserId = req.body.targetUserId || (req as any).user?.userId;
    const targetUsername = req.body.targetUsername || (req as any).user?.username || 'User';
    const capturedBy = req.body.capturedBy || (req as any).user?.userId;
    const capturedByName = req.body.capturedByName || (req as any).user?.username || 'Admin';
    const base64Image = req.body.base64Image || req.body.image;
    const { captureType, intervalSeconds } = req.body;

    if (!targetUserId || !base64Image) {
      sendError(res, 'targetUserId and base64Image (or image) are required', HttpStatus.BAD_REQUEST);
      return;
    }

    // Ensure uploads/screenshots directory exists
    const uploadDir = path.join(process.cwd(), 'uploads', 'screenshots');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Remove base64 data prefix if present
    const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, '');
    const filename = `screen_${targetUserId}_${Date.now()}.jpg`;
    const filepath = path.join(uploadDir, filename);

    fs.writeFileSync(filepath, base64Data, 'base64');
    const imageUrl = `/uploads/screenshots/${filename}`;

    const screenshot = await ScreenshotModel.create({
      targetUserId,
      targetUsername: targetUsername || 'User',
      capturedBy: capturedBy || targetUserId,
      capturedByName: capturedByName || 'Admin',
      imageUrl,
      captureType: captureType || 'interval',
      intervalSeconds: intervalSeconds || 30,
    });

    sendSuccess(res, screenshot, 'Screenshot captured and saved successfully', HttpStatus.CREATED);
  } catch (error: any) {
    logger.error('Error in saveScreenshot:', error);
    sendError(res, error.message || 'Failed to save screenshot', HttpStatus.INTERNAL_SERVER_ERROR);
  }
};

// Get Screenshots for a specific target user
export const getUserScreenshots = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 30;
    const skip = (page - 1) * limit;

    const screenshots = await ScreenshotModel.find({ targetUserId: userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await ScreenshotModel.countDocuments({ targetUserId: userId });

    sendSuccess(res, screenshots, undefined, HttpStatus.OK, {
      count: screenshots.length,
      total,
    });
  } catch (error: any) {
    logger.error('Error in getUserScreenshots:', error);
    sendError(res, error.message || 'Failed to retrieve screenshots', HttpStatus.INTERNAL_SERVER_ERROR);
  }
};

// Delete a screenshot
export const deleteScreenshot = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const screenshot = await ScreenshotModel.findByIdAndDelete(id);

    if (screenshot && screenshot.imageUrl) {
      const localPath = path.join(process.cwd(), screenshot.imageUrl);
      if (fs.existsSync(localPath)) {
        try {
          fs.unlinkSync(localPath);
        } catch {}
      }
    }

    sendSuccess(res, null, 'Screenshot deleted successfully', HttpStatus.OK);
  } catch (error: any) {
    logger.error('Error in deleteScreenshot:', error);
    sendError(res, error.message, HttpStatus.INTERNAL_SERVER_ERROR);
  }
};

// Get Live Monitoring Status & Active Users Telemetry
export const getMonitoringStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const activeSocketUserIds = getConnectedOnlineUserIds();
    const totalUsers = await UserModel.countDocuments();
    
    // Query users that have an active socket connection
    const onlineUsers = activeSocketUserIds.length > 0
      ? await UserModel.find({ _id: { $in: activeSocketUserIds } }).select('-password').lean()
      : [];

    const totalScreenshots = await ScreenshotModel.countDocuments();

    sendSuccess(res, {
      totalUsers,
      onlineCount: onlineUsers.length,
      onlineUsers,
      totalScreenshots,
    }, undefined, HttpStatus.OK);
  } catch (error: any) {
    logger.error('Error in getMonitoringStats:', error);
    sendError(res, error.message, HttpStatus.INTERNAL_SERVER_ERROR);
  }
};
