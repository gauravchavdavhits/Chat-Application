import React, { useState, useEffect } from 'react';
import { UserProfile, GroupProfile } from '../types/chat.types';
import { updateGroupApi, leaveGroupApi } from '../services/groupService';
import { getAllUsersApi, searchUsersApi } from '../services/userService';
import { ConfirmModal } from './ConfirmModal';

interface GroupDetailsModalProps {
  group: GroupProfile;
  currentUser: UserProfile;
  onClose: () => void;
  onGroupUpdated: (group: GroupProfile) => void;
  onGroupLeft: (groupId: string) => void;
}

export function GroupDetailsModal({ group, currentUser, onClose, onGroupUpdated, onGroupLeft }: GroupDetailsModalProps) {
  const isAdmin = group.adminId === currentUser._id;
  
  const [name, setName] = useState(group.name);
  const [editingName, setEditingName] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // For adding members
  const [showAddMembers, setShowAddMembers] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  
  // Real members list (in a real app we'd fetch the full user profiles for the member IDs)
  // Here we just fetch all users and filter
  const [memberProfiles, setMemberProfiles] = useState<UserProfile[]>([]);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const res = await getAllUsersApi();
        if (res.success && Array.isArray(res.data)) {
          setMemberProfiles(res.data.filter(u => group.members.includes(u._id)));
          setUsers(res.data.filter(u => !group.members.includes(u._id)));
        }
      } catch (e) {
        // ignore
      }
    };
    fetchAll();
  }, [group.members]);

  const handleUpdateName = async () => {
    if (!name.trim() || name === group.name) {
      setEditingName(false);
      return;
    }
    setLoading(true);
    try {
      const res = await updateGroupApi(group._id, { name, adminId: currentUser._id });
      if (res.success) {
        onGroupUpdated(res.data);
        setEditingName(false);
      }
    } catch (e: any) {
      setError('Failed to update group name');
    } finally {
      setLoading(false);
    }
  };

  const handleAddMember = async (userId: string) => {
    setLoading(true);
    try {
      const newMembers = [...group.members, userId];
      const res = await updateGroupApi(group._id, { members: newMembers, adminId: currentUser._id });
      if (res.success) {
        onGroupUpdated(res.data);
      }
    } catch (e: any) {
      setError('Failed to add member');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    setLoading(true);
    try {
      const newMembers = group.members.filter(id => id !== userId);
      const res = await updateGroupApi(group._id, { members: newMembers, adminId: currentUser._id });
      if (res.success) {
        onGroupUpdated(res.data);
      }
    } catch (e: any) {
      setError('Failed to remove member');
    } finally {
      setLoading(false);
    }
  };

  const handleLeaveGroup = () => {
    setShowLeaveConfirm(true);
  };

  const performLeaveGroup = async () => {
    setLoading(true);
    try {
      const res = await leaveGroupApi(group._id, currentUser._id);
      if (res.success) {
        onGroupLeft(group._id);
      }
    } catch (e: any) {
      setError('Failed to leave group');
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ width: '420px', maxWidth: '92%', borderRadius: '20px', padding: '22px 20px', maxHeight: '86vh', display: 'flex', flexDirection: 'column' }}>
        <button className="modal-close" onClick={onClose} title="Close">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
        
        {/* Header & Avatar */}
        <div style={{ textAlign: 'center', marginBottom: '16px' }}>
          <div style={{ width: '68px', height: '68px', margin: '0 auto 10px auto', position: 'relative' }}>
            {group.avatar ? (
              <img src={group.avatar} alt="Avatar" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--border-color)' }} />
            ) : (
              <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', fontSize: '26px', fontWeight: 'bold', boxShadow: '0 6px 16px rgba(99, 102, 241, 0.35)' }}>
                {group.name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          
          {editingName ? (
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginTop: '6px' }}>
              <input 
                type="text" 
                className="form-input" 
                value={name} 
                onChange={e => setName(e.target.value)} 
                autoFocus
                style={{ maxWidth: '220px', padding: '6px 12px', fontSize: '14px' }}
              />
              <button className="primary-btn" style={{ padding: '6px 14px', fontSize: '13px' }} onClick={handleUpdateName} disabled={loading}>Save</button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '700', color: 'var(--text-main)' }}>{group.name}</h2>
              {isAdmin && (
                <button 
                  className="icon-btn" 
                  onClick={() => setEditingName(true)} 
                  title="Edit Name"
                  style={{ width: '26px', height: '26px', borderRadius: '6px', background: 'var(--input-bg)', border: '1px solid var(--border-color)', color: 'var(--text-muted)' }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
                  </svg>
                </button>
              )}
            </div>
          )}
          <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '3px', fontWeight: '500' }}>
            {group.members.length} members
          </div>
        </div>

        {error && <div className="error-banner" style={{ marginBottom: '12px', padding: '8px', fontSize: '12px' }}>⚠️ {error}</div>}

        {/* Members Section */}
        <div style={{ marginBottom: '16px', flex: 1, overflowY: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <h3 style={{ margin: 0, fontSize: '0.85rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)' }}>Members</h3>
            {isAdmin && !showAddMembers && (
              <button 
                type="button"
                onClick={() => setShowAddMembers(true)}
                style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'rgba(99, 102, 241, 0.12)', border: '1px solid rgba(99, 102, 241, 0.25)', color: 'var(--accent-color)', borderRadius: '6px', padding: '4px 8px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s' }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                Add Member
              </button>
            )}
          </div>
          
          {showAddMembers && (
            <div style={{ marginBottom: '12px', padding: '12px', backgroundColor: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <h4 style={{ margin: 0, fontSize: '0.85rem', fontWeight: '600' }}>Add Member</h4>
                <button 
                  type="button"
                  onClick={() => setShowAddMembers(false)} 
                  style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'var(--input-bg)', border: '1px solid var(--border-color)', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 }}
                  title="Cancel"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
              </div>
              <input 
                type="text" 
                className="form-input" 
                placeholder="Search user by username..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ marginBottom: '8px', width: '100%', boxSizing: 'border-box', padding: '6px 10px', fontSize: '13px' }}
              />
              <div className="custom-scroll" style={{ maxHeight: '110px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {users.filter(u => u.username.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '8px', fontSize: '11px', color: 'var(--text-muted)' }}>No available users found</div>
                ) : (
                  users.filter(u => u.username.toLowerCase().includes(searchQuery.toLowerCase())).map(u => (
                    <div key={u._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 8px', borderRadius: '6px', background: 'var(--input-bg)' }}>
                      <span style={{ fontSize: '13px', fontWeight: '500' }}>{u.username}</span>
                      <button className="primary-btn" style={{ padding: '3px 8px', fontSize: '11px', borderRadius: '5px' }} onClick={() => handleAddMember(u._id)} disabled={loading}>Add</button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          <div className="custom-scroll" style={{ maxHeight: '180px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '4px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
            {memberProfiles.map(member => (
              <div key={member._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 8px', borderRadius: '6px', transition: 'background 0.2s', background: 'var(--input-bg)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--accent-gradient)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 'bold' }}>
                    {member.avatar ? (
                      <img src={member.avatar} alt="Avatar" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                    ) : (
                      member.username.charAt(0).toUpperCase()
                    )}
                  </div>
                  <span style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-main)' }}>
                    {member.username} 
                    {member._id === group.adminId && (
                      <span style={{ marginLeft: '6px', fontSize: '10px', padding: '1px 5px', borderRadius: '4px', background: 'rgba(99, 102, 241, 0.15)', color: 'var(--accent-color)', fontWeight: '600' }}>Admin</span>
                    )}
                  </span>
                </div>
                {isAdmin && member._id !== currentUser._id && (
                  <button 
                    type="button"
                    style={{ background: 'rgba(239, 68, 68, 0.1)', border: 'none', color: '#ef4444', width: '24px', height: '24px', borderRadius: '5px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s' }} 
                    onClick={() => handleRemoveMember(member._id)} 
                    disabled={loading} 
                    title="Remove Member"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Leave/Delete Group Action */}
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '4px' }}>
          <button 
            className="secondary-btn" 
            style={{ color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.35)', background: 'rgba(239, 68, 68, 0.06)', width: '100%', padding: '9px 0', fontSize: '13.5px', borderRadius: '10px' }}
            onClick={handleLeaveGroup}
            disabled={loading}
          >
            {isAdmin && group.members.length === 1 ? 'Delete Group' : 'Leave Group'}
          </button>
        </div>
      </div>
      
      {showLeaveConfirm && (
        <ConfirmModal
          title={isAdmin && group.members.length === 1 ? 'Delete Group' : 'Leave Group'}
          message={isAdmin && group.members.length === 1 ? 'Are you sure you want to delete this group? This cannot be undone.' : 'Are you sure you want to leave this group?'}
          confirmText={isAdmin && group.members.length === 1 ? 'Delete' : 'Leave'}
          isDestructive={true}
          onConfirm={() => {
            setShowLeaveConfirm(false);
            performLeaveGroup();
          }}
          onCancel={() => setShowLeaveConfirm(false)}
        />
      )}
    </div>
  );
}
