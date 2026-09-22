import React from 'react';
import { TypingText } from '../TypingText';
import { ChatPreview } from '../ChatPreview';

interface HeroSectionProps {
  onOpenAuth: (mode: 'login' | 'register') => void;
}

const DYNAMIC_PHRASES = [
  'without limits',
  'in real time',
  'with your team',
  'from anywhere',
  'with confidence',
];

export const HeroSection: React.FC<HeroSectionProps> = ({ onOpenAuth }) => {
  const handleScrollToFeatures = (e: React.MouseEvent) => {
    e.preventDefault();
    const target = document.getElementById('features');
    if (target) {
      target.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section id="hero" className="landing-section landing-hero-section">
      <div className="landing-container landing-hero-layout">
        {/* Left Column: Heading, Dynamic Typing, and CTA */}
        <div className="landing-hero-content">
          <div className="landing-badge">
            <span className="landing-badge-dot" aria-hidden="true" />
            <span>Modern Real-Time Communication Platform</span>
          </div>

          <h1 className="landing-hero-title">
            <span className="headline-static-line">Connect, chat and collaborate</span>
            <span className="headline-dynamic-line">
              <TypingText phrases={DYNAMIC_PHRASES} />
            </span>
          </h1>

          <p className="landing-hero-subtitle">
            A high-performance communication platform featuring instant direct messaging, group collaboration rooms, WebRTC voice and video calling, and dynamic presence indicators.
          </p>

          <div className="landing-hero-cta">
            <button
              type="button"
              className="landing-hero-btn landing-btn-primary"
              onClick={() => onOpenAuth('register')}
            >
              Start Chatting
            </button>
            <a
              href="#features"
              onClick={handleScrollToFeatures}
              className="landing-hero-btn landing-btn-secondary"
            >
              Explore Features
            </a>
          </div>

          {/* Trust Highlights */}
          <div className="landing-hero-trust" aria-label="Product guarantees">
            <div className="trust-pill">
              <span className="trust-dot active" />
              <span>Persistent Socket Stream</span>
            </div>
            <span className="trust-divider" aria-hidden="true">•</span>
            <div className="trust-pill">
              <span className="trust-dot blue" />
              <span>Peer-to-Peer WebRTC</span>
            </div>
            <span className="trust-divider" aria-hidden="true">•</span>
            <div className="trust-pill">
              <span className="trust-dot purple" />
              <span>JWT Authenticated</span>
            </div>
          </div>
        </div>

        {/* Right Column: Interactive Chat Preview */}
        <div className="landing-hero-visual">
          <ChatPreview />
        </div>
      </div>
    </section>
  );
};
