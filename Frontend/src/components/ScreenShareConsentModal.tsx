import React from 'react';

interface ScreenShareConsentModalProps {
  adminName: string;
  onAccept: () => void;
  onReject: () => void;
}

export const ScreenShareConsentModal: React.FC<ScreenShareConsentModalProps> = ({
  adminName,
  onAccept,
  onReject,
}) => {
  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000,
      animation: 'fadeIn 0.2s ease-out',
      padding: '20px'
    }}>
      <div style={{
        background: 'linear-gradient(145deg, #1e293b, #0f172a)',
        border: '1px solid rgba(99, 102, 241, 0.3)',
        borderRadius: '20px',
        padding: '28px 24px',
        maxWidth: '440px',
        width: '100%',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 30px rgba(99, 102, 241, 0.2)',
        textAlign: 'center',
        color: '#fff',
      }}>
        {/* Radar / Screen Monitor Icon */}
        <div style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(239, 68, 68, 0.2))',
          border: '2px solid rgba(99, 102, 241, 0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 18px',
          color: '#818cf8',
        }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
            <line x1="8" y1="21" x2="16" y2="21"></line>
            <line x1="12" y1="17" x2="12" y2="21"></line>
          </svg>
        </div>

        <h3 style={{ margin: '0 0 8px 0', fontSize: '1.25rem', fontWeight: '700', letterSpacing: '-0.02em' }}>
          Screen Sharing Request
        </h3>

        <p style={{ margin: '0 0 16px 0', color: '#94a3b8', fontSize: '13.5px', lineHeight: '1.5' }}>
          Administrator <strong style={{ color: '#f8fafc' }}>{adminName}</strong> is requesting to view your screen in real time.
        </p>

        <div style={{
          background: 'rgba(255, 255, 255, 0.04)',
          borderRadius: '12px',
          padding: '12px 14px',
          marginBottom: '24px',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          textAlign: 'left',
          fontSize: '12px',
          color: '#cbd5e1'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span style={{ color: '#4ade80', fontSize: '14px' }}>✓</span>
            <span>You select what to share (Entire Screen, Window, or Tab)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: '#4ade80', fontSize: '14px' }}>✓</span>
            <span>You can stop sharing anytime from your browser</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            type="button"
            onClick={onReject}
            style={{
              flex: 1,
              padding: '12px',
              borderRadius: '12px',
              background: 'rgba(255, 255, 255, 0.08)',
              color: '#94a3b8',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            Reject
          </button>

          <button
            type="button"
            onClick={onAccept}
            style={{
              flex: 1.4,
              padding: '12px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
              color: '#fff',
              border: 'none',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(99, 102, 241, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
            Accept & Share
          </button>
        </div>
      </div>
    </div>
  );
};
