import React from 'react';

interface FooterProps {
  onOpenAuth: (mode: 'login' | 'register') => void;
}

export const Footer: React.FC<FooterProps> = ({ onOpenAuth }) => {
  const handleScrollToTop = (e: React.MouseEvent) => {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, targetId: string) => {
    e.preventDefault();
    const element = document.getElementById(targetId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <footer className="landing-footer">
      <div className="landing-container landing-footer-grid">
        {/* Brand & Mission */}
        <div className="landing-footer-col brand-col">
          <div className="footer-brand-header">
            <div className="landing-logo-icon small" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"
                  fill="url(#landingGradFooter)"
                />
                <defs>
                  <linearGradient id="landingGradFooter" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#6366f1" />
                    <stop offset="0.5" stopColor="#8b5cf6" />
                    <stop offset="1" stopColor="#06b6d4" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <span className="landing-brand-name">Chat Application</span>
          </div>

          <p className="landing-footer-copy">
            Real-time messaging platform built for fast, simple and engaging conversations across web browsers.
          </p>

          <div className="landing-footer-contact">
            <span className="contact-label">Official Contact:</span>
            <a href="mailto:bidirectionalchat@gmail.com" className="contact-email-link">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
              </svg>
              bidirectionalchat@gmail.com
            </a>
          </div>
        </div>

        {/* Navigation Links */}
        <div className="landing-footer-col">
          <h4 className="footer-col-title">Navigation</h4>
          <ul className="footer-links-list">
            <li><a href="#features" onClick={(e) => handleNavClick(e, 'features')}>Features</a></li>
            <li><a href="#technology" onClick={(e) => handleNavClick(e, 'technology')}>Technology</a></li>
            <li><a href="#how-it-works" onClick={(e) => handleNavClick(e, 'how-it-works')}>How It Works</a></li>
            <li><a href="#security" onClick={(e) => handleNavClick(e, 'security')}>Security</a></li>
            <li><a href="#faq" onClick={(e) => handleNavClick(e, 'faq')}>FAQ</a></li>
          </ul>
        </div>

        {/* Resources & Open Source */}
        <div className="landing-footer-col">
          <h4 className="footer-col-title">Resources</h4>
          <ul className="footer-links-list">
            <li>
              <a
                href="https://github.com/gauravchavdavhits/Chat-Application"
                target="_blank"
                rel="noopener noreferrer"
              >
                GitHub Repository ↗
              </a>
            </li>
            <li>
              <a
                href="https://gauravchavdavhits.github.io/Chat-Application/"
                target="_blank"
                rel="noopener noreferrer"
              >
                Live Demo ↗
              </a>
            </li>
            <li>
              <button
                type="button"
                className="footer-action-link"
                onClick={() => onOpenAuth('login')}
              >
                Sign In
              </button>
            </li>
            <li>
              <button
                type="button"
                className="footer-action-link"
                onClick={() => onOpenAuth('register')}
              >
                Get Started
              </button>
            </li>
          </ul>
        </div>
      </div>

      {/* Bottom Legal & Back To Top */}
      <div className="landing-footer-bottom">
        <div className="landing-container footer-bottom-container">
          <p className="copyright-text">
            © 2026 Chat Application. All rights reserved.
          </p>
          <a href="#hero" onClick={handleScrollToTop} className="footer-back-to-top">
            <span>Back to Top</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M18 15l-6-6-6 6" />
            </svg>
          </a>
        </div>
      </div>
    </footer>
  );
};
