import React, { useState, useRef, useEffect } from 'react';
import './MessageOptions.css';

interface MessageOptionsProps {
  onReply: () => void;
  onCopy: () => void;
  onForward: () => void;
  onEdit?: () => void;
  onDeleteForMe: () => void;
  onDeleteForEveryone?: () => void;
  onReact: (emoji: string) => void;
  isOwnMessage: boolean;
}

export function MessageOptions({
  onReply,
  onCopy,
  onForward,
  onEdit,
  onDeleteForMe,
  onDeleteForEveryone,
  onReact,
  isOwnMessage
}: MessageOptionsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [openUpwards, setOpenUpwards] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      // Check if near bottom
      if (menuRef.current) {
        const rect = menuRef.current.getBoundingClientRect();
        if (rect.bottom > window.innerHeight - 300) {
          setOpenUpwards(true);
        } else {
          setOpenUpwards(false);
        }
      }
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleAction = (action: () => void) => {
    action();
    setIsOpen(false);
  };

  return (
    <div className={`message-options-container ${isOwnMessage ? 'own' : 'other'}`} ref={menuRef}>
      <div className="message-options-bar">
        {/* Emoji Reactions */}
        <button className="emoji-btn" title="Like" onClick={() => handleAction(() => onReact('👍'))}>👍</button>
        <button className="emoji-btn" title="Heart" onClick={() => handleAction(() => onReact('❤️'))}>❤️</button>
        <button className="emoji-btn" title="Laugh" onClick={() => handleAction(() => onReact('😂'))}>😂</button>
        <button className="emoji-btn" title="Surprised" onClick={() => handleAction(() => onReact('😮'))}>😮</button>
        
        <div className="action-divider" style={{ width: '1px', height: '16px', background: 'rgba(255,255,255,0.1)', margin: '0 4px' }} />
        
        <button className="option-btn" onClick={() => handleAction(onReply)} title="Reply">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 17 4 12 9 7"/><path d="M20 18v-2a4 4 0 0 0-4-4H4"/></svg>
        </button>

        {isOwnMessage && onEdit && (
          <button className="option-btn" onClick={() => handleAction(onEdit)} title="Edit">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
        )}

        <button className={`option-btn ${isOpen ? 'active' : ''}`} onClick={() => setIsOpen(!isOpen)} title="More options">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="1" />
            <circle cx="19" cy="12" r="1" />
            <circle cx="5" cy="12" r="1" />
          </svg>
        </button>
      </div>

      {isOpen && (
        <div className={`message-options-dropdown ${openUpwards ? 'upwards' : ''}`}>
          <button className="dropdown-item" onClick={() => handleAction(onReply)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 17 4 12 9 7"/><path d="M20 18v-2a4 4 0 0 0-4-4H4"/></svg>
            Reply
          </button>
          
          <button className="dropdown-item" onClick={() => handleAction(onCopy)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            Copy
          </button>

          <button className="dropdown-item" onClick={() => handleAction(onForward)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 17 20 12 15 7"/><path d="M4 18v-2a4 4 0 0 1 4-4h12"/></svg>
            Forward
          </button>

          <div className="dropdown-divider" />

          <button className="dropdown-item danger" onClick={() => handleAction(onDeleteForMe)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            Delete for me
          </button>

          {isOwnMessage && onDeleteForEveryone && (
            <button className="dropdown-item danger" onClick={() => handleAction(onDeleteForEveryone)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z"/><line x1="18" y1="9" x2="12" y2="15"/><line x1="12" y1="9" x2="18" y2="15"/></svg>
              Delete for everyone
            </button>
          )}
        </div>
      )}
    </div>
  );
}
