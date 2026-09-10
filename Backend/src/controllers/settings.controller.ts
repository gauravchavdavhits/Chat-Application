import { Request, Response } from 'express';
import { UserModel } from '../models/user.model';
import { MessageModel } from '../models/message.model';
import { HttpStatus } from '../constants/httpStatus';
import { sendSuccess, sendError } from '../utils/response';

export const updateSettings = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const settings = req.body.settings || req.body;

    const user = await UserModel.findByIdAndUpdate(
      userId,
      { $set: { settings } },
      { new: true, runValidators: true }
    );

    if (!user) {
      sendError(res, 'User not found', HttpStatus.NOT_FOUND);
      return;
    }

    sendSuccess(res, user.settings, 'Settings updated successfully', HttpStatus.OK);
  } catch (error: any) {
    sendError(res, error.message || 'Failed to update settings', HttpStatus.INTERNAL_SERVER_ERROR);
  }
};

export const clearChatHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    
    // "Clear chat history" in Settings usually means hiding all messages for the current user
    // To do this, we can append userId to the deletedFor array for all messages where the user is involved
    await MessageModel.updateMany(
      { 
        $or: [{ senderId: userId }, { receiverId: userId }],
        deletedFor: { $ne: userId }
      },
      {
        $push: { deletedFor: userId }
      }
    );

    sendSuccess(res, null, 'Chat history cleared for user', HttpStatus.OK);
  } catch (error: any) {
    sendError(res, error.message || 'Failed to clear chat history', HttpStatus.INTERNAL_SERVER_ERROR);
  }
};
