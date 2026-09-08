import http from 'http';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import connectDB from './config/db.js';
import { initSocket } from './config/socket.js';
import handleChatSocket from './sockets/chatSocket.js';
import { errorHandler, notFound } from './middlewares/errorMiddleware.js';

// Import routes
import authRoutes from './routes/authRoutes.js';
import chatRoutes from './routes/chatRoutes.js';
import botRoutes from './routes/botRoutes.js';

// Load environment variables
dotenv.config();

// Initialize Database
connectDB();

const app = express();
const server = http.createServer(app);

// Initialize Socket.io
const io = initSocket(server);
handleChatSocket(io);

// Middlewares
app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:5173', credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health Check Route
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    message: 'Bidirectional Chat Bot Backend API (ES6+ ESM) is running'
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/bot', botRoutes);

// Error Handling Middlewares
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`🚀 Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});
