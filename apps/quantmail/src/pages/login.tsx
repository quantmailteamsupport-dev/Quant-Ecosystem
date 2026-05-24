// ============================================================================
// QuantMail - Login Page
// ============================================================================

import React, { useState } from 'react';

export interface LoginPageProps {
  onSubmit: (email: string, password: string, twoFactorCode?: string) => Promise<void>;
  onForgotPassword: () => void;
  onRegister: () => void;
  error?: string;
  isLoading?: boolean;
}

export function LoginPage({ onSubmit, onForgotPassword, onRegister, error, isLoading }: LoginPageProps): React.ReactElement {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [showTwoFactor, setShowTwoFactor] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [validationError, setValidationError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');

    if (!email) { setValidationError('Email is required'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setValidationError('Please enter a valid email'); return; }
    if (!password) { setValidationError('Password is required'); return; }
    if (password.length < 8) { setValidationError('Password must be at least 8 characters'); return; }

    await onSubmit(email, password, showTwoFactor ? twoFactorCode : undefined);
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-header">
          <div className="logo">
            <span className="logo-icon">Q</span>
            <span className="logo-text">QuantMail</span>
          </div>
          <h1>Welcome back</h1>
          <p>Sign in to access your email, repos, and more.</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {(error || validationError) && (
            <div className="alert alert-error">
              {error || validationError}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email">Email address</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              autoFocus
              disabled={isLoading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <div className="input-with-action">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                autoComplete="current-password"
                disabled={isLoading}
              />
              <button
                type="button"
                className="btn-icon"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          {showTwoFactor && (
            <div className="form-group">
              <label htmlFor="twoFactor">Two-factor authentication code</label>
              <input
                id="twoFactor"
                type="text"
                value={twoFactorCode}
                onChange={(e) => setTwoFactorCode(e.target.value)}
                placeholder="Enter 6-digit code"
                maxLength={6}
                autoComplete="one-time-code"
                disabled={isLoading}
              />
              <p className="form-hint">Enter the code from your authenticator app or a backup code.</p>
            </div>
          )}

          <div className="form-actions">
            <label className="checkbox-label">
              <input type="checkbox" /> Remember me
            </label>
            <button type="button" className="btn-link" onClick={onForgotPassword}>
              Forgot password?
            </button>
          </div>

          <button type="submit" className="btn btn-primary btn-full" disabled={isLoading}>
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="auth-divider">
          <span>or continue with</span>
        </div>

        <div className="social-login">
          <button className="btn btn-social" disabled={isLoading}>
            <span className="social-icon">G</span> Google
          </button>
          <button className="btn btn-social" disabled={isLoading}>
            <span className="social-icon">GH</span> GitHub
          </button>
        </div>

        <div className="auth-footer">
          <p>Don't have an account? <button className="btn-link" onClick={onRegister}>Create one</button></p>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
