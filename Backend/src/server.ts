import dotenv from 'dotenv';
dotenv.config();

import { createServer } from 'http';
import { logger } from './utils/logger';
import { Server } from 'socket.io';
import app from './app';
import { config } from './config';
import { registerChatSocket } from './sockets/chat.socket';
import { ClientToServerEvents, ServerToClientEvents } from './types/chat.types';
import { createAdapter } from '@socket.io/redis-adapter';
import { redisPubClient, redisSubClient } from './config/redis';

// Create HTTP server using createServer(app)
const httpServer = createServer(app);

// Attach Socket.IO to HTTP server with CORS
const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: {
    origin: config.corsOrigin,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Attach Redis adapter if Redis Pub/Sub is active
if (redisPubClient && redisSubClient) {
  try {
    io.adapter(createAdapter(redisPubClient, redisSubClient));
    logger.info('🔌 Socket.IO Redis Adapter activated for multi-instance horizontal scaling');
  } catch (err: any) {
    logger.warn(`Failed to bind Socket.IO Redis adapter: ${err.message}`);
  }
}

// Register Socket event listeners
registerChatSocket(io);

// Handle server listen errors (e.g. port already in use)
httpServer.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EADDRINUSE') {
    logger.error(`❌ Port ${config.port} is already in use by another process.`);
    process.exit(1);
  } else {
    logger.error(`❌ Server error: ${err.message}`);
  }
});

// Start listening
httpServer.listen(config.port, () => {
  logger.info(`🚀 Backend server listening on port ${config.port}`);
  logger.info(`🔗 CORS configured for localhost & ngrok tunnels`);
});

// Graceful shutdown
const gracefulShutdown = (signal: string) => {
  logger.info(`Received ${signal}. Gracefully closing HTTP and WebSocket server...`);
  httpServer.close(() => {
    logger.info('HTTP server closed successfully.');
    process.exit(0);
  });
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

