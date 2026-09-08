import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { MessageModel } from '../models/message.model';
import { GroupModel } from '../models/group.model';

export const getConversationMessages = async (req: Request, res: Response): Promise<void> => {
  try {
    const { conversationId } = req.params;
    const { userId } = req.query;

    const conversationIdStr = String(conversationId || '');

    // Check if conversationId refers to a group
    const cleanGroupId = conversationIdStr.startsWith('group_')
      ? conversationIdStr.replace('group_', '')
      : conversationIdStr;

    let group = null;
    if (mongoose.Types.ObjectId.isValid(cleanGroupId)) {
      group = await GroupModel.findById(cleanGroupId);
    }

    // If it is a group, verify membership
    if (group) {
      if (userId && !group.members.includes(String(userId))) {
        res.status(403).json({
          success: false,
          message: 'Access denied: You are not a member of this group',
          data: [],
        });
        return;
      }
    }

    // Match conversationId against either cleanGroupId, group_cleanGroupId, or groupId field
    const query: any = {
      $or: [
        { conversationId },
        { conversationId: cleanGroupId },
        { conversationId: `group_${cleanGroupId}` },
        { groupId: cleanGroupId },
      ],
    };
    if (userId) {
      query.deletedFor = { $ne: String(userId) };
    }

    const messages = await MessageModel.find(query).sort({ createdAt: 1 }).lean();

    res.status(200).json({
      success: true,
      count: messages.length,
      data: messages,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to retrieve messages',
    });
  }
};

export const uploadFile = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, message: 'No file uploaded' });
      return;
    }

    // Construct the file URL as a relative path so the frontend proxy can handle it
    const fileUrl = `/uploads/${req.file.filename}`;

    res.status(200).json({
      success: true,
      message: 'File uploaded successfully',
      data: {
        fileUrl,
        fileName: req.file.originalname,
        fileType: req.file.mimetype,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'File upload failed',
    });
  }
};
