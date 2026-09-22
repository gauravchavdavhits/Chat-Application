import React, { useState } from 'react';
import { AuthModal } from './AuthModal';
import { ParticleBackground } from './ParticleBackground';
import { TypingText } from './TypingText';
import { ChatPreview } from './ChatPreview';
import { UserProfile } from '../types/chat.types';

interface LandingPageProps {
  onAuthSuccess: (user: UserProfile) => void;
}

const DYNAMIC_PHRASES = [
  'with your people',
  'in real time',
  'from anywhere',
  'without limits',
  'with confidence',
];

export const LandingPage: React.FC<LandingPageProps> = ({ onAuthSuccess }) => {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authInitialMode, setAuthInitialMode] = useState<'login' | 'register'>('login');
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  const handleOpenAuth = (mode: 'login' | 'register') => {
    setAuthInitialMode(mode);
    setShowAuthModal(true);
  };

  const toggleFaq = (index: number) => {
    setOpenFaqIndex(openFaqIndex === index ? null : index);
  };

  return (
    <div className="landing-wrapper">
      {/* Global Atmospheric particle & glowing node background canvas for the entire page */}
      <ParticleBackground />

      {/* 1. Header & Navigation */}
      <header className="landing-header">
        <div className="landing-container landing-nav-container">
          <a href="#hero" className="landing-brand" aria-label="Chat Application Home">
            <div className="landing-logo-icon" aria-hidden="true">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"
                  fill="url(#landingGrad)"
                />
                <defs>
                  <linearGradient id="landingGrad" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#6366f1" />
                    <stop offset="0.5" stopColor="#8b5cf6" />
                    <stop offset="1" stopColor="#ec4899" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <span className="landing-brand-name">Chat Application</span>
          </a>

          <nav className="landing-nav" aria-label="Main Navigation">
            <a href="#features" className="landing-nav-link">Features</a>
            <a href="#technology" className="landing-nav-link">Technology</a>
            <a href="#how-it-works" className="landing-nav-link">How It Works</a>
            <a href="#security" className="landing-nav-link">Security</a>
            <a href="#faq" className="landing-nav-link">FAQ</a>
          </nav>

          <div className="landing-nav-actions">
            <button
              type="button"
              className="landing-btn-secondary"
              onClick={() => handleOpenAuth('login')}
            >
              Sign In
            </button>
            <button
              type="button"
              className="landing-btn-primary"
              onClick={() => handleOpenAuth('register')}
            >
              Get Started
            </button>
          </div>
        </div>
      </header>

      {/* 2. Main Content */}
      <main>
        {/* HERO SECTION WITH DYNAMIC TYPING & PREVIEW */}
        <section id="hero" className="landing-section landing-hero-section">

          <div className="landing-container landing-hero-layout">
            {/* Left Column: Heading, Dynamic Typing, and CTA */}
            <div className="landing-hero-content">
              <div className="landing-badge">
                <span className="landing-badge-dot" aria-hidden="true" />
                <span>✦ Real-Time Communication</span>
              </div>

              <h1 className="landing-hero-title">
                <span className="headline-static-line">Connect, chat and collaborate</span>
                <span className="headline-dynamic-line">
                  <TypingText phrases={DYNAMIC_PHRASES} />
                </span>
              </h1>

              <p className="landing-hero-subtitle">
                Experience fast, simple, and engaging conversations with a modern real-time chat experience built on React, TypeScript, Node.js, Express, Socket.IO, and MongoDB.
              </p>

              <div className="landing-hero-cta">
                <button
                  type="button"
                  className="landing-hero-btn landing-btn-primary"
                  onClick={() => handleOpenAuth('register')}
                >
                  Start Chatting
                </button>
                <a
                  href="#features"
                  className="landing-hero-btn landing-btn-secondary"
                >
                  Explore Features
                </a>
              </div>

              {/* Trust/Status indicator line */}
              <div className="landing-hero-trust" aria-label="Application Highlights">
                <span className="trust-indicator" aria-hidden="true">●</span>
                <span className="trust-item">Real-Time Messaging</span>
                <span className="trust-divider" aria-hidden="true">•</span>
                <span className="trust-item">Fast</span>
                <span className="trust-divider" aria-hidden="true">•</span>
                <span className="trust-item">WebRTC Voice &amp; Video</span>
                <span className="trust-divider" aria-hidden="true">•</span>
                <span className="trust-item">Secure</span>
              </div>
            </div>

            {/* Right Column: Interactive Chat Preview */}
            <div className="landing-hero-visual">
              <ChatPreview />
            </div>
          </div>
        </section>

        {/* FEATURES SECTION */}
        <section id="features" className="landing-section">
          <div className="landing-container">
            <div className="landing-section-header">
              <h2 className="landing-section-title">Production-Ready Communication Features</h2>
              <p className="landing-section-desc">
                Everything you need for seamless digital interaction, from one-on-one direct messages to interactive group chats.
              </p>
            </div>

            <div className="landing-features-grid">
              <article className="landing-feature-item">
                <div className="landing-feature-icon" aria-hidden="true">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                </div>
                <h3 className="landing-feature-name">Real-Time Direct Messaging</h3>
                <p className="landing-feature-text">
                  Send and receive text messages instantly without page refreshes. Real-time delivery powered by persistent WebSocket sockets.
                </p>
              </article>

              <article className="landing-feature-item">
                <div className="landing-feature-icon" aria-hidden="true">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                </div>
                <h3 className="landing-feature-name">Live Online &amp; Offline Status</h3>
                <p className="landing-feature-text">
                  Instant visibility into active user presence. Online status indicators update dynamically whenever contacts connect or disconnect.
                </p>
              </article>

              <article className="landing-feature-item">
                <div className="landing-feature-icon" aria-hidden="true">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>
                </div>
                <h3 className="landing-feature-name">WebRTC Voice &amp; Video Calling</h3>
                <p className="landing-feature-text">
                  High-fidelity audio and video calling directly from your browser. Includes microphone muting, camera switching, and screen sharing.
                </p>
              </article>

              <article className="landing-feature-item">
                <div className="landing-feature-icon" aria-hidden="true">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                </div>
                <h3 className="landing-feature-name">Group Channels &amp; Collaboration</h3>
                <p className="landing-feature-text">
                  Create dedicated group rooms, manage members, and communicate with multiple team members simultaneously in real time.
                </p>
              </article>

              <article className="landing-feature-item">
                <div className="landing-feature-icon" aria-hidden="true">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                </div>
                <h3 className="landing-feature-name">Message Editing &amp; Deletion</h3>
                <p className="landing-feature-text">
                  Full control over your conversation history. Edit sent messages in place or delete them seamlessly across connected client devices.
                </p>
              </article>

              <article className="landing-feature-item">
                <div className="landing-feature-icon" aria-hidden="true">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                </div>
                <h3 className="landing-feature-name">Image, Media &amp; GIF Sharing</h3>
                <p className="landing-feature-text">
                  Share photos, documents, emojis, and animated GIFs powered by Giphy integration directly inside active chat threads.
                </p>
              </article>
            </div>
          </div>
        </section>

        {/* TECHNOLOGY SECTION */}
        <section id="technology" className="landing-section landing-tech-section">
          <div className="landing-container">
            <div className="landing-section-header">
              <h2 className="landing-section-title">Built with Modern Web Technologies</h2>
              <p className="landing-section-desc">
                Architected with industry-standard frameworks for responsive user experiences, reliable API communication, and scalable persistence.
              </p>
            </div>

            <div className="landing-tech-grid">
              <article className="landing-tech-card">
                <div className="landing-tech-tag">Frontend</div>
                <h3 className="landing-tech-name">React &amp; TypeScript</h3>
                <p className="landing-tech-desc">
                  Type-safe component architecture bundled with Vite. Provides rapid rendering, modular state management, and optimized responsive layouts.
                </p>
              </article>

              <article className="landing-tech-card">
                <div className="landing-tech-tag">Real-Time</div>
                <h3 className="landing-tech-name">Socket.IO &amp; WebSockets</h3>
                <p className="landing-tech-desc">
                  Powers bidirectional event streams for instant message delivery, live typing states, presence broadcasting, and call signaling.
                </p>
              </article>

              <article className="landing-tech-card">
                <div className="landing-tech-tag">Backend</div>
                <h3 className="landing-tech-name">Node.js &amp; Express.js</h3>
                <p className="landing-tech-desc">
                  RESTful API architecture handling authenticated endpoints, file uploads, group management, user profiles, and security middleware.
                </p>
              </article>

              <article className="landing-tech-card">
                <div className="landing-tech-tag">Database</div>
                <h3 className="landing-tech-name">MongoDB Atlas &amp; Mongoose</h3>
                <p className="landing-tech-desc">
                  Scalable cloud NoSQL database storing structured user profiles, encrypted credentials, conversation records, and call logs.
                </p>
              </article>
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section id="how-it-works" className="landing-section">
          <div className="landing-container">
            <div className="landing-section-header">
              <h2 className="landing-section-title">How the Chat Application Works</h2>
              <p className="landing-section-desc">
                Get started in seconds with a simple, secure, and straightforward workflow.
              </p>
            </div>

            <div className="landing-steps-grid">
              <div className="landing-step-item">
                <div className="landing-step-num" aria-hidden="true">1</div>
                <h3 className="landing-step-title">Create an Account</h3>
                <p className="landing-step-desc">Register with a unique username and secure password with built-in validation checks.</p>
              </div>
              <div className="landing-step-item">
                <div className="landing-step-num" aria-hidden="true">2</div>
                <h3 className="landing-step-title">Connect &amp; Discover</h3>
                <p className="landing-step-desc">Browse registered users, see who is currently online, or create a group conversation.</p>
              </div>
              <div className="landing-step-item">
                <div className="landing-step-num" aria-hidden="true">3</div>
                <h3 className="landing-step-title">Chat &amp; Call in Real Time</h3>
                <p className="landing-step-desc">Exchange instant messages, share media, or start a voice/video call with one click.</p>
              </div>
            </div>
          </div>
        </section>

        {/* SECURITY SECTION */}
        <section id="security" className="landing-section landing-security-section">
          <div className="landing-container">
            <div className="landing-section-header">
              <h2 className="landing-section-title">Authentication &amp; Application Security</h2>
              <p className="landing-section-desc">
                Implementing standard web security best practices across client and server layers.
              </p>
            </div>

            <div className="landing-security-grid">
              <article className="landing-security-item">
                <h3 className="landing-security-name">JWT Authentication &amp; Refresh Rotation</h3>
                <p className="landing-security-desc">
                  Stateless JSON Web Tokens with short-lived access tokens and automatic refresh token rotation on token expiration.
                </p>
              </article>
              <article className="landing-security-item">
                <h3 className="landing-security-name">Bcrypt Password Hashing</h3>
                <p className="landing-security-desc">
                  All user passwords are cryptographically salted and hashed using bcrypt before database storage.
                </p>
              </article>
              <article className="landing-security-item">
                <h3 className="landing-security-name">CORS &amp; Strict Transport Controls</h3>
                <p className="landing-security-desc">
                  Explicit origin whitelisting ensures only trusted frontend clients can interact with the backend API and socket namespaces.
                </p>
              </article>
              <article className="landing-security-item">
                <h3 className="landing-security-name">Input Sanitization &amp; Validation</h3>
                <p className="landing-security-desc">
                  Form validation with Yup on the client and schema-level validation with DOMPurify sanitization against XSS attacks.
                </p>
              </article>
            </div>
          </div>
        </section>

        {/* FAQ SECTION */}
        <section id="faq" className="landing-section">
          <div className="landing-container">
            <div className="landing-section-header">
              <h2 className="landing-section-title">Frequently Asked Questions</h2>
              <p className="landing-section-desc">
                Common questions about the Chat Application and its underlying architecture.
              </p>
            </div>

            <div className="landing-faq-list">
              {[
                {
                  q: 'What is this Chat Application?',
                  a: 'It is a full-stack real-time messaging web application that enables users to communicate via text messages, group rooms, voice calls, and video calls directly from any modern web browser.'
                },
                {
                  q: 'What technologies are used in this application?',
                  a: 'The frontend is built with React, TypeScript, and Vite. The backend runs on Node.js and Express with Socket.IO for real-time events. MongoDB Atlas is used for data persistence, and WebRTC enables peer-to-peer audio/video calling.'
                },
                {
                  q: 'Does the application support real-time message delivery?',
                  a: 'Yes. Messages, delivery updates, typing indicators, and presence status changes are transmitted instantly via persistent Socket.IO WebSocket connections.'
                },
                {
                  q: 'Can users share images, files, and GIFs?',
                  a: 'Yes. The application includes multimedia file attachment support and interactive GIF search powered by Giphy.'
                },
                {
                  q: 'Is an account required to use the chat features?',
                  a: 'Yes. Users need to register and sign in to access conversations, join group channels, maintain personal chat history, and participate in calls.'
                }
              ].map((faq, idx) => (
                <div key={idx} className="landing-faq-item">
                  <button
                    type="button"
                    className="landing-faq-question"
                    onClick={() => toggleFaq(idx)}
                    aria-expanded={openFaqIndex === idx}
                  >
                    <span>{faq.q}</span>
                    <span className="landing-faq-toggle" aria-hidden="true">
                      {openFaqIndex === idx ? '−' : '+'}
                    </span>
                  </button>
                  {openFaqIndex === idx && (
                    <div className="landing-faq-answer">
                      <p>{faq.a}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* 3. Footer */}
      <footer className="landing-footer">
        <div className="landing-container landing-footer-container">
          <div className="landing-footer-left">
            <p className="landing-footer-brand">Chat Application</p>
            <p className="landing-footer-copy">
              Real-time messaging platform built with React, TypeScript, Node.js, Express, MongoDB, and Socket.IO.
            </p>
          </div>
          <div className="landing-footer-links">
            <a href="#hero">Back to Top</a>
            <a href="https://github.com/gauravchavdavhits/Chat-Application" target="_blank" rel="noopener noreferrer">
              GitHub Repository
            </a>
            <button
              type="button"
              className="landing-link-button"
              onClick={() => handleOpenAuth('login')}
            >
              Sign In
            </button>
          </div>
        </div>
      </footer>

      {/* Auth Modal Overlay when user chooses to login or register */}
      {showAuthModal && (
        <AuthModal
          onAuthSuccess={onAuthSuccess}
          initialIsLogin={authInitialMode === 'login'}
          onClose={() => setShowAuthModal(false)}
        />
      )}
    </div>
  );
};
