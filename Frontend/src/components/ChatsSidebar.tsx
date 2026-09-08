import React, { useState, useEffect } from 'react';
import { UserProfile, ChatMessage, RecentChatUser } from '../types/chat.types';
import { getRecentChatUsersApi } from '../services/userService';
import { getSocket } from '../services/socket';

interface ChatsSidebarProps {
  currentUser: UserProfile;
  selectedFriend: UserProfile | null;
  onSelectFriend: (friend: UserProfile) => void;
  onlineUserIds: string[];
  latestMessage?: ChatMessage | null;
  unreadCounts?: Record<string, number>;
  refreshTrigger?: number;
}

export function ChatsSidebar({
  currentUser,
  selectedFriend,
  onSelectFriend,
  onlineUserIds = [],
  latestMessage,
  unreadCounts = {},
  refreshTrigger = 0,
}: ChatsSidebarProps) {
  const [recentChats, setRecentChats] = useState<RecentChatUser[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchRecentChats = async () => {
    try {
      setLoading(true);
      const res = await getRecentChatUsersApi(currentUser._id);
      if (res && res.success && Array.isArray(res.data)) {
        setRecentChats(res.data);
        
        // Auto-sync selectedFriend if their avatar or details changed
        if (selectedFriend) {
          const freshFriend = res.data.find(c => c.user._id === selectedFriend._id)?.user;
          if (freshFriend && (freshFriend.avatar !== selectedFriend.avatar || freshFriend.username !== selectedFriend.username)) {
            onSelectFriend(freshFriend);
          }
        }
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecentChats();
  }, [currentUser._id, refreshTrigger]);

  useEffect(() => {
    if (latestMessage) {
      // Refresh the list to update lastMessage and reorder
      fetchRecentChats();
    }
  }, [latestMessage]);

  useEffect(() => {
    const socket = getSocket();
    if (socket) {
      const handleConversationCleared = () => {
        fetchRecentChats();
      };
      socket.on('conversation_cleared', handleConversationCleared);
      return () => {
        socket.off('conversation_cleared', handleConversationCleared);
      };
    }
  }, [currentUser._id]);

  const formatTime = (timeStr?: string | Date) => {
    if (!timeStr) return '';
    const date = new Date(timeStr);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="sidebar-container">
      <div className="sidebar-logo">
        <h2>Chats</h2>
      </div>

      <div className="friends-list">
        {loading ? (
          <div className="loading-text">Loading chats...</div>
        ) : recentChats.length === 0 ? (
          <div className="no-users-text">No chats yet. Go to People to start one!</div>
        ) : (
          recentChats.map((chat) => {
            const friend = chat.user;
            const isSelected = selectedFriend?._id === friend._id;
            const isOnline = onlineUserIds.includes(friend._id);

            return (
              <div
                key={friend._id}
                className={`friend-item ${isSelected ? 'selected' : ''}`}
                onClick={() => onSelectFriend(friend)}
              >
                <div className="friend-avatar">
                  {friend.avatar ? (
                    <img src={friend.avatar} alt="Avatar" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                  ) : (
                    friend.username.charAt(0).toUpperCase()
                  )}
                  {isOnline && <span className="status-dot-mini online" style={{ position: 'absolute', bottom: '0', right: '0' }} />}
                </div>
                <div className="friend-info" style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div className="friend-name" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{friend.username}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{formatTime(chat.lastMessageTime)}</div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', paddingRight: '8px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      {chat.lastMessage?.includes('Video call') ? (
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--accent-color)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                          <polygon points="23 7 16 12 23 17 23 7"></polygon>
                          <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
                        </svg>
                      ) : chat.lastMessage?.includes('Voice call') ? (
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--accent-color)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                        </svg>
                      ) : chat.lastMessage === 'File attached' ? (
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                          <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path>
                        </svg>
                      ) : null}
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {chat.lastMessage?.replace(/^(📹|📞)\s*/, '') || 'Started a conversation'}
                      </span>
                    </div>
                  </div>
                </div>
                {unreadCounts[friend._id] > 0 && (
                  <div className="unread-badge">
                    {unreadCounts[friend._id] > 99 ? '99+' : unreadCounts[friend._id]}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
