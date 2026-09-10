import React, { useEffect, useRef, useState, useMemo } from 'react';
import { ChatMessage, UserProfile, CallRecord, ChatTarget } from '../types/chat.types';

interface MessageListProps {
  messages: ChatMessage[];
  callRecords?: CallRecord[];
  currentUser: UserProfile | null;
  selectedTarget?: ChatTarget | null;
  onCallUser?: (userId: string, isVideoCall: boolean) => void;
  fetchOlderMessages?: () => void;
  hasMore?: boolean;
  loadingOlder?: boolean;
  onReply?: (message: ChatMessage) => void;
  onEdit?: (message: ChatMessage) => void;
  onForward?: (message: ChatMessage) => void;
  onDeleteForMe?: (messageId: string) => void;
  onDeleteForEveryone?: (messageId: string) => void;
  onReact?: (messageId: string, emoji: string) => void;
}

type TimelineItem =
  | { type: 'message'; data: ChatMessage; timestamp: Date }
  | { type: 'call'; data: CallRecord; timestamp: Date };

const ImageAttachment = ({ url, alt }: { url: string; alt: string; isOwn?: boolean; msgId?: string }) => {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return (
      <div 
        className="attachment-fallback"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '10px 14px',
          background: 'rgba(255, 255, 255, 0.08)',
          borderRadius: '10px',
          fontSize: '0.85rem',
          color: 'var(--text-muted, #94a3b8)',
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <polyline points="21 15 16 10 5 21" />
          <line x1="2" y1="2" x2="22" y2="22" stroke="#ef4444" />
        </svg>
        <span>Image unavailable ({alt || 'Attachment'})</span>
      </div>
    );
  }

  return (
    <img
      src={url}
      alt={alt || 'Image'}
      className="attachment-image"
      loading="lazy"
      onError={() => setHasError(true)}
      onClick={() => window.open(url, '_blank', 'noopener,noreferrer')}
      style={{ cursor: 'pointer', display: 'block', maxWidth: '100%', maxHeight: '320px', borderRadius: '12px', objectFit: 'contain' }}
    />
  );
};

import { MessageOptions } from './MessageOptions';

export function MessageList({ messages, callRecords = [], currentUser, selectedTarget, onCallUser, fetchOlderMessages, hasMore, loadingOlder, onReply, onEdit, onForward, onDeleteForMe, onDeleteForEveryone, onReact }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [pendingDeletes, setPendingDeletes] = useState<Record<string, { type: 'me' | 'everyone', timeoutId: ReturnType<typeof setTimeout> }>>({});

  const handleReact = (msgId: string, emoji: string) => {
    if (onReact) {
      onReact(msgId, emoji);
    }
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, callRecords.length]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (!fetchOlderMessages || !hasMore || loadingOlder) return;
    if (e.currentTarget.scrollTop < 50) {
      fetchOlderMessages();
    }
  };

  const initiateDelete = (msgId: string, type: 'me' | 'everyone') => {
    const timeoutId = setTimeout(() => {
      if (type === 'me' && onDeleteForMe) onDeleteForMe(msgId);
      if (type === 'everyone' && onDeleteForEveryone) onDeleteForEveryone(msgId);
      
      setPendingDeletes(prev => {
        const next = { ...prev };
        delete next[msgId];
        return next;
      });
    }, 5000);

    setPendingDeletes(prev => ({ ...prev, [msgId]: { type, timeoutId } }));
  };

  const undoDelete = (msgId: string) => {
    setPendingDeletes(prev => {
      const next = { ...prev };
      if (next[msgId]) {
        clearTimeout(next[msgId].timeoutId);
        delete next[msgId];
      }
      return next;
    });
  };

  const pendingDeletesRef = useRef(pendingDeletes);
  useEffect(() => {
    pendingDeletesRef.current = pendingDeletes;
  }, [pendingDeletes]);

  useEffect(() => {
    return () => {
      Object.values(pendingDeletesRef.current).forEach(pd => clearTimeout(pd.timeoutId));
    };
  }, []);

  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 10000);
    return () => clearInterval(interval);
  }, []);

  const formatDayHeader = (date: Date) => {
    const today = new Date();
    const isToday = date.toDateString() === today.toDateString();
    
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    const isYesterday = date.toDateString() === yesterday.toDateString();

    const timeString = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (isToday) {
      return `Today ${timeString}`;
    }
    if (isYesterday) {
      return `Yesterday ${timeString}`;
    }
    return date.toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
    }) + ` ${timeString}`;
  };

  const getDurationText = (seconds: number) => {
    if (!seconds || seconds <= 0) return '0s';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  const timelineItems: TimelineItem[] = useMemo(() => {
    const visibleMsgs = messages.filter((msg) => {
      if (msg.deletedFor?.includes(currentUser?._id || '')) return false;
      if (msg.isDeletedForEveryone && msg.deletedAt) {
        if (now - new Date(msg.deletedAt).getTime() > 60000) {
          return false;
        }
      }
      return true;
    });

    const msgItems: TimelineItem[] = visibleMsgs.map((m) => ({
      type: 'message',
      data: m,
      timestamp: new Date(m.timestamp),
    }));

    const callItems: TimelineItem[] = callRecords.map((c) => ({
      type: 'call',
      data: c,
      timestamp: new Date(c.startedAt || c.createdAt),
    }));

    return [...msgItems, ...callItems].sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
    );
  }, [messages, callRecords, currentUser?._id, now]);

  return (
    <div className="message-list-container" ref={containerRef} onScroll={handleScroll}>
      {loadingOlder && (
        <div style={{ textAlign: 'center', padding: '10px', color: '#888', fontSize: '0.85em' }}>
          Loading older messages...
        </div>
      )}
      {timelineItems.length === 0 && (
        <div className="empty-messages-placeholder">
          <p style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            No messages yet. Send a message to start your conversation!
          </p>
        </div>
      )}

      {timelineItems.map((item, index) => {
        const currentItemDate = item.timestamp.toDateString();
        const prevItemDate = index > 0 ? timelineItems[index - 1].timestamp.toDateString() : null;
        const showDateDivider = index === 0 || currentItemDate !== prevItemDate;

        if (item.type === 'call') {
          const call = item.data;
          const callerId = typeof call.callerId === 'object' ? (call.callerId as any)._id : call.callerId;
          const isOutgoing = callerId === currentUser?._id;
          const otherUser = isOutgoing ? call.receiverId : call.callerId;
          const otherUserId = typeof otherUser === 'object' ? (otherUser as any)?._id : otherUser;
          
          const isVideo = call.callType === 'video';
          const isMissed = call.status === 'missed' || call.status === 'rejected';
          const startTimeStr = new Date(call.startedAt || call.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          const endTimeStr = call.endedAt ? new Date(call.endedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : startTimeStr;

          return (
            <React.Fragment key={`call-${call._id}-${index}`}>
              {showDateDivider && (
                <div className="chat-date-divider">
                  <div className="chat-date-divider-line" />
                  <span className="chat-date-divider-pill">{formatDayHeader(item.timestamp)}</span>
                  <div className="chat-date-divider-line" />
                </div>
              )}
              <div className={`message-item ${isOutgoing ? 'own-message' : 'other-message'}`}>
                <div 
                  className={`whatsapp-call-bubble ${isOutgoing ? 'own-call-bubble' : 'other-call-bubble'} ${isMissed ? 'is-missed' : ''}`}
                  onClick={() => otherUserId && onCallUser && onCallUser(otherUserId, isVideo)}
                  title={otherUserId && onCallUser ? `Click to ${isVideo ? 'video call' : 'voice call'} back` : undefined}
                >
                  <div className="whatsapp-call-icon-wrap">
                    {isVideo ? (
                      <svg className="whatsapp-call-type-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="23 7 16 12 23 17 23 7"></polygon>
                        <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
                      </svg>
                    ) : (
                      <svg className="whatsapp-call-type-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                      </svg>
                    )}
                  </div>
                  
                  <div className="whatsapp-call-info">
                    <div className="whatsapp-call-title">
                      {isVideo ? 'Video call' : 'Voice call'}
                    </div>
                    <div className="whatsapp-call-sub">
                      {/* Arrow indicator for incoming vs outgoing */}
                      <span className={`whatsapp-call-direction ${isMissed ? 'direction-missed' : isOutgoing ? 'direction-outgoing' : 'direction-incoming'}`}>
                        {isOutgoing ? (
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="7" y1="17" x2="17" y2="7"></line>
                            <polyline points="7 7 17 7 17 17"></polyline>
                          </svg>
                        ) : (
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="17" y1="7" x2="7" y2="17"></line>
                            <polyline points="17 17 7 17 7 7"></polyline>
                          </svg>
                        )}
                      </span>
                      <span className="whatsapp-call-status-text">
                        {call.status === 'completed' 
                          ? getDurationText(call.duration)
                          : call.status === 'missed' 
                            ? (isOutgoing ? 'Unanswered' : 'Missed')
                            : call.status === 'rejected'
                              ? 'Declined'
                              : 'Cancelled'}
                      </span>
                    </div>
                  </div>

                  <span className="whatsapp-call-time">
                    {startTimeStr}
                  </span>
                </div>
              </div>
            </React.Fragment>
          );
        }

        const msg = item.data;
        const isOwn = Boolean(currentUser && msg.senderId === currentUser._id);
        const isSystemMessage = msg.message?.endsWith('left the group') || msg.message?.endsWith('joined the group');
        const timeStr = item.timestamp.toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        });
        const isImage = Boolean(
          msg.fileType?.startsWith('image/') ||
          (msg.fileUrl && /\.(jpeg|jpg|gif|png|webp|svg|bmp)(\?.*)?$/i.test(msg.fileUrl)) ||
          (msg.fileName && /\.(jpeg|jpg|gif|png|webp|svg|bmp)$/i.test(msg.fileName))
        );
        const displayUrl = msg.fileUrl?.replace('http://localhost:5000', '');
        const repliedMessage = msg.replyTo ? messages.find(m => m.id === msg.replyTo) : null;

        const handleCopy = () => { if (msg.message) navigator.clipboard.writeText(msg.message); };
        const handleForward = () => { if (onForward) onForward(msg); };

        if (isSystemMessage) {
          return (
            <React.Fragment key={msg.id}>
              {showDateDivider && (
                <div className="chat-date-divider">
                  <div className="chat-date-divider-line" />
                  <span className="chat-date-divider-pill">{formatDayHeader(item.timestamp)}</span>
                  <div className="chat-date-divider-line" />
                </div>
              )}
              <div className="chat-date-divider" style={{ margin: '10px 0' }}>
                <div className="chat-date-divider-line" />
                <span 
                  className="chat-date-divider-pill" 
                  style={{ 
                    display: 'inline-flex', 
                    alignItems: 'center', 
                    gap: '6px', 
                    background: 'rgba(30, 41, 59, 0.85)',
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    color: 'var(--text-main)',
                    fontSize: '0.78rem',
                    fontWeight: 500,
                    padding: '5px 16px'
                  }}
                  title={`Event recorded at ${timeStr}`}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                    <polyline points="16 17 21 12 16 7"></polyline>
                    <line x1="21" y1="12" x2="9" y2="12"></line>
                  </svg>
                  <span>{msg.message}</span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginLeft: '4px' }}>• {timeStr}</span>
                </span>
                <div className="chat-date-divider-line" />
              </div>
            </React.Fragment>
          );
        }

        return (
          <React.Fragment key={msg.id}>
            {showDateDivider && (
              <div className="chat-date-divider">
                <div className="chat-date-divider-line" />
                <span className="chat-date-divider-pill">{formatDayHeader(item.timestamp)}</span>
                <div className="chat-date-divider-line" />
              </div>
            )}
            <div className={`message-item ${isOwn ? 'own-message' : 'other-message'}`}>
              {pendingDeletes[msg.id] ? (
                <div className="message-body" style={{ background: isOwn ? 'var(--own-bubble)' : 'var(--other-bubble)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                  <span style={{ fontSize: '0.9rem', fontStyle: 'italic' }}>This message has been deleted.</span>
                  <button onClick={() => undoDelete(msg.id)} style={{ background: 'transparent', border: 'none', color: '#fff', textDecoration: 'underline', cursor: 'pointer', fontWeight: 'bold' }}>Undo</button>
                </div>
              ) : (
                <>
                  <MessageOptions 
                    isOwnMessage={isOwn}
                    onReply={() => onReply && onReply(msg)}
                    onCopy={handleCopy}
                    onForward={handleForward}
                    onEdit={msg.fileUrl ? undefined : () => onEdit && onEdit(msg)}
                    onDeleteForMe={() => initiateDelete(msg.id, 'me')}
                    onDeleteForEveryone={() => initiateDelete(msg.id, 'everyone')}
                    onReact={(emoji) => handleReact(msg.id, emoji)}
                  />
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', flexDirection: isOwn ? 'row-reverse' : 'row' }}>
                    {!isOwn && (
                      <div className="message-avatar" style={{ flexShrink: 0, paddingBottom: '4px' }}>
                        <div className="chat-friend-avatar" style={{ width: '32px', height: '32px', fontSize: '0.85rem', background: 'var(--accent-gradient)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 'bold', overflow: 'hidden' }}>
                          {selectedTarget && 'avatar' in selectedTarget && selectedTarget.avatar ? (
                            <img src={selectedTarget.avatar} alt="Avatar" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                          ) : (
                            msg.senderName ? msg.senderName.charAt(0).toUpperCase() : '?'
                          )}
                        </div>
                      </div>
                    )}
                    <div style={{ display: 'flex', flexDirection: 'column', width: 'fit-content', maxWidth: '100%' }}>
                      {!isOwn && (
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px', marginLeft: '4px', fontWeight: 600, alignSelf: 'flex-start' }}>
                          {msg.senderName}
                        </span>
                      )}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexDirection: isOwn ? 'row-reverse' : 'row', width: 'fit-content', maxWidth: '100%', justifyContent: isOwn ? 'flex-end' : 'flex-start' }}>
                        {msg.isDeletedForEveryone ? (
                          <div className="deleted-message-row"><span>This message was deleted</span></div>
                        ) : (
                          <div
                            className="message-body"
                            style={{
                              minWidth: msg.reactions && Object.keys(msg.reactions).length > 0
                                ? `${Math.min(260, Math.max(70, Object.keys(msg.reactions).length * 36 + 24))}px`
                                : '40px',
                              display: 'flex',
                              flexDirection: 'column',
                              transition: 'min-width 0.2s ease',
                            }}
                          >
                            {repliedMessage && (
                              <div className="reply-banner" style={{ fontSize: '0.8rem', backgroundColor: 'rgba(255, 255, 255, 0.15)', padding: '8px 12px', borderRadius: '6px', marginBottom: '6px', display: 'flex', flexDirection: 'column', gap: '4px', color: '#fff' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap' }}>
                                  <strong style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis' }}>{repliedMessage.senderName}</strong>
                                  <span style={{ fontSize: '0.7rem', opacity: 0.7, flexShrink: 0 }}>{new Date(repliedMessage.timestamp).toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).replace(',', '')}</span>
                                </div>
                                <div style={{ opacity: 0.9 }}>{repliedMessage.message}</div>
                              </div>
                            )}
                            {displayUrl && (
                              <div className="message-attachment">
                                {isImage ? (
                                  <ImageAttachment url={displayUrl} alt={msg.fileName || 'Attachment'} isOwn={isOwn} msgId={msg.id} />
                                ) : (
                                  <a href={displayUrl} target="_blank" rel="noopener noreferrer" className="attachment-link">📄 {msg.fileName || 'Download File'}</a>
                                )}
                              </div>
                            )}
                            {msg.message && <div className="message-text">{msg.message} {msg.isEdited && <span style={{ fontSize: '0.7em', color: '#888', marginLeft: '6px' }}>(edited)</span>}</div>}
                            {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                              <div
                                className="message-reactions-tray"
                                style={{
                                  position: 'relative',
                                  marginTop: '6px',
                                  marginBottom: '-16px',
                                  marginLeft: isOwn ? 'auto' : '-4px',
                                  marginRight: isOwn ? '-4px' : 'auto',
                                  display: 'flex',
                                  flexWrap: 'nowrap',
                                  alignItems: 'center',
                                  gap: '4px',
                                  zIndex: 2,
                                  width: 'fit-content',
                                  maxWidth: '100%',
                                }}
                              >
                                {Object.entries(msg.reactions).map(([emoji, users]) => {
                                  if (!users || users.length === 0) return null;
                                  const hasUserReacted = currentUser && users.includes(currentUser._id);
                                  return (
                                    <div
                                      key={emoji}
                                      style={{
                                        background: hasUserReacted ? 'rgba(99, 102, 241, 0.28)' : 'var(--bg-card)',
                                        padding: '2px 7px',
                                        borderRadius: '12px',
                                        fontSize: '13px',
                                        border: `1px solid ${hasUserReacted ? 'rgba(99, 102, 241, 0.55)' : 'var(--border-color)'}`,
                                        boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
                                        cursor: 'pointer',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '3px',
                                        userSelect: 'none',
                                        whiteSpace: 'nowrap',
                                        transition: 'all 0.15s ease',
                                      }}
                                      onClick={() => handleReact(msg.id, emoji)}
                                      title={hasUserReacted ? "Click to remove your reaction" : "Click to react"}
                                    >
                                      <span>{emoji}</span>
                                      {users.length > 1 && (
                                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                                          {users.length}
                                        </span>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        )}
                        <div className="message-hover-time" style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', alignSelf: isOwn ? 'flex-end' : 'center', marginBottom: isOwn ? '2px' : '0' }}>
                          {timeStr}
                          {isOwn && !msg.isDeletedForEveryone && (
                            <span style={{ display: 'flex', alignItems: 'center', color: msg.status === 'read' ? '#3b82f6' : '#94a3b8' }}>
                              {msg.status === 'delivered' || msg.status === 'read' ? (
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 6 12 16 9 13"></polyline><polyline points="16 6 6 16 3 13"></polyline></svg>
                              ) : (
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </React.Fragment>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}

export default MessageList;
