import dns from 'dns';
import mongoose from 'mongoose';
import { logger } from '../utils/logger';

export const connectDB = async (): Promise<void> => {
  try {
    // Fix for Node.js DNS resolution issues on Windows with mongodb+srv SRV records
    try {
      dns.setServers(['8.8.8.8', '1.1.1.1']);
    } catch {
      // Ignore if cannot set custom DNS
    }

    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/bidirectional-chat-bot';
    const conn = await mongoose.connect(mongoUri);
    logger.info(`🍃 MongoDB Connected: ${conn.connection.host}`);
  } catch (error: any) {
    logger.error(`💥 MongoDB Connection Error: ${error.message}`);
  }
};
