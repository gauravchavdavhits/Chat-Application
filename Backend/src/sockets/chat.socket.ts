import { Server, Socket } from 'socket.io';
import { MessageModel } from '../models/message.model';
import { CallModel } from '../models/call.model';
import { UserModel } from '../models/user.model';
import { logger } from '../utils/logger';

let socketIOInstance: Server | null = null;

export const getSocketIO = (): Server | null => socketIOInstance;

// Helper to get array of currently connected active user IDs
export const getConnectedOnlineUserIds = (): string[] => {
  return Array.from(activeUsers.keys()).filter(id => {
    const sockets = activeUsers.get(id);
    return sockets && sockets.size > 0;
  });
};

// Map to track socket.id -> userId
const socketUserMap = new Map<string, string>();
const activeUsers = new Map<string, Set<string>>();
// Set to track userIds currently active in a call
const activeCallUsers = new Set<string>();

/**
 * Helper to get user online visibility preference
 */
const getUserOnlineVisibility = async (userId: string): Promise<boolean> => {
  try {
    const user = await UserModel.findById(userId).select('settings');
    const visibility = user?.settings?.privacy?.onlineVisibility;
    return visibility !== 'nobody';
  } catch {
    return true;
  }
};


/**
 * Common Helper: Broadcast an event to conversation room, participants, and global fallback
 */
const broadcastToTargets = (
  io: Server,
  eventName: string,
  payload: any,
  targets: { conversationId?: string; receiverId?: string; senderId?: string }
) => {
  const { conversationId, receiverId, senderId } = targets;

  if (conversationId) io.to(conversationId).emit(eventName, payload);
  if (receiverId) io.to(receiverId).emit(eventName, payload);
  if (senderId) io.to(senderId).emit(eventName, payload);

  io.emit(eventName, payload);
};

/**
 * Common Helper: Update message status and broadcast status update event
 */
const handleMessageStatusUpdate = async (
  io: Server,
  messageId: string,
  conversationId: string,
  status: 'delivered' | 'read'
) => {
  if (!messageId) return;

  try {
    const updatedMsg = await MessageModel.findByIdAndUpdate(
      messageId,
      { status },
      { new: true }
    );

    if (updatedMsg) {
      const payload = { messageId, conversationId, status };
      if (conversationId) io.to(conversationId).emit('message_status_update', payload);
      io.emit('message_status_update', payload);
    }
  } catch (error: any) {
    logger.error(`💥 Error updating message status to ${status}:`, error.message);
  }
};

/**
 * Common Helper: Standardize message model to socket payload
 */
const formatMessagePayload = (msg: any) => ({
  id: msg._id?.toString() || msg.id,
  conversationId: msg.conversationId,
  senderId: msg.senderId,
  senderName: msg.senderName,
  receiverId: msg.receiverId,
  receiverName: msg.receiverName,
  groupId: msg.groupId,
  message: msg.message,
  fileUrl: msg.fileUrl,
  fileName: msg.fileName,
  fileType: msg.fileType,
  replyTo: msg.replyTo?.toString(),
  isEdited: msg.isEdited || false,
  isDeletedForEveryone: msg.isDeletedForEveryone || false,
  deletedFor: msg.deletedFor || [],
  reactions: msg.reactions instanceof Map ? Object.fromEntries(msg.reactions.entries()) : (msg.reactions || {}),
  timestamp: msg.createdAt || msg.timestamp || new Date(),
  status: msg.status || 'sent',
});

export const registerChatSocket = (io: Server): void => {
  socketIOInstance = io;
  io.on('connection', (socket: Socket) => {
    logger.info(`🔌 User connected: [Socket ID: ${socket.id}]`);

    // Handle user coming online (can be triggered by join_user or explicitly user_online)
    const handleUserOnline = async (userId: string) => {
      if (!userId) return;

      socket.join(userId);
      socketUserMap.set(socket.id, userId);

      if (!activeUsers.has(userId)) {
        activeUsers.set(userId, new Set());
      }
      const userSockets = activeUsers.get(userId)!;
      
      const isFirstConnection = userSockets.size === 0;
      userSockets.add(socket.id);

      logger.info(`👤 Socket ${socket.id} registered for user [${userId}]`);

      const isVisible = await getUserOnlineVisibility(userId);

      // If it's their first connection, broadcast they are online if their visibility is enabled
      if (isFirstConnection && isVisible) {
        io.emit('user_status_changed', { userId, isOnline: true });
      }

      // Send the current list of all visible online users to the newly connected socket
      const allOnlineIds = Array.from(activeUsers.keys());
      const visibleOnlineIds: string[] = [];

      for (const id of allOnlineIds) {
        if (await getUserOnlineVisibility(id)) {
          visibleOnlineIds.push(id);
        }
      }

      socket.emit('online_users_update', visibleOnlineIds);
    };

    // Join personal user room to receive direct 1-on-1 messages
    socket.on('join_user', handleUserOnline);
    socket.on('user_online', handleUserOnline);

    // Join specific conversation room
    socket.on('join_chat', (data: any) => {
      const { conversationId, senderName, senderId } = data || {};
      if (conversationId) {
        socket.join(conversationId);
        logger.info(`💬 User ${senderName} (${senderId}) joined conversation room [${conversationId}]`);
      }
      if (senderId) {
        socket.join(senderId);
      }
    });

    // Handle 1-on-1 and Group Direct Message Event
    socket.on('send_message', async (data: any) => {
      const { senderId, senderName, receiverId, receiverName, groupId, message, fileUrl, fileName, fileType, replyTo } = data;

      if ((!message || !message.trim()) && !fileUrl) return;

      // Compute conversation ID between 2 users, or use groupId
      const conversationId = data.conversationId || groupId || [senderId, receiverId].sort().join('_');

      logger.info(`📩 Message from [${senderName}] to [${receiverName || receiverId}]: ${message || '[Attachment]'}`);

      try {
        const savedMessage = await MessageModel.create({
          conversationId,
          senderId,
          senderName: senderName || 'User',
          receiverId: receiverId || '',
          receiverName: receiverName || '',
          groupId,
          message: message ? message.trim() : '',
          fileUrl,
          fileName,
          fileType,
          replyTo,
        });

        const formattedPayload = formatMessagePayload(savedMessage);
        broadcastToTargets(io, 'receive_message', formattedPayload, { conversationId, receiverId, senderId });
        logger.info(`📢 Direct message broadcasted to [${receiverName}] & conversation [${conversationId}]`);
      } catch (error: any) {
        logger.error(`💥 Error saving direct message to MongoDB:`, error.message);
      }
    });

    // Edit Message
    socket.on('edit_message', async (data: any) => {
      const { messageId, newText, conversationId } = data;
      if (!messageId || !newText) return;

      try {
        const updatedMsg = await MessageModel.findByIdAndUpdate(
          messageId,
          { message: newText, isEdited: true },
          { new: true }
        );
        if (updatedMsg) {
          const payload = {
            id: updatedMsg._id.toString(),
            message: updatedMsg.message,
            senderId: updatedMsg.senderId,
            senderName: updatedMsg.senderName,
            isEdited: true,
            timestamp: updatedMsg.createdAt
          };

          broadcastToTargets(io, 'message_edited', payload, {
            conversationId,
            receiverId: updatedMsg.receiverId,
            senderId: updatedMsg.senderId,
          });
        }
      } catch (error: any) {
        logger.error(`💥 Error editing message:`, error.message);
      }
    });

    // Delete Message (for me or everyone)
    socket.on('delete_message', async (data: any) => {
      const { messageId, type, conversationId } = data;
      if (!messageId) return;

      try {
        const userId = socketUserMap.get(socket.id);
        
        if (type === 'me' && userId) {
          await MessageModel.findByIdAndUpdate(messageId, {
            $addToSet: { deletedFor: userId }
          });
          socket.emit('message_deleted', { messageId, conversationId, deletedForMe: true });
        } else if (type === 'everyone') {
          const updatedMsg = await MessageModel.findByIdAndUpdate(messageId, {
            isDeletedForEveryone: true,
            message: '',
            fileUrl: '',
            fileName: '',
          }, { new: true });
          
          const payload = { messageId, conversationId, deletedAt: updatedMsg?.updatedAt || new Date() };
          if (conversationId) io.to(conversationId).emit('message_deleted', payload);
          io.emit('message_deleted', payload);
        }
      } catch (error: any) {
        logger.error(`💥 Error deleting message:`, error.message);
      }
    });

    // Clear Entire Conversation (for me)
    socket.on('clear_conversation', async (data: any) => {
      const { conversationId } = data;
      const userId = socketUserMap.get(socket.id);
      if (!conversationId || !userId) return;

      try {
        await MessageModel.updateMany(
          {
            conversationId,
            deletedFor: { $ne: userId }
          },
          {
            $addToSet: { deletedFor: userId }
          }
        );

        socket.emit('conversation_cleared', { conversationId });
      } catch (error: any) {
        logger.error(`💥 Error clearing conversation:`, error.message);
      }
    });

    // Handle emoji reactions
    socket.on('react_message', async (data: any) => {
      const { messageId, conversationId, emoji, userId } = data;
      if (!messageId || !emoji) return;

      const reactingUserId = userId || socketUserMap.get(socket.id);
      if (!reactingUserId) return;

      try {
        const message = await MessageModel.findById(messageId);
        if (!message) return;

        const reactionsMap = (message.reactions instanceof Map)
          ? message.reactions
          : new Map(Object.entries(message.reactions || {}));

        const userList: string[] = reactionsMap.get(emoji) || [];
        const userIndex = userList.indexOf(reactingUserId);

        if (userIndex > -1) {
          userList.splice(userIndex, 1);
        } else {
          userList.push(reactingUserId);
        }

        if (userList.length === 0) {
          reactionsMap.delete(emoji);
        } else {
          reactionsMap.set(emoji, userList);
        }

        message.reactions = reactionsMap as any;
        message.markModified('reactions');
        await message.save();

        const payload = {
          messageId,
          conversationId: conversationId || message.conversationId,
          reactions: Object.fromEntries(reactionsMap.entries()),
        };

        broadcastToTargets(io, 'message_reaction_updated', payload, {
          conversationId: payload.conversationId,
          receiverId: message.receiverId,
          senderId: message.senderId,
        });
      } catch (error: any) {
        logger.error(`💥 Error updating message reaction:`, error.message);
      }
    });

    // Message Delivered & Read status updates
    socket.on('message_delivered', (data: any) => {
      handleMessageStatusUpdate(io, data?.messageId, data?.conversationId, 'delivered');
    });

    socket.on('message_read', (data: any) => {
      handleMessageStatusUpdate(io, data?.messageId, data?.conversationId, 'read');
    }); 

    // Handle typing events
    socket.on('typing', (data: any) => {
      const { conversationId, senderId, senderName } = data || {};
      if (conversationId) {
        socket.to(conversationId).emit('user_typing', { conversationId, senderId, senderName });
      }
    });

    socket.on('stop_typing', (data: any) => {
      const { conversationId, senderId } = data || {};
      if (conversationId) {
        socket.to(conversationId).emit('user_stop_typing', { conversationId, senderId });
      }
    });

    // WebRTC Signaling Events
    socket.on('call_user', (data: any) => {
      const { userToCall, signalData, from, name, avatar, isVideoCall, callRoomId } = data;
      
      // Check if the target user is already busy on another call
      if (activeCallUsers.has(userToCall)) {
        logger.warn(`⚠️ User [${userToCall}] is busy on another call. Informing caller [${from}].`);
        socket.emit('user_busy', { userId: userToCall, message: 'User is busy on another call.' });
        return;
      }

      activeCallUsers.add(from);

      io.to(userToCall).emit('call_user', {
        signal: signalData,
        from,
        name,
        avatar,
        isVideoCall,
        callRoomId: callRoomId || [from, userToCall].sort().join('_'),
      });
    });

    socket.on('answer_call', (data: any) => {
      const myId = socketUserMap.get(socket.id);
      if (myId) activeCallUsers.add(myId);

      io.to(data.to).emit('call_accepted', {
        signal: data.signal,
        from: myId || '',
      });
    });

    socket.on('ice_candidate', (data: any) => {
      const { to, candidate, from } = data;
      if (to && candidate) {
        io.to(to).emit('ice_candidate', { 
          candidate,
          from: from || socketUserMap.get(socket.id) || '',
        });
      }
    });

    socket.on('call_mic_toggled', (data: { roomId?: string; to?: string; userId: string; isMuted: boolean }) => {
      const { roomId, to, userId, isMuted } = data;
      if (roomId) {
        socket.to(`call_room_${roomId}`).emit('call_mic_toggled', { userId, isMuted });
      }
      if (to) {
        io.to(to).emit('call_mic_toggled', { userId, isMuted });
      }
    });

    // Multi-participant Room-based Signaling
    socket.on('join_call_room', (data: { roomId: string; user: { _id: string; username: string; avatar?: string }; isVideoCall: boolean }) => {
      const { roomId, user, isVideoCall } = data;
      if (!roomId || !user) return;
      socket.join(`call_room_${roomId}`);
      activeCallUsers.add(user._id);
      logger.info(`📞 User ${user.username} (${user._id}) joined call room [${roomId}]`);
      
      // Notify other participants in the call room that a new participant joined
      socket.to(`call_room_${roomId}`).emit('call_room_user_joined', {
        user,
        isVideoCall,
        socketId: socket.id,
      });
    });

    socket.on('call_room_signal', (data: { to: string; from: any; signal: any; isVideoCall: boolean }) => {
      const { to, from, signal, isVideoCall } = data;
      io.to(to).emit('call_room_signal', {
        from,
        signal,
        isVideoCall,
      });
    });

    socket.on('call_upgrade_video', (data: { roomId?: string; to?: string; from: string }) => {
      const { roomId, to, from } = data;
      logger.info(`📹 Call upgraded to video from [${from}] to [${to || roomId}]`);
      if (roomId) {
        socket.to(`call_room_${roomId}`).emit('call_upgraded_to_video', { from, roomId });
        io.to(roomId).emit('call_upgraded_to_video', { from, roomId });
      }
      if (to) {
        io.to(to).emit('call_upgraded_to_video', { from, roomId });
      }
      io.emit('call_upgraded_to_video', { from, roomId, to });
    });

    socket.on('leave_call_room', (data: { roomId: string; userId: string; username?: string }) => {
      const { roomId, userId, username } = data;
      if (!roomId) return;
      socket.leave(`call_room_${roomId}`);
      activeCallUsers.delete(userId);
      logger.info(`📞 User ${username || userId} left call room [${roomId}]`);
      
      // Notify remaining participants that ONLY this particular user left
      socket.to(`call_room_${roomId}`).emit('call_room_user_left', {
        userId,
        username,
      });
    });

    socket.on('end_call', async (data: any) => {
      const { to, callerId, receiverId, callType, status, duration, startedAt, endedAt, roomId } = data;
      
      if (callerId) activeCallUsers.delete(callerId);
      if (receiverId) activeCallUsers.delete(receiverId);

      if (roomId) {
        socket.to(`call_room_${roomId}`).emit('call_room_user_left', {
          userId: callerId || socketUserMap.get(socket.id),
        });
      }

      if (to) {
        io.to(to).emit('call_ended', { leftUserId: callerId || socketUserMap.get(socket.id) });
      }

      if (callerId && receiverId && callType && status) {
        try {
          const callRecord = await CallModel.create({
            callerId,
            receiverId,
            callType,
            status,
            duration: duration || 0,
            startedAt: startedAt || new Date(),
            endedAt: endedAt || new Date()
          });

          await callRecord.populate('callerId', 'username avatar isOnline');
          await callRecord.populate('receiverId', 'username avatar isOnline');

          const payload = {
            message: 'Call history updated',
            call: callRecord
          };
          
          io.to(callerId).emit('call_history_updated', payload);
          io.to(receiverId).emit('call_history_updated', payload);
        } catch (error: any) {
          logger.error(`💥 Error saving call history:`, error.message);
        }
      }
    });

    // ── Live Screen Monitoring & Remote Streaming Events ──
    socket.on('admin_request_monitoring', (data: { adminId: string; adminName: string; targetUserId: string; intervalSeconds?: number }) => {
      logger.info(`🔍 Admin ${data.adminName} (${data.adminId}) requested live monitoring on User (${data.targetUserId})`);
      io.to(data.targetUserId).emit('admin_monitoring_requested', {
        adminId: data.adminId,
        adminName: data.adminName,
        intervalSeconds: data.intervalSeconds || 30,
      });
    });

    socket.on('user_monitoring_rejected', (data: { adminId: string; userId: string; username: string }) => {
      logger.info(`❌ User ${data.username} (${data.userId}) rejected screen sharing request from Admin ${data.adminId}`);
      io.to(data.adminId).emit('user_monitoring_rejected', data);
    });

    socket.on('user_monitoring_offer', (data: { adminId: string; userId: string; username: string; sdp: any }) => {
      io.to(data.adminId).emit('user_monitoring_offer', data);
    });

    socket.on('admin_monitoring_answer', (data: { targetUserId: string; adminId: string; sdp: any }) => {
      io.to(data.targetUserId).emit('admin_monitoring_answer', data);
    });

    socket.on('monitoring_ice_candidate', (data: { targetUserId: string; candidate: any }) => {
      io.to(data.targetUserId).emit('monitoring_ice_candidate', {
        candidate: data.candidate,
        fromUserId: socketUserMap.get(socket.id),
      });
    });

    socket.on('admin_stop_monitoring', (data: { targetUserId: string; adminId: string }) => {
      logger.info(`🛑 Admin ${data.adminId} stopped monitoring User (${data.targetUserId})`);
      io.to(data.targetUserId).emit('admin_monitoring_stopped', { adminId: data.adminId });
    });

    socket.on('user_monitoring_stopped', (data: { adminId?: string; userId: string }) => {
      logger.info(`🛑 User (${data.userId}) stopped sharing screen`);
      if (data.adminId) {
        io.to(data.adminId).emit('admin_monitoring_stopped', { adminId: data.adminId });
      }
      io.emit('user_monitoring_stopped', data);
    });

    socket.on('admin_trigger_instant_capture', (data: { targetUserId: string; adminId: string }) => {
      io.to(data.targetUserId).emit('capture_instant_screenshot_request', { adminId: data.adminId });
    });

    socket.on('monitoring_screenshot_captured', (data: any) => {
      if (data.adminId) {
        io.to(data.adminId).emit('new_monitoring_screenshot', data);
      }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      logger.info(`❌ User disconnected: [Socket ID: ${socket.id}]`);
      
      const userId = socketUserMap.get(socket.id);
      if (userId) {
        socketUserMap.delete(socket.id);
        activeCallUsers.delete(userId);
        
        const userSockets = activeUsers.get(userId);
        if (userSockets) {
          userSockets.delete(socket.id);
          
          // If this was the last active socket for this user
          if (userSockets.size === 0) {
            activeUsers.delete(userId);
            io.emit('user_status_changed', { userId, isOnline: false });
          }
        }
      }
    });
  });
};

