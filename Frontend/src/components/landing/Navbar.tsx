import React, { useState, useEffect } from 'react';

interface NavbarProps {
  onOpenAuth: (mode: 'login' | 'register') => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenAuth }) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('hero');

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);

      const sections = ['hero', 'features', 'technology', 'how-it-works', 'security', 'faq'];
      const scrollPosition = window.scrollY + 160;

      for (const sectionId of sections) {
        const el = document.getElementById(sectionId);
        if (el) {
          const top = el.offsetTop;
          const height = el.offsetHeight;
          if (scrollPosition >= top && scrollPosition < top + height) {
            setActiveSection(sectionId);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, targetId: string) => {
    e.preventDefault();
    setMobileMenuOpen(false);
    const element = document.getElementById(targetId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header className={`landing-header ${isScrolled ? 'header-scrolled' : ''}`}>
      <div className="landing-container landing-nav-container">
        {/* Brand Logo */}
        <a
          href="#hero"
          onClick={(e) => handleNavClick(e, 'hero')}
          className="landing-brand"
          aria-label="Chat Application Home"
        >
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
                  <stop offset="1" stopColor="#06b6d4" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          <span className="landing-brand-name">Chat Application</span>
        </a>

        {/* Desktop Navigation */}
        <nav className="landing-nav" aria-label="Main Navigation">
          <a
            href="#features"
            className={`landing-nav-link ${activeSection === 'features' ? 'active' : ''}`}
            onClick={(e) => handleNavClick(e, 'features')}
          >
            Features
          </a>
          <a
            href="#technology"
            className={`landing-nav-link ${activeSection === 'technology' ? 'active' : ''}`}
            onClick={(e) => handleNavClick(e, 'technology')}
          >
            Technology
          </a>
          <a
            href="#how-it-works"
            className={`landing-nav-link ${activeSection === 'how-it-works' ? 'active' : ''}`}
            onClick={(e) => handleNavClick(e, 'how-it-works')}
          >
            How It Works
          </a>
          <a
            href="#security"
            className={`landing-nav-link ${activeSection === 'security' ? 'active' : ''}`}
            onClick={(e) => handleNavClick(e, 'security')}
          >
            Security
          </a>
          <a
            href="#faq"
            className={`landing-nav-link ${activeSection === 'faq' ? 'active' : ''}`}
            onClick={(e) => handleNavClick(e, 'faq')}
          >
            FAQ
          </a>
        </nav>

        {/* Action Buttons */}
        <div className="landing-nav-actions">
          <button
            type="button"
            className="landing-btn-secondary"
            onClick={() => onOpenAuth('login')}
          >
            Sign In
          </button>
          <button
            type="button"
            className="landing-btn-primary"
            onClick={() => onOpenAuth('register')}
          >
            Get Started
          </button>

          {/* Mobile Hamburger Toggle */}
          <button
            type="button"
            className="landing-mobile-menu-toggle"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileMenuOpen}
          >
            <span className={`hamburger-bar ${mobileMenuOpen ? 'open' : ''}`} />
            <span className={`hamburger-bar ${mobileMenuOpen ? 'open' : ''}`} />
            <span className={`hamburger-bar ${mobileMenuOpen ? 'open' : ''}`} />
          </button>
        </div>
      </div>

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div className="landing-mobile-drawer" role="dialog" aria-modal="true">
          <nav className="mobile-nav-links">
            <a
              href="#features"
              className={`mobile-nav-item ${activeSection === 'features' ? 'active' : ''}`}
              onClick={(e) => handleNavClick(e, 'features')}
            >
              Features
            </a>
            <a
              href="#technology"
              className={`mobile-nav-item ${activeSection === 'technology' ? 'active' : ''}`}
              onClick={(e) => handleNavClick(e, 'technology')}
            >
              Technology
            </a>
            <a
              href="#how-it-works"
              className={`mobile-nav-item ${activeSection === 'how-it-works' ? 'active' : ''}`}
              onClick={(e) => handleNavClick(e, 'how-it-works')}
            >
              How It Works
            </a>
            <a
              href="#security"
              className={`mobile-nav-item ${activeSection === 'security' ? 'active' : ''}`}
              onClick={(e) => handleNavClick(e, 'security')}
            >
              Security
            </a>
            <a
              href="#faq"
              className={`mobile-nav-item ${activeSection === 'faq' ? 'active' : ''}`}
              onClick={(e) => handleNavClick(e, 'faq')}
            >
              FAQ
            </a>
          </nav>
          <div className="mobile-drawer-actions">
            <button
              type="button"
              className="landing-btn-secondary"
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenAuth('login');
              }}
            >
              Sign In
            </button>
            <button
              type="button"
              className="landing-btn-primary"
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenAuth('register');
              }}
            >
              Get Started
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
