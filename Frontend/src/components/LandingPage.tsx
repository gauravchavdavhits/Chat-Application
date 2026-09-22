import React, { useState, useEffect } from 'react';
import { AuthModal } from './AuthModal';
import { ParticleBackground } from './ParticleBackground';
import { Navbar } from './landing/Navbar';
import { HeroSection } from './landing/HeroSection';
import { FeaturesSection } from './landing/FeaturesSection';
import { TechSection } from './landing/TechSection';
import { HowItWorksSection } from './landing/HowItWorksSection';
import { SecuritySection } from './landing/SecuritySection';
import { FaqSection } from './landing/FaqSection';
import { Footer } from './landing/Footer';
import { BackToTop } from './landing/BackToTop';
import { UserProfile } from '../types/chat.types';

interface LandingPageProps {
  onAuthSuccess: (user: UserProfile) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onAuthSuccess }) => {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authInitialMode, setAuthInitialMode] = useState<'login' | 'register'>('login');

  const handleOpenAuth = (mode: 'login' | 'register') => {
    setAuthInitialMode(mode);
    setShowAuthModal(true);
  };

  // Scroll reveal observer for landing sections
  useEffect(() => {
    // Respect prefers-reduced-motion
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mediaQuery.matches) return;

    const sections = document.querySelectorAll('.landing-section');
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('section-revealed');
          }
        });
      },
      {
        root: null,
        rootMargin: '0px',
        threshold: 0.12,
      }
    );

    sections.forEach((sec) => observer.observe(sec));

    return () => observer.disconnect();
  }, []);

  return (
    <div className="landing-wrapper">
      {/* Global atmospheric particle & glowing node canvas */}
      <ParticleBackground />

      {/* 1. Header & Navigation */}
      <Navbar onOpenAuth={handleOpenAuth} />

      {/* 2. Main Page Content */}
      <main id="main-content">
        <HeroSection onOpenAuth={handleOpenAuth} />
        <FeaturesSection />
        <TechSection />
        <HowItWorksSection />
        <SecuritySection />
        <FaqSection />
      </main>

      {/* 3. Footer */}
      <Footer onOpenAuth={handleOpenAuth} />

      {/* 4. Floating Back to Top Button */}
      <BackToTop />

      {/* 5. Auth Modal Overlay */}
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
