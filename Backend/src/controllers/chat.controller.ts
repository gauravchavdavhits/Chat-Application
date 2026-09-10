import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { MessageModel } from '../models/message.model';
import { GroupModel } from '../models/group.model';
import { HttpStatus } from '../constants/httpStatus';
import { sendSuccess, sendError } from '../utils/response';

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
        sendError(res, 'Access denied: You are not a member of this group', HttpStatus.FORBIDDEN, { data: [] });
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

    sendSuccess(res, messages, undefined, HttpStatus.OK, { count: messages.length });
  } catch (error: any) {
    sendError(res, error.message || 'Failed to retrieve messages', HttpStatus.INTERNAL_SERVER_ERROR);
  }
};

export const uploadFile = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      sendError(res, 'No file uploaded', HttpStatus.BAD_REQUEST);
      return;
    }

    // Construct the file URL as a relative path so the frontend proxy can handle it
    const fileUrl = `/uploads/${req.file.filename}`;

    sendSuccess(res, {
      fileUrl,
      fileName: req.file.originalname,
      fileType: req.file.mimetype,
    }, 'File uploaded successfully', HttpStatus.OK);
  } catch (error: any) {
    sendError(res, error.message || 'File upload failed', HttpStatus.INTERNAL_SERVER_ERROR);
  }
};
