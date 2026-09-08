import React, { useState, useEffect, useRef } from 'react';
import { UserProfile, UserSettings } from '../types/chat.types';
import { updateSettingsApi, clearChatHistoryApi } from '../services/settingsService';
import { uploadFileApi, updateAvatarApi, updateProfileApi, sendEmailOtpApi, verifyEmailOtpApi } from '../services/userService';
import { ConfirmModal } from './ConfirmModal';
import { CustomSelect } from './CustomSelect';

interface SettingsViewProps {
  currentUser: UserProfile;
  onUpdateUser: (user: UserProfile) => void;
  onLogout: () => void;
}

type SettingsCategory = 'profile' | 'privacy' | 'notifications' | 'appearance' | 'chat' | 'other';

const defaultSettings: UserSettings = {
  privacy: { onlineVisibility: 'everyone', lastSeenVisibility: 'everyone', readReceipts: true, blockedUsers: [] },
  notifications: { messages: true, calls: true, sounds: true },
  appearance: { mode: 'dark', themeColor: '#6366f1', wallpaper: '' },
  chat: { enterToSend: true, fontSize: 'medium' }
};

/* ── Reusable sub-components ──────────────────────────────────────── */

const ToggleSwitch: React.FC<{ checked: boolean; onChange: (v: boolean) => void }> = ({ checked, onChange }) => (
  <div
    onClick={() => onChange(!checked)}
    style={{
      width: '48px', height: '26px', borderRadius: '13px', cursor: 'pointer',
      background: checked ? 'linear-gradient(135deg, var(--accent-color, #6366f1), #8b5cf6)' : 'rgba(255,255,255,0.1)',
      transition: 'background 0.3s', position: 'relative', flexShrink: 0,
      boxShadow: checked ? '0 2px 10px rgba(99,102,241,0.4)' : 'inset 0 1px 3px rgba(0,0,0,0.3)',
    }}
  >
    <div style={{
      width: '20px', height: '20px', borderRadius: '50%', background: '#fff',
      position: 'absolute', top: '3px', left: checked ? '25px' : '3px',
      transition: 'left 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
      boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
    }} />
  </div>
);

const cardStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  padding: '20px 24px', borderRadius: '16px',
  background: 'var(--bg-card)',
  border: '1px solid var(--border-color)',
  backdropFilter: 'blur(10px)',
  boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
  transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: '0.74rem', fontWeight: '700', textTransform: 'uppercase',
  letterSpacing: '1.2px', color: 'var(--text-muted)', marginBottom: '4px',
  paddingLeft: '4px',
};

const selectStyle: React.CSSProperties = {
  width: '100%', padding: '12px 16px', paddingRight: '40px', borderRadius: '12px',
  border: '1px solid var(--border-color)', background: 'var(--input-bg)',
  color: 'var(--text-main)', fontSize: '14px', cursor: 'pointer',
  outline: 'none', transition: 'border-color 0.2s',
  WebkitAppearance: 'none' as any, MozAppearance: 'none' as any, appearance: 'none' as const,
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%23888' viewBox='0 0 16 16'%3E%3Cpath d='M8 11L3 6h10l-5 5z'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat', backgroundPosition: 'right 14px center',
};

const iconBoxStyle: React.CSSProperties = {
  width: '40px', height: '40px', borderRadius: '12px',
  background: 'rgba(99,102,241,0.15)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
};

/* ── Main Component ───────────────────────────────────────────────── */

export function SettingsView({ currentUser, onUpdateUser, onLogout }: SettingsViewProps) {
  const [activeCategory, setActiveCategory] = useState<SettingsCategory>('profile');
  const [settings, setSettings] = useState<UserSettings>(currentUser.settings || defaultSettings);
  const [loading, setLoading] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [usernameInput, setUsernameInput] = useState(currentUser.username || '');
  const [emailInput, setEmailInput] = useState(currentUser.email || '');
  const [profileSaving, setProfileSaving] = useState(false);

  // Email Verification State
  const [isVerified, setIsVerified] = useState<boolean>(() => {
    const saved = localStorage.getItem(`email_verified_${currentUser._id}`);
    if (saved !== null) return saved === 'true';
    return currentUser.isEmailVerified ?? false;
  });
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpValue, setOtpValue] = useState(['', '', '', '', '', '']);
  const [otpError, setOtpError] = useState('');
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [otpResendCountdown, setOtpResendCountdown] = useState(0);
  const otpInputsRef = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    setUsernameInput(currentUser.username || '');
    setEmailInput(currentUser.email || '');
    const saved = localStorage.getItem(`email_verified_${currentUser._id}`);
    if (saved !== null) {
      setIsVerified(saved === 'true');
    } else {
      setIsVerified(currentUser.isEmailVerified ?? false);
    }
  }, [currentUser.username, currentUser.email, currentUser._id, currentUser.isEmailVerified]);

  // Handle countdown timer for OTP resend
  useEffect(() => {
    if (otpResendCountdown > 0) {
      const timer = setTimeout(() => setOtpResendCountdown(prev => prev - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [otpResendCountdown]);

  const [sendingOtp, setSendingOtp] = useState(false);

  const handleSendOtp = async () => {
    if (!emailInput.trim()) {
      setErrorMsg('Please provide a valid email address');
      setTimeout(() => setErrorMsg(''), 3000);
      return;
    }

    setSendingOtp(true);
    try {
      const res = await sendEmailOtpApi(currentUser._id, emailInput.trim());
      if (res.success) {
        setOtpValue(['', '', '', '', '', '']);
        setOtpError('');
        setShowOtpModal(true);
        setOtpResendCountdown(60);
        setSuccessMsg(res.message || 'Verification code sent to your email!');
        setTimeout(() => setSuccessMsg(''), 4000);
        setTimeout(() => {
          otpInputsRef.current[0]?.focus();
        }, 150);
      } else {
        setErrorMsg(res.message || 'Failed to send OTP email');
        setTimeout(() => setErrorMsg(''), 4000);
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Error sending verification email. Check SMTP setup.');
      setTimeout(() => setErrorMsg(''), 4000);
    } finally {
      setSendingOtp(false);
    }
  };

  const handleOtpChange = (index: number, val: string) => {
    if (!/^\d*$/.test(val)) return;
    const newOtp = [...otpValue];
    newOtp[index] = val.slice(-1);
    setOtpValue(newOtp);
    setOtpError('');

    if (val && index < 5) {
      otpInputsRef.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpValue[index] && index > 0) {
      otpInputsRef.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text').trim();
    if (/^\d{6}$/.test(pasteData)) {
      const digits = pasteData.split('');
      setOtpValue(digits);
      otpInputsRef.current[5]?.focus();
    }
  };

  const handleConfirmOtp = async () => {
    const entered = otpValue.join('');
    if (entered.length < 6) {
      setOtpError('Please enter all 6 digits');
      return;
    }

    setIsVerifyingOtp(true);
    setOtpError('');
    try {
      const res = await verifyEmailOtpApi(currentUser._id, entered);
      if (res.success) {
        setIsVerified(true);
        setShowOtpModal(false);
        setSuccessMsg('Email verified successfully! Click "Save Changes" below to update your profile in the database. ✅');
        setTimeout(() => setSuccessMsg(''), 5000);
      } else {
        setOtpError(res.message || 'Invalid verification code');
      }
    } catch (err: any) {
      setOtpError(err.response?.data?.message || 'Verification failed. Please try again.');
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usernameInput.trim() || !emailInput.trim()) {
      setErrorMsg('Username and email cannot be empty');
      setTimeout(() => setErrorMsg(''), 3000);
      return;
    }

    // Require email verification before allowing save to MongoDB
    if (!isVerified) {
      setErrorMsg('Please verify your email with OTP first before saving changes! ⚠️');
      setTimeout(() => setErrorMsg(''), 4000);
      handleSendOtp();
      return;
    }

    try {
      setProfileSaving(true);
      const res = await updateProfileApi(currentUser._id, usernameInput.trim(), emailInput.trim());
      if (res.success && res.data) {
        // Sync user state and store verified flag in localStorage
        const updatedUser = { ...res.data, isEmailVerified: true };
        onUpdateUser(updatedUser);
        localStorage.setItem(`email_verified_${currentUser._id}`, 'true');
        setSuccessMsg('Profile changes saved to MongoDB successfully! ✅');
        setTimeout(() => setSuccessMsg(''), 3500);
      } else {
        setErrorMsg(res.message || 'Failed to update profile in database');
        setTimeout(() => setErrorMsg(''), 3500);
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Error updating profile in database');
      setTimeout(() => setErrorMsg(''), 3500);
    } finally {
      setProfileSaving(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setAvatarUploading(true);
    try {
      const uploadRes = await uploadFileApi(file);
      if (uploadRes.success && uploadRes.data?.fileUrl) {
        const updateRes = await updateAvatarApi(currentUser._id, uploadRes.data.fileUrl);
        if (updateRes.success) {
          onUpdateUser(updateRes.data);
          setSuccessMsg('Profile picture updated successfully!');
          setTimeout(() => setSuccessMsg(''), 3000);
        } else {
          setErrorMsg('Failed to update avatar profile');
          setTimeout(() => setErrorMsg(''), 3000);
        }
      } else {
        setErrorMsg('Failed to upload image file');
        setTimeout(() => setErrorMsg(''), 3000);
      }
    } catch {
      setErrorMsg('Error uploading profile picture');
      setTimeout(() => setErrorMsg(''), 3000);
    } finally {
      setAvatarUploading(false);
    }
  };

  // Save settings automatically when they change
  useEffect(() => {
    const saveSettings = async () => {
      try {
        const res = await updateSettingsApi(currentUser._id, settings);
        if (res.success) {
          onUpdateUser({ ...currentUser, settings });
        }
      } catch {
        // ignore
      }
    };
    // Only save if it's not the initial mount load
    if (JSON.stringify(settings) !== JSON.stringify(currentUser.settings || defaultSettings)) {
      const timer = setTimeout(() => saveSettings(), 500);
      return () => clearTimeout(timer);
    }
  }, [settings, currentUser._id]);

  const updateNestedSetting = (category: keyof UserSettings, field: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [field]: value
      }
    }));
  };

  const handleClearChatHistory = () => {
    setShowClearConfirm(true);
  };

  const performClearChatHistory = async () => {
    setLoading(true);
    try {
      await clearChatHistoryApi(currentUser._id);
      setSuccessMsg('Chat history cleared successfully!');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (e) {
      setErrorMsg('Failed to clear chat history');
      setTimeout(() => setErrorMsg(''), 3000);
    } finally {
      setLoading(false);
    }
  };

  const categories = [
    { id: 'profile', label: 'Profile', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg> },
    { id: 'privacy', label: 'Privacy & Security', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg> },
    { id: 'notifications', label: 'Notifications', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg> },
    { id: 'appearance', label: 'Appearance', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="13.5" cy="6.5" r=".5"></circle><circle cx="17.5" cy="10.5" r=".5"></circle><circle cx="8.5" cy="7.5" r=".5"></circle><circle cx="6.5" cy="12.5" r=".5"></circle><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"></path></svg> },
    { id: 'chat', label: 'Chat Settings', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg> },
    { id: 'other', label: 'About & Help', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg> },
  ];

  return (
    <>
      {/* Settings Sidebar */}
      <div className="sidebar-container" style={{ width: '300px', flexShrink: 0, borderRight: '1px solid var(--border-color)' }}>
        <div className="sidebar-logo">
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path>
              <circle cx="12" cy="12" r="3"></circle>
            </svg>
            Settings
          </h2>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '16px' }}>
          {categories.map(c => {
            const isActive = activeCategory === c.id;
            return (
              <div
                key={c.id}
                onClick={() => setActiveCategory(c.id as SettingsCategory)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '14px',
                  padding: '12px 16px', borderRadius: '12px', cursor: 'pointer',
                  background: isActive
                    ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(139, 92, 246, 0.12))'
                    : 'transparent',
                  border: isActive
                    ? '1px solid rgba(99, 102, 241, 0.4)'
                    : '1px solid transparent',
                  fontWeight: isActive ? '600' : '500',
                  color: isActive ? 'var(--accent-color, #6366f1)' : 'var(--text-muted)',
                  transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                  boxShadow: isActive ? '0 2px 8px rgba(99, 102, 241, 0.15)' : 'none',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = 'rgba(99, 102, 241, 0.08)';
                    e.currentTarget.style.color = 'var(--text-main)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = 'var(--text-muted)';
                  }
                }}
              >
                <span style={{ display: 'flex', color: isActive ? 'var(--accent-color, #6366f1)' : 'currentColor', opacity: isActive ? 1 : 0.75 }}>
                  {c.icon}
                </span>
                {c.label}
              </div>
            );
          })}
        </div>

      </div>

      {/* Settings Content */}
      <div className="chat-window" style={{ overflowY: 'auto', padding: '40px 48px' }}>

        {/* Toast Messages */}
        {successMsg && (
          <div style={{ padding: '14px 20px', background: 'linear-gradient(135deg, rgba(0,200,83,0.15), rgba(0,200,83,0.05))', color: '#4ade80', borderRadius: '12px', marginBottom: '24px', border: '1px solid rgba(0,200,83,0.2)', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
            {successMsg}
          </div>
        )}
        {errorMsg && (
          <div style={{ padding: '14px 20px', background: 'linear-gradient(135deg, rgba(239,68,68,0.15), rgba(239,68,68,0.05))', color: '#f87171', borderRadius: '12px', marginBottom: '24px', border: '1px solid rgba(239,68,68,0.2)', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
            {errorMsg}
          </div>
        )}

        <div style={{ maxWidth: '640px' }}>

          {/* ── PROFILE ──────────────────────────────────────────── */}
          {activeCategory === 'profile' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
              {/* Profile Hero Card */}
              <div style={{
                borderRadius: '20px', overflow: 'hidden',
                background: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
              }}>
                {/* Banner with animated mesh pattern */}
                <div style={{ height: '120px', position: 'relative', overflow: 'hidden', background: 'var(--accent-gradient)' }}>
                  <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 20% 50%, rgba(255,255,255,0.2) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(0,0,0,0.15) 0%, transparent 40%)' }} />
                  <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '50px', background: 'linear-gradient(transparent, rgba(0,0,0,0.4))' }} />
                </div>
                {/* Avatar + Info */}
                <div style={{ padding: '0 28px 28px', marginTop: '-50px', position: 'relative', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: '20px' }}>
                    <div style={{
                      width: '94px', height: '94px', borderRadius: '50%',
                      background: 'var(--accent-gradient)',
                      border: '4px solid var(--bg-card)',
                      overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
                      position: 'relative',
                    }}>
                      {currentUser.avatar ? (
                        <img src={currentUser.avatar} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <span style={{ color: '#fff', fontSize: '34px', fontWeight: 'bold' }}>{currentUser.username.charAt(0).toUpperCase()}</span>
                      )}
                      {avatarUploading && (
                        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <svg className="spin-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
                        </div>
                      )}
                    </div>
                    <div>
                      <h2 style={{ margin: '0 0 4px 0', fontSize: '22px', fontWeight: '700', color: 'var(--text-main)' }}>{currentUser.username}</h2>
                      <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '14px' }}>{currentUser.email}</p>
                    </div>
                  </div>

                  {/* Change Avatar Button */}
                  <div>
                    <input
                      type="file"
                      ref={avatarInputRef}
                      style={{ display: 'none' }}
                      accept="image/*"
                      onChange={handleAvatarUpload}
                    />
                    <button
                      type="button"
                      onClick={() => avatarInputRef.current?.click()}
                      disabled={avatarUploading}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '8px',
                        padding: '10px 16px', borderRadius: '12px',
                        background: 'var(--input-bg)',
                        border: '1px solid var(--border-color)',
                        color: 'var(--text-main)', fontSize: '13px', fontWeight: '600',
                        cursor: avatarUploading ? 'not-allowed' : 'pointer',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                        <circle cx="12" cy="13" r="4"></circle>
                      </svg>
                      {avatarUploading ? 'Uploading...' : 'Change Photo'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Profile fields */}
              <form onSubmit={handleSaveProfile} style={{ ...cardStyle, flexDirection: 'column', alignItems: 'stretch', gap: '20px', padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <p style={{ ...sectionTitleStyle, marginBottom: '0' }}>Account Information</p>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Editable</span>
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px', display: 'block', fontWeight: '500' }}>Username</label>
                  <input
                    type="text"
                    value={usernameInput}
                    onChange={(e) => setUsernameInput(e.target.value)}
                    placeholder="Enter your username"
                    style={{ ...selectStyle, backgroundImage: 'none' }}
                    required
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px', display: 'block', fontWeight: '500' }}>Email</label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <input
                      type="email"
                      value={emailInput}
                      onChange={(e) => {
                        setEmailInput(e.target.value);
                        if (e.target.value !== currentUser.email) {
                          setIsVerified(false);
                        }
                      }}
                      placeholder="Enter your email"
                      style={{
                        ...selectStyle,
                        backgroundImage: 'none',
                        paddingRight: isVerified ? '90px' : '82px',
                      }}
                      required
                    />
                    <div style={{ position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center' }}>
                      {isVerified ? (
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px',
                          padding: '6px 12px',
                          borderRadius: '8px',
                          background: 'rgba(74, 222, 128, 0.12)',
                          color: '#4ade80',
                          fontSize: '12px',
                          fontWeight: '600',
                        }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12"></polyline>
                          </svg>
                          Verified
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={handleSendOtp}
                          disabled={sendingOtp}
                          style={{
                            padding: '6px 14px',
                            borderRadius: '8px',
                            background: 'linear-gradient(135deg, var(--accent-color, #6366f1), #8b5cf6)',
                            color: '#fff',
                            fontSize: '12px',
                            fontWeight: '600',
                            border: 'none',
                            cursor: sendingOtp ? 'not-allowed' : 'pointer',
                            opacity: sendingOtp ? 0.7 : 1,
                            boxShadow: '0 2px 8px rgba(99, 102, 241, 0.35)',
                            transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                          }}
                          onMouseEnter={(e) => {
                            if (!sendingOtp) {
                              e.currentTarget.style.transform = 'scale(1.02)';
                              e.currentTarget.style.boxShadow = '0 4px 12px rgba(99, 102, 241, 0.5)';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!sendingOtp) {
                              e.currentTarget.style.transform = 'scale(1)';
                              e.currentTarget.style.boxShadow = '0 2px 8px rgba(99, 102, 241, 0.35)';
                            }
                          }}
                        >
                          {sendingOtp ? (
                            <>
                              <svg className="spin-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
                              Sending...
                            </>
                          ) : (
                            <>
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                                <polyline points="22 4 12 14.01 9 11.01"></polyline>
                              </svg>
                              Verify
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '14px', marginTop: '4px' }}>
                  {!isVerified && (
                    <span style={{ fontSize: '12px', color: '#facc15', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                      Verify email first to save
                    </span>
                  )}
                  <button
                    type="submit"
                    disabled={profileSaving || !isVerified || (usernameInput.trim() === (currentUser.username || '').trim() && emailInput.trim().toLowerCase() === (currentUser.email || '').trim().toLowerCase() && (currentUser.isEmailVerified ?? false))}
                    style={{
                      padding: '10px 22px',
                      borderRadius: '12px',
                      background: (profileSaving || !isVerified || (usernameInput.trim() === (currentUser.username || '').trim() && emailInput.trim().toLowerCase() === (currentUser.email || '').trim().toLowerCase() && (currentUser.isEmailVerified ?? false)))
                        ? 'rgba(99, 102, 241, 0.22)'
                        : 'linear-gradient(135deg, var(--accent-color, #6366f1), #8b5cf6)',
                      color: (profileSaving || !isVerified || (usernameInput.trim() === (currentUser.username || '').trim() && emailInput.trim().toLowerCase() === (currentUser.email || '').trim().toLowerCase() && (currentUser.isEmailVerified ?? false)))
                        ? 'rgba(199, 210, 254, 0.75)'
                        : '#fff',
                      fontSize: '13px',
                      fontWeight: '600',
                      border: (profileSaving || !isVerified || (usernameInput.trim() === (currentUser.username || '').trim() && emailInput.trim().toLowerCase() === (currentUser.email || '').trim().toLowerCase() && (currentUser.isEmailVerified ?? false)))
                        ? '1px solid rgba(99, 102, 241, 0.35)'
                        : 'none',
                      cursor: (profileSaving || !isVerified || (usernameInput.trim() === (currentUser.username || '').trim() && emailInput.trim().toLowerCase() === (currentUser.email || '').trim().toLowerCase() && (currentUser.isEmailVerified ?? false))) ? 'not-allowed' : 'pointer',
                      opacity: profileSaving ? 0.6 : 1,
                      boxShadow: (profileSaving || !isVerified || (usernameInput.trim() === (currentUser.username || '').trim() && emailInput.trim().toLowerCase() === (currentUser.email || '').trim().toLowerCase() && (currentUser.isEmailVerified ?? false)))
                        ? '0 2px 6px rgba(0, 0, 0, 0.1)'
                        : '0 4px 14px rgba(99, 102, 241, 0.35)',
                      transition: 'all 0.25s ease',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    {profileSaving ? (
                      <>
                        <svg className="spin-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
                        Saving...
                      </>
                    ) : (
                      'Save Changes'
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ── PRIVACY ──────────────────────────────────────────── */}
          {activeCategory === 'privacy' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <p style={sectionTitleStyle}>Visibility</p>
              <div style={{
                ...cardStyle,
                flexDirection: 'column',
                alignItems: 'stretch',
                gap: '24px',
                padding: '24px',
                overflow: 'visible',
                position: 'relative',
                zIndex: 10,
              }}>
                <div style={{ position: 'relative', zIndex: 12 }}>
                  <label style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px', display: 'block', fontWeight: '500' }}>Who can see you online</label>
                  <CustomSelect
                    value={settings.privacy.onlineVisibility}
                    onChange={val => updateNestedSetting('privacy', 'onlineVisibility', val)}
                    options={[
                      {
                        value: 'everyone',
                        label: 'Everyone',
                        description: 'Visible to all contacts and users',
                        icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
                      },
                      {
                        value: 'nobody',
                        label: 'Nobody',
                        description: 'Hide online status from everyone',
                        icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                      }
                    ]}
                  />
                </div>
                <div style={{ position: 'relative', zIndex: 11 }}>
                  <label style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px', display: 'block', fontWeight: '500' }}>Who can see your last seen</label>
                  <CustomSelect
                    value={settings.privacy.lastSeenVisibility}
                    onChange={val => updateNestedSetting('privacy', 'lastSeenVisibility', val)}
                    options={[
                      {
                        value: 'everyone',
                        label: 'Everyone',
                        description: 'Show timestamp of when you were last active',
                        icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                      },
                      {
                        value: 'nobody',
                        label: 'Nobody',
                        description: 'Hide your last seen timestamp',
                        icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="1" y1="1" x2="23" y2="23"></line><path d="M21 21l-4.35-4.35"></path><circle cx="11" cy="11" r="8"></circle></svg>
                      }
                    ]}
                  />
                </div>
              </div>

              <p style={{ ...sectionTitleStyle, marginTop: '12px' }}>Security</p>
              <div style={{ ...cardStyle, position: 'relative', zIndex: 1 }}>
                <div style={{ flex: 1 }}>
                  <h4 style={{ margin: 0, marginBottom: '4px', fontSize: '15px', fontWeight: '600' }}>Read Receipts</h4>
                  <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.5' }}>If turned off, you won't see read receipts from others either.</p>
                </div>
                <ToggleSwitch checked={settings.privacy.readReceipts} onChange={v => updateNestedSetting('privacy', 'readReceipts', v)} />
              </div>
            </div>
          )}

          {activeCategory === 'notifications' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <p style={sectionTitleStyle}>Alerts</p>
              {([
                { key: 'messages', title: 'Message Notifications', desc: 'Get notified when you receive new messages.', iconPath: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z' },
                { key: 'calls', title: 'Call Notifications', desc: 'Ring on incoming voice and video calls.', iconPath: 'M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z' },
                { key: 'sounds', title: 'Notification Sounds', desc: 'Play sounds for incoming notifications.', iconPath: 'M11 5L6 9 2 9 2 15 6 15 11 19 11 5' },
              ] as const).map(item => (
                <div key={item.key} style={cardStyle}>
                  <div style={{ display: 'flex', gap: '14px', flex: 1 }}>
                    <div style={iconBoxStyle}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d={item.iconPath}></path>
                      </svg>
                    </div>
                    <div>
                      <h4 style={{ margin: 0, marginBottom: '4px', fontSize: '15px', fontWeight: '600' }}>{item.title}</h4>
                      <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.4' }}>{item.desc}</p>
                    </div>
                  </div>
                  <ToggleSwitch checked={settings.notifications[item.key]} onChange={v => updateNestedSetting('notifications', item.key, v)} />
                </div>
              ))}
            </div>
          )}

          {/* ── APPEARANCE ───────────────────────────────────────── */}
          {activeCategory === 'appearance' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <p style={sectionTitleStyle}>Theme</p>
              <div style={{
                ...cardStyle,
                flexDirection: 'column',
                alignItems: 'stretch',
                gap: '20px',
                padding: '24px',
                overflow: 'visible',
                position: 'relative',
                zIndex: 10,
              }}>
                <div style={{ position: 'relative', zIndex: 12 }}>
                  <label style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px', display: 'block', fontWeight: '500' }}>Theme Mode</label>
                  <CustomSelect
                    value={settings.appearance.mode}
                    onChange={val => updateNestedSetting('appearance', 'mode', val)}
                    options={[
                      {
                        value: 'system',
                        label: 'System Default',
                        description: 'Matches your OS appearance automatically',
                        icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>
                      },
                      {
                        value: 'dark',
                        label: 'Dark Mode',
                        description: 'Sleek dark theme, comfortable in low light',
                        icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
                      },
                      {
                        value: 'light',
                        label: 'Light Mode',
                        description: 'Clean and bright daytime theme',
                        icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>
                      }
                    ]}
                  />
                </div>
              </div>

              <p style={{ ...sectionTitleStyle, marginTop: '12px' }}>Accent Color</p>
              <div style={{ ...cardStyle, padding: '24px', position: 'relative', zIndex: 1 }}>
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                  {[
                    { color: '#5865F2', name: 'Indigo' },
                    { color: '#ed4245', name: 'Rose' },
                    { color: '#57F287', name: 'Emerald' },
                    { color: '#FEE75C', name: 'Amber' },
                    { color: '#EB459E', name: 'Pink' },
                    { color: '#3b82f6', name: 'Blue' },
                    { color: '#f97316', name: 'Orange' },
                  ].map(({ color, name }) => (
                    <div
                      key={color}
                      onClick={() => updateNestedSetting('appearance', 'themeColor', color)}
                      title={name}
                      style={{
                        width: '44px', height: '44px', borderRadius: '14px', backgroundColor: color,
                        cursor: 'pointer', transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                        border: settings.appearance.themeColor === color ? '3px solid #fff' : '3px solid transparent',
                        boxShadow: settings.appearance.themeColor === color ? `0 0 0 3px ${color}40, 0 4px 14px ${color}50` : 'none',
                        transform: settings.appearance.themeColor === color ? 'scale(1.15)' : 'scale(1)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      {settings.appearance.themeColor === color && (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── CHAT SETTINGS ────────────────────────────────────── */}
          {activeCategory === 'chat' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <p style={sectionTitleStyle}>Behavior</p>
              </div>
              <div style={cardStyle}>
                <div style={{ display: 'flex', gap: '14px', flex: 1 }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent-color)" strokeWidth="2"><polyline points="9 10 4 15 9 20"></polyline><path d="M20 4v7a4 4 0 0 1-4 4H4"></path></svg>
                  </div>
                  <div>
                    <h4 style={{ margin: 0, marginBottom: '4px', fontSize: '15px', fontWeight: '600' }}>Enter to Send</h4>
                    <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.4' }}>Press Enter key to send a message immediately.</p>
                  </div>
                </div>
                <ToggleSwitch checked={settings.chat.enterToSend} onChange={v => updateNestedSetting('chat', 'enterToSend', v)} />
              </div>

              <div style={{
                ...cardStyle,
                flexDirection: 'column',
                alignItems: 'stretch',
                gap: '16px',
                padding: '24px',
                overflow: 'visible',
                position: 'relative',
                zIndex: 10,
              }}>
                <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent-color)" strokeWidth="2"><polyline points="4 7 4 4 20 4 20 7"></polyline><line x1="9" y1="20" x2="15" y2="20"></line><line x1="12" y1="4" x2="12" y2="20"></line></svg>
                  </div>
                  <label style={{ fontSize: '15px', fontWeight: '600' }}>Message Font Size</label>
                </div>
                <div style={{ position: 'relative', zIndex: 11 }}>
                  <CustomSelect
                    value={settings.chat.fontSize}
                    onChange={val => updateNestedSetting('chat', 'fontSize', val)}
                    options={[
                      {
                        value: 'small',
                        label: 'Small',
                        description: 'Compact text sizing (13px)',
                        icon: <span style={{ fontSize: '12px', fontWeight: '700' }}>A</span>
                      },
                      {
                        value: 'medium',
                        label: 'Medium (Default)',
                        description: 'Standard balanced size (14.5px)',
                        icon: <span style={{ fontSize: '15px', fontWeight: '700' }}>A</span>
                      },
                      {
                        value: 'large',
                        label: 'Large',
                        description: 'Larger text for enhanced readability (17px)',
                        icon: <span style={{ fontSize: '18px', fontWeight: '700' }}>A</span>
                      }
                    ]}
                  />
                </div>
              </div>

              {/* Danger Zone */}
              <div style={{ marginTop: '8px' }}>
                <p style={{ ...sectionTitleStyle, color: '#f87171' }}>Danger Zone</p>
              </div>
              <div style={{
                padding: '24px', borderRadius: '16px',
                background: 'linear-gradient(145deg, rgba(239,68,68,0.08), rgba(239,68,68,0.03))',
                border: '1px solid rgba(239,68,68,0.15)',
              }}>
                <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                  </div>
                  <div style={{ flex: 1 }}>
                    <h4 style={{ margin: 0, marginBottom: '6px', fontSize: '15px', fontWeight: '600', color: '#f87171' }}>Clear Chat History</h4>
                    <p style={{ margin: 0, marginBottom: '16px', fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                      This will permanently delete all your messages. Other users will still see their copies.
                    </p>
                    <button
                      onClick={handleClearChatHistory}
                      disabled={loading}
                      style={{
                        background: 'linear-gradient(135deg, #ef4444, #dc2626)', color: '#fff',
                        border: 'none', borderRadius: '10px', padding: '10px 22px',
                        fontSize: '14px', fontWeight: '600', cursor: loading ? 'not-allowed' : 'pointer',
                        opacity: loading ? 0.6 : 1, transition: 'all 0.3s',
                        boxShadow: '0 4px 14px rgba(239,68,68,0.3)',
                      }}
                    >
                      {loading ? 'Clearing...' : 'Clear All History'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── OTHER / ABOUT ────────────────────────────────────── */}
          {activeCategory === 'other' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <p style={sectionTitleStyle}>Application</p>
              <div style={{ ...cardStyle, flexDirection: 'column', alignItems: 'stretch', padding: '28px', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{ width: '44px', height: '44px', borderRadius: '14px', background: 'linear-gradient(135deg, var(--accent-color, #6366f1), #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700' }}>Bidirectional Chat</h3>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)', background: 'rgba(99,102,241,0.15)', padding: '2px 8px', borderRadius: '6px', fontWeight: '600' }}>v1.0.0</span>
                  </div>
                </div>
                <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-muted)', lineHeight: '1.6' }}>
                  A real-time chat application with group chats, voice/video calls, file sharing, and much more.
                </p>
              </div>

              <div style={{ ...cardStyle, padding: '24px' }}>
                <div style={{ display: 'flex', gap: '14px', alignItems: 'center', flex: 1 }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent-color)" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                  </div>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '15px', fontWeight: '600' }}>Help & Support</h4>
                    <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>support@example.com</p>
                  </div>
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2"><polyline points="9 18 15 12 9 6"></polyline></svg>
              </div>

              {/* Logout */}
              <div style={{ marginTop: '16px' }}>
                <button
                  onClick={onLogout}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    background: 'linear-gradient(145deg, rgba(239,68,68,0.1), rgba(239,68,68,0.05))',
                    color: '#f87171', border: '1px solid rgba(239,68,68,0.2)',
                    borderRadius: '14px', padding: '14px 24px',
                    fontSize: '15px', fontWeight: '600', cursor: 'pointer',
                    transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                    width: '100%', justifyContent: 'center',
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                  Log Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {showClearConfirm && (
        <ConfirmModal
          title="Clear Chat History"
          message="Are you sure you want to clear your entire chat history? This cannot be undone. Other users will still see their copies of the messages."
          confirmText="Clear History"
          isDestructive={true}
          onConfirm={() => {
            setShowClearConfirm(false);
            performClearChatHistory();
          }}
          onCancel={() => setShowClearConfirm(false)}
        />
      )}

      {/* Email Verification OTP Modal */}
      {showOtpModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px',
          animation: 'fadeIn 0.2s ease',
        }}>
          <div style={{
            background: 'var(--bg-card, #1e293b)',
            border: '1px solid var(--border-color, rgba(255,255,255,0.1))',
            borderRadius: '20px',
            padding: '32px',
            maxWidth: '440px',
            width: '100%',
            boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
            textAlign: 'center',
            position: 'relative',
          }}>
            {/* Close Button */}
            <button
              onClick={() => setShowOtpModal(false)}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: 'rgba(255,255,255,0.06)',
                border: 'none',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-muted, #94a3b8)',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>

            {/* Email Icon */}
            <div style={{
              width: '60px',
              height: '60px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(139, 92, 246, 0.2))',
              border: '1px solid rgba(99, 102, 241, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 18px',
              color: 'var(--accent-color, #6366f1)',
            }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                <polyline points="22,6 12,13 2,6"></polyline>
              </svg>
            </div>

            <h3 style={{ margin: '0 0 8px 0', fontSize: '20px', fontWeight: '700', color: 'var(--text-main, #fff)' }}>
              Verify Email Address
            </h3>
            <p style={{ margin: '0 0 24px 0', fontSize: '13px', color: 'var(--text-muted, #94a3b8)', lineHeight: '1.5' }}>
              We sent a 6-digit verification code to <br />
              <strong style={{ color: 'var(--text-main, #fff)' }}>{emailInput}</strong>
            </p>

            {/* 6-Digit OTP Inputs */}
            <div
              style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: '16px' }}
              onPaste={handleOtpPaste}
            >
              {otpValue.map((digit, idx) => (
                <input
                  key={idx}
                  ref={(el) => { otpInputsRef.current[idx] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(idx, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                  style={{
                    width: '46px',
                    height: '52px',
                    borderRadius: '12px',
                    border: otpError ? '2px solid #ef4444' : (digit ? '2px solid var(--accent-color, #6366f1)' : '1px solid var(--border-color, rgba(255,255,255,0.15))'),
                    background: 'var(--input-bg, rgba(0,0,0,0.2))',
                    color: 'var(--text-main, #fff)',
                    fontSize: '22px',
                    fontWeight: '700',
                    textAlign: 'center',
                    outline: 'none',
                    transition: 'all 0.2s ease',
                    boxShadow: digit ? '0 0 10px rgba(99, 102, 241, 0.2)' : 'none',
                  }}
                />
              ))}
            </div>

            {otpError && (
              <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: '#f87171', fontWeight: '500' }}>
                {otpError}
              </p>
            )}

            {/* Verify Button */}
            <button
              onClick={handleConfirmOtp}
              disabled={isVerifyingOtp || otpValue.join('').length < 6}
              style={{
                width: '100%',
                padding: '13px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, var(--accent-color, #6366f1), #8b5cf6)',
                color: '#fff',
                fontSize: '14px',
                fontWeight: '600',
                border: 'none',
                cursor: isVerifyingOtp || otpValue.join('').length < 6 ? 'not-allowed' : 'pointer',
                opacity: isVerifyingOtp || otpValue.join('').length < 6 ? 0.6 : 1,
                boxShadow: '0 4px 14px rgba(99, 102, 241, 0.35)',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                marginBottom: '16px',
              }}
            >
              {isVerifyingOtp ? (
                <>
                  <svg className="spin-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
                  Verifying...
                </>
              ) : (
                'Confirm & Verify'
              )}
            </button>

            {/* Resend Code */}
            <div style={{ fontSize: '13px', color: 'var(--text-muted, #94a3b8)' }}>
              Didn't receive code?{' '}
              {otpResendCountdown > 0 ? (
                <span style={{ color: 'var(--accent-color, #818cf8)' }}>Resend in {otpResendCountdown}s</span>
              ) : (
                <button
                  type="button"
                  onClick={handleSendOtp}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--accent-color, #818cf8)',
                    cursor: 'pointer',
                    fontWeight: '600',
                    textDecoration: 'underline',
                    padding: 0,
                    fontSize: '13px',
                  }}
                >
                  Resend Code
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
