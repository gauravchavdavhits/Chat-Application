import { generateBotResponse } from '../services/botService.js';

// @desc    Process user message and return bot reply via HTTP
// @route   POST /api/bot/chat
// @access  Public
export const handleBotMessage = async (req, res, next) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ success: false, message: 'Message text is required' });
    }

    const reply = await generateBotResponse(message);

    res.status(200).json({
      success: true,
      data: {
        reply,
        timestamp: new Date()
      }
    });
  } catch (error) {
    next(error);
  }
};
