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
        </div>

        {loading ? (
          <div className="loading-text">Loading users...</div>
        ) : users.length === 0 ? (
          <div className="no-users-text">
            {searchQuery.trim() ? "No users found. Try another username!" : "No registered users found."}
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
                    <img src={friend.avatar} alt="Avatar" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
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
