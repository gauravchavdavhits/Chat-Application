import mongoose from 'mongoose';
import { logger } from '../utils/logger';

export const connectDB = async (): Promise<void> => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/bidirectional-chat-bot';
    const conn = await mongoose.connect(mongoUri);
    logger.info(`🍃 MongoDB Connected: ${conn.connection.host}`);
  } catch (error: any) {
    logger.error(`💥 MongoDB Connection Error: ${error.message}`);
  }
};
