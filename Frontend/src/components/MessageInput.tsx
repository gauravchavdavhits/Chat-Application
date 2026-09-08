import React, { useState, useRef, useEffect } from 'react';
import { uploadFileApi } from '../services/userService';
import { UnifiedPicker } from './UnifiedPicker';

interface MessageInputProps {
  onSendMessage: (messageText: string, fileData?: { fileUrl: string; fileName: string; fileType: string }) => void;
  disabled?: boolean;
  onTyping?: () => void;
  onStopTyping?: () => void;
  replyingToMessage?: any;
  editingMessage?: any;
  onCancelReplyEdit?: () => void;
  enterToSend?: boolean;
}

export function MessageInput({ onSendMessage, disabled = false, onTyping, onStopTyping, replyingToMessage, editingMessage, onCancelReplyEdit, enterToSend = true }: MessageInputProps) {
  const [inputText, setInputText] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const lastTypingTimeRef = useRef<number>(0);

  useEffect(() => {
    if (editingMessage && editingMessage.message) {
      setInputText(editingMessage.message);
    }
  }, [editingMessage]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);
    
    if (onTyping && onStopTyping) {
      const now = Date.now();
      if (now - lastTypingTimeRef.current > 2000) {
        onTyping();
        lastTypingTimeRef.current = now;
      }
      
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      typingTimeoutRef.current = setTimeout(() => {
        onStopTyping();
        lastTypingTimeRef.current = 0;
      }, 2000);
    }
  };



  const onEmojiClick = (emoji: any) => {
    setInputText((prev) => prev + emoji.native);
  };

  const onGifClick = (gif: any) => {
    onSendMessage('', {
      fileUrl: gif.imageUrl,
      fileName: 'giphy.gif',
      fileType: 'image/gif'
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFiles(Array.from(e.target.files));
    }
  };

  const clearFiles = () => {
    setSelectedFiles([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (imageInputRef.current) imageInputRef.current.value = '';
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!inputText.trim() && selectedFiles.length === 0) || uploading) return;

    try {
      setUploading(true);

      if (selectedFiles.length > 0) {
        for (let i = 0; i < selectedFiles.length; i++) {
          const file = selectedFiles[i];
          const res = await uploadFileApi(file);
          if (res.success) {
            // Attach text to the first file only
            const textToSend = i === 0 ? inputText.trim() : '';
            onSendMessage(textToSend, res.data);
          }
        }
      } else if (inputText.trim()) {
        onSendMessage(inputText.trim());
      }

      setInputText('');
      clearFiles();

      if (onStopTyping) {
        onStopTyping();
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    } catch (error) {
      console.error('Failed to send message/file', error);
      alert('Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="message-input-container">
      {selectedFiles.length > 0 && (
        <div className="file-preview-banner">
          <span className="file-name" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
            {selectedFiles.length === 1 ? selectedFiles[0].name : `${selectedFiles.length} files selected`}
          </span>
          <button className="clear-file-btn" onClick={clearFiles} type="button">✖</button>
        </div>
      )}
      
      {(replyingToMessage || editingMessage) && (
        <div className="reply-edit-banner" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', backgroundColor: 'var(--tertiary-bg, #2f3136)', borderTopLeftRadius: '8px', borderTopRightRadius: '8px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--accent-color, #5865F2)', fontWeight: 'bold' }}>
              {editingMessage ? 'Editing Message' : `Replying to ${replyingToMessage.senderName}`}
            </span>
            <span style={{ fontSize: '0.9rem', color: '#b9bbbe', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {editingMessage ? editingMessage.message : replyingToMessage.message || 'Attachment'}
            </span>
          </div>
          <button className="clear-file-btn" onClick={() => {
            if (onCancelReplyEdit) onCancelReplyEdit();
            if (editingMessage) setInputText('');
          }} type="button">✖</button>
        </div>
      )}

      <form className="message-input-form" onSubmit={handleSend} style={replyingToMessage || editingMessage ? { borderTopLeftRadius: 0, borderTopRightRadius: 0 } : {}}>
        <div className="input-wrapper">
          <input
            type="file"
            ref={fileInputRef}
            style={{ display: 'none' }}
            onChange={handleFileChange}
            disabled={disabled || uploading}
          />
          <textarea
            className="message-input"
            placeholder={disabled ? 'Select a friend to start chatting...' : 'Type a message...'}
            value={inputText}
            onChange={(e: any) => handleInputChange(e)}
            onKeyDown={(e) => {
              if (enterToSend && e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend(e);
              }
            }}
            disabled={disabled || uploading}
            rows={1}
            style={{ resize: 'none', overflowY: 'auto', minHeight: '40px', maxHeight: '120px' }}
          />
          
          <div className="input-actions">
            <UnifiedPicker 
              onEmojiSelect={onEmojiClick}
              onGifSelect={onGifClick}
              disabled={disabled || uploading}
            />

            <button
              type="button"
              className="icon-btn"
              onClick={() => imageInputRef.current?.click()}
              disabled={disabled || uploading}
              title="Attach Image"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
            </button>
            <input
              type="file"
              ref={imageInputRef}
              style={{ display: 'none' }}
              onChange={handleFileChange}
              accept="image/*"
              multiple
              disabled={disabled || uploading}
            />

            <button
              type="button"
              className="icon-btn"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled || uploading}
              title="Attach File"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
              </svg>
            </button>

            <div className="action-divider"></div>

            <button
              type="submit"
              className="icon-btn send-icon-btn"
              disabled={disabled || uploading || (!inputText.trim() && selectedFiles.length === 0)}
              title="Send"
            >
              {uploading ? (
                <svg className="spin-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
              ) : editingMessage ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

export default MessageInput;
