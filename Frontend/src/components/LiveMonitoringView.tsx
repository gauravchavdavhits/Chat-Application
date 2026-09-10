import React, { useState, useEffect, useRef, useCallback } from 'react';
import { UserProfile, ScreenshotItem } from '../types/chat.types';
import { getSocket } from '../services/socket';
import {
  getMonitoringStatsApi,
  getUserScreenshotsApi,
  saveScreenshotApi,
  deleteScreenshotApi,
  MonitoringStats,
} from '../services/monitoringService';

interface LiveMonitoringViewProps {
  currentUser: UserProfile;
}

export function LiveMonitoringView({ currentUser }: LiveMonitoringViewProps) {
  const [stats, setStats] = useState<MonitoringStats | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [screenshots, setScreenshots] = useState<ScreenshotItem[]>([]);
  const [loadingScreenshots, setLoadingScreenshots] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isConnectingStream, setIsConnectingStream] = useState(false);
  const [intervalSeconds, setIntervalSeconds] = useState<number>(15);
  const [autoCaptureActive, setAutoCaptureActive] = useState<boolean>(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const autoCaptureTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const socket = getSocket();

  // Load telemetry stats & users
  const loadStats = useCallback(async () => {
    try {
      const res = await getMonitoringStatsApi();
      if (res.success) {
        setStats(res.data);
        if (!selectedUser && res.data.onlineUsers.length > 0) {
          const firstTarget = res.data.onlineUsers.find(u => u._id !== currentUser._id) || res.data.onlineUsers[0];
          setSelectedUser(firstTarget);
        }
      }
    } catch (err: any) {
      console.error('Failed to load stats:', err);
    }
  }, [currentUser._id, selectedUser]);

  // Load screenshots for selected user
  const loadScreenshots = useCallback(async (userId: string) => {
    setLoadingScreenshots(true);
    try {
      const res = await getUserScreenshotsApi(userId);
      if (res.success) {
        setScreenshots(res.data);
      }
    } catch (err: any) {
      console.error('Failed to load screenshots:', err);
    } finally {
      setLoadingScreenshots(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
    const interval = setInterval(loadStats, 5000);

    const handleUserStatusChanged = () => {
      loadStats();
    };

    socket.on('online_users_update', handleUserStatusChanged);
    socket.on('user_status_changed', handleUserStatusChanged);

    return () => {
      clearInterval(interval);
      socket.off('online_users_update', handleUserStatusChanged);
      socket.off('user_status_changed', handleUserStatusChanged);
    };
  }, [loadStats, socket]);

  useEffect(() => {
    if (selectedUser) {
      loadScreenshots(selectedUser._id);
    }
  }, [selectedUser, loadScreenshots]);

  // Capture canvas screenshot from live video feed
  const captureVideoSnapshot = useCallback(async (type: 'manual' | 'interval' = 'manual') => {
    if (!remoteVideoRef.current || !selectedUser) return;
    const video = remoteVideoRef.current;
    if (!video.videoWidth || !video.videoHeight) return;

    try {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Draw the exact video frame at native resolution
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Add a clean timestamp watermark bar
      const barHeight = Math.max(36, Math.floor(canvas.height * 0.045));
      const fontSize = Math.max(14, Math.floor(canvas.height * 0.022));
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(0, canvas.height - barHeight, canvas.width, barHeight);
      ctx.fillStyle = '#4ade80';
      ctx.font = `bold ${fontSize}px sans-serif`;
      ctx.textBaseline = 'middle';
      ctx.fillText(`● LIVE CAPTURE [${selectedUser.username}] - ${new Date().toLocaleString()}`, 20, canvas.height - (barHeight / 2));

      const base64Image = canvas.toDataURL('image/jpeg', 0.88);

      const res = await saveScreenshotApi({
        targetUserId: selectedUser._id,
        targetUsername: selectedUser.username,
        capturedBy: currentUser._id,
        capturedByName: currentUser.username,
        base64Image,
        captureType: type,
        intervalSeconds,
      });

      if (res.success && res.data) {
        setScreenshots(prev => [res.data, ...prev]);
        if (type === 'manual') {
          setSuccessMsg('High-resolution screenshot saved!');
          setTimeout(() => setSuccessMsg(''), 3000);
        }
      }
    } catch (err: any) {
      console.error('Error capturing screenshot:', err);
    }
  }, [selectedUser, currentUser, intervalSeconds]);

  // Handle automatic interval timer
  useEffect(() => {
    if (isStreaming && autoCaptureActive && intervalSeconds > 0) {
      if (autoCaptureTimer.current) clearInterval(autoCaptureTimer.current);
      autoCaptureTimer.current = setInterval(() => {
        captureVideoSnapshot('interval');
      }, intervalSeconds * 1000);
    } else {
      if (autoCaptureTimer.current) {
        clearInterval(autoCaptureTimer.current);
        autoCaptureTimer.current = null;
      }
    }
    return () => {
      if (autoCaptureTimer.current) {
        clearInterval(autoCaptureTimer.current);
        autoCaptureTimer.current = null;
      }
    };
  }, [isStreaming, autoCaptureActive, intervalSeconds, captureVideoSnapshot]);

  // Setup WebRTC connection for receiving screen stream
  const startMonitoringSession = (target: UserProfile) => {
    setIsConnectingStream(true);
    setIsStreaming(false);

    // Close any previous peer connection
    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }

    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
    });

    peerConnection.current = pc;

    pc.ontrack = (event) => {
      if (remoteVideoRef.current && event.streams[0]) {
        remoteVideoRef.current.srcObject = event.streams[0];
        setIsStreaming(true);
        setIsConnectingStream(false);
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('monitoring_ice_candidate', {
          targetUserId: target._id,
          candidate: event.candidate,
        });
      }
    };

    // Send monitoring request to target client
    socket.emit('admin_request_monitoring', {
      adminId: currentUser._id,
      adminName: currentUser.username,
      targetUserId: target._id,
      intervalSeconds,
    });
  };

  const stopMonitoringSession = () => {
    if (selectedUser) {
      socket.emit('admin_stop_monitoring', {
        targetUserId: selectedUser._id,
        adminId: currentUser._id,
      });
    }
    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
    setIsStreaming(false);
    setIsConnectingStream(false);
  };

  // Socket event listeners for stream signaling
  useEffect(() => {
    const handleUserOffer = async (data: { adminId: string; userId: string; username: string; sdp: any }) => {
      if (data.adminId !== currentUser._id) return;
      if (!peerConnection.current) {
        const pc = new RTCPeerConnection({
          iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
        });
        peerConnection.current = pc;
        pc.ontrack = (event) => {
          if (remoteVideoRef.current && event.streams[0]) {
            remoteVideoRef.current.srcObject = event.streams[0];
            setIsStreaming(true);
            setIsConnectingStream(false);
          }
        };
      }

      const pc = peerConnection.current;
      await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socket.emit('admin_monitoring_answer', {
        targetUserId: data.userId,
        adminId: currentUser._id,
        sdp: answer,
      });
    };

    const handleIceCandidate = async (data: { candidate: any }) => {
      if (peerConnection.current && data.candidate) {
        try {
          await peerConnection.current.addIceCandidate(new RTCIceCandidate(data.candidate));
        } catch (e) {
          console.error('Error adding ICE candidate:', e);
        }
      }
    };

    const handleNewScreenshot = (data: any) => {
      if (data.screenshot) {
        setScreenshots(prev => [data.screenshot, ...prev]);
      }
    };

    const handleUserRejected = (data: { username: string }) => {
      setIsConnectingStream(false);
      setIsStreaming(false);
      setErrorMsg(`${data.username} declined the screen sharing request.`);
      setTimeout(() => setErrorMsg(''), 5000);
    };

    const handleUserStopped = () => {
      stopMonitoringSession();
      setSuccessMsg(`Target user stopped sharing their screen.`);
      setTimeout(() => setSuccessMsg(''), 4000);
    };

    socket.on('user_monitoring_offer', handleUserOffer);
    socket.on('monitoring_ice_candidate', handleIceCandidate);
    socket.on('new_monitoring_screenshot', handleNewScreenshot);
    socket.on('user_monitoring_rejected', handleUserRejected);
    socket.on('user_monitoring_stopped', handleUserStopped);
    socket.on('admin_monitoring_stopped', handleUserStopped);

    return () => {
      socket.off('user_monitoring_offer', handleUserOffer);
      socket.off('monitoring_ice_candidate', handleIceCandidate);
      socket.off('new_monitoring_screenshot', handleNewScreenshot);
      socket.off('user_monitoring_rejected', handleUserRejected);
      socket.off('user_monitoring_stopped', handleUserStopped);
      socket.off('admin_monitoring_stopped', handleUserStopped);
    };
  }, [currentUser._id, socket]);

  const handleDeleteScreenshot = async (id: string) => {
    try {
      const res = await deleteScreenshotApi(id);
      if (res.success) {
        setScreenshots(prev => prev.filter(s => s._id !== id));
      }
    } catch (err: any) {
      setErrorMsg('Failed to delete screenshot');
      setTimeout(() => setErrorMsg(''), 3000);
    }
  };  return (
    <div style={{ display: 'flex', width: '100%', height: '100%', background: 'var(--bg-dark, #0b0f19)', color: 'var(--text-main, #fff)', overflow: 'hidden' }}>
      
      {/* ── Left Target Users Sidebar ──────────────────────── */}
      <div style={{
        width: '320px',
        flexShrink: 0,
        borderRight: '1px solid var(--border-color)',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--sidebar-bg, #131b2e)',
      }}>
        <div style={{ padding: '24px 20px', borderBottom: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '10px',
              background: 'linear-gradient(135deg, #ef4444, #f97316)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3"></circle>
                <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path>
              </svg>
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: 'var(--text-main)' }}>Live Monitoring</h2>
              <span style={{ fontSize: '12px', color: '#4ade80', fontWeight: '600' }}>● Real-Time Feed</span>
            </div>
          </div>

          {/* Quick Telemetry Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '16px' }}>
            <div style={{ background: 'var(--input-bg, #f1f5f9)', padding: '10px 12px', borderRadius: '12px', border: '1px solid var(--border-color)', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <span style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)' }}>Active Online</span>
              <div style={{ fontSize: '18px', fontWeight: '700', color: '#16a34a', marginTop: '2px' }}>{stats?.onlineCount ?? 0}</div>
            </div>
            <div style={{ background: 'var(--input-bg, #f1f5f9)', padding: '10px 12px', borderRadius: '12px', border: '1px solid var(--border-color)', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <span style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)' }}>Snapshots</span>
              <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--accent-color, #6366f1)', marginTop: '2px' }}>{stats?.totalScreenshots ?? 0}</div>
            </div>
          </div>
        </div>

        {/* User Selection List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', paddingLeft: '6px', paddingRight: '6px' }}>
            <p style={{ margin: 0, fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-muted, #94a3b8)' }}>
              Online Users
            </p>
            <span style={{ fontSize: '11px', background: 'rgba(74, 222, 128, 0.15)', color: '#4ade80', padding: '2px 8px', borderRadius: '10px', fontWeight: '600' }}>
              {stats?.onlineUsers?.length || 0} active
            </span>
          </div>

          {(!stats?.onlineUsers || stats.onlineUsers.length === 0) ? (
            <div style={{ textAlign: 'center', padding: '36px 12px', color: 'var(--text-muted, #94a3b8)' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
              </div>
              <p style={{ fontSize: '13px', margin: '0 0 4px', fontWeight: '600', color: 'var(--text-main, #fff)' }}>No users online</p>
              <p style={{ fontSize: '11.5px', margin: 0 }}>Active users with an open connection will appear here</p>
            </div>
          ) : (
            (stats.onlineUsers).map((u) => {
              const isSelected = selectedUser?._id === u._id;
              const isSelf = u._id === currentUser._id;
              return (
                <div
                  key={u._id}
                  onClick={() => {
                    if (selectedUser?._id !== u._id) {
                      stopMonitoringSession();
                      setSelectedUser(u);
                    }
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    background: isSelected ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                    border: isSelected ? '1px solid rgba(99, 102, 241, 0.4)' : '1px solid transparent',
                    marginBottom: '6px',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <div style={{ position: 'relative' }}>
                    <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700' }}>
                      {u.avatar ? <img src={u.avatar} alt={u.username} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : u.username.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ position: 'absolute', bottom: '0', right: '0', width: '12px', height: '12px', borderRadius: '50%', background: '#4ade80', border: '2px solid #131b2e' }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <h4 style={{ margin: 0, fontSize: '14px', fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {u.username} {isSelf && '(You)'}
                      </h4>
                    </div>
                    <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted, #94a3b8)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {u.email}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── Main Monitoring Stage ─────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto', padding: '24px 32px' }}>
        
        {/* Toast Notification */}
        {successMsg && (
          <div style={{ padding: '12px 18px', background: 'rgba(74, 222, 128, 0.15)', border: '1px solid rgba(74, 222, 128, 0.3)', color: '#4ade80', borderRadius: '12px', marginBottom: '16px', fontSize: '13px', fontWeight: '600' }}>
            {successMsg}
          </div>
        )}
        {errorMsg && (
          <div style={{ padding: '12px 18px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#f87171', borderRadius: '12px', marginBottom: '16px', fontSize: '13px', fontWeight: '600' }}>
            {errorMsg}
          </div>
        )}

        {selectedUser ? (
          <>
            {/* Header Control Toolbar */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px 20px',
              background: 'var(--bg-card, #131b2e)',
              borderRadius: '16px',
              border: '1px solid var(--border-color)',
              marginBottom: '20px',
              flexWrap: 'wrap',
              gap: '12px',
              boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ width: '46px', height: '46px', borderRadius: '14px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700' }}>
                  {selectedUser.avatar ? <img src={selectedUser.avatar} alt={selectedUser.username} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : selectedUser.username.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 style={{ margin: '0 0 2px 0', fontSize: '17px', fontWeight: '700', color: 'var(--text-main)' }}>{selectedUser.username}</h3>
                  <span style={{ fontSize: '12px', color: isStreaming ? '#16a34a' : 'var(--text-muted)' }}>
                    {isStreaming ? '● Live Stream Broadcasting' : 'Ready to Monitor'}
                  </span>
                </div>
              </div>

              {/* Action Buttons & Interval Select */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                
                {/* Interval Selector */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--input-bg, #f1f5f9)', padding: '6px 12px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Interval:</span>
                  <select
                    value={intervalSeconds}
                    onChange={(e) => setIntervalSeconds(Number(e.target.value))}
                    style={{
                      background: 'transparent',
                      color: 'var(--text-main)',
                      border: 'none',
                      fontSize: '12px',
                      fontWeight: '600',
                      outline: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    <option value={15}>Every 15s (Testing)</option>
                    <option value={30}>Every 30s</option>
                    <option value={60}>Every 1 min</option>
                    <option value={300}>Every 5 mins</option>
                    <option value={600}>Every 10 mins</option>
                    <option value={900}>Every 15 mins</option>
                    <option value={1800}>Every 30 mins</option>
                  </select>
                </div>

                {/* Auto Capture Toggle */}
                <button
                  type="button"
                  onClick={() => setAutoCaptureActive(!autoCaptureActive)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '10px',
                    background: autoCaptureActive ? 'rgba(74, 222, 128, 0.18)' : 'var(--input-bg, #f1f5f9)',
                    color: autoCaptureActive ? '#16a34a' : 'var(--text-muted)',
                    border: autoCaptureActive ? '1px solid rgba(74, 222, 128, 0.4)' : '1px solid var(--border-color)',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: 'pointer',
                  }}
                >
                  {autoCaptureActive ? '⏱ Auto-Capture ON' : '⏱ Auto-Capture OFF'}
                </button>

                {/* Instant Manual Snapshot Button */}
                {isStreaming && (
                  <button
                    type="button"
                    onClick={() => captureVideoSnapshot('manual')}
                    style={{
                      padding: '8px 14px',
                      borderRadius: '10px',
                      background: 'linear-gradient(135deg, #10b981, #059669)',
                      color: '#fff',
                      border: 'none',
                      fontSize: '12px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>
                    Take Snapshot
                  </button>
                )}

                {/* Start / Stop Stream Button */}
                {isStreaming ? (
                  <button
                    type="button"
                    onClick={stopMonitoringSession}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '10px',
                      background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                      color: '#fff',
                      border: 'none',
                      fontSize: '13px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect></svg>
                    Stop Monitoring
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => startMonitoringSession(selectedUser)}
                    disabled={isConnectingStream}
                    style={{
                      padding: '8px 18px',
                      borderRadius: '10px',
                      background: 'linear-gradient(135deg, var(--accent-color, #6366f1), #8b5cf6)',
                      color: '#fff',
                      border: 'none',
                      fontSize: '13px',
                      fontWeight: '600',
                      cursor: isConnectingStream ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      boxShadow: '0 4px 14px rgba(99, 102, 241, 0.35)',
                    }}
                  >
                    {isConnectingStream ? (
                      <>
                        <svg className="spin-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
                        Requesting Stream...
                      </>
                    ) : (
                      <>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                        Start Live Stream
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Video Viewport Card */}
            <div style={{
              width: '100%',
              minHeight: '380px',
              maxHeight: '520px',
              aspectRatio: '16 / 9',
              borderRadius: '20px',
              background: '#070b13',
              border: '1px solid var(--border-color, rgba(255,255,255,0.12))',
              position: 'relative',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 12px 36px rgba(0,0,0,0.6)',
              marginBottom: '28px',
            }}>
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                muted
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  display: isStreaming ? 'block' : 'none',
                }}
              />

              {!isStreaming && (
                <div style={{ textAlign: 'center', padding: '30px' }}>
                  <div style={{
                    width: '64px', height: '64px', borderRadius: '50%',
                    background: 'rgba(99, 102, 241, 0.1)',
                    border: '1px dashed rgba(99, 102, 241, 0.4)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 16px',
                  }}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--accent-color, #6366f1)" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>
                  </div>
                  <h3 style={{ margin: '0 0 6px 0', fontSize: '18px', fontWeight: '700' }}>Live Screen Stream Offline</h3>
                  <p style={{ margin: '0 0 16px 0', color: 'var(--text-muted, #94a3b8)', fontSize: '13px' }}>
                    Click "Start Live Stream" above to stream {selectedUser.username}'s desktop/tab in real-time.
                  </p>
                </div>
              )}
            </div>

            {/* ── Screenshot History Gallery ──────────────────── */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, fontSize: '17px', fontWeight: '700' }}>
                  Captured Activity Snapshots ({screenshots.length})
                </h3>
                <button
                  type="button"
                  onClick={() => selectedUser && loadScreenshots(selectedUser._id)}
                  style={{ background: 'none', border: 'none', color: 'var(--accent-color, #818cf8)', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}
                >
                  ↻ Refresh
                </button>
              </div>

              {loadingScreenshots ? (
                <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted, #94a3b8)' }}>Loading snapshots...</div>
              ) : screenshots.length === 0 ? (
                <div style={{
                  padding: '36px',
                  borderRadius: '16px',
                  background: 'var(--bg-card, #131b2e)',
                  border: '1px dashed var(--border-color, rgba(255,255,255,0.1))',
                  textAlign: 'center',
                  color: 'var(--text-muted, #94a3b8)',
                  fontSize: '13px',
                }}>
                  No screenshots recorded yet. Start live monitoring or click "Take Snapshot" to capture activity.
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '16px' }}>
                  {screenshots.map((s) => (
                    <div
                      key={s._id}
                      style={{
                        borderRadius: '14px',
                        overflow: 'hidden',
                        background: 'var(--bg-card, #131b2e)',
                        border: '1px solid var(--border-color, rgba(255,255,255,0.12))',
                        position: 'relative',
                        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                      }}
                    >
                      <div
                        onClick={() => setSelectedImage(s.imageUrl)}
                        style={{ height: '160px', overflow: 'hidden', cursor: 'pointer', position: 'relative', background: '#020617' }}
                      >
                        <img
                          src={s.imageUrl}
                          alt="Snapshot"
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'contain',
                            display: 'block',
                            background: '#020617'
                          }}
                        />
                        <span style={{
                          position: 'absolute', top: '8px', left: '8px',
                          background: 'rgba(0,0,0,0.75)',
                          backdropFilter: 'blur(4px)',
                          color: s.captureType === 'manual' ? '#10b981' : '#818cf8',
                          padding: '3px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: '700',
                          textTransform: 'uppercase',
                        }}>
                          {s.captureType}
                        </span>
                      </div>

                      <div style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(0,0,0,0.2)' }}>
                        <div style={{ fontSize: '11.5px', color: 'var(--text-muted, #94a3b8)', fontWeight: '500' }}>
                          {new Date(s.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteScreenshot(s._id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#ef4444',
                            cursor: 'pointer',
                            padding: '4px',
                            display: 'flex',
                            alignItems: 'center',
                          }}
                          title="Delete Screenshot"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--text-muted, #94a3b8)' }}>
            Please select an online user from the left sidebar to start monitoring.
          </div>
        )}
      </div>

      {/* ── High-Res Image Lightbox Modal ──────────────────── */}
      {selectedImage && (
        <div
          onClick={() => setSelectedImage(null)}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.85)',
            backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 99999,
            padding: '24px',
          }}
        >
          <div style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }}>
            <img src={selectedImage} alt="Full Resolution" style={{ maxWidth: '100%', maxHeight: '90vh', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.2)' }} />
            <button
              onClick={() => setSelectedImage(null)}
              style={{
                position: 'absolute', top: '-14px', right: '-14px',
                width: '32px', height: '32px', borderRadius: '50%',
                background: '#ef4444', color: '#fff', border: 'none',
                cursor: 'pointer', fontWeight: 'bold',
              }}
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
