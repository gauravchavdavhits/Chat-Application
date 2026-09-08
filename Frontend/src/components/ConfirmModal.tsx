import React from 'react';

interface ConfirmModalProps {
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
}

export function ConfirmModal({ 
  title, 
  message, 
  onConfirm, 
  onCancel, 
  confirmText = 'Confirm', 
  cancelText = 'Cancel', 
  isDestructive = false 
}: ConfirmModalProps) {
  return (
    <div className="modal-overlay" style={{ zIndex: 1000 }}>
      <div className="modal-content" style={{ width: '400px', maxWidth: '90%' }}>
        <h2>{title}</h2>
        <p style={{ margin: '16px 0', color: 'var(--text-muted)' }}>{message}</p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
          <button className="secondary-btn" onClick={onCancel}>{cancelText}</button>
          <button 
            className="primary-btn" 
            style={isDestructive ? { backgroundColor: 'var(--error-color, #ef4444)' } : {}}
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
