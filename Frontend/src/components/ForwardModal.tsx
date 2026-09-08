import React, { useState, useEffect } from 'react';
import { UserProfile, ChatMessage } from '../types/chat.types';
import { getAllUsersApi } from '../services/userService';
import './ForwardModal.css';

interface ForwardModalProps {
  currentUser: UserProfile;
  messageToForward: ChatMessage;
  onClose: () => void;
  onForward: (message: ChatMessage, targetUsers: UserProfile[]) => void;
}

export function ForwardModal({ currentUser, messageToForward, onClose, onForward }: ForwardModalProps) {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const res = await getAllUsersApi();
        if (res && res.success && Array.isArray(res.data)) {
          // Exclude current user
          setUsers(res.data.filter(u => u._id !== currentUser._id));
        }
      } catch (error) {
        console.error('Failed to fetch users for forwarding', error);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, [currentUser._id]);

  const filteredUsers = users.filter(u => 
    u.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleUser = (userId: string) => {
    setSelectedUsers(prev => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        // Optional: WhatsApp limits forwarding to 5 chats.
        if (next.size < 5) {
          next.add(userId);
        }
      }
      return next;
    });
  };

  const handleForward = () => {
    const targets = users.filter(u => selectedUsers.has(u._id));
    if (targets.length > 0) {
      onForward(messageToForward, targets);
    }
  };

  return (
    <div className="forward-modal-overlay" onClick={onClose}>
      <div className="forward-modal" onClick={e => e.stopPropagation()}>
        <div className="forward-header">
          <h3>Forward message to...</h3>
          <button className="forward-close-btn" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div className="forward-search">
          <input 
            type="text" 
            placeholder="Search contacts" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="forward-contacts">
          {loading ? (
            <div style={{ padding: '20px', textAlign: 'center', color: '#888' }}>Loading contacts...</div>
          ) : filteredUsers.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: '#888' }}>No contacts found.</div>
          ) : (
            filteredUsers.map(user => (
              <div 
                key={user._id} 
                className="forward-contact-item"
                onClick={() => toggleUser(user._id)}
              >
                <div className={`forward-checkbox ${selectedUsers.has(user._id) ? 'checked' : ''}`}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                </div>
                <div className="forward-avatar">
                  {user.avatar ? (
                    <img src={user.avatar} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    user.username.charAt(0).toUpperCase()
                  )}
                </div>
                <div className="forward-name">{user.username}</div>
              </div>
            ))
          )}
        </div>

        <div className="forward-footer">
          <button 
            className="forward-send-btn" 
            disabled={selectedUsers.size === 0}
            onClick={handleForward}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
            Send {selectedUsers.size > 0 && `(${selectedUsers.size})`}
          </button>
        </div>
      </div>
    </div>
  );
}
