import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { CallModel } from '../models/call.model';
import { HttpStatus } from '../constants/httpStatus';
import { sendSuccess, sendError } from '../utils/response';

export const getUserCallHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = String(req.params.userId || '');
    if (!userId) {
      sendError(res, 'UserId is required', HttpStatus.BAD_REQUEST);
      return;
    }

    const isMongoId = mongoose.Types.ObjectId.isValid(userId);
    const userObjectId = isMongoId ? new mongoose.Types.ObjectId(userId) : null;

    const callFilter = userObjectId
      ? { $or: [{ callerId: userObjectId }, { receiverId: userObjectId }] }
      : { $or: [{ callerId: userId }, { receiverId: userId }] };
    
    const calls = await CallModel.find(callFilter)
      .populate('callerId', 'username avatar isOnline')
      .populate('receiverId', 'username avatar isOnline')
      .sort({ createdAt: -1 })
      .lean()
      .catch(() => []);

    sendSuccess(res, calls, undefined, HttpStatus.OK);
  } catch (error: any) {
    sendError(res, error.message || 'Failed to fetch call history', HttpStatus.INTERNAL_SERVER_ERROR);
  }
};

export const getConversationCallHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    const user1Id = String(req.params.user1Id || '');
    const user2Id = String(req.params.user2Id || '');

    const id1 = mongoose.Types.ObjectId.isValid(user1Id) ? new mongoose.Types.ObjectId(user1Id) : user1Id;
    const id2 = mongoose.Types.ObjectId.isValid(user2Id) ? new mongoose.Types.ObjectId(user2Id) : user2Id;

    const calls = await CallModel.find({
      $or: [
        { callerId: id1, receiverId: id2 },
        { callerId: id2, receiverId: id1 }
      ]
    })
      .populate('callerId', 'username avatar isOnline')
      .populate('receiverId', 'username avatar isOnline')
      .sort({ createdAt: 1 })
      .lean()
      .catch(() => []);

    sendSuccess(res, calls, undefined, HttpStatus.OK);
  } catch (error: any) {
    sendError(res, error.message || 'Failed to fetch conversation call history', HttpStatus.INTERNAL_SERVER_ERROR);
  }
};
