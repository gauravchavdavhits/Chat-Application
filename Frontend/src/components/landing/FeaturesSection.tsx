import React from 'react';

interface FeatureItem {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const FEATURES: FeatureItem[] = [
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
    title: 'Instant Direct Messaging',
    description: 'Exchange 1-on-1 private messages with sub-second delivery, read receipts, and live typing notifications.',
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
    title: 'Live Presence & Online Status',
    description: 'Monitor when teammates are connected, idle, or offline with automated heartbeat synchronization.',
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="23 7 16 12 23 17 23 7" />
        <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
      </svg>
    ),
    title: 'WebRTC Audio & Video Calling',
    description: 'Initiate browser-based calls with camera switching, mute controls, and native screen sharing capabilities.',
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    title: 'Collaborative Group Channels',
    description: 'Create dedicated team rooms, invite members, view member rosters, and coordinate group conversations.',
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
      </svg>
    ),
    title: 'Message History & Inline Editing',
    description: 'Edit typos in sent messages, delete unwanted messages, or forward conversation threads seamlessly.',
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <polyline points="21 15 16 10 5 21" />
      </svg>
    ),
    title: 'Rich Media, Files & GIF Search',
    description: 'Attach images and documents directly or express reactions with full Giphy integration and emoji picker.',
  },
];

export const FeaturesSection: React.FC = () => {
  return (
    <section id="features" className="landing-section">
      <div className="landing-container">
        <div className="landing-section-header">
          <div className="section-pre-tag">CAPABILITIES</div>
          <h2 className="landing-section-title">Built for Modern Team Interaction</h2>
          <p className="landing-section-desc">
            Explore core communication tools designed for clarity, speed, and seamless everyday teamwork.
          </p>
        </div>

        <div className="landing-features-grid">
          {FEATURES.map((feature, idx) => (
            <article key={idx} className="landing-feature-card">
              <div className="landing-feature-icon-wrapper" aria-hidden="true">
                {feature.icon}
              </div>
              <h3 className="landing-feature-name">{feature.title}</h3>
              <p className="landing-feature-text">{feature.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};
