import React, { useState, useEffect } from 'react';
import { UserProfile, GroupProfile, RecentGroup } from '../types/chat.types';
import { getUserGroupsApi } from '../services/groupService';

interface GroupsSidebarProps {
  currentUser: UserProfile;
  selectedGroup: GroupProfile | null;
  onSelectGroup: (group: GroupProfile) => void;
  latestMessage: any;
  unreadCounts: Record<string, number>;
  onCreateGroupClick: () => void;
  refreshTrigger?: number;
}

export function GroupsSidebar({
  currentUser,
  selectedGroup,
  onSelectGroup,
  latestMessage,
  unreadCounts,
  onCreateGroupClick,
  refreshTrigger = 0,
}: GroupsSidebarProps) {
  const [groups, setGroups] = useState<RecentGroup[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchGroups = async () => {
    try {
      setLoading(true);
      const res = await getUserGroupsApi(currentUser._id);
      if (res && res.success && Array.isArray(res.data)) {
        setGroups(res.data);
        
        // If current selectedGroup is not in user's valid groups, deselect it
        if (selectedGroup) {
          const stillMember = res.data.some(g => g.group._id === selectedGroup._id);
          if (!stillMember) {
            onSelectGroup(null as any);
          }
        }
      } else {
        setGroups([]);
        if (selectedGroup) {
          onSelectGroup(null as any);
        }
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, [currentUser._id, refreshTrigger]);

  // Listen to new messages to re-fetch/reorder groups
  useEffect(() => {
    if (latestMessage && latestMessage.groupId) {
      fetchGroups(); // Simple approach: refetch when group message arrives
    }
  }, [latestMessage]);

  const formatTime = (timeStr?: string | Date) => {
    if (!timeStr) return '';
    const date = new Date(timeStr);
    const now = new Date();
    
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    if (now.getTime() - date.getTime() < 7 * 24 * 60 * 60 * 1000) {
      return date.toLocaleDateString([], { weekday: 'short' });
    }
    
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <div className="sidebar-container">
      <div className="sidebar-logo" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Groups</h2>
        <button 
          onClick={onCreateGroupClick}
          style={{ 
            width: '34px', 
            height: '34px', 
            borderRadius: '10px', 
            background: 'var(--accent-color, #6366f1)', 
            color: '#ffffff', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            cursor: 'pointer',
            border: 'none',
            boxShadow: '0 3px 10px rgba(99, 102, 241, 0.35)',
            transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.transform = 'translateY(-1px) scale(1.05)';
            e.currentTarget.style.boxShadow = '0 6px 16px rgba(99, 102, 241, 0.5)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.transform = 'translateY(0) scale(1)';
            e.currentTarget.style.boxShadow = '0 3px 10px rgba(99, 102, 241, 0.35)';
          }}
          title="Create Group"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
        </button>
      </div>

      <div className="friends-list">
        {loading ? (
          <div className="loading-text">Loading groups...</div>
        ) : groups.length === 0 ? (
          <div className="no-users-text">You are not part of any groups yet.</div>
        ) : (
          groups.map((item) => {
            const { group, lastMessage, lastMessageTime } = item;
            const unreadCount = unreadCounts[group._id] || 0;
            const isSelected = selectedGroup?._id === group._id;

            return (
              <div
                key={group._id}
                className={`friend-item ${isSelected ? 'selected' : ''}`}
                onClick={() => onSelectGroup(group)}
              >
                <div className="friend-avatar">
                  {group.avatar ? (
                    <img src={group.avatar} alt="Avatar" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                  ) : (
                    group.name.charAt(0).toUpperCase()
                  )}
                </div>
                <div className="friend-info">
                  <div className="friend-name-row">
                    <span className="friend-name">{group.name}</span>
                    {lastMessageTime && (
                      <span className="last-message-time">{formatTime(lastMessageTime)}</span>
                    )}
                  </div>
                  <div className="friend-status-row">
                    <span className="last-message-text" style={{ 
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      maxWidth: '160px',
                      color: lastMessage === '🚫 This message was deleted' ? 'rgba(255, 255, 255, 0.4)' : 'inherit',
                      fontStyle: lastMessage === '🚫 This message was deleted' ? 'italic' : 'normal',
                      display: 'inline-block'
                    }}>
                      {lastMessage || 'No messages yet'}
                    </span>
                    {unreadCount > 0 && (
                      <span className="unread-badge">{unreadCount}</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
