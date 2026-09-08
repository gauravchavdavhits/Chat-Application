import React, { useState } from 'react';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { ForwardModal } from './ForwardModal';
import { UserProfile, ChatMessage, GroupProfile, ChatTarget, CallRecord } from '../types/chat.types';

interface ChatWindowProps {
  currentUser: UserProfile;
  selectedTarget: ChatTarget | null;
  messages: ChatMessage[];
  callRecords?: CallRecord[];
  sendMessage: (messageText: string, fileData?: { fileUrl: string; fileName: string; fileType: string }, replyTo?: string) => void;
  forwardMessage?: (message: ChatMessage, users: UserProfile[]) => void;
  editMessage?: (messageId: string, newText: string) => void;
  deleteMessage?: (messageId: string, type: 'me' | 'everyone') => void;
  clearConversation?: () => void;
  reactToMessage?: (messageId: string, emoji: string) => void;
  isConnected?: boolean;
  error?: string | null;
  typingUser?: string | null;
  emitTyping?: () => void;
  emitStopTyping?: () => void;
  fetchOlderMessages?: () => void;
  hasMore?: boolean;
  loadingOlder?: boolean;
  onlineUserIds?: string[];
  callUser?: (userId: string, isVideoCall: boolean, name?: string, avatar?: string) => void;
  markMessagesAsRead?: () => void;
  onGroupHeaderClick?: () => void;
  enterToSend?: boolean;
}

export function ChatWindow({ currentUser, selectedTarget, messages, callRecords = [], sendMessage, forwardMessage, editMessage, deleteMessage, clearConversation, reactToMessage, isConnected, error, typingUser, emitTyping, emitStopTyping, fetchOlderMessages, hasMore, loadingOlder, onlineUserIds = [], callUser, markMessagesAsRead, onGroupHeaderClick, enterToSend = true }: ChatWindowProps) {

  const [replyingToMessage, setReplyingToMessage] = React.useState<ChatMessage | null>(null);
  const [editingMessage, setEditingMessage] = React.useState<ChatMessage | null>(null);
  const [forwardingMessage, setForwardingMessage] = React.useState<ChatMessage | null>(null);
  const [moreMenuOpen, setMoreMenuOpen] = React.useState(false);
  const [showSearch, setShowSearch] = React.useState(false);
  const [searchFilter, setSearchFilter] = React.useState('');
  const [showMediaDrawer, setShowMediaDrawer] = React.useState(false);
  const [showContactInfo, setShowContactInfo] = React.useState(false);
  const [showClearConfirm, setShowClearConfirm] = React.useState(false);
  const [isMuted, setIsMuted] = React.useState(false);

  React.useEffect(() => {
    if (markMessagesAsRead) {
      markMessagesAsRead();
    }
  }, [messages, markMessagesAsRead]);

  // Close more menu when clicking outside
  React.useEffect(() => {
    const handleClickOutside = () => setMoreMenuOpen(false);
    if (moreMenuOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [moreMenuOpen]);

  const handleSendMessage = (messageText: string, fileData?: { fileUrl: string; fileName: string; fileType: string }) => {
    if (editingMessage && editMessage) {
      editMessage(editingMessage.id, messageText);
      setEditingMessage(null);
    } else {
      sendMessage(messageText, fileData, replyingToMessage?.id);
      setReplyingToMessage(null);
    }
  };

  const handleClearConversation = () => {
    if (clearConversation) {
      clearConversation();
    } else if (deleteMessage) {
      messages.forEach(m => {
        deleteMessage(m.id, 'me');
      });
    }
    setShowClearConfirm(false);
  };

  // Filter messages if search is active
  const filteredMessages = React.useMemo(() => {
    if (!showSearch || !searchFilter.trim()) return messages;
    const q = searchFilter.toLowerCase();
    return messages.filter(m => (m.message && m.message.toLowerCase().includes(q)) || (m.fileName && m.fileName.toLowerCase().includes(q)));
  }, [messages, showSearch, searchFilter]);

  // Extract shared media files
  const sharedMedia = React.useMemo(() => {
    return messages.filter(m => m.fileUrl);
  }, [messages]);

  return (
    <div className="chat-window">
      {/* Chat Header */}
      <div className="chat-header-bar">
        <div className="chat-header-left" onClick={() => {
          if (selectedTarget) {
            if ('members' in selectedTarget && onGroupHeaderClick) {
              onGroupHeaderClick();
            } else {
              setShowContactInfo(true);
            }
          }
        }} style={{ cursor: selectedTarget ? 'pointer' : 'default' }}>
          {selectedTarget ? (
            <>
              <div className="chat-friend-avatar">
                {selectedTarget.avatar ? (
                  <img src={selectedTarget.avatar} alt="Avatar" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                ) : (
                  ('username' in selectedTarget ? selectedTarget.username : selectedTarget.name).charAt(0).toUpperCase()
                )}
              </div>
              <div className="chat-friend-info">
                <h3 className="chat-friend-name">
                  {'username' in selectedTarget ? selectedTarget.username : selectedTarget.name}
                  {isMuted && <span style={{ marginLeft: '6px', fontSize: '13px', color: 'var(--text-muted)' }} title="Muted">🔕</span>}
                </h3>
                <div className="friend-status">
                  {'members' in selectedTarget ? (
                    `${selectedTarget.members.length} members`
                  ) : (
                    onlineUserIds.includes(selectedTarget._id) ? 'Online' : 'Offline'
                  )}
                </div>
              </div>
            </>
          ) : (
            <h3 className="chat-friend-name">Select a chat</h3>
          )}
        </div>
        
        {selectedTarget && (
          <div className="chat-header-right" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {/* Direct 1-on-1 voice & video calls */}
            {!('members' in selectedTarget) && (
              <>
                <button 
                  className="icon-btn" 
                  onClick={() => callUser && callUser(selectedTarget._id, false, selectedTarget.username, selectedTarget.avatar)}
                  title="Voice Call"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                  </svg>
                </button>
                <button 
                  className="icon-btn" 
                  onClick={() => callUser && callUser(selectedTarget._id, true, selectedTarget.username, selectedTarget.avatar)}
                  title="Video Call"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="23 7 16 12 23 17 23 7"></polygon>
                    <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
                  </svg>
                </button>
              </>
            )}

            {/* ⋮ More Options Dropdown Menu */}
            <div className="more-options-container" style={{ position: 'relative' }}>
              <button 
                className={`icon-btn ${moreMenuOpen ? 'active' : ''}`} 
                onClick={(e) => {
                  e.stopPropagation();
                  setMoreMenuOpen(prev => !prev);
                }}
                title="More Options"
                style={moreMenuOpen ? { background: 'rgba(99, 102, 241, 0.2)', borderColor: 'rgba(99, 102, 241, 0.4)', color: 'var(--accent-color)' } : undefined}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="1.5"></circle>
                  <circle cx="12" cy="5" r="1.5"></circle>
                  <circle cx="12" cy="19" r="1.5"></circle>
                </svg>
              </button>

              {moreMenuOpen && (
                <div 
                  className="more-options-dropdown" 
                  style={{ top: '100%', bottom: 'auto', marginTop: '8px', right: 0, zIndex: 1000 }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Option 1: Info */}
                  <button 
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setMoreMenuOpen(false);
                      if ('members' in selectedTarget && onGroupHeaderClick) {
                        onGroupHeaderClick();
                      } else {
                        setShowContactInfo(true);
                      }
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                    {'members' in selectedTarget ? 'Group Info' : 'Contact Info'}
                  </button>

                  {/* Option 2: Search */}
                  <button 
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setMoreMenuOpen(false);
                      setShowSearch(true);
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                    Search in Chat
                  </button>

                  {/* Option 3: Media & Docs */}
                  <button 
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setMoreMenuOpen(false);
                      setShowMediaDrawer(true);
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                    Media, Links & Docs ({sharedMedia.length})
                  </button>

                  {/* Option 4: Mute Notifications */}
                  <button 
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setMoreMenuOpen(false);
                      setIsMuted(prev => !prev);
                    }}
                  >
                    {isMuted ? (
                      <>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
                        Unmute Notifications
                      </>
                    ) : (
                      <>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13.73 21a2 2 0 0 1-3.46 0"></path><path d="M18.63 13A17.89 17.89 0 0 1 18 8"></path><path d="M6.26 6.26A5.86 5.86 0 0 0 6 8c0 7-3 9-3 9h14"></path><path d="M18 8a6 6 0 0 0-9.33-5"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                        Mute Notifications
                      </>
                    )}
                  </button>

                  <div style={{ height: '1px', background: 'var(--border-color)', margin: '4px 0' }} />

                  {/* Option 5: Clear Messages */}
                  <button 
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setMoreMenuOpen(false);
                      setShowClearConfirm(true);
                    }} 
                    style={{ color: '#ef4444' }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    Clear Messages
                  </button>

                  {/* Option 6: Group Details / Leave Group shortcut */}
                  {'members' in selectedTarget && onGroupHeaderClick && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setMoreMenuOpen(false);
                        onGroupHeaderClick();
                      }}
                      style={{ color: '#ef4444' }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                      Leave Group
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Inline Search Bar */}
      {showSearch && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 20px', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          <input
            type="text"
            placeholder="Search messages..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            autoFocus
            style={{ flex: 1, background: 'transparent', border: 'none', color: 'var(--text-main)', fontSize: '14px', outline: 'none' }}
          />
          {searchFilter && (
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{filteredMessages.length} results</span>
          )}
          <button className="icon-btn" onClick={() => { setShowSearch(false); setSearchFilter(''); }} style={{ padding: '4px' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
      )}

      {error && <div className="error-banner">⚠️ {error}</div>}

      {/* Messages */}
      <MessageList 
        messages={filteredMessages} 
        callRecords={callRecords}
        currentUser={currentUser} 
        selectedTarget={selectedTarget}
        onCallUser={callUser}
        fetchOlderMessages={fetchOlderMessages}
        hasMore={hasMore}
        loadingOlder={loadingOlder}
        onReply={(msg) => { setReplyingToMessage(msg); setEditingMessage(null); }}
        onEdit={(msg) => { setEditingMessage(msg); setReplyingToMessage(null); }}
        onForward={(msg) => setForwardingMessage(msg)}
        onDeleteForMe={(msgId) => deleteMessage && deleteMessage(msgId, 'me')}
        onDeleteForEveryone={(msgId) => deleteMessage && deleteMessage(msgId, 'everyone')}
        onReact={reactToMessage}
      />

      {/* Typing Indicator */}
      {typingUser && (
        <div className="typing-indicator" style={{ padding: '8px 20px', fontStyle: 'italic', color: '#888', fontSize: '0.9em', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div className="typing-dots">
            <span>.</span><span>.</span><span>.</span>
          </div>
          {typingUser} is typing...
        </div>
      )}

      {/* Input */}
      <MessageInput
        onSendMessage={handleSendMessage}
        disabled={!selectedTarget || !isConnected}
        onTyping={emitTyping}
        onStopTyping={emitStopTyping}
        replyingToMessage={replyingToMessage}
        editingMessage={editingMessage}
        enterToSend={enterToSend}
        onCancelReplyEdit={() => {
          setReplyingToMessage(null);
          setEditingMessage(null);
        }}
      />
      
      {/* Forward Modal */}
      {forwardingMessage && forwardMessage && (
        <ForwardModal
          currentUser={currentUser}
          messageToForward={forwardingMessage}
          onClose={() => setForwardingMessage(null)}
          onForward={(msg, targets) => {
            forwardMessage(msg, targets);
            setForwardingMessage(null);
          }}
        />
      )}

      {/* Clear Chat Confirmation Modal */}
      {showClearConfirm && (
        <div className="modal-overlay" onClick={() => setShowClearConfirm(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '18px', fontWeight: '700' }}>Clear chat messages?</h3>
            <p style={{ margin: '0 0 20px 0', color: 'var(--text-muted)', fontSize: '14px', lineHeight: '1.5' }}>
              Are you sure you want to clear all messages in this conversation? Messages will be deleted for you.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button className="secondary-btn" onClick={() => setShowClearConfirm(false)}>Cancel</button>
              <button className="primary-btn" style={{ background: '#ef4444' }} onClick={handleClearConversation}>Clear Messages</button>
            </div>
          </div>
        </div>
      )}

      {/* Contact Info Modal */}
      {showContactInfo && selectedTarget && !('members' in selectedTarget) && (
        <div className="modal-overlay" onClick={() => setShowContactInfo(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ width: '420px', maxWidth: '92%', borderRadius: '24px', padding: '22px 20px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
            {/* Top Close Button */}
            <button className="modal-close" onClick={() => setShowContactInfo(false)} title="Close">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>

            {/* Profile Avatar Header */}
            <div style={{ width: '76px', height: '76px', borderRadius: '50%', background: 'var(--accent-gradient)', color: '#fff', fontSize: '30px', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', position: 'relative', boxShadow: '0 6px 20px rgba(99, 102, 241, 0.35)', border: '3px solid var(--border-color)' }}>
              {selectedTarget.avatar ? (
                <img src={selectedTarget.avatar} alt="Avatar" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
              ) : (
                selectedTarget.username.charAt(0).toUpperCase()
              )}
              <span 
                style={{
                  position: 'absolute',
                  bottom: '1px',
                  right: '1px',
                  width: '16px',
                  height: '16px',
                  borderRadius: '50%',
                  backgroundColor: onlineUserIds.includes(selectedTarget._id) ? '#22c55e' : '#94a3b8',
                  border: '2.5px solid var(--bg-card)',
                  boxShadow: onlineUserIds.includes(selectedTarget._id) ? '0 0 8px rgba(34, 197, 94, 0.6)' : 'none'
                }} 
              />
            </div>

            <h2 style={{ margin: '0 0 3px 0', fontSize: '1.25rem', fontWeight: '700', color: 'var(--text-main)' }}>{selectedTarget.username}</h2>
            <p style={{ margin: '0 0 14px 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>{selectedTarget.email}</p>

            {/* Quick Action Buttons */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginBottom: '14px' }}>
              <button
                type="button"
                onClick={() => {
                  setShowContactInfo(false);
                  if (callUser) callUser(selectedTarget._id, false, selectedTarget.username, selectedTarget.avatar);
                }}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  padding: '8px 12px',
                  borderRadius: '10px',
                  background: 'rgba(99, 102, 241, 0.12)',
                  border: '1px solid rgba(99, 102, 241, 0.25)',
                  color: 'var(--accent-color)',
                  fontSize: '12.5px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                Voice Call
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowContactInfo(false);
                  if (callUser) callUser(selectedTarget._id, true, selectedTarget.username, selectedTarget.avatar);
                }}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  padding: '8px 12px',
                  borderRadius: '10px',
                  background: 'rgba(99, 102, 241, 0.12)',
                  border: '1px solid rgba(99, 102, 241, 0.25)',
                  color: 'var(--accent-color)',
                  fontSize: '12.5px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>
                Video Call
              </button>
            </div>

            {/* Details Section */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'left' }}>
              {/* Presence Status */}
              <div style={{ padding: '10px 12px', background: 'var(--input-bg)', borderRadius: '10px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: '10.5px', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', fontWeight: '600', marginBottom: '2px' }}>Status</div>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: onlineUserIds.includes(selectedTarget._id) ? '#22c55e' : 'var(--text-muted)' }}>
                    {onlineUserIds.includes(selectedTarget._id) ? '● Online' : '○ Offline'}
                  </div>
                </div>
                <span style={{ fontSize: '11.5px', padding: '2px 7px', borderRadius: '5px', background: onlineUserIds.includes(selectedTarget._id) ? 'rgba(34, 197, 94, 0.15)' : 'rgba(148, 163, 184, 0.15)', color: onlineUserIds.includes(selectedTarget._id) ? '#22c55e' : 'var(--text-muted)', fontWeight: '600' }}>
                  {onlineUserIds.includes(selectedTarget._id) ? 'Active' : 'Away'}
                </span>
              </div>

              {/* Email Address */}
              <div style={{ padding: '10px 12px', background: 'var(--input-bg)', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '10.5px', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', fontWeight: '600', marginBottom: '2px' }}>Email Address</div>
                <div style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-main)', wordBreak: 'break-all' }}>
                  {selectedTarget.email || 'Not available'}
                </div>
              </div>

              {/* Shared Media / Messages Stats */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div 
                  onClick={() => { setShowContactInfo(false); setShowMediaDrawer(true); }}
                  style={{ padding: '10px 12px', background: 'var(--input-bg)', borderRadius: '10px', border: '1px solid var(--border-color)', cursor: 'pointer', transition: 'all 0.2s' }}
                >
                  <div style={{ fontSize: '10.5px', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', fontWeight: '600', marginBottom: '2px' }}>Shared Media</div>
                  <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--accent-color)' }}>
                    {sharedMedia.length} files ↗
                  </div>
                </div>

                <div style={{ padding: '10px 12px', background: 'var(--input-bg)', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '10.5px', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', fontWeight: '600', marginBottom: '2px' }}>Total Messages</div>
                  <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-main)' }}>
                    {messages.length}
                  </div>
                </div>
              </div>

              {/* Encryption & Security Info */}
              <div style={{ padding: '8px 12px', background: 'rgba(99, 102, 241, 0.06)', borderRadius: '10px', border: '1px solid rgba(99, 102, 241, 0.18)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent-color)" strokeWidth="2.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Messages and calls are secured with real-time encryption.</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Media & Docs Modal */}
      {showMediaDrawer && (
        <div className="modal-overlay" onClick={() => setShowMediaDrawer(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ width: 'fit-content', minWidth: '320px', maxWidth: '92%', maxHeight: '80vh', borderRadius: '24px', padding: '22px 20px', display: 'flex', flexDirection: 'column', position: 'relative' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', gap: '24px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '700', color: 'var(--text-main)' }}>Shared Media & Docs</h3>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>{sharedMedia.length} total shared files</div>
              </div>
              <button className="modal-close" onClick={() => setShowMediaDrawer(false)} title="Close">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

            {/* Media Grid Container */}
            <div className="custom-scroll" style={{ overflowY: 'auto', paddingRight: '2px', maxHeight: '58vh' }}>
              {sharedMedia.length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '36px 20px', color: 'var(--text-muted)', gap: '10px' }}>
                  <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'rgba(99, 102, 241, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-color)' }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                  </div>
                  <span style={{ fontSize: '13.5px', fontWeight: '500' }}>No media or documents shared yet.</span>
                </div>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', maxWidth: '460px' }}>
                  {sharedMedia.map(m => {
                    const isImg = m.fileType?.startsWith('image') || m.fileUrl?.match(/\.(jpeg|jpg|gif|png|webp)/i);
                    return (
                      <a 
                        key={m.id} 
                        href={m.fileUrl} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        style={{ 
                          textDecoration: 'none', 
                          color: 'inherit',
                          borderRadius: '12px',
                          overflow: 'hidden',
                          background: 'var(--input-bg)',
                          border: '1px solid var(--border-color)',
                          display: 'flex',
                          flexDirection: 'column',
                          width: '135px',
                          transition: 'transform 0.2s, box-shadow 0.2s',
                          position: 'relative',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'translateY(-2px)';
                          e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.25)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                      >
                        {isImg ? (
                          <div style={{ position: 'relative', width: '100%', height: '110px' }}>
                            <img src={m.fileUrl} alt={m.fileName || 'Image'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '4px 6px', background: 'linear-gradient(transparent, rgba(0,0,0,0.8))', color: '#fff', fontSize: '11px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {m.fileName || 'Photo'}
                            </div>
                          </div>
                        ) : (
                          <div style={{ padding: '12px 10px', height: '110px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: '6px' }}>
                            <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(99, 102, 241, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-color)' }}>
                              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                            </div>
                            <span style={{ fontSize: '11.5px', fontWeight: '500', color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%' }}>
                              {m.fileName || 'Document'}
                            </span>
                          </div>
                        )}
                      </a>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ChatWindow;

