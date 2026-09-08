import dotenv from 'dotenv';
dotenv.config();

import { createServer } from 'http';
import { logger } from './utils/logger';
import { Server } from 'socket.io';
import app from './app';
import { config } from './config';
import { registerChatSocket } from './sockets/chat.socket';
import { ClientToServerEvents, ServerToClientEvents } from './types/chat.types';

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

// Register Socket event listeners
registerChatSocket(io);

// Start listening
httpServer.listen(config.port, () => {
  logger.info(`🚀 Backend server listening on port ${config.port}`);
  logger.info(`🔗 CORS configured for localhost & ngrok tunnels`);
});
