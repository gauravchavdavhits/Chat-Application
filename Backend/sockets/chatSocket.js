import Message from '../models/messageModel.js';

const handleChatSocket = (io) => {
  io.on('connection', (socket) => {
    console.log(`⚡ User connected: ${socket.id}`);

    // Join a specific chat room / friend conversation
    socket.on('join_room', async (roomId) => {
      socket.join(roomId);
      console.log(`👤 Socket ${socket.id} joined room ${roomId}`);
    });

    // Listen for incoming message from a user to their friend / room
    socket.on('send_message', async (data) => {
      const { roomId = 'room_default', sender = 'user', text, senderId, senderName } = data;

      if (!text || !text.trim()) return;

      console.log(`📩 Message from [${senderName || 'User'}] in room [${roomId}]: ${text}`);

      try {
        // 1. Save Message permanently to MongoDB
        let savedMessage;
        try {
          savedMessage = await Message.create({
            conversationId: roomId,
            sender: sender,
            senderId: senderId || socket.id,
            text: text.trim(),
            metadata: {
              senderName: senderName || 'User'
            }
          });
        } catch (dbErr) {
          console.warn('⚠️ Could not save message to MongoDB (using fallback object):', dbErr.message);
          savedMessage = {
            _id: Date.now().toString(),
            conversationId: roomId,
            sender: sender,
            senderId: senderId || socket.id,
            text: text.trim(),
            metadata: { senderName: senderName || 'User' },
            createdAt: new Date()
          };
        }

        // 2. Instantly broadcast message to ALL users in the room (including friends)
        io.to(roomId).emit('receive_message', {
          _id: savedMessage._id,
          conversationId: savedMessage.conversationId,
          sender: savedMessage.sender,
          senderId: savedMessage.senderId,
          senderName: senderName || 'User',
          text: savedMessage.text,
          createdAt: savedMessage.createdAt
        });
      } catch (error) {
        console.error('Error handling send_message in socket:', error);
      }
    });

    // Listen for delete_message
    socket.on('delete_message', async (data) => {
      const { messageId, type, conversationId, userId } = data;
      if (!messageId || !type) return;

      try {
        const message = await Message.findById(messageId);
        if (!message) return;

        if (type === 'everyone') {
          message.isDeletedForEveryone = true;
          message.deletedAt = new Date();
          // Optionally clear text, but keeping it allows frontend to show "This message was deleted"
          // based on the boolean.
          await message.save();
        } else if (type === 'me' && userId) {
          if (!message.deletedFor) message.deletedFor = [];
          if (!message.deletedFor.includes(userId)) {
            message.deletedFor.push(userId);
          }
          await message.save();
        }

        // Broadcast to room
        if (conversationId) {
          io.to(conversationId).emit('message_deleted', {
            messageId,
            type,
            userId
          });
        }
      } catch (err) {
        console.error('Error deleting message:', err);
      }
    });

    // User disconnect
    socket.on('disconnect', () => {
      console.log(`❌ User disconnected: ${socket.id}`);
    });
  });
};

export default handleChatSocket;
