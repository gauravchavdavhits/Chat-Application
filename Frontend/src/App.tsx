import React, { useState, useEffect, useRef } from 'react';
import { UserProfile } from './types/chat.types';
import { AuthModal } from './components/AuthModal';
import { ChatsSidebar } from './components/ChatsSidebar';
import { PeopleSidebar } from './components/PeopleSidebar';
import { ChatWindow } from './components/ChatWindow';
import { CallModal } from './components/CallModal';
import { useSocket } from './hooks/useSocket';
import { useWebRTC } from './hooks/useWebRTC';
import { MainNavBar, TabType } from './components/MainNavBar';
import { GroupsSidebar } from './components/GroupsSidebar';
import { CreateGroupModal } from './components/CreateGroupModal';
import { GroupDetailsModal } from './components/GroupDetailsModal';
import { CallsPlaceholder } from './components/Placeholders';
import { CallsSidebar } from './components/CallsSidebar';
import { SettingsView } from './components/SettingsView';
import { LiveMonitoringView } from './components/LiveMonitoringView';
import { ScreenShareConsentModal } from './components/ScreenShareConsentModal';
import { useMonitoringStreamer } from './hooks/useMonitoringStreamer';
import { getSocket } from './services/socket';
import { getUserByIdApi } from './services/userService';
import './App.css';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('chats');
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem('chat_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [selectedFriend, setSelectedFriend] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem('selected_friend');
    return saved ? JSON.parse(saved) : null;
  });
  
  const [selectedGroup, setSelectedGroup] = useState<any | null>(() => {
    const saved = localStorage.getItem('selected_group');
    if (!saved) return null;
    try {
      const parsed = JSON.parse(saved);
      const savedUser = localStorage.getItem('chat_user');
      const curUser = savedUser ? JSON.parse(savedUser) : null;
      if (curUser && parsed.members && !parsed.members.includes(curUser._id)) {
        localStorage.removeItem('selected_group');
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  });

  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showGroupDetails, setShowGroupDetails] = useState(false);
  const [newCallHistoryTrigger, setNewCallHistoryTrigger] = useState(0);
  const [groupRefreshTrigger, setGroupRefreshTrigger] = useState(0);

  const handleAuthSuccess = (user: UserProfile) => {
    setCurrentUser(user);
    localStorage.setItem('chat_user', JSON.stringify(user));
    setSelectedFriend(null);
    setSelectedGroup(null);
    localStorage.removeItem('selected_friend');
    localStorage.removeItem('selected_group');
  };

  const handleLogout = () => {
    import('./services/authService').then(m => m.logoutApi());
    setCurrentUser(null);
    setSelectedFriend(null);
    setSelectedGroup(null);
    localStorage.removeItem('auth_token');
    localStorage.removeItem('chat_user');
    localStorage.removeItem('selected_friend');
    localStorage.removeItem('selected_group');
  };

  const handleUpdateCurrentUser = (updatedUser: UserProfile) => {
    setCurrentUser((prev) => {
      const merged = {
        ...prev,
        ...updatedUser,
        settings: updatedUser.settings || prev?.settings || {
          privacy: { onlineVisibility: 'everyone', lastSeenVisibility: 'everyone', readReceipts: true, blockedUsers: [] },
          notifications: { messages: true, calls: true, sounds: true },
          appearance: { mode: 'dark', themeColor: '#6366f1', wallpaper: '' },
          chat: { enterToSend: true, fontSize: 'medium' }
        }
      };
      localStorage.setItem('chat_user', JSON.stringify(merged));
      return merged;
    });
  };

  // Client-side screen streaming hook when requested by an authorized admin
  const {
    isBeingMonitored,
    activeAdminName,
    pendingRequest,
    acceptScreenShare,
    rejectScreenShare,
    stopStreaming: stopScreenStreaming,
  } = useMonitoringStreamer(currentUser);

  // Initialize socket connection and message history
  const { isConnected, messages, callRecords, sendMessage, forwardMessage, editMessage, deleteMessage, clearConversation, reactToMessage, onlineUserIds, error, latestMessage, typingUser, emitTyping, emitStopTyping, fetchOlderMessages, hasMore, loadingOlder } = useSocket(
    currentUser,
    activeTab === 'groups' ? selectedGroup : selectedFriend
  );

  const {
    callState,
    participants,
    mutedParticipants,
    connectionQuality,
    localVideoRef,
    remoteVideoRef,
    callUser,
    startGroupCall,
    answerCall,
    leaveCall,
    inviteParticipant,
    toggleMic,
    toggleVideo,
    toggleSpeaker,
    upgradeToVideo,
    localMicMuted,
    localVideoOff,
    speakerOn,
    isScreenSharing,
    startScreenShare,
    stopScreenShare,
    switchCamera,
    changeAudioInput,
    changeVideoInput,
    changeAudioOutput,
  } = useWebRTC(currentUser);

  const handleCallUser = (targetId: string, isVideoCall: boolean, name?: string, avatar?: string) => {
    // If target matches currently selected group, initiate a group call
    if (selectedGroup && selectedGroup._id === targetId) {
      startGroupCall(selectedGroup, isVideoCall);
      return;
    }

    let targetName = name;
    let targetAvatar = avatar;
    if (!targetName && selectedFriend && selectedFriend._id === targetId) {
      targetName = selectedFriend.username;
      targetAvatar = selectedFriend.avatar;
    }
    callUser(targetId, isVideoCall, targetName, targetAvatar);
  };

  const handleSelectFriend = (friend: UserProfile) => {
    setSelectedFriend(friend);
    setUnreadCounts((prev) => {
      const newCounts = { ...prev };
      delete newCounts[friend._id];
      return newCounts;
    });
    localStorage.setItem('selected_friend', JSON.stringify(friend));
  };
  
  const handleSelectGroup = (group: any) => {
    setSelectedGroup(group || null);
    if (group && group._id) {
      setUnreadCounts((prev) => {
        const newCounts = { ...prev };
        delete newCounts[group._id];
        return newCounts;
      });
      localStorage.setItem('selected_group', JSON.stringify(group));
    } else {
      localStorage.removeItem('selected_group');
    }
  };

  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const lastProcessedMessageId = useRef<string | null>(null);

  useEffect(() => {
    if (latestMessage && latestMessage.id !== lastProcessedMessageId.current) {
      lastProcessedMessageId.current = latestMessage.id;
      if (
        latestMessage.senderId !== currentUser?._id &&
        latestMessage.senderId !== selectedFriend?._id
      ) {
        setUnreadCounts((prev) => ({
          ...prev,
          [latestMessage.senderId]: (prev[latestMessage.senderId] || 0) + 1,
        }));
      }
    }
  }, [latestMessage, currentUser?._id, selectedFriend?._id, selectedGroup?._id]);

  useEffect(() => {
    if (selectedFriend?._id) {
      getUserByIdApi(selectedFriend._id).then((res) => {
        if (res.success && res.data) {
          if (res.data.avatar !== selectedFriend.avatar || res.data.username !== selectedFriend.username) {
            setSelectedFriend(res.data);
            localStorage.setItem('selected_friend', JSON.stringify(res.data));
          }
        }
      }).catch(() => {});
    }
  }, [selectedFriend?._id]);

  useEffect(() => {
    const socket = getSocket();
    if (socket) {
      const handleHistoryUpdate = () => setNewCallHistoryTrigger(prev => prev + 1);
      socket.on('call_history_updated', handleHistoryUpdate);
      return () => {
        socket.off('call_history_updated', handleHistoryUpdate);
      };
    }
  }, []);

  // Apply settings dynamically (theme mode, theme color, font size)
  useEffect(() => {
    const root = document.documentElement;
    const settings = currentUser?.settings;
    
    // 1. Theme Mode (light / dark / system) - default to dark
    const mode = settings?.appearance?.mode || 'dark';
    if (mode === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    } else {
      root.setAttribute('data-theme', mode);
    }

    // 2. Accent color & gradient dynamic update
    if (settings?.appearance?.themeColor) {
      const color = settings.appearance.themeColor;
      root.style.setProperty('--accent-color', color);
      root.style.setProperty('--accent-gradient', `linear-gradient(135deg, ${color} 0%, #8b5cf6 50%, #ec4899 100%)`);
      root.style.setProperty('--own-bubble', `linear-gradient(135deg, ${color} 0%, ${color}cc 100%)`);
    }
    
    // 3. Font size
    if (settings?.chat?.fontSize) {
      root.setAttribute('data-font-size', settings.chat.fontSize);
    }
  }, [currentUser?.settings]);

  // If not logged in, show Auth Modal
  if (!currentUser) {
    return <AuthModal onAuthSuccess={handleAuthSuccess} />;
  }

  // Logged in – show main app layout
  return (
    <div className="app-layout">
      <MainNavBar 
        activeTab={activeTab} 
        onTabChange={setActiveTab} 
        currentUser={currentUser} 
      />

      {activeTab === 'chats' && (
        <>
          <ChatsSidebar
            currentUser={currentUser}
            selectedFriend={selectedFriend}
            onSelectFriend={handleSelectFriend}
            onlineUserIds={onlineUserIds}
            latestMessage={latestMessage}
            unreadCounts={unreadCounts}
          />
          <ChatWindow
            currentUser={currentUser}
            selectedTarget={selectedFriend}
            messages={messages}
            callRecords={callRecords}
            sendMessage={sendMessage}
            forwardMessage={forwardMessage}
            editMessage={editMessage}
            deleteMessage={deleteMessage}
            clearConversation={clearConversation}
            reactToMessage={reactToMessage}
            isConnected={isConnected}
            error={error}
            typingUser={typingUser}
            emitTyping={emitTyping}
            emitStopTyping={emitStopTyping}
            fetchOlderMessages={fetchOlderMessages}
            hasMore={hasMore}
            loadingOlder={loadingOlder}
            onlineUserIds={onlineUserIds}
            callUser={handleCallUser}
            enterToSend={currentUser?.settings?.chat?.enterToSend ?? true}
          />
        </>
      )}

      {activeTab === 'people' && (
        <>
          <PeopleSidebar
            currentUser={currentUser}
            onlineUserIds={onlineUserIds}
            onStartChat={(friend) => {
              handleSelectFriend(friend);
              setActiveTab('chats');
            }}
          />
          <div className="chat-window" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-muted)' }}>
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5, marginBottom: '16px' }}>
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
            <h2>Find someone new</h2>
            <p style={{ marginTop: '8px' }}>Select a person from the sidebar to start a conversation.</p>
          </div>
        </>
      )}
      {activeTab === 'groups' && (
        <>
          <GroupsSidebar
            currentUser={currentUser}
            selectedGroup={selectedGroup}
            onSelectGroup={handleSelectGroup}
            latestMessage={latestMessage}
            unreadCounts={unreadCounts}
            onCreateGroupClick={() => setShowCreateGroup(true)}
            refreshTrigger={groupRefreshTrigger}
          />
          {selectedGroup ? (
            <ChatWindow
              currentUser={currentUser}
              selectedTarget={selectedGroup}
              messages={messages}
              sendMessage={sendMessage}
              forwardMessage={forwardMessage}
              editMessage={editMessage}
              deleteMessage={deleteMessage}
              clearConversation={clearConversation}
              reactToMessage={reactToMessage}
              isConnected={isConnected}
              error={error}
              typingUser={typingUser}
              emitTyping={emitTyping}
              emitStopTyping={emitStopTyping}
              fetchOlderMessages={fetchOlderMessages}
              hasMore={hasMore}
              loadingOlder={loadingOlder}
              onlineUserIds={onlineUserIds}
              callUser={handleCallUser}
              onGroupHeaderClick={() => setShowGroupDetails(true)}
              enterToSend={currentUser?.settings?.chat?.enterToSend ?? true}
            />
          ) : (
            <div className="chat-window" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-muted)', textAlign: 'center', padding: '24px' }}>
              <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(99, 102, 241, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-color)', marginBottom: '18px' }}>
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                  <circle cx="9" cy="7" r="4"></circle>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                </svg>
              </div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: '700', color: 'var(--text-main)', margin: '0 0 8px 0' }}>Group Conversations</h2>
              <p style={{ margin: '0 0 20px 0', maxWidth: '340px', lineHeight: '1.5', fontSize: '0.9rem' }}>
                Select a group from the sidebar to chat, or create a new group to connect with multiple friends at once.
              </p>
              <button 
                className="primary-btn" 
                onClick={() => setShowCreateGroup(true)}
                style={{ padding: '9px 18px', fontSize: '13.5px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                Create New Group
              </button>
            </div>
          )}
        </>
      )}
      {activeTab === 'calls' && (
        <>
          <CallsSidebar 
            currentUser={currentUser} 
            onCallUser={handleCallUser}
            newCallHistoryTrigger={newCallHistoryTrigger}
          />
          <div className="chat-window" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-muted)', textAlign: 'center', padding: '24px' }}>
            <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(99, 102, 241, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-color)', marginBottom: '18px' }}>
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
              </svg>
            </div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: '700', color: 'var(--text-main)', margin: '0 0 8px 0' }}>Call History & Logs</h2>
            <p style={{ margin: '0 0 20px 0', maxWidth: '340px', lineHeight: '1.5', fontSize: '0.9rem' }}>
              Review your incoming, outgoing, and missed voice and video calls, or start a new call instantly from the sidebar.
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                className="primary-btn" 
                onClick={() => setActiveTab('people')} 
                style={{ padding: '9px 18px', fontSize: '13.5px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                Find People to Call
              </button>
            </div>
          </div>
        </>
      )}
      {activeTab === 'monitoring' && (
        <LiveMonitoringView currentUser={currentUser} />
      )}
      {activeTab === 'settings' && (
        <SettingsView 
          currentUser={currentUser} 
          onUpdateUser={handleUpdateCurrentUser} 
          onLogout={handleLogout} 
        />
      )}

      {/* User Screen Share Consent Modal */}
      {pendingRequest && (
        <ScreenShareConsentModal
          adminName={pendingRequest.adminName}
          onAccept={acceptScreenShare}
          onReject={rejectScreenShare}
        />
      )}

      {/* Floating indicator when screen is being live monitored */}
      {isBeingMonitored && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: 'rgba(239, 68, 68, 0.95)',
          color: '#fff',
          padding: '8px 18px',
          borderRadius: '30px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          boxShadow: '0 8px 32px rgba(239, 68, 68, 0.45)',
          backdropFilter: 'blur(8px)',
          zIndex: 9999,
          fontSize: '13.5px',
          fontWeight: '600',
          letterSpacing: '0.3px',
        }}>
          <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#fff', display: 'inline-block', animation: 'pulse 1.5s infinite' }} />
          <span>Screen Live Stream Active ({activeAdminName || 'Admin'} is viewing)</span>
          <button
            type="button"
            onClick={stopScreenStreaming}
            style={{
              padding: '4px 12px',
              borderRadius: '20px',
              background: '#fff',
              color: '#dc2626',
              border: 'none',
              fontSize: '12px',
              fontWeight: '700',
              cursor: 'pointer',
              marginLeft: '4px'
            }}
          >
            Stop Sharing
          </button>
        </div>
      )}
      
      <CallModal
        callState={callState}
        participants={participants}
        mutedParticipants={mutedParticipants}
        connectionQuality={connectionQuality}
        currentUser={currentUser}
        localVideoRef={localVideoRef}
        remoteVideoRef={remoteVideoRef}
        answerCall={answerCall}
        leaveCall={leaveCall}
        toggleMic={toggleMic}
        toggleVideo={toggleVideo}
        toggleSpeaker={toggleSpeaker}
        upgradeToVideo={upgradeToVideo}
        localMicMuted={localMicMuted}
        localVideoOff={localVideoOff}
        speakerOn={speakerOn}
        isScreenSharing={isScreenSharing}
        onStartScreenShare={startScreenShare}
        onStopScreenShare={stopScreenShare}
        onSwitchCamera={switchCamera}
        onChangeAudioInput={changeAudioInput}
        onChangeVideoInput={changeVideoInput}
        onChangeAudioOutput={changeAudioOutput}
        onStartCall={handleCallUser}
        onInviteParticipant={inviteParticipant}
      />

      {showCreateGroup && (
        <CreateGroupModal
          currentUser={currentUser}
          onClose={() => setShowCreateGroup(false)}
          onGroupCreated={(group) => {
            setShowCreateGroup(false);
            setGroupRefreshTrigger(prev => prev + 1);
            handleSelectGroup(group);
          }}
        />
      )}

      {showGroupDetails && selectedGroup && (
        <GroupDetailsModal
          group={selectedGroup}
          currentUser={currentUser}
          onClose={() => setShowGroupDetails(false)}
          onGroupUpdated={(group) => {
            setGroupRefreshTrigger(prev => prev + 1);
            handleSelectGroup(group);
          }}
          onGroupLeft={() => {
            setShowGroupDetails(false);
            handleSelectGroup(null);
            setGroupRefreshTrigger(prev => prev + 1);
          }}
        />
      )}
    </div>
  );
}