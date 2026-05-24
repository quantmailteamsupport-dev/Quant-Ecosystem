// ============================================================================
// QuantMail - Landing Page
// ============================================================================

import React from 'react';

interface Feature {
  icon: string;
  title: string;
  description: string;
}

const features: Feature[] = [
  { icon: 'mail', title: 'Smart Email', description: 'AI-powered email with smart compose, auto-categorize, and priority inbox' },
  { icon: 'code', title: 'Code & Repos', description: 'GitHub-like repository management with code review and CI/CD' },
  { icon: 'lock', title: 'Ecosystem SSO', description: 'One login for all 9 Quant apps. Secure OAuth2 identity provider.' },
  { icon: 'brain', title: 'AI Assistant', description: 'Smart compose, meeting extraction, reply suggestions, and more' },
  { icon: 'calendar', title: 'Calendar', description: 'Integrated scheduling with smart availability detection' },
  { icon: 'users', title: 'Contacts', description: 'Unified contact directory synced across all Quant apps' },
];

export interface LandingPageProps {
  onLogin: () => void;
  onRegister: () => void;
}

export function LandingPage({ onLogin, onRegister }: LandingPageProps): React.ReactElement {
  return (
    <div className="landing-page">
      {/* Hero Section */}
      <header className="hero">
        <nav className="nav">
          <div className="logo">
            <span className="logo-icon">Q</span>
            <span className="logo-text">QuantMail</span>
          </div>
          <div className="nav-actions">
            <button className="btn btn-outline" onClick={onLogin}>Sign In</button>
            <button className="btn btn-primary" onClick={onRegister}>Get Started</button>
          </div>
        </nav>

        <div className="hero-content">
          <h1>Your entire digital life, unified.</h1>
          <p className="hero-subtitle">
            Email, code repositories, CI/CD pipelines, calendar, contacts, and AI assistance.
            All in one place. The central hub of the Quant Ecosystem.
          </p>
          <div className="hero-cta">
            <button className="btn btn-primary btn-lg" onClick={onRegister}>
              Create Free Account
            </button>
            <button className="btn btn-outline btn-lg" onClick={onLogin}>
              Sign In to Your Account
            </button>
          </div>
        </div>
      </header>

      {/* Features Section */}
      <section className="features">
        <h2>Everything you need, nothing you don't</h2>
        <div className="features-grid">
          {features.map((feature, index) => (
            <div key={index} className="feature-card">
              <div className="feature-icon">{feature.icon}</div>
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Ecosystem Section */}
      <section className="ecosystem">
        <h2>Connected to the entire Quant Ecosystem</h2>
        <p>Sign in once, access everywhere. QuantMail is the identity provider for all Quant apps.</p>
        <div className="app-grid">
          {['QuantChat', 'QuantSync', 'QuantAds', 'QuantTube', 'QuantNeon', 'QuantEdits', 'QuantMax', 'QuantAI'].map((app) => (
            <div key={app} className="app-badge">{app}</div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-content">
          <div className="footer-brand">
            <span className="logo-icon">Q</span>
            <span>QuantMail</span>
          </div>
          <div className="footer-links">
            <a href="/privacy">Privacy</a>
            <a href="/terms">Terms</a>
            <a href="/docs">API Docs</a>
            <a href="/status">Status</a>
          </div>
          <p className="footer-copyright">2024 Quant Ecosystem. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;
