import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { ScreenshotModel } from '../models/screenshot.model';
import { UserModel } from '../models/user.model';
import { logger } from '../utils/logger';

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
      res.status(400).json({ success: false, message: 'targetUserId and base64Image (or image) are required' });
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

    res.status(201).json({
      success: true,
      data: screenshot,
      message: 'Screenshot captured and saved successfully',
    });
  } catch (error: any) {
    logger.error('Error in saveScreenshot:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to save screenshot' });
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

    res.status(200).json({
      success: true,
      count: screenshots.length,
      total,
      data: screenshots,
    });
  } catch (error: any) {
    logger.error('Error in getUserScreenshots:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to retrieve screenshots' });
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

    res.status(200).json({ success: true, message: 'Screenshot deleted successfully' });
  } catch (error: any) {
    logger.error('Error in deleteScreenshot:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

import { getConnectedOnlineUserIds } from '../sockets/chat.socket';

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

    res.status(200).json({
      success: true,
      data: {
        totalUsers,
        onlineCount: onlineUsers.length,
        onlineUsers,
        totalScreenshots,
      },
    });
  } catch (error: any) {
    logger.error('Error in getMonitoringStats:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
