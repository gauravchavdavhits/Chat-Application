import { useEffect, useState, useCallback, useRef } from 'react';
import { getSocket } from '../services/socket';
import { ChatMessage, UserProfile, ChatTarget, CallRecord } from '../types/chat.types';
import { fetchConversationMessagesApi } from '../services/userService';
import { getDirectCallHistoryApi } from '../services/callService';
import { soundService } from '../services/soundService';

/**
 * Helper to normalize raw database/socket message objects into ChatMessage format
 */
const mapRawMessage = (m: any): ChatMessage => ({
  id: m._id || m.id,
  conversationId: m.conversationId,
  senderId: m.senderId,
  senderName: m.senderName,
  receiverId: m.receiverId,
  receiverName: m.receiverName,
  groupId: m.groupId,
  message: m.message,
  fileUrl: m.fileUrl,
  fileName: m.fileName,
  fileType: m.fileType,
  replyTo: m.replyTo,
  isEdited: m.isEdited,
  isDeletedForEveryone: m.isDeletedForEveryone,
  deletedFor: m.deletedFor || [],
  deletedAt: m.deletedAt || m.updatedAt,
  reactions: m.reactions || {},
  timestamp: m.createdAt || m.timestamp,
  status: m.status || 'sent',
});

/**
 * Custom React hook for Socket.IO connection and direct 1-on-1 messaging.
 * - Joins user's personal room on connect.
 * - Loads chat history and call history from MongoDB when selectedTarget changes.
 * - Listens for receive_message and call_history_updated events.
 * - De-duplicates incoming messages.
 */
export function useSocket(currentUser: UserProfile | null, selectedTarget: ChatTarget | null) {
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [callRecords, setCallRecords] = useState<CallRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [onlineUserIds, setOnlineUserIds] = useState<string[]>([]);
  const [latestMessage, setLatestMessage] = useState<ChatMessage | null>(null);
  const [typingUser, setTypingUser] = useState<string | null>(null);
  const seenIds = useRef<Set<string>>(new Set());

  // Compute the unique conversation ID between 2 users (deterministic sort)
  const conversationId =
    currentUser && selectedTarget
      ? 'members' in selectedTarget ? selectedTarget._id : [currentUser._id, selectedTarget._id].sort().join('_')
      : null;

  const convIdRef = useRef(conversationId);
  useEffect(() => {
    convIdRef.current = conversationId;
  }, [conversationId]);

  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);

  // Load initial chat history and call history when the conversation changes
  useEffect(() => {
    if (!conversationId) {
      setMessages([]);
      setCallRecords([]);
      seenIds.current.clear();
      setPage(1);
      setHasMore(false);
      return;
    }

    const loadHistory = async () => {
      try {
        const res = await fetchConversationMessagesApi(conversationId, 1, currentUser?._id);
        if (res.success && Array.isArray(res.data)) {
          const mapped: ChatMessage[] = res.data.map(mapRawMessage);
          seenIds.current = new Set(mapped.map((m) => m.id));
          setMessages(mapped);
          setPage(1);
          setHasMore(mapped.length === 50);

          // Acknowledge messages sent to us as read since we just opened the chat (respecting readReceipts privacy setting)
          if (currentUser) {
            const canSendReadReceipt = currentUser?.settings?.privacy?.readReceipts ?? true;
            const socket = getSocket();
            mapped.forEach(m => {
              if (m.receiverId === currentUser._id && m.status !== 'read' && m.conversationId) {
                if (canSendReadReceipt) {
                  socket.emit('message_read', { messageId: m.id, conversationId: m.conversationId });
                } else {
                  socket.emit('message_delivered', { messageId: m.id, conversationId: m.conversationId });
                }
              }
            });
          }
        }
      } catch (err: any) {
        console.error('Failed to load chat history:', err.message);
      }

      // If it's a 1-on-1 direct conversation, also load call history
      if (currentUser && selectedTarget && !('members' in selectedTarget)) {
        try {
          const callRes = await getDirectCallHistoryApi(currentUser._id, selectedTarget._id);
          if (callRes && callRes.success && Array.isArray(callRes.data)) {
            setCallRecords(callRes.data);
          }
        } catch {
          // ignore
        }
      } else {
        setCallRecords([]);
      }
    };

    loadHistory();
  }, [conversationId, currentUser?._id, selectedTarget?._id]);


  const fetchOlderMessages = useCallback(async () => {
    if (!conversationId || loadingOlder || !hasMore) return;
    
    setLoadingOlder(true);
    try {
      const nextPage = page + 1;
      const res = await fetchConversationMessagesApi(conversationId, nextPage, currentUser?._id);
      if (res.success && Array.isArray(res.data) && res.data.length > 0) {
        const mapped: ChatMessage[] = res.data.map(mapRawMessage);
        
        // Add only new IDs to seen
        const newMessages = mapped.filter(m => !seenIds.current.has(m.id));
        newMessages.forEach(m => seenIds.current.add(m.id));
        
        setMessages(prev => [...newMessages, ...prev]);

        // Acknowledge older loaded messages as read
        if (currentUser) {
          const socket = getSocket();
          newMessages.forEach(m => {
            if (m.receiverId === currentUser._id && m.status !== 'read' && m.conversationId) {
              socket.emit('message_read', { messageId: m.id, conversationId: m.conversationId });
            }
          });
        }
        setPage(nextPage);
        setHasMore(res.data.length === 50);
      } else {
        setHasMore(false);
      }
    } catch (err: any) {
      console.error('Failed to load older messages:', err.message);
    } finally {
      setLoadingOlder(false);
    }
  }, [conversationId, page, loadingOlder, hasMore, currentUser]);

  // Socket event management (Global)
  useEffect(() => {
    if (!currentUser) return;

    const socket = getSocket();
    setIsConnected(socket.connected);

    const onConnect = () => {
      setIsConnected(true);
      setError(null);
      console.log('🟢 Connected to Socket.IO Server');
      socket.emit('user_online', currentUser._id);
      
      // Also join conversation room if we have one active
      if (convIdRef.current) {
        socket.emit('join_chat', {
          conversationId: convIdRef.current,
          senderName: currentUser.username,
          senderId: currentUser._id,
        });
      }
    };

    const onDisconnect = () => {
      setIsConnected(false);
      console.log('🔴 Disconnected from Socket.IO Server');
    };

    const onReceiveMessage = (data: any) => {
      const formatted: ChatMessage = mapRawMessage(data);
      const msgId = formatted.id;

      setLatestMessage(formatted);

      const targetMatches = 
        data.conversationId === convIdRef.current ||
        (data.groupId && (convIdRef.current === data.groupId || convIdRef.current === `group_${data.groupId}`));

      if (!targetMatches) return;
      if (seenIds.current.has(msgId)) return;
      
      seenIds.current.add(msgId);
      setMessages((prev) => [...prev, formatted]);

      // Play sound and trigger notifications if enabled in user settings
      if (data.senderId !== currentUser._id) {
        const notifyEnabled = currentUser?.settings?.notifications?.messages ?? true;
        const soundEnabled = currentUser?.settings?.notifications?.sounds ?? true;

        if (soundEnabled) {
          soundService.playMessageSound();
        }

        if (notifyEnabled && document.hidden && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
          new Notification(formatted.senderName || 'New Message', {
            body: formatted.message || 'Sent an attachment',
            icon: '/favicon.ico',
          });
        }
      }

      // Acknowledge message delivery or read (respecting readReceipts privacy setting)
      if (data.senderId !== currentUser._id) {
        const canSendReadReceipt = currentUser?.settings?.privacy?.readReceipts ?? true;
        if (data.conversationId === convIdRef.current) {
          // We are actively viewing this conversation
          if (canSendReadReceipt) {
            getSocket().emit('message_read', { messageId: msgId, conversationId: data.conversationId });
          } else {
            getSocket().emit('message_delivered', { messageId: msgId, conversationId: data.conversationId });
          }
        } else {
          // We are NOT viewing this conversation (e.g. looking at another chat)
          getSocket().emit('message_delivered', { messageId: msgId, conversationId: data.conversationId });
        }
      }
    };

    const onOnlineUsersUpdate = (userIds: string[]) => {
      setOnlineUserIds(userIds);
    };

    const onUserStatusChanged = ({ userId, isOnline }: { userId: string; isOnline: boolean }) => {
      setOnlineUserIds((prev) => {
        if (isOnline) {
          if (!prev.includes(userId)) return [...prev, userId];
          return prev;
        } else {
          return prev.filter((id) => id !== userId);
        }
      });
    };

    const onUserTyping = (data: { conversationId: string; senderId: string; senderName: string }) => {
      if (data.conversationId === convIdRef.current && data.senderId !== currentUser._id) {
        setTypingUser(data.senderName);
      }
    };

    const onUserStopTyping = (data: { conversationId: string; senderId: string }) => {
      if (data.conversationId === convIdRef.current && data.senderId !== currentUser._id) {
        setTypingUser(null);
      }
    };

    const onMessageEdited = (data: ChatMessage) => {
      setMessages((prev) => prev.map(m => (m.id === data.id ? { ...m, message: data.message, isEdited: true } : m)));
    };

    const onMessageReactionUpdated = (data: { messageId: string; conversationId: string; reactions: { [emoji: string]: string[] } }) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === data.messageId ? { ...msg, reactions: data.reactions } : msg
        )
      );
    };

    const onMessageDeleted = (data: { messageId: string; conversationId: string; deletedAt?: Date | string; deletedForMe?: boolean }) => {
      setMessages((prev) => 
        prev.map(msg => {
          if (msg.id === data.messageId) {
            if (data.deletedForMe) {
              return { ...msg, deletedFor: [...(msg.deletedFor || []), currentUser._id] };
            }
            return { ...msg, isDeletedForEveryone: true, message: '', fileUrl: '', fileName: '', deletedAt: data.deletedAt || new Date() };
          }
          return msg;
        })
      );
    };

    const onMessageStatusUpdate = (data: { messageId: string; conversationId: string; status: 'delivered' | 'read' }) => {
      if (data.conversationId !== convIdRef.current) return;
      setMessages((prev) => prev.map(msg => 
        msg.id === data.messageId ? { ...msg, status: data.status } : msg
      ));
    };

    const onCallHistoryUpdated = (payload: { message: string; call: CallRecord }) => {
      if (!payload?.call) return;
      const call = payload.call;
      const callerId = typeof call.callerId === 'object' ? (call.callerId as any)._id : call.callerId;
      const receiverId = typeof call.receiverId === 'object' ? (call.receiverId as any)._id : call.receiverId;

      if (
        currentUser &&
        selectedTarget &&
        !('members' in selectedTarget) &&
        ((callerId === currentUser._id && receiverId === selectedTarget._id) ||
         (callerId === selectedTarget._id && receiverId === currentUser._id))
      ) {
        setCallRecords((prev) => {
          const exists = prev.some((c) => c._id === call._id);
          if (exists) {
            return prev.map((c) => (c._id === call._id ? call : c));
          }
          return [...prev, call];
        });
      }
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('receive_message', onReceiveMessage);
    socket.on('online_users_update', onOnlineUsersUpdate);
    socket.on('user_status_changed', onUserStatusChanged);
    socket.on('user_typing', onUserTyping);
    socket.on('user_stop_typing', onUserStopTyping);
    socket.on('message_edited', onMessageEdited);
    socket.on('message_reaction_updated', onMessageReactionUpdated);
    socket.on('message_deleted', onMessageDeleted);
    socket.on('message_status_update', onMessageStatusUpdate);
    socket.on('call_history_updated', onCallHistoryUpdated);

    if (socket.connected) {
      socket.emit('user_online', currentUser._id);
    }

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('receive_message', onReceiveMessage);
      socket.off('online_users_update', onOnlineUsersUpdate);
      socket.off('user_status_changed', onUserStatusChanged);
      socket.off('user_typing', onUserTyping);
      socket.off('user_stop_typing', onUserStopTyping);
      socket.off('message_edited', onMessageEdited);
      socket.off('message_reaction_updated', onMessageReactionUpdated);
      socket.off('message_deleted', onMessageDeleted);
      socket.off('message_status_update', onMessageStatusUpdate);
      socket.off('call_history_updated', onCallHistoryUpdated);
    };
  }, [currentUser, selectedTarget]);

  // Handle joining specific conversation room
  useEffect(() => {
    if (!currentUser || !conversationId) return;
    
    const socket = getSocket();
    if (socket.connected) {
      socket.emit('join_chat', {
        conversationId,
        senderName: currentUser.username,
        senderId: currentUser._id,
      });
    }
  }, [currentUser, conversationId]);

  // Send a direct message
  const sendMessage = useCallback(
    (messageText: string, fileData?: { fileUrl: string; fileName: string; fileType: string }, replyTo?: string) => {
      if (!currentUser || !selectedTarget || !isConnected) return;
      
      const socket = getSocket();
      const isGroup = 'members' in selectedTarget;

      const newMsg = {
        conversationId,
        senderId: currentUser._id,
        senderName: currentUser.username,
        receiverId: isGroup ? undefined : selectedTarget._id,
        receiverName: isGroup ? undefined : (selectedTarget as UserProfile).username,
        groupId: isGroup ? selectedTarget._id : undefined,
        message: messageText,
        fileUrl: fileData?.fileUrl,
        fileName: fileData?.fileName,
        fileType: fileData?.fileType,
        replyTo,
      };

      socket.emit('send_message', newMsg);
    },
    [currentUser, selectedTarget, isConnected, conversationId]
  );

  // Edit an existing message
  const editMessage = useCallback(
    (messageId: string, newText: string) => {
      if (!currentUser || !conversationId || !isConnected) return;
      
      const socket = getSocket();
      socket.emit('edit_message', {
        messageId,
        newText,
        conversationId,
      });

      // Optimistic update
      setMessages((prev) => prev.map(m => m.id === messageId ? { ...m, message: newText, isEdited: true } : m));
    },
    [currentUser, conversationId, isConnected]
  );

  // Delete message (either for me or for everyone)
  const deleteMessage = useCallback(
    (messageId: string, type: 'me' | 'everyone') => {
      if (!currentUser || !conversationId || !isConnected) return;
      
      const socket = getSocket();
      socket.emit('delete_message', {
        messageId,
        conversationId,
        type,
        userId: currentUser._id,
      });

      // Optimistic update
      setMessages((prev) => 
        prev.map(msg => {
          if (msg.id === messageId) {
            if (type === 'me') {
              return { ...msg, deletedFor: [...(msg.deletedFor || []), currentUser._id] };
            }
            return { ...msg, isDeletedForEveryone: true, message: '', fileUrl: '', fileName: '', deletedAt: new Date() };
          }
          return msg;
        })
      );
    },
    [currentUser, conversationId, isConnected]
  );

  // Clear all messages in the active conversation (for me)
  const clearConversation = useCallback(() => {
    if (!currentUser || !conversationId || !isConnected) return;

    const socket = getSocket();
    socket.emit('clear_conversation', { conversationId });

    // Instantly wipe messages from state
    setMessages([]);
    seenIds.current.clear();
  }, [currentUser, conversationId, isConnected]);

  // Forward message to multiple targets
  const forwardMessage = useCallback(
    (messageToForward: ChatMessage, targets: UserProfile[]) => {
      if (!currentUser || !isConnected) return;
      
      const socket = getSocket();
      targets.forEach((target) => {
        const targetConvId = [currentUser._id, target._id].sort().join('_');
        const forwardPayload = {
          conversationId: targetConvId,
          senderId: currentUser._id,
          senderName: currentUser.username,
          receiverId: target._id,
          receiverName: target.username,
          message: messageToForward.message,
          fileUrl: messageToForward.fileUrl,
          fileName: messageToForward.fileName,
          fileType: messageToForward.fileType,
        };
        socket.emit('send_message', forwardPayload);
      });
    },
    [currentUser, isConnected]
  );

  // Typing indicator triggers
  const emitTyping = useCallback(() => {
    if (!currentUser || !selectedTarget || !isConnected) return;
    const socket = getSocket();
    const isGroup = 'members' in selectedTarget;
    socket.emit('typing', {
      conversationId,
      senderId: currentUser._id,
      senderName: currentUser.username,
      receiverId: isGroup ? undefined : selectedTarget._id,
      groupId: isGroup ? selectedTarget._id : undefined,
    });
  }, [currentUser, selectedTarget, isConnected, conversationId]);

  const emitStopTyping = useCallback(() => {
    if (!currentUser || !selectedTarget || !isConnected) return;
    const socket = getSocket();
    const isGroup = 'members' in selectedTarget;
    socket.emit('stop_typing', {
      conversationId,
      senderId: currentUser._id,
      receiverId: isGroup ? undefined : selectedTarget._id,
      groupId: isGroup ? selectedTarget._id : undefined,
    });
  }, [currentUser, selectedTarget, isConnected, conversationId]);

  // React to message with emoji
  const reactToMessage = useCallback(
    (messageId: string, emoji: string) => {
      if (!currentUser || !isConnected) return;

      const socket = getSocket();
      socket.emit('react_message', {
        messageId,
        conversationId,
        emoji,
        userId: currentUser._id,
      });

      // Optimistic update
      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.id !== messageId) return msg;
          const reactions = { ...(msg.reactions || {}) };
          const userList = [...(reactions[emoji] || [])];
          const userIndex = userList.indexOf(currentUser._id);

          if (userIndex > -1) {
            userList.splice(userIndex, 1);
          } else {
            userList.push(currentUser._id);
          }

          if (userList.length === 0) {
            delete reactions[emoji];
          } else {
            reactions[emoji] = userList;
          }

          return { ...msg, reactions };
        })
      );
    },
    [currentUser, conversationId, isConnected]
  );

  return {
    isConnected,
    messages,
    callRecords,
    error,
    onlineUserIds,
    latestMessage,
    typingUser,
    sendMessage,
    forwardMessage,
    editMessage,
    deleteMessage,
    clearConversation,
    reactToMessage,
    emitTyping,
    emitStopTyping,
    fetchOlderMessages,
    hasMore,
    loadingOlder,
  };
}

export default useSocket;
