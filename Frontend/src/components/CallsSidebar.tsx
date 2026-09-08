import React, { useState, useEffect } from 'react';
import { UserProfile, CallRecord } from '../types/chat.types';
import { getUserCallHistoryApi } from '../services/callService';

interface CallsSidebarProps {
  currentUser: UserProfile;
  onCallUser: (userId: string, isVideoCall: boolean, name?: string, avatar?: string) => void;
  newCallHistoryTrigger: number;
}

export function CallsSidebar({ currentUser, onCallUser, newCallHistoryTrigger }: CallsSidebarProps) {
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'missed' | 'voice' | 'video'>('all');

  const fetchCalls = async () => {
    try {
      setLoading(true);
      const res = await getUserCallHistoryApi(currentUser._id);
      if (res && res.success && Array.isArray(res.data)) {
        setCalls(res.data);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCalls();
  }, [currentUser._id, newCallHistoryTrigger]);

  const filteredCalls = calls.filter((call) => {
    if (filter === 'all') return true;
    if (filter === 'missed') return call.status === 'missed';
    if (filter === 'voice') return call.callType === 'voice';
    if (filter === 'video') return call.callType === 'video';
    return true;
  });

  const formatTime = (timeStr?: string | Date) => {
    if (!timeStr) return '';
    const date = new Date(timeStr);
    const now = new Date();
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const getDurationText = (seconds: number) => {
    if (!seconds) return '0s';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  return (
    <div className="sidebar-container">
      <div className="sidebar-logo">
        <h2>Calls</h2>
      </div>

      <div style={{ display: 'flex', gap: '8px', padding: '16px 24px', overflowX: 'auto', borderBottom: '1px solid var(--border-color)' }}>
        {['all', 'missed', 'voice', 'video'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f as any)}
            style={{
              padding: '6px 12px',
              borderRadius: '16px',
              border: 'none',
              backgroundColor: filter === f ? 'var(--accent-color)' : 'var(--bg-secondary)',
              color: filter === f ? 'white' : 'var(--text-muted)',
              cursor: 'pointer',
              fontSize: '12px',
              textTransform: 'capitalize',
              whiteSpace: 'nowrap'
            }}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="friends-list">
        {loading ? (
          <div className="loading-text">Loading calls...</div>
        ) : filteredCalls.length === 0 ? (
          <div className="no-users-text">No calls found.</div>
        ) : (
          filteredCalls.map((call) => {
            const isOutgoing = call.callerId?._id === currentUser._id;
            const peer = isOutgoing ? call.receiverId : call.callerId;
            
            if (!peer) return null;

            const isMissed = call.status === 'missed';
            const statusColor = isMissed ? '#ff4444' : call.status === 'completed' ? '#00c853' : 'var(--text-muted)';
            
            return (
              <div
                key={call._id}
                className="friend-item"
                style={{ cursor: 'default' }}
              >
                <div className="friend-avatar">
                  {peer.avatar ? (
                    <img src={peer.avatar} alt="Avatar" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                  ) : (
                    peer.username.charAt(0).toUpperCase()
                  )}
                </div>
                <div className="friend-info">
                  <div className="friend-name-row">
                    <span className="friend-name" style={{ color: isMissed ? '#ff4444' : 'inherit' }}>
                      {peer.username}
                    </span>
                    <span className="last-message-time">{formatTime(call.createdAt)}</span>
                  </div>
                  <div className="friend-status-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={statusColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                        {isOutgoing ? (
                          <>
                            <line x1="7" y1="17" x2="17" y2="7"></line>
                            <polyline points="7 7 17 7 17 17"></polyline>
                          </>
                        ) : (
                          <>
                            <line x1="17" y1="7" x2="7" y2="17"></line>
                            <polyline points="17 17 7 17 7 7"></polyline>
                          </>
                        )}
                      </svg>
                      <span style={{ textTransform: 'capitalize' }}>
                        {isOutgoing ? 'Outgoing' : 'Incoming'} {call.callType} • {call.status} {call.status === 'completed' && `(${getDurationText(call.duration)})`}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button className="icon-btn" style={{ padding: '6px' }} onClick={() => onCallUser(peer._id, false, peer.username, peer.avatar)} title="Voice Call">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                        </svg>
                      </button>
                      <button className="icon-btn" style={{ padding: '6px' }} onClick={() => onCallUser(peer._id, true, peer.username, peer.avatar)} title="Video Call">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polygon points="23 7 16 12 23 17 23 7"></polygon>
                          <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
                        </svg>
                      </button>
                    </div>
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
