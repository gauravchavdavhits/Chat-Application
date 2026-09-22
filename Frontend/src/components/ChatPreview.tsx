import React, { useState, useEffect } from 'react';

export const ChatPreview: React.FC = () => {
  const [activeMessageStep, setActiveMessageStep] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveMessageStep((prev) => (prev + 1) % 4);
    }, 2800);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="hero-chat-preview-container">
      {/* Ambient background glow behind window */}
      <div className="chat-preview-glow" aria-hidden="true" />

      {/* Floating Status Notification Pill */}
      <aside className="floating-badge floating-badge-top" aria-label="Incoming connection alert">
        <span className="pulse-indicator" aria-hidden="true" />
        <span className="badge-text">Encrypted Peer Connected</span>
      </aside>

      {/* Main Glassmorphic Chat Window */}
      <section className="glass-chat-window" aria-label="Interactive Chat Preview Demonstration">
        {/* Window Top Bar */}
        <header className="glass-chat-header">
          <div className="chat-header-user">
            <div className="avatar-wrapper">
              <div className="demo-avatar">
                <span className="avatar-initials">NC</span>
                <span className="online-indicator-dot" />
              </div>
            </div>
            <div className="user-meta">
              <div className="user-meta-name">Nova Community</div>
              <div className="user-meta-status">
                <span className="status-live-dot" />
                <span>38 Members Online</span>
              </div>
            </div>
          </div>
          <div className="chat-header-actions" aria-hidden="true">
            <div className="action-pill">WebRTC Active</div>
          </div>
        </header>

        {/* Message Thread Body */}
        <div className="glass-chat-body">
          {/* Message 1 */}
          <div className={`preview-bubble-row incoming ${activeMessageStep >= 0 ? 'visible' : ''}`}>
            <div className="bubble-avatar" aria-hidden="true">E</div>
            <div className="bubble-content">
              <span className="bubble-author">Elena Rostova</span>
              <p className="bubble-text">Hey team! Are the real-time rooms ready for testing? 🚀</p>
              <time className="bubble-time">10:42 AM</time>
            </div>
          </div>

          {/* Message 2 */}
          <div className={`preview-bubble-row outgoing ${activeMessageStep >= 1 ? 'visible' : ''}`}>
            <div className="bubble-content">
              <p className="bubble-text">Yes! WebSockets and WebRTC channels are fully synchronized.</p>
              <div className="bubble-status">
                <time className="bubble-time">10:43 AM</time>
                <span className="checkmarks" aria-label="Read receipts">✓✓</span>
              </div>
            </div>
          </div>

          {/* Message 3 */}
          <div className={`preview-bubble-row incoming ${activeMessageStep >= 2 ? 'visible' : ''}`}>
            <div className="bubble-avatar" aria-hidden="true">M</div>
            <div className="bubble-content">
              <span className="bubble-author">Marcus Vance</span>
              <p className="bubble-text">Latency is under 25ms worldwide. Launching group call now! 📞</p>
              <time className="bubble-time">10:44 AM</time>
            </div>
          </div>

          {/* Typing indicator */}
          <div className={`typing-bubble-row ${activeMessageStep >= 3 ? 'visible' : ''}`} aria-hidden="true">
            <span className="typing-dot" />
            <span className="typing-dot" />
            <span className="typing-dot" />
          </div>
        </div>

        {/* Window Input Footer */}
        <footer className="glass-chat-input-bar">
          <div className="mock-input-field">
            <span className="mock-placeholder">Type a message or share a file...</span>
          </div>
          <button type="button" className="mock-send-btn" aria-label="Send message">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </footer>
      </section>

      {/* Floating Call Card Badge Bottom-Right */}
      <aside className="floating-badge floating-badge-bottom" aria-label="Active call status">
        <div className="call-avatar-stack" aria-hidden="true">
          <span className="avatar-mini a1">JD</span>
          <span className="avatar-mini a2">AL</span>
        </div>
        <div className="badge-text-group">
          <span className="badge-label">WebRTC Voice &amp; Video</span>
          <span className="badge-sub">Lossless Opus Audio</span>
        </div>
      </aside>
    </div>
  );
};
