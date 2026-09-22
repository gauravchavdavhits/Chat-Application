import React, { useState, useEffect } from 'react';

export const ChatPreview: React.FC = () => {
  // Step sequence: 0: Elena incoming, 1: You outgoing, 2: Typing indicator, 3: Marcus incoming
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % 4);
    }, 2600);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="hero-chat-preview-container">
      {/* Ambient background glow behind window */}
      <div className="chat-preview-glow" aria-hidden="true" />

      {/* Floating Status Cards Around Chat Preview */}
      <aside className="hero-floating-card card-online" aria-label="Active users indicator">
        <span className="floating-status-dot online" aria-hidden="true" />
        <div className="floating-card-info">
          <span className="card-title">12 users online</span>
          <span className="card-sub">Channels synchronized</span>
        </div>
      </aside>

      <aside className="hero-floating-card card-delivered" aria-label="Message delivery confirmation">
        <span className="floating-status-icon success" aria-hidden="true">✓</span>
        <div className="floating-card-info">
          <span className="card-title">Message delivered</span>
          <span className="card-sub">&lt; 18ms socket latency</span>
        </div>
      </aside>

      <aside className="hero-floating-card card-webrtc" aria-label="WebRTC audio video session">
        <span className="floating-status-dot pulse" aria-hidden="true" />
        <div className="floating-card-info">
          <span className="card-title">WebRTC connected</span>
          <span className="card-sub">Opus HD Audio • 1080p</span>
        </div>
      </aside>

      <aside className="hero-floating-card card-typing" aria-label="Typing indicator alert">
        <div className="card-typing-dots" aria-hidden="true">
          <span className="typing-mini-dot" />
          <span className="typing-mini-dot" />
          <span className="typing-mini-dot" />
        </div>
        <span className="card-title">Marcus is typing...</span>
      </aside>

      {/* Main Glassmorphic Chat Window */}
      <section className="glass-chat-window" aria-label="Interactive Product Preview">
        {/* Window Top Bar */}
        <header className="glass-chat-header">
          <div className="chat-header-user">
            <div className="avatar-wrapper">
              <div className="demo-avatar">
                <span className="avatar-initials">DS</span>
                <span className="online-indicator-dot" />
              </div>
            </div>
            <div className="user-meta">
              <div className="user-meta-name">DevOps Squad</div>
              <div className="user-meta-status">
                <span className="status-live-dot" />
                <span>8 members active now</span>
              </div>
            </div>
          </div>
          <div className="chat-header-actions" aria-hidden="true">
            <div className="header-action-btn" title="Voice call">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
            </div>
            <div className="header-action-btn active" title="WebRTC Video call">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <polygon points="23 7 16 12 23 17 23 7" />
                <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
              </svg>
            </div>
          </div>
        </header>

        {/* Message Thread Body */}
        <div className="glass-chat-body">
          {/* Message 1 (Incoming) */}
          <div className={`preview-bubble-row incoming ${activeStep >= 0 ? 'visible' : ''}`}>
            <div className="bubble-avatar" aria-hidden="true">ER</div>
            <div className="bubble-content">
              <div className="bubble-header">
                <span className="bubble-author">Elena Rostova</span>
                <time className="bubble-time">10:42 AM</time>
              </div>
              <p className="bubble-text">Are the new WebRTC video channels ready for staging testing? 🚀</p>
            </div>
          </div>

          {/* Message 2 (Outgoing) */}
          <div className={`preview-bubble-row outgoing ${activeStep >= 1 ? 'visible' : ''}`}>
            <div className="bubble-content">
              <p className="bubble-text">Yes! Sockets connected and screen sharing is enabled.</p>
              <div className="bubble-footer">
                <time className="bubble-time">10:43 AM</time>
                <span className="checkmarks" aria-label="Delivered and read">✓✓</span>
              </div>
            </div>
          </div>

          {/* Message 3 (Incoming) */}
          <div className={`preview-bubble-row incoming ${activeStep >= 3 ? 'visible' : ''}`}>
            <div className="bubble-avatar" aria-hidden="true">MV</div>
            <div className="bubble-content">
              <div className="bubble-header">
                <span className="bubble-author">Marcus Vance</span>
                <time className="bubble-time">10:44 AM</time>
              </div>
              <p className="bubble-text">Audio latency is sub-20ms worldwide. Ready to call! 🎧</p>
            </div>
          </div>

          {/* Typing Indicator Bubble */}
          <div className={`preview-bubble-row typing-row ${activeStep === 2 ? 'visible' : ''}`} aria-hidden="true">
            <div className="bubble-avatar">MV</div>
            <div className="typing-bubble-card">
              <span className="typing-dot" />
              <span className="typing-dot" />
              <span className="typing-dot" />
            </div>
          </div>
        </div>

        {/* Window Input Bar */}
        <footer className="glass-chat-input-bar">
          <div className="mock-input-field">
            <span className="mock-placeholder">Type a message or drop files...</span>
          </div>
          <button type="button" className="mock-send-btn" aria-label="Send message">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </footer>
      </section>
    </div>
  );
};
