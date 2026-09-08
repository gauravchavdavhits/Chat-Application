import { Request, Response } from 'express';
import { UserModel } from '../models/user.model';
import { MessageModel } from '../models/message.model';

export const updateSettings = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const { settings } = req.body;

    const user = await UserModel.findByIdAndUpdate(
      userId,
      { $set: { settings } },
      { new: true, runValidators: true }
    );

    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Settings updated successfully',
      data: user.settings,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update settings',
    });
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

    res.status(200).json({
      success: true,
      message: 'Chat history cleared for user',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to clear chat history',
    });
  }
};
