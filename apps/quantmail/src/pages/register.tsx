// ============================================================================
// QuantMail - Registration Page
// ============================================================================

import React, { useState } from 'react';

export interface RegisterPageProps {
  onSubmit: (data: { email: string; username: string; password: string; displayName: string }) => Promise<void>;
  onLogin: () => void;
  error?: string;
  isLoading?: boolean;
}

export function RegisterPage({ onSubmit, onLogin, error, isLoading }: RegisterPageProps): React.ReactElement {
  const [formData, setFormData] = useState({ email: '', username: '', password: '', confirmPassword: '', displayName: '' });
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [passwordStrength, setPasswordStrength] = useState<'weak' | 'medium' | 'strong'>('weak');

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (field === 'password') {
      evaluatePasswordStrength(value);
    }
  };

  const evaluatePasswordStrength = (password: string) => {
    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    setPasswordStrength(score >= 5 ? 'strong' : score >= 3 ? 'medium' : 'weak');
  };

  const validate = (): string[] => {
    const errors: string[] = [];
    if (!formData.displayName.trim()) errors.push('Display name is required');
    if (!formData.email) errors.push('Email is required');
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) errors.push('Invalid email format');
    if (!formData.username) errors.push('Username is required');
    else if (!/^[a-zA-Z0-9_]{3,30}$/.test(formData.username)) errors.push('Username must be 3-30 alphanumeric characters');
    if (!formData.password) errors.push('Password is required');
    else if (formData.password.length < 8) errors.push('Password must be at least 8 characters');
    else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) errors.push('Password needs uppercase, lowercase, and a number');
    if (formData.password !== formData.confirmPassword) errors.push('Passwords do not match');
    if (!acceptTerms) errors.push('You must accept the terms of service');
    return errors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors = validate();
    setValidationErrors(errors);
    if (errors.length > 0) return;

    await onSubmit({
      email: formData.email,
      username: formData.username,
      password: formData.password,
      displayName: formData.displayName,
    });
  };

  return (
    <div className="auth-page">
      <div className="auth-container auth-container-wide">
        <div className="auth-header">
          <div className="logo">
            <span className="logo-icon">Q</span>
            <span className="logo-text">QuantMail</span>
          </div>
          <h1>Create your account</h1>
          <p>Join the Quant Ecosystem. One account for all 9 apps.</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {(error || validationErrors.length > 0) && (
            <div className="alert alert-error">
              {error && <p>{error}</p>}
              {validationErrors.map((err, i) => <p key={i}>{err}</p>)}
            </div>
          )}

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="displayName">Display Name</label>
              <input
                id="displayName"
                type="text"
                value={formData.displayName}
                onChange={(e) => updateField('displayName', e.target.value)}
                placeholder="John Doe"
                disabled={isLoading}
              />
            </div>
            <div className="form-group">
              <label htmlFor="username">Username</label>
              <input
                id="username"
                type="text"
                value={formData.username}
                onChange={(e) => updateField('username', e.target.value)}
                placeholder="johndoe"
                autoComplete="username"
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="email">Email address</label>
            <input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => updateField('email', e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              disabled={isLoading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) => updateField('password', e.target.value)}
              placeholder="Min 8 characters"
              autoComplete="new-password"
              disabled={isLoading}
            />
            <div className={`password-strength password-strength-${passwordStrength}`}>
              <div className="strength-bar" />
              <span>Password strength: {passwordStrength}</span>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <input
              id="confirmPassword"
              type="password"
              value={formData.confirmPassword}
              onChange={(e) => updateField('confirmPassword', e.target.value)}
              placeholder="Re-enter your password"
              autoComplete="new-password"
              disabled={isLoading}
            />
          </div>

          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={acceptTerms}
              onChange={(e) => setAcceptTerms(e.target.checked)}
              disabled={isLoading}
            />
            I agree to the <a href="/terms">Terms of Service</a> and <a href="/privacy">Privacy Policy</a>
          </label>

          <button type="submit" className="btn btn-primary btn-full" disabled={isLoading}>
            {isLoading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <div className="auth-footer">
          <p>Already have an account? <button className="btn-link" onClick={onLogin}>Sign in</button></p>
        </div>
      </div>
    </div>
  );
}

export default RegisterPage;
