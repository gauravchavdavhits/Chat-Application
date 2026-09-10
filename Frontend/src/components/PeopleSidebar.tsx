import React, { useState, useEffect, useRef } from 'react';
import { UserProfile } from '../types/chat.types';
import { getAllUsersApi, searchUsersApi } from '../services/userService';

interface PeopleSidebarProps {
  currentUser: UserProfile;
  onlineUserIds: string[];
  onStartChat: (friend: UserProfile) => void;
}

export function PeopleSidebar({
  currentUser,
  onlineUserIds = [],
  onStartChat,
}: PeopleSidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchAllUsers = async () => {
    try {
      setLoading(true);
      const res = await getAllUsersApi();
      if (res && res.success && Array.isArray(res.data)) {
        const filtered = res.data.filter((u) => u._id !== currentUser._id);
        setUsers(filtered);
      }
    } catch (err) {
      console.error('Failed to load users in PeopleSidebar:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllUsers();
  }, [currentUser._id]);

  // Handle Search Input with debounce
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      fetchAllUsers();
      return;
    }

    try {
      setLoading(true);
      const res = await searchUsersApi(query.trim());
      if (res && res.success && Array.isArray(res.data)) {
        const filtered = res.data.filter((u) => u._id !== currentUser._id);
        setUsers(filtered);
      }
      setLoading(false);
    } catch {
      setLoading(false);
    }
  };

  const onSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    handleSearch(searchQuery);
  };

  const onSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);
    
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    searchTimeoutRef.current = setTimeout(() => {
      handleSearch(val);
    }, 500);
  };

  return (
    <div className="sidebar-container">
      <div className="sidebar-logo">
        <h2>People</h2>
      </div>

      {/* Search Input Bar */}
      <form className="sidebar-search-form" onSubmit={onSearchSubmit} style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '15px' }}>
        <div className="sidebar-search-wrapper">
          <svg className="sidebar-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            className="sidebar-search-input"
            placeholder="Find new people..."
            value={searchQuery}
            onChange={onSearchInputChange}
          />
          <button type="submit" style={{ display: 'none' }} />
        </div>
      </form>

      <div className="friends-list">
        <div className="friends-list-title">
          <span>ALL USERS</span>
          <button 
            type="button" 
            className="refresh-users-btn" 
            onClick={fetchAllUsers} 
            title="Refresh Users"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 4 23 10 17 10"></polyline>
              <polyline points="1 20 1 14 7 14"></polyline>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
            </svg>
          </button>
        </div>

        {loading ? (
          <div className="loading-text">Loading users...</div>
        ) : users.length === 0 ? (
          <div className="no-users-text" style={{ padding: '2rem 1.5rem', lineHeight: '1.6' }}>
            <div style={{ marginBottom: '8px', fontSize: '1.5rem' }}>👥</div>
            {searchQuery.trim() ? (
              "No users found matching your search. Try another username!"
            ) : (
              <div>
                <strong>No other users yet</strong>
                <p style={{ margin: '6px 0 0', fontSize: '0.78rem', opacity: 0.8 }}>
                  When other people register and join the app, they will appear here automatically.
                </p>
              </div>
            )}
          </div>
        ) : (
          users.map((friend) => {
            const isOnline = onlineUserIds.includes(friend._id);

            return (
              <div
                key={friend._id}
                className="friend-item"
                onClick={() => onStartChat(friend)}
              >
                <div className="friend-avatar">
                  {friend.avatar ? (
                    <img 
                      src={friend.avatar} 
                      alt="Avatar" 
                      style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} 
                      onError={(e) => {
                        (e.currentTarget as HTMLElement).style.display = 'none';
                        if (e.currentTarget.parentElement) {
                          e.currentTarget.parentElement.innerText = friend.username.charAt(0).toUpperCase();
                        }
                      }}
                    />
                  ) : (
                    friend.username.charAt(0).toUpperCase()
                  )}
                  {isOnline && <span className="status-dot-mini online" style={{ position: 'absolute', bottom: '0', right: '0' }} />}
                </div>
                <div className="friend-info">
                  <div className="friend-name">{friend.username}</div>
                  <div className="friend-status" style={{ color: isOnline ? '#22c55e' : 'var(--text-muted)' }}>
                    {isOnline ? 'Online' : 'Offline'}
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
