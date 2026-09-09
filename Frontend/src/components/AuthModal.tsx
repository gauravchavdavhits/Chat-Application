import React, { useState } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { UserProfile } from '../types/chat.types';
import { registerApi, loginApi } from '../services/authService';

interface AuthModalProps {
  onAuthSuccess: (user: UserProfile) => void;
}

// Validation Regex
const USERNAME_REGEX = /^[a-zA-Z0-9_.]+$/;
// Minimum 8 chars, at least 1 uppercase or lowercase, 1 number, and 1 special character
const PASSWORD_REGEX = /^(?=.*[a-zA-Z])(?=.*\d)(?=.*[@$!%*?&#^()_+={}\[\]:;<>,.?/~\\-]).{8,64}$/;
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

// Yup Validation Schemas
const loginValidationSchema = Yup.object({
  email: Yup.string()
    .trim()
    .required('Email address is required')
    .matches(EMAIL_REGEX, 'Enter a valid email address (e.g. name@example.com)'),
  password: Yup.string()
    .required('Password is required')
    .min(1, 'Password is required'),
});

const registerValidationSchema = Yup.object({
  username: Yup.string()
    .trim()
    .required('Username is required')
    .min(3, 'Username must be at least 3 characters')
    .max(25, 'Username cannot exceed 25 characters')
    .matches(USERNAME_REGEX, 'Username can only contain letters, numbers, dots, and underscores'),
  email: Yup.string()
    .trim()
    .required('Email address is required')
    .matches(EMAIL_REGEX, 'Enter a valid email address (e.g. name@example.com)'),
  password: Yup.string()
    .required('Password is required')
    .min(8, 'Password must be at least 8 characters')
    .max(64, 'Password cannot exceed 64 characters')
    .matches(
      PASSWORD_REGEX,
      'Password must contain at least 1 letter, 1 number, and 1 special symbol'
    ),
  confirmPassword: Yup.string()
    .required('Please confirm your password')
    .oneOf([Yup.ref('password')], 'Passwords must match'),
});

export function AuthModal({ onAuthSuccess }: AuthModalProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [serverError, setServerError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Formik for Login
  const loginFormik = useFormik({
    initialValues: {
      email: '',
      password: '',
    },
    validationSchema: loginValidationSchema,
    validateOnBlur: true,
    validateOnChange: true,
    onSubmit: async (values, { setSubmitting }) => {
      setServerError('');
      setSuccessMessage('');
      try {
        const res = await loginApi(values.email.trim(), values.password);
        if (res.success && res.data) {
          onAuthSuccess(res.data);
        } else {
          setServerError(res.message || 'Login failed. Please check your credentials.');
        }
      } catch (err: any) {
        setServerError(
          err?.response?.data?.message || err.message || 'Something went wrong. Please try again.'
        );
      } finally {
        setSubmitting(false);
      }
    },
  });

  // Formik for Register
  const registerFormik = useFormik({
    initialValues: {
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
    validationSchema: registerValidationSchema,
    validateOnBlur: true,
    validateOnChange: true,
    onSubmit: async (values, { setSubmitting, resetForm }) => {
      setServerError('');
      setSuccessMessage('');
      try {
        const res = await registerApi(values.username.trim(), values.email.trim(), values.password);
        if (res.success) {
          resetForm();
          setIsLogin(true);
          setSuccessMessage('Account created successfully! Please sign in.');
        } else {
          setServerError(res.message || 'Registration failed. Please try again.');
        }
      } catch (err: any) {
        setServerError(
          err?.response?.data?.message || err.message || 'Something went wrong. Please try again.'
        );
      } finally {
        setSubmitting(false);
      }
    },
  });

  const activeFormik = isLogin ? loginFormik : registerFormik;

  const handleTabSwitch = (toLogin: boolean) => {
    setIsLogin(toLogin);
    setServerError('');
    setSuccessMessage('');
    loginFormik.resetForm();
    registerFormik.resetForm();
  };

  // Password requirement flags for visual checklist in Register mode
  const currentPassword = registerFormik.values.password;
  const hasMinLength = currentPassword.length >= 8;
  const hasLetter = /[a-zA-Z]/.test(currentPassword);
  const hasNumber = /[0-9]/.test(currentPassword);
  const hasSpecial = /[@$!%*?&#^()_+={}\[\]:;<>,.?/~\\-]/.test(currentPassword);

  return (
    <div className="auth-overlay">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo-wrapper">
            <div className="auth-logo-glow"></div>
            <div className="auth-logo">
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <defs>
                  <linearGradient id="bubbleGrad1" x1="2" y1="2" x2="16" y2="16" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#ffffff" />
                    <stop offset="1" stopColor="#e0e7ff" />
                  </linearGradient>
                  <linearGradient id="bubbleGrad2" x1="8" y1="8" x2="22" y2="22" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#a855f7" />
                    <stop offset="1" stopColor="#6366f1" />
                  </linearGradient>
                </defs>
                {/* Primary speech bubble */}
                <path
                  d="M14 4H6C4.34315 4 3 5.34315 3 7V12C3 13.6569 4.34315 15 6 15H7V18L10.5 15H14C15.6569 15 17 13.6569 17 12V7C17 5.34315 15.6569 4 14 4Z"
                  fill="url(#bubbleGrad1)"
                />
                {/* Secondary overlapping speech bubble (bidirectional concept) */}
                <path
                  d="M10 11H18C19.6569 11 21 12.3431 21 14V17C21 18.6569 19.6569 20 18 20H17.5L15 22V20H10C8.34315 20 7 18.6569 7 17V14C7 12.3431 8.34315 11 10 11Z"
                  fill="url(#bubbleGrad2)"
                  stroke="#ffffff"
                  strokeWidth="1.2"
                />
                {/* Minimal bidirectional arrows inside primary */}
                <circle cx="7.5" cy="9.5" r="1" fill="#6366f1" />
                <circle cx="10" cy="9.5" r="1" fill="#6366f1" />
                <circle cx="12.5" cy="9.5" r="1" fill="#6366f1" />
              </svg>
            </div>
          </div>
          <h2 className="auth-title">Bidirectional Chat</h2>
          <p className="auth-subtitle">
            {isLogin ? 'Welcome back! Sign in to continue' : 'Create an account to start real-time messaging'}
          </p>
        </div>

        <div className="auth-tabs">
          <button
            type="button"
            className={`auth-tab ${isLogin ? 'active' : ''}`}
            onClick={() => handleTabSwitch(true)}
          >
            Login
          </button>
          <button
            type="button"
            className={`auth-tab ${!isLogin ? 'active' : ''}`}
            onClick={() => handleTabSwitch(false)}
          >
            Register
          </button>
        </div>

        {serverError && (
          <div className="auth-error-alert">
            {serverError}
          </div>
        )}

        {successMessage && (
          <div
            className="auth-error-alert success"
            style={{
              background: 'rgba(16, 185, 129, 0.15)',
              borderColor: 'rgba(16, 185, 129, 0.3)',
              color: '#34d399',
            }}
          >
            ✅ {successMessage}
          </div>
        )}

        <form
          className="auth-form"
          onSubmit={activeFormik.handleSubmit}
          noValidate
        >
          {/* SCROLLABLE FIELDS CONTAINER */}
          <div className="auth-body">
            {/* USERNAME (Register Only) */}
            {!isLogin && (
              <div className="form-group">
                <label className="form-label" htmlFor="reg-username">
                  Username
                </label>
                <input
                  id="reg-username"
                  name="username"
                  type="text"
                  className={`form-input ${
                    registerFormik.touched.username && registerFormik.errors.username
                      ? 'is-invalid'
                      : registerFormik.touched.username && !registerFormik.errors.username
                      ? 'is-valid'
                      : ''
                  }`}
                  placeholder="e.g. john_doe"
                  value={registerFormik.values.username}
                  onChange={registerFormik.handleChange}
                  onBlur={registerFormik.handleBlur}
                  autoComplete="username"
                />
                {registerFormik.touched.username && registerFormik.errors.username && (
                  <span className="field-error-text">
                    {registerFormik.errors.username}
                  </span>
                )}
              </div>
            )}

            {/* EMAIL */}
            <div className="form-group">
              <label className="form-label" htmlFor="auth-email">
                Email Address
              </label>
              <input
                id="auth-email"
                name="email"
                type="email"
                className={`form-input ${
                  activeFormik.touched.email && activeFormik.errors.email
                    ? 'is-invalid'
                    : activeFormik.touched.email && !activeFormik.errors.email
                    ? 'is-valid'
                    : ''
                }`}
                placeholder="you@example.com"
                value={activeFormik.values.email}
                onChange={activeFormik.handleChange}
                onBlur={activeFormik.handleBlur}
                autoComplete="email"
              />
              {activeFormik.touched.email && activeFormik.errors.email && (
                <span className="field-error-text">
                  {activeFormik.errors.email}
                </span>
              )}
            </div>

            {/* PASSWORD */}
            <div className="form-group">
              <label className="form-label" htmlFor="auth-password">
                Password
              </label>
              <div className="password-input-wrapper">
                <input
                  id="auth-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  className={`form-input password-field ${
                    activeFormik.touched.password && activeFormik.errors.password
                      ? 'is-invalid'
                      : activeFormik.touched.password && !activeFormik.errors.password
                      ? 'is-valid'
                      : ''
                  }`}
                  placeholder={isLogin ? 'Enter your password' : 'Min. 8 characters'}
                  value={activeFormik.values.password}
                  onChange={activeFormik.handleChange}
                  onBlur={activeFormik.handleBlur}
                  autoComplete={isLogin ? 'current-password' : 'new-password'}
                />
                <button
                  type="button"
                  className="eye-toggle-btn"
                  onClick={() => setShowPassword((prev) => !prev)}
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                      <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  )}
                </button>
              </div>
              {activeFormik.touched.password && activeFormik.errors.password && (
                <span className="field-error-text">
                  {activeFormik.errors.password}
                </span>
              )}

              {/* Live Password Strength Checklist (Register Mode) */}
              {!isLogin && (
                <div className="password-requirements">
                  <div className={`password-req-item ${hasMinLength ? 'met' : ''}`}>
                    <span>{hasMinLength ? '✓' : '○'}</span> Minimum 8 characters
                  </div>
                  <div className={`password-req-item ${hasLetter ? 'met' : ''}`}>
                    <span>{hasLetter ? '✓' : '○'}</span> At least one letter (a-z, A-Z)
                  </div>
                  <div className={`password-req-item ${hasNumber ? 'met' : ''}`}>
                    <span>{hasNumber ? '✓' : '○'}</span> At least one number (0-9)
                  </div>
                  <div className={`password-req-item ${hasSpecial ? 'met' : ''}`}>
                    <span>{hasSpecial ? '✓' : '○'}</span> At least one special symbol (!@#$%...)
                  </div>
                </div>
              )}
            </div>

            {/* CONFIRM PASSWORD (Register Only) */}
            {!isLogin && (
              <div className="form-group">
                <label className="form-label" htmlFor="reg-confirm-password">
                  Confirm Password
                </label>
                <div className="password-input-wrapper">
                  <input
                    id="reg-confirm-password"
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    className={`form-input password-field ${
                      registerFormik.touched.confirmPassword && registerFormik.errors.confirmPassword
                        ? 'is-invalid'
                        : registerFormik.touched.confirmPassword && !registerFormik.errors.confirmPassword
                        ? 'is-valid'
                        : ''
                    }`}
                    placeholder="Re-enter your password"
                    value={registerFormik.values.confirmPassword}
                    onChange={registerFormik.handleChange}
                    onBlur={registerFormik.handleBlur}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="eye-toggle-btn"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    tabIndex={-1}
                    aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                  >
                    {showConfirmPassword ? (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    ) : (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                        <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    )}
                  </button>
                </div>
                {registerFormik.touched.confirmPassword && registerFormik.errors.confirmPassword && (
                  <span className="field-error-text">
                    {registerFormik.errors.confirmPassword}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* FIXED BOTTOM ACTION BUTTON */}
          <div className="auth-footer">
            <button
              type="submit"
              className="auth-submit-btn"
              disabled={activeFormik.isSubmitting}
            >
              {activeFormik.isSubmitting
                ? 'Please wait...'
                : isLogin
                ? 'Sign In'
                : 'Create Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AuthModal;
