import React from 'react';

export const PeoplePlaceholder: React.FC = () => {
  return (
    <div className="placeholder-view">
      <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#818cf8', opacity: 0.5, marginBottom: '20px' }}>
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
        <circle cx="9" cy="7" r="4"></circle>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
      </svg>
      <h2>People</h2>
      <p style={{ color: 'var(--text-muted)' }}>Discover and connect with more users.</p>
    </div>
  );
};

export const GroupsPlaceholder: React.FC = () => {
  return (
    <div className="placeholder-view">
      <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#818cf8', opacity: 0.5, marginBottom: '20px' }}>
        <rect x="3" y="3" width="7" height="7"></rect>
        <rect x="14" y="3" width="7" height="7"></rect>
        <rect x="14" y="14" width="7" height="7"></rect>
        <rect x="3" y="14" width="7" height="7"></rect>
      </svg>
      <h2>Groups</h2>
      <p style={{ color: 'var(--text-muted)' }}>Group chats are coming soon!</p>
    </div>
  );
};

export const CallsPlaceholder: React.FC = () => {
  return (
    <div className="placeholder-view">
      <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#818cf8', opacity: 0.5, marginBottom: '20px' }}>
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
      </svg>
      <h2>Call History</h2>
      <p style={{ color: 'var(--text-muted)' }}>Your recent voice and video calls will appear here.</p>
    </div>
  );
};
