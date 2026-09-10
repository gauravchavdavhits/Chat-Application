import React, { useState, useEffect, useRef } from 'react';
import { CallState, Participant, ConnectionQuality } from '../hooks/useWebRTC';
import { UserProfile } from '../types/chat.types';
import { getAllUsersApi } from '../services/userService';
import { CustomSelect } from './CustomSelect';


interface CallModalProps {
  callState: CallState;
  participants?: Participant[];
  mutedParticipants?: string[];
  connectionQuality?: ConnectionQuality;
  currentUser?: UserProfile | null;
  localVideoRef: React.RefObject<HTMLVideoElement>;
  remoteVideoRef: React.RefObject<HTMLVideoElement>;
  answerCall: () => void;
  leaveCall: () => void;
  toggleMic: () => void;
  toggleVideo: () => void;
  toggleSpeaker: () => void;
  upgradeToVideo: () => void;
  localMicMuted: boolean;
  localVideoOff: boolean;
  speakerOn: boolean;
  isScreenSharing?: boolean;
  onStartScreenShare?: () => Promise<boolean>;
  onStopScreenShare?: () => Promise<void>;
  onSwitchCamera?: () => Promise<boolean>;
  onChangeAudioInput?: (deviceId: string) => Promise<void>;
  onChangeVideoInput?: (deviceId: string) => Promise<void>;
  onChangeAudioOutput?: (deviceId: string) => Promise<void>;
  onStartCall?: (userId: string, isVideoCall: boolean, name?: string, avatar?: string) => void;
  onInviteParticipant?: (user: UserProfile) => void;
}

export const CallModal: React.FC<CallModalProps> = ({
  callState,
  participants = [],
  mutedParticipants = [],
  connectionQuality = 'connected',
  currentUser,
  localVideoRef,
  remoteVideoRef,
  answerCall,
  leaveCall,
  toggleMic,
  toggleVideo,
  toggleSpeaker,
  upgradeToVideo,
  localMicMuted,
  localVideoOff,
  speakerOn,
  isScreenSharing,
  onStartScreenShare,
  onStopScreenShare,
  onSwitchCamera,
  onChangeAudioInput,
  onChangeVideoInput,
  onChangeAudioOutput,
  onStartCall,
  onInviteParticipant,
}) => {
  const [callDuration, setCallDuration] = useState(0);
  const [moreOptionsOpen, setMoreOptionsOpen] = useState(false);
  const [modalMessage, setModalMessage] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const modalContainerRef = useRef<HTMLDivElement>(null);

  // Sub-modals inside Call Modal
  const [showDeviceModal, setShowDeviceModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showAddParticipantModal, setShowAddParticipantModal] = useState(false);
  const [showParticipantsList, setShowParticipantsList] = useState(false);

  // Device lists
  const [audioInputDevices, setAudioInputDevices] = useState<MediaDeviceInfo[]>([]);
  const [audioOutputDevices, setAudioOutputDevices] = useState<MediaDeviceInfo[]>([]);
  const [videoInputDevices, setVideoInputDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedAudioInput, setSelectedAudioInput] = useState<string>('');
  const [selectedAudioOutput, setSelectedAudioOutput] = useState<string>('');
  const [selectedVideoInput, setSelectedVideoInput] = useState<string>('');

  // Add participant users list
  const [availableUsers, setAvailableUsers] = useState<UserProfile[]>([]);
  const [searchUserQuery, setSearchUserQuery] = useState('');
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [usersProfileMap, setUsersProfileMap] = useState<Record<string, UserProfile>>({});

  // Auto-fetch all user profiles on mount or call active to resolve participant names & avatars
  useEffect(() => {
    let isMounted = true;
    getAllUsersApi().then((res) => {
      if (isMounted && res.success && Array.isArray(res.data)) {
        const map: Record<string, UserProfile> = {};
        res.data.forEach((u) => {
          map[u._id] = u;
        });
        setUsersProfileMap(map);
      }
    }).catch(() => {});
    return () => {
      isMounted = false;
    };
  }, [callState.callAccepted, callState.isCalling, callState.isReceivingCall]);

  // Settings state
  const [noiseSuppression, setNoiseSuppression] = useState(true);
  const [echoCancellation, setEchoCancellation] = useState(true);
  const [autoGainControl, setAutoGainControl] = useState(true);
  const [videoQuality, setVideoQuality] = useState<'720p' | '1080p' | '480p'>('720p');

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Sync stream to remoteVideoRef whenever participants or call status change
  useEffect(() => {
    if (callState.callAccepted || callState.isCalling) {
      if (remoteVideoRef.current) {
        const stream = participants[0]?.stream;
        if (stream && remoteVideoRef.current.srcObject !== stream) {
          remoteVideoRef.current.srcObject = stream;
        }
        if (remoteVideoRef.current.srcObject) {
          remoteVideoRef.current.muted = false;
          remoteVideoRef.current.play().catch(() => {});
        }
      }
      if (localVideoRef.current && localVideoRef.current.srcObject) {
        localVideoRef.current.play().catch(() => {});
      }
    }
  }, [participants, callState.callAccepted, callState.isCalling, callState.isVideoCall, remoteVideoRef, localVideoRef]);

  const loadDevices = async () => {
    try {
      if (!navigator.mediaDevices?.enumerateDevices) return;
      const devices = await navigator.mediaDevices.enumerateDevices();
      setAudioInputDevices(devices.filter((d) => d.kind === 'audioinput'));
      setAudioOutputDevices(devices.filter((d) => d.kind === 'audiooutput'));
      setVideoInputDevices(devices.filter((d) => d.kind === 'videoinput'));
    } catch (err) {
      console.error('Error enumerating devices:', err);
    }
  };

  const loadAllUsers = async () => {
    try {
      setLoadingUsers(true);
      const res = await getAllUsersApi();
      if (res.success) {
        const map: Record<string, UserProfile> = {};
        res.data.forEach((u) => {
          map[u._id] = u;
        });
        setUsersProfileMap(map);

        const activeIds = new Set([
          currentUser?._id,
          callState.caller?.id,
          ...participants.map((p) => p.id),
        ]);
        const others = res.data.filter((u) => !activeIds.has(u._id));
        setAvailableUsers(others);
      }
    } catch (err) {
      console.error('Failed to load users for call invite:', err);
    } finally {
      setLoadingUsers(false);
    }
  };

  const toggleFullscreen = async () => {
    setMoreOptionsOpen(false);
    try {
      if (!document.fullscreenElement) {
        if (modalContainerRef.current?.requestFullscreen) {
          await modalContainerRef.current.requestFullscreen();
        } else if ((modalContainerRef.current as any)?.webkitRequestFullscreen) {
          await (modalContainerRef.current as any).webkitRequestFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if ((document as any).webkitExitFullscreen) {
          await (document as any).webkitExitFullscreen();
        }
      }
    } catch (err) {
      console.error('Error toggling fullscreen:', err);
      setModalMessage('Could not enter fullscreen mode.');
    }
  };

  const handleScreenShareToggle = async () => {
    setMoreOptionsOpen(false);
    if (isScreenSharing) {
      if (onStopScreenShare) await onStopScreenShare();
    } else {
      if (onStartScreenShare) {
        const ok = await onStartScreenShare();
        if (!ok) setModalMessage('Could not start screen sharing. Permission denied or unsupported.');
      }
    }
  };

  const handleSwitchCamera = async () => {
    setMoreOptionsOpen(false);
    if (onSwitchCamera) {
      const ok = await onSwitchCamera();
      if (!ok) setModalMessage('Could not switch camera. Check if additional cameras are available.');
    }
  };

  const handleOpenAudioDevices = async () => {
    setMoreOptionsOpen(false);
    await loadDevices();
    setShowDeviceModal(true);
  };

  const handleOpenSettings = async () => {
    setMoreOptionsOpen(false);
    await loadDevices();
    setShowSettingsModal(true);
  };

  const handleOpenAddParticipant = async () => {
    setMoreOptionsOpen(false);
    await loadAllUsers();
    setShowAddParticipantModal(true);
  };

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (callState.callAccepted) {
      setCallDuration(0);
      interval = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else {
      setCallDuration(0);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [callState.callAccepted]);

  // Keep remoteVideoRef attached whenever participants list or streams change
  useEffect(() => {
    if (callState.callAccepted) {
      const activeStream = participants[0]?.stream;
      if (activeStream && remoteVideoRef.current) {
        // Always force-assign srcObject (browser needs this to pick up new tracks)
        remoteVideoRef.current.srcObject = activeStream;
        remoteVideoRef.current.muted = false;
        remoteVideoRef.current.play().catch(() => {});
      }
      // Delayed retry in case the video element wasn't ready on first pass
      const timer = setTimeout(() => {
        const stream = participants[0]?.stream;
        if (stream && remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = stream;
          remoteVideoRef.current.muted = false;
          remoteVideoRef.current.play().catch(() => {});
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [participants, callState.callAccepted, callState.isVideoCall, remoteVideoRef]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (!callState.isReceivingCall && !callState.isCalling && !callState.callAccepted) {
    return null;
  }

  const filteredUsers = availableUsers.filter((u) =>
    u.username.toLowerCase().includes(searchUserQuery.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchUserQuery.toLowerCase())
  );

  // Total call participants count including yourself
  const totalCount = 1 + (participants.length > 0 ? participants.length : (callState.caller ? 1 : 0));

  return (
    <div className={`call-modal-overlay ${isFullscreen ? 'is-fullscreen' : ''}`} ref={modalContainerRef}>
      <div className={`call-modal-content ${callState.callAccepted ? (callState.isVideoCall ? 'active-video-call' : 'active-audio-call') : 'pending-call'} ${isFullscreen ? 'is-fullscreen' : ''}`}>
        
        {/* INCOMING CALL */}
        {callState.isReceivingCall && !callState.callAccepted && (
          <div className="call-status-container">
            <h2>Incoming {callState.isVideoCall ? 'Video' : 'Voice'} Call</h2>
            <div className="caller-info">
              <div className="caller-avatar" style={{ overflow: 'hidden' }}>
                {callState.caller?.avatar ? (
                  <img src={callState.caller.avatar} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  callState.caller?.name ? callState.caller.name.charAt(0).toUpperCase() : 'U'
                )}
              </div>
              <h3>{callState.caller?.name || 'Incoming Call'}</h3>
              <p>is calling you...</p>
            </div>
            <div className="call-actions">
              <button className="btn-decline" onClick={leaveCall}>
                Decline
              </button>
              <button className="btn-accept" onClick={answerCall}>
                Accept
              </button>
            </div>
          </div>
        )}

        {/* OUTGOING CALL */}
        {callState.isCalling && !callState.callAccepted && (
          <div className="call-status-container">
            <h2>Calling...</h2>
            <div className="caller-info">
              <div className="caller-avatar" style={{ overflow: 'hidden' }}>
                {callState.caller?.avatar ? (
                  <img src={callState.caller.avatar} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  callState.caller?.name && callState.caller.name !== 'Calling...' ? callState.caller.name.charAt(0).toUpperCase() : '📞'
                )}
              </div>
              <h3>{callState.caller?.name || 'Calling...'}</h3>
              <p>Ringing...</p>
            </div>
            <div className="call-actions">
              <button className="btn-decline" onClick={leaveCall}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* ACTIVE CALL */}
        {callState.callAccepted && (
          <div className="active-call-container">
            {/* Top header with timer, network quality badge, and participant count */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '4px 12px', marginBottom: '10px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  background: 'rgba(0,0,0,0.4)', padding: '4px 10px', borderRadius: '20px',
                  color: '#e2e8f0', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px'
                }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }}></span>
                  {formatTime(callDuration)}
                </div>

                {/* Connection Quality Status Badge */}
                {(() => {
                  const isConnected = connectionQuality === 'connected' || (callState.callAccepted && connectionQuality !== 'failed');
                  const isFailed = connectionQuality === 'failed';
                  
                  return (
                    <div style={{
                      padding: '4px 9px', borderRadius: '20px', fontSize: '11.5px', fontWeight: 600,
                      display: 'flex', alignItems: 'center', gap: '5px',
                      background: isConnected ? 'rgba(34, 197, 94, 0.15)' :
                                  isFailed ? 'rgba(239, 68, 68, 0.2)' :
                                  'rgba(234, 179, 8, 0.2)',
                      color: isConnected ? '#4ade80' :
                             isFailed ? '#f87171' : '#facc15',
                      border: `1px solid ${
                        isConnected ? 'rgba(34, 197, 94, 0.3)' :
                        isFailed ? 'rgba(239, 68, 68, 0.4)' :
                        'rgba(234, 179, 8, 0.4)'
                      }`
                    }}>
                      <span style={{
                        width: 6, height: 6, borderRadius: '50%',
                        background: isConnected ? '#22c55e' :
                                    isFailed ? '#ef4444' : '#eab308'
                      }}></span>
                      {isConnected ? 'HD Secure' :
                       isFailed ? 'Disconnected' : 'Connecting...'}
                    </div>
                  );
                })()}
              </div>

              <button
                onClick={() => setShowParticipantsList(!showParticipantsList)}
                style={{
                  background: 'rgba(99, 102, 241, 0.2)', border: '1px solid rgba(99, 102, 241, 0.4)',
                  color: '#e0e7ff', padding: '5px 12px', borderRadius: '20px',
                  cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px',
                  fontWeight: 500
                }}
                title="View active participants"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                {totalCount} {totalCount === 1 ? 'Person' : 'People'}
              </button>
            </div>

            {callState.isVideoCall ? (
              <div className={`video-grid ${participants.length > 1 ? 'multi-participant-grid' : ''}`} style={{ position: 'relative' }}>
                {isScreenSharing && (
                  <div style={{
                    position: 'absolute', top: 12, left: 12, zIndex: 10,
                    background: 'rgba(99, 102, 241, 0.9)', color: 'white',
                    padding: '4px 10px', borderRadius: '6px', fontSize: '12px',
                    fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px'
                  }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }}></span>
                    Sharing Screen
                  </div>
                )}

                {/* Caller Mute Indicator for main peer */}
                {callState.caller && mutedParticipants.includes(callState.caller.id) && (
                  <div style={{
                    position: 'absolute', top: 12, right: 12, zIndex: 10,
                    background: 'rgba(239, 68, 68, 0.85)', color: 'white',
                    padding: '4px 8px', borderRadius: '20px', fontSize: '11px',
                    display: 'flex', alignItems: 'center', gap: '4px'
                  }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="1" y1="1" x2="23" y2="23"></line><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"></path><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"></path></svg>
                    Muted
                  </div>
                )}
                
                {/* Main Remote Video */}
                <video
                  playsInline
                  ref={remoteVideoRef}
                  autoPlay
                  onLoadedMetadata={(e) => {
                    (e.currentTarget as HTMLVideoElement).play().catch(() => {});
                  }}
                  className="remote-video"
                />

                {/* Additional Participants Videos (for 3+ people) */}
                {participants.length > 1 && (
                  <div className="additional-participants-row">
                    {participants.slice(1).map((p) => {
                      const userObj = usersProfileMap[p.id];
                      const displayName = (p.name && p.name !== 'Participant' && p.name !== 'Group Member') ? p.name : (userObj?.username || p.name || 'User');
                      return (
                        <div key={p.id} className="participant-video-tile" style={{ position: 'relative' }}>
                          <video
                            playsInline
                            autoPlay
                            ref={(el) => {
                              if (el && p.stream) el.srcObject = p.stream;
                            }}
                          />
                          <div className="participant-tile-name">
                            {displayName} {mutedParticipants.includes(p.id) ? '🔇' : ''}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Local Video Thumbnail */}
                <video
                  playsInline
                  muted
                  ref={localVideoRef}
                  autoPlay
                  onLoadedMetadata={(e) => {
                    (e.currentTarget as HTMLVideoElement).play().catch(() => {});
                  }}
                  className={`local-video ${localVideoOff ? 'hidden' : ''}`}
                />
              </div>
            ) : (
              <div className="audio-call-ui">
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', justifyContent: 'center', alignItems: 'center', margin: '16px 0' }}>
                  {/* Local user avatar */}
                  <div style={{ textAlign: 'center' }}>
                    <div className="caller-avatar active-audio" style={{ width: 84, height: 84, fontSize: '2rem', overflow: 'hidden', position: 'relative' }}>
                      {currentUser?.avatar ? (
                        <img src={currentUser.avatar} alt="You" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        currentUser?.username?.charAt(0).toUpperCase() || 'You'
                      )}
                      {localMicMuted && (
                        <div style={{ position: 'absolute', bottom: 0, right: 0, background: '#ef4444', borderRadius: '50%', padding: '4px', display: 'flex' }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><line x1="1" y1="1" x2="23" y2="23"></line><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"></path></svg>
                        </div>
                      )}
                    </div>
                    <div style={{ fontSize: '13px', color: '#cbd5e1', marginTop: '4px' }}>You {localMicMuted ? '(Muted)' : ''}</div>
                  </div>

                  {/* Remote / other participants */}
                  {participants.length > 0 ? (
                    participants.map((p) => {
                      const userObj = usersProfileMap[p.id];
                      const displayName = (p.name && p.name !== 'Participant' && p.name !== 'Group Member') ? p.name : (userObj?.username || p.name || 'User');
                      const displayAvatar = p.avatar || userObj?.avatar;
                      const initial = displayName.charAt(0).toUpperCase() || 'U';
                      const isPeerMuted = mutedParticipants.includes(p.id);

                      return (
                        <div key={p.id} style={{ textAlign: 'center' }}>
                          <div className="caller-avatar active-audio" style={{ width: 84, height: 84, fontSize: '2rem', overflow: 'hidden', position: 'relative' }}>
                            {displayAvatar ? (
                              <img src={displayAvatar} alt={displayName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              initial
                            )}
                            {isPeerMuted && (
                              <div style={{ position: 'absolute', bottom: 0, right: 0, background: '#ef4444', borderRadius: '50%', padding: '4px', display: 'flex' }}>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><line x1="1" y1="1" x2="23" y2="23"></line><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"></path></svg>
                              </div>
                            )}
                          </div>
                          <div style={{ fontSize: '13px', color: '#cbd5e1', marginTop: '4px', maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {displayName} {isPeerMuted ? '(Muted)' : ''}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div style={{ textAlign: 'center' }}>
                      <div className="caller-avatar active-audio" style={{ width: 84, height: 84, fontSize: '2rem', overflow: 'hidden', position: 'relative' }}>
                        {callState.caller?.avatar ? (
                          <img src={callState.caller.avatar} alt="Caller" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          callState.caller?.name ? callState.caller.name.charAt(0).toUpperCase() : 'U'
                        )}
                        {callState.caller && mutedParticipants.includes(callState.caller.id) && (
                          <div style={{ position: 'absolute', bottom: 0, right: 0, background: '#ef4444', borderRadius: '50%', padding: '4px', display: 'flex' }}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><line x1="1" y1="1" x2="23" y2="23"></line><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"></path></svg>
                          </div>
                        )}
                      </div>
                      <div style={{ fontSize: '13px', color: '#cbd5e1', marginTop: '4px', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {callState.caller?.name || 'In Call'} {callState.caller && mutedParticipants.includes(callState.caller.id) ? '(Muted)' : ''}
                      </div>
                    </div>
                  )}
                </div>

                {/* Persistent audio playback elements for all participants */}
                <audio
                  playsInline
                  ref={remoteVideoRef}
                  autoPlay
                  controls={false}
                  style={{ position: 'fixed', left: '-9999px', opacity: 0, pointerEvents: 'none' }}
                />
                {participants.map((p) => (
                  <audio
                    key={`audio_${p.id}`}
                    playsInline
                    autoPlay
                    controls={false}
                    ref={(el) => {
                      if (el && p.stream && el.srcObject !== p.stream) {
                        el.srcObject = p.stream;
                        el.play().catch((e) => console.warn('Audio participant playback warning:', e));
                      }
                    }}
                    style={{ position: 'fixed', left: '-9999px', opacity: 0, pointerEvents: 'none' }}
                  />
                ))}
              </div>
            )}

            <div className="active-call-controls">
              <button 
                className={`control-btn ${localMicMuted ? 'muted' : ''}`} 
                onClick={toggleMic}
                title={localMicMuted ? "Unmute" : "Mute"}
              >
                {localMicMuted ? (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="1" y1="1" x2="23" y2="23"></line>
                    <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"></path>
                    <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"></path>
                    <line x1="12" y1="19" x2="12" y2="23"></line>
                    <line x1="8" y1="23" x2="16" y2="23"></line>
                  </svg>
                ) : (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                    <line x1="12" y1="19" x2="12" y2="23"></line>
                    <line x1="8" y1="23" x2="16" y2="23"></line>
                  </svg>
                )}
              </button>

              {!callState.isVideoCall && (
                <button className="control-btn" onClick={toggleSpeaker} title={speakerOn ? "Speaker ON" : "Speaker OFF"}>
                  {speakerOn ? (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                      <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                      <path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
                    </svg>
                  ) : (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                      <line x1="23" y1="9" x2="17" y2="15"></line>
                      <line x1="17" y1="9" x2="23" y2="15"></line>
                    </svg>
                  )}
                </button>
              )}

              {!callState.isVideoCall && (
                <button className="control-btn" onClick={upgradeToVideo} title="Switch to Video Call">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="23 7 16 12 23 17 23 7"></polygon>
                    <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
                  </svg>
                </button>
              )}

              {callState.isVideoCall && (
                <button 
                  className={`control-btn ${localVideoOff ? 'muted' : ''}`} 
                  onClick={toggleVideo}
                  title={localVideoOff ? "Turn on camera" : "Turn off camera"}
                >
                  {localVideoOff ? (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M16 16v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2m5.66 0H14a2 2 0 0 1 2 2v3.34l1 1L23 7v10"></path>
                      <line x1="1" y1="1" x2="23" y2="23"></line>
                    </svg>
                  ) : (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="23 7 16 12 23 17 23 7"></polygon>
                      <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
                    </svg>
                  )}
                </button>
              )}

              <div className="more-options-container">
                <button className="control-btn" onClick={() => setMoreOptionsOpen(!moreOptionsOpen)} title="More options">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="1"></circle>
                    <circle cx="12" cy="5" r="1"></circle>
                    <circle cx="12" cy="19" r="1"></circle>
                  </svg>
                </button>
                {moreOptionsOpen && (
                  <div className="more-options-dropdown">
                    {callState.isVideoCall && (
                      <button onClick={handleScreenShareToggle}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>
                        {isScreenSharing ? 'Stop Sharing' : 'Screen Share'}
                      </button>
                    )}
                    <button onClick={toggleFullscreen}>
                      {isFullscreen ? (
                        <>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"></path></svg>
                          Exit Full Screen
                        </>
                      ) : (
                        <>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path></svg>
                          Full Screen
                        </>
                      )}
                    </button>
                    {callState.isVideoCall && (
                      <button onClick={handleSwitchCamera}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>
                        Switch Camera
                      </button>
                    )}
                    <button onClick={handleOpenAudioDevices}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 18v-6a9 9 0 0 1 18 0v6"></path><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"></path></svg>
                      Speaker / Audio
                    </button>
                    <button onClick={handleOpenSettings}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="3"></circle>
                        <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path>
                      </svg>
                      Settings
                    </button>
                    <button onClick={handleOpenAddParticipant}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><line x1="20" y1="8" x2="20" y2="14"></line><line x1="23" y1="11" x2="17" y2="11"></line></svg>
                      Add participant
                    </button>
                  </div>
                )}
              </div>

              <button className="control-btn end-call" onClick={leaveCall} title="Leave Call">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-3.33-2.67m-2.67-3.34a19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91"></path>
                  <line x1="23" y1="1" x2="1" y2="23"></line>
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* PARTICIPANTS ROSTER MODAL */}
        {showParticipantsList && (
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.65)', display: 'flex', 
            justifyContent: 'center', alignItems: 'center', zIndex: 1000,
            backdropFilter: 'blur(6px)', padding: '20px'
          }}>
            <div style={{
              backgroundColor: '#1E1E2E', padding: '24px', borderRadius: '16px',
              width: '100%', maxWidth: '380px', color: 'white',
              boxShadow: '0 15px 35px rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.1)',
              textAlign: 'left'
            }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                Call Participants ({totalCount})
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
                {/* You */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                      {currentUser?.username?.charAt(0).toUpperCase() || 'Y'}
                    </div>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 500 }}>{currentUser?.username} (You)</div>
                      <div style={{ fontSize: '12px', color: '#22c55e' }}>Connected</div>
                    </div>
                  </div>
                  <span style={{ fontSize: '12px', color: localMicMuted ? '#ef4444' : '#22c55e' }}>
                    {localMicMuted ? 'Muted' : 'Mic ON'}
                  </span>
                </div>

                {/* Other Joined Participants */}
                {participants.length > 0 ? (
                  participants.map((p) => {
                    const userObj = usersProfileMap[p.id];
                    const displayName = (p.name && p.name !== 'Participant' && p.name !== 'Group Member') ? p.name : (userObj?.username || p.name || 'User');
                    const displayAvatar = p.avatar || userObj?.avatar;
                    const initial = displayName.charAt(0).toUpperCase() || 'U';

                    return (
                      <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', overflow: 'hidden' }}>
                            {displayAvatar ? (
                              <img src={displayAvatar} alt={displayName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              initial
                            )}
                          </div>
                          <div>
                            <div style={{ fontSize: '14px', fontWeight: 500 }}>{displayName}</div>
                            <div style={{ fontSize: '12px', color: '#22c55e' }}>In Call</div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  callState.caller && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', overflow: 'hidden' }}>
                          {callState.caller.avatar ? (
                            <img src={callState.caller.avatar} alt={callState.caller.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            callState.caller.name.charAt(0).toUpperCase()
                          )}
                        </div>
                        <div>
                          <div style={{ fontSize: '14px', fontWeight: 500 }}>{callState.caller.name}</div>
                          <div style={{ fontSize: '12px', color: '#22c55e' }}>In Call</div>
                        </div>
                      </div>
                    </div>
                  )
                )}
              </div>

              <button 
                onClick={() => setShowParticipantsList(false)}
                style={{
                  background: '#6366f1', color: 'white', border: 'none', 
                  padding: '10px', borderRadius: '8px', cursor: 'pointer',
                  fontWeight: '600', width: '100%'
                }}
              >
                Done
              </button>
            </div>
          </div>
        )}

        {/* SPEAKER / AUDIO DEVICE SELECTOR MODAL */}
        {showDeviceModal && (
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.65)', display: 'flex', 
            justifyContent: 'center', alignItems: 'center', zIndex: 1000,
            backdropFilter: 'blur(8px)', padding: '20px'
          }}>
            <div style={{
              backgroundColor: '#1E1E2E', padding: '24px', borderRadius: '18px',
              width: '100%', maxWidth: '380px', color: 'white',
              boxShadow: '0 20px 40px rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.12)',
              textAlign: 'left'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 18v-6a9 9 0 0 1 18 0v6"></path><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"></path></svg>
                  Audio & Video Devices
                </h3>
                <button
                  onClick={() => setShowDeviceModal(false)}
                  style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '18px' }}
                >
                  ✕
                </button>
              </div>

              {/* Microphone Select */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12.5px', color: '#94a3b8', marginBottom: '6px', fontWeight: 500 }}>Microphone</label>
                <CustomSelect
                  value={selectedAudioInput}
                  onChange={(val) => {
                    setSelectedAudioInput(val);
                    if (onChangeAudioInput) onChangeAudioInput(val);
                  }}
                  options={[
                    {
                      value: '',
                      label: 'Default Microphone',
                      description: 'System default audio input',
                      icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>
                    },
                    ...audioInputDevices.map((d, i) => ({
                      value: d.deviceId,
                      label: d.label || `Microphone ${i + 1}`,
                      icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path></svg>
                    }))
                  ]}
                />
              </div>

              {/* Speaker Select */}
              {audioOutputDevices.length > 0 && (
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '12.5px', color: '#94a3b8', marginBottom: '6px', fontWeight: 500 }}>Speaker / Output</label>
                  <CustomSelect
                    value={selectedAudioOutput}
                    onChange={(val) => {
                      setSelectedAudioOutput(val);
                      if (onChangeAudioOutput) onChangeAudioOutput(val);
                    }}
                    options={[
                      {
                        value: '',
                        label: 'Default Speaker',
                        description: 'System default audio output',
                        icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>
                      },
                      ...audioOutputDevices.map((d, i) => ({
                        value: d.deviceId,
                        label: d.label || `Speaker ${i + 1}`,
                        icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon></svg>
                      }))
                    ]}
                  />
                </div>
              )}

              {/* Camera Select */}
              {callState.isVideoCall && videoInputDevices.length > 0 && (
                <div style={{ marginBottom: '18px' }}>
                  <label style={{ display: 'block', fontSize: '12.5px', color: '#94a3b8', marginBottom: '6px', fontWeight: 500 }}>Camera</label>
                  <CustomSelect
                    value={selectedVideoInput}
                    onChange={(val) => {
                      setSelectedVideoInput(val);
                      if (onChangeVideoInput) onChangeVideoInput(val);
                    }}
                    options={[
                      {
                        value: '',
                        label: 'Default Camera',
                        description: 'System default video device',
                        icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 7l-7 5 7 5V7z"></path><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>
                      },
                      ...videoInputDevices.map((d, i) => ({
                        value: d.deviceId,
                        label: d.label || `Camera ${i + 1}`,
                        icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 7l-7 5 7 5V7z"></path><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>
                      }))
                    ]}
                  />
                </div>
              )}

              <button 
                onClick={() => setShowDeviceModal(false)}
                className="modal-submit-btn"
                style={{
                  background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                  color: 'white', border: 'none', 
                  padding: '11px', borderRadius: '10px', cursor: 'pointer',
                  fontWeight: '600', width: '100%', marginTop: '6px',
                  boxShadow: '0 4px 14px rgba(99, 102, 241, 0.4)'
                }}
              >
                Apply & Done
              </button>
            </div>
          </div>
        )}

        {/* CALL SETTINGS MODAL */}
        {showSettingsModal && (
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.65)', display: 'flex', 
            justifyContent: 'center', alignItems: 'center', zIndex: 1000,
            backdropFilter: 'blur(8px)', padding: '20px'
          }}>
            <div style={{
              backgroundColor: '#1E1E2E', padding: '24px', borderRadius: '18px',
              width: '100%', maxWidth: '380px', color: 'white',
              boxShadow: '0 20px 40px rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.12)',
              textAlign: 'left'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="3"></circle>
                    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path>
                  </svg>
                  Call Settings
                </h3>
                <button
                  onClick={() => setShowSettingsModal(false)}
                  style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '18px' }}
                >
                  ✕
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '14px', cursor: 'pointer', padding: '6px 0' }}>
                  <span>Noise Suppression</span>
                  <input 
                    type="checkbox" 
                    checked={noiseSuppression} 
                    onChange={(e) => setNoiseSuppression(e.target.checked)} 
                    style={{ width: '18px', height: '18px', accentColor: '#6366f1', cursor: 'pointer' }}
                  />
                </label>

                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '14px', cursor: 'pointer', padding: '6px 0' }}>
                  <span>Echo Cancellation</span>
                  <input 
                    type="checkbox" 
                    checked={echoCancellation} 
                    onChange={(e) => setEchoCancellation(e.target.checked)} 
                    style={{ width: '18px', height: '18px', accentColor: '#6366f1', cursor: 'pointer' }}
                  />
                </label>

                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '14px', cursor: 'pointer', padding: '6px 0' }}>
                  <span>Auto Gain Control</span>
                  <input 
                    type="checkbox" 
                    checked={autoGainControl} 
                    onChange={(e) => setAutoGainControl(e.target.checked)} 
                    style={{ width: '18px', height: '18px', accentColor: '#6366f1', cursor: 'pointer' }}
                  />
                </label>

                {callState.isVideoCall && (
                  <div style={{ marginTop: '8px' }}>
                    <label style={{ display: 'block', fontSize: '12.5px', color: '#94a3b8', marginBottom: '6px', fontWeight: 500 }}>Video Quality</label>
                    <CustomSelect
                      value={videoQuality}
                      onChange={(val) => setVideoQuality(val as any)}
                      options={[
                        {
                          value: '480p',
                          label: 'Standard (480p)',
                          description: 'Low bandwidth & battery saver',
                          icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>
                        },
                        {
                          value: '720p',
                          label: 'High Definition (720p)',
                          description: 'Smooth HD clarity',
                          icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>
                        },
                        {
                          value: '1080p',
                          label: 'Full HD (1080p)',
                          description: 'Maximum visual detail & resolution',
                          icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>
                        }
                      ]}
                    />
                  </div>
                )}
              </div>


              <button 
                onClick={() => {
                  setShowSettingsModal(false);
                  setModalMessage('Audio and video settings updated successfully.');
                }}
                className="modal-submit-btn"
                style={{
                  background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                  color: 'white', border: 'none', 
                  padding: '11px', borderRadius: '10px', cursor: 'pointer',
                  fontWeight: '600', width: '100%',
                  boxShadow: '0 4px 14px rgba(99, 102, 241, 0.4)'
                }}
              >
                Save Settings
              </button>
            </div>
          </div>
        )}

        {/* ADD PARTICIPANT MODAL */}
        {showAddParticipantModal && (
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.65)', display: 'flex', 
            justifyContent: 'center', alignItems: 'center', zIndex: 1000,
            backdropFilter: 'blur(6px)', padding: '20px'
          }}>
            <div style={{
              backgroundColor: '#1E1E2E', padding: '24px', borderRadius: '16px',
              width: '100%', maxWidth: '400px', color: 'white',
              boxShadow: '0 15px 35px rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.1)',
              textAlign: 'left', display: 'flex', flexDirection: 'column', maxHeight: '80vh'
            }}>
              <h3 style={{ margin: '0 0 12px 0', fontSize: '18px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><line x1="20" y1="8" x2="20" y2="14"></line><line x1="23" y1="11" x2="17" y2="11"></line></svg>
                Invite Participant
              </h3>
              <p style={{ fontSize: '13px', color: '#94a3b8', margin: '0 0 14px 0' }}>
                Invite other registered users to join this active call.
              </p>

              <input 
                type="text"
                placeholder="Search user..."
                value={searchUserQuery}
                onChange={(e) => setSearchUserQuery(e.target.value)}
                style={{
                  width: '100%', padding: '10px 14px', background: '#2D2D3F',
                  color: 'white', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px',
                  marginBottom: '12px'
                }}
              />

              <div style={{ flex: 1, overflowY: 'auto', maxHeight: '220px', marginBottom: '16px' }}>
                {loadingUsers ? (
                  <div style={{ textAlign: 'center', padding: '16px', color: '#94a3b8' }}>Loading users...</div>
                ) : filteredUsers.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '16px', color: '#94a3b8' }}>No available users found.</div>
                ) : (
                  filteredUsers.map((u) => (
                    <div 
                      key={u._id}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '8px 10px', borderRadius: '8px', background: 'rgba(255,255,255,0.03)',
                        marginBottom: '6px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          width: '32px', height: '32px', borderRadius: '50%',
                          background: '#6366f1', display: 'flex', alignItems: 'center',
                          justifyContent: 'center', fontWeight: 'bold', fontSize: '13px'
                        }}>
                          {u.username.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontSize: '14px', fontWeight: 500 }}>{u.username}</div>
                          <div style={{ fontSize: '11px', color: '#94a3b8' }}>{u.email}</div>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          setShowAddParticipantModal(false);
                          setModalMessage(`Call invitation sent to ${u.username}!`);
                          if (onInviteParticipant) {
                            onInviteParticipant(u);
                          } else if (onStartCall) {
                            onStartCall(u._id, callState.isVideoCall, u.username, u.avatar);
                          }
                        }}
                        style={{
                          background: '#22c55e', color: 'white', border: 'none',
                          padding: '6px 12px', borderRadius: '6px', cursor: 'pointer',
                          fontSize: '12px', fontWeight: 600
                        }}
                      >
                        Invite
                      </button>
                    </div>
                  ))
                )}
              </div>

              <button 
                onClick={() => setShowAddParticipantModal(false)}
                style={{
                  background: 'rgba(255,255,255,0.1)', color: 'white', border: 'none', 
                  padding: '10px', borderRadius: '8px', cursor: 'pointer',
                  fontWeight: '600', width: '100%'
                }}
              >
                Close
              </button>
            </div>
          </div>
        )}

        {/* CUSTOM INFO TOAST / DIALOG */}
        {modalMessage && (
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', 
            justifyContent: 'center', alignItems: 'center', zIndex: 1100,
            backdropFilter: 'blur(4px)'
          }}>
            <div style={{
              backgroundColor: '#1E1E2E', padding: '24px', borderRadius: '12px',
              maxWidth: '300px', textAlign: 'center', color: 'white',
              boxShadow: '0 10px 25px rgba(0,0,0,0.5)', border: '1px solid #333'
            }}>
              <p style={{ margin: '0 0 20px 0', fontSize: '15px', lineHeight: '1.5' }}>{modalMessage}</p>
              <button 
                onClick={() => setModalMessage(null)}
                style={{
                  background: '#6366f1', color: 'white', border: 'none', 
                  padding: '10px 24px', borderRadius: '8px', cursor: 'pointer',
                  fontWeight: '600', width: '100%'
                }}
              >
                Got it
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
