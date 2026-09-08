import Message from '../models/messageModel.js';
import Conversation from '../models/conversationModel.js';

// @desc    Get messages for a conversation
// @route   GET /api/chat/messages/:conversationId
// @access  Public
export const getMessages = async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const messages = await Message.find({ conversationId })
      .sort({ createdAt: -1 }) // Sort descending to get latest first
      .skip(skip)
      .limit(limit);

    // Reverse to chronological order for the frontend
    messages.reverse();

    res.status(200).json({
      success: true,
      count: messages.length,
      page,
      data: messages
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Send a message
// @route   POST /api/chat/messages
// @access  Public
export const sendMessage = async (req, res, next) => {
  try {
    const { conversationId, sender, text, senderId } = req.body;

    if (!conversationId || !sender || !text) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const message = await Message.create({
      conversationId,
      sender,
      senderId,
      text
    });

    res.status(201).json({
      success: true,
      data: message
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Clear chat history for user
// @route   POST /api/chat/clear-history/:userId or /api/settings/clear-chat/:userId
// @access  Public
export const clearChatHistory = async (req, res, next) => {
  try {
    const { userId } = req.params;
    if (!userId) {
      return res.status(400).json({ success: false, message: 'User ID is required' });
    }

    // Delete messages sent by this user or in user's conversations
    await Message.deleteMany({
      $or: [
        { senderId: userId },
        { conversationId: { $regex: userId } }
      ]
    });

    res.status(200).json({
      success: true,
      message: 'Chat history cleared successfully'
    });
  } catch (error) {
    next(error);
  }
};

