import React, { useState, useEffect } from 'react';
import { UserProfile, GroupProfile } from '../types/chat.types';
import { getAllUsersApi, searchUsersApi } from '../services/userService';
import { createGroupApi } from '../services/groupService';

interface CreateGroupModalProps {
  currentUser: UserProfile;
  onClose: () => void;
  onGroupCreated: (group: GroupProfile) => void;
}

export function CreateGroupModal({ currentUser, onClose, onGroupCreated }: CreateGroupModalProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [groupName, setGroupName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchUsers = async (query?: string) => {
    try {
      setLoading(true);
      const res = query ? await searchUsersApi(query) : await getAllUsersApi();
      if (res && res.success && Array.isArray(res.data)) {
        setUsers(res.data.filter((u) => u._id !== currentUser._id));
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [currentUser._id]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchUsers(searchQuery.trim());
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const toggleUser = (userId: string) => {
    const newSet = new Set(selectedUserIds);
    if (newSet.has(userId)) {
      newSet.delete(userId);
    } else {
      newSet.add(userId);
    }
    setSelectedUserIds(newSet);
  };

  const handleNext = () => {
    if (selectedUserIds.size === 0) {
      setError('Please select at least one member.');
      return;
    }
    setError('');
    setStep(2);
  };

  const handleCreate = async () => {
    if (!groupName.trim()) {
      setError('Group name is required.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await createGroupApi(
        groupName.trim(),
        currentUser._id,
        Array.from(selectedUserIds)
      );
      if (res.success && res.data) {
        onGroupCreated(res.data);
      } else {
        setError('Failed to create group');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error creating group');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ width: '450px', maxWidth: '90%', position: 'relative' }}>
        <button 
          className="icon-btn" 
          onClick={onClose}
          style={{ position: 'absolute', top: '16px', right: '16px', background: 'var(--input-bg)', border: '1px solid var(--border-color)', borderRadius: '50%', padding: '6px', cursor: 'pointer' }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
        <h2 style={{ color: 'var(--text-main)', marginBottom: '16px', fontWeight: '700' }}>{step === 1 ? 'Add Members' : 'Group Info'}</h2>

        {error && <div className="error-banner">{error}</div>}

        {step === 1 && (
          <>
            <div style={{ marginBottom: '16px' }}>
              <input
                type="text"
                className="form-input"
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ width: '100%' }}
              />
            </div>
            <div style={{ maxHeight: '280px', overflowY: 'auto', marginBottom: '16px', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '6px', background: 'var(--input-bg)' }}>
              {loading && users.length === 0 ? (
                <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>
              ) : users.length === 0 ? (
                <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)' }}>No users found.</div>
              ) : (
                users.map((user) => {
                  const isSelected = selectedUserIds.has(user._id);
                  return (
                    <div
                      key={user._id}
                      onClick={() => toggleUser(user._id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '10px 12px',
                        cursor: 'pointer',
                        borderRadius: '8px',
                        backgroundColor: isSelected ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                        color: 'var(--text-main)',
                        transition: 'all 0.15s ease',
                        marginBottom: '2px',
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) e.currentTarget.style.backgroundColor = 'rgba(99, 102, 241, 0.08)';
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      <div 
                        style={{ 
                          width: '20px', 
                          height: '20px', 
                          borderRadius: '6px',
                          border: isSelected ? 'none' : '2px solid var(--border-color)',
                          backgroundColor: isSelected ? 'var(--accent-color, #6366f1)' : 'var(--bg-card)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginRight: '14px',
                          transition: 'all 0.2s',
                          flexShrink: 0,
                        }}
                      >
                        {isSelected && (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12"></polyline>
                          </svg>
                        )}
                      </div>
                      <div className="friend-avatar" style={{ width: '34px', height: '34px', marginRight: '12px' }}>
                        {user.avatar ? (
                          <img src={user.avatar} alt="Avatar" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                        ) : (
                          user.username.charAt(0).toUpperCase()
                        )}
                      </div>
                      <span style={{ fontWeight: isSelected ? '600' : '500', fontSize: '14.5px' }}>{user.username}</span>
                    </div>
                  );
                })
              )}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button 
                className="primary-btn" 
                onClick={handleNext} 
                disabled={selectedUserIds.size === 0}
                style={{ 
                  opacity: selectedUserIds.size === 0 ? 0.5 : 1,
                  cursor: selectedUserIds.size === 0 ? 'not-allowed' : 'pointer',
                  padding: '10px 24px'
                }}
              >
                Next ({selectedUserIds.size})
              </button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)' }}>Group Name</label>
              <input
                type="text"
                className="form-input"
                placeholder="Enter group name..."
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                autoFocus
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <button className="secondary-btn" onClick={() => setStep(1)}>Back</button>
              <button className="primary-btn" onClick={handleCreate} disabled={loading || !groupName.trim()}>
                {loading ? 'Creating...' : 'Create Group'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
