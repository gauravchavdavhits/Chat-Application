import { io, Socket } from 'socket.io-client';
import { ClientToServerEvents, ServerToClientEvents } from '../types/chat.types';

// Socket.IO server URL
const SOCKET_URL = '/';

// Typed Socket client instance
let socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;

/**
 * Get or initialize the Socket instance
 */
export const getSocket = (): Socket<ServerToClientEvents, ClientToServerEvents> => {
  if (!socket) {
    const token = localStorage.getItem('auth_token');
    socket = io(SOCKET_URL, {
      autoConnect: true,
      auth: {
        token: token || undefined,
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });
  }
  return socket;
};


/**
 * Disconnect socket cleanly
 */
export const disconnectSocket = (): void => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
