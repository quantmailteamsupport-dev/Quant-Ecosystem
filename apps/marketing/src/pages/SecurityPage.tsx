import React from 'react';
import { Header } from '../components/Header.js';
import { Footer } from '../components/Footer.js';
import { CTASection } from '../components/CTASection.js';

export interface SecurityPageProps {
  className?: string;
}

export interface SecurityFeature {
  title: string;
  description: string;
}

const SECURITY_FEATURES: SecurityFeature[] = [
  {
    title: 'End-to-End Encryption by Default',
    description:
      'All data is encrypted with AES-256 before leaving your device. Only you hold the decryption keys.',
  },
  {
    title: 'Local-First Storage',
    description:
      'Your data is stored locally first. Cloud sync is optional, always encrypted, and you control what syncs.',
  },
  {
    title: 'Privacy-First Design',
    description:
      'No tracking, no ads, no data mining. Your information is never sold or used for training AI models.',
  },
  {
    title: 'Zero-Knowledge Architecture',
    description:
      'Quant servers cannot read your data. Even in a breach, your information remains encrypted and unreadable.',
  },
  {
    title: 'SOC 2 Type II Certified',
    description:
      'Annual third-party audits verify our security controls, availability, and data protection practices.',
  },
  {
    title: 'GDPR Compliant',
    description:
      'Full compliance with European data protection regulations. Data residency options available.',
  },
  {
    title: 'Open Source Core',
    description:
      'Core encryption and sync libraries are open source for community audit and verification.',
  },
  {
    title: 'Forward Secrecy',
    description:
      'Ephemeral session keys ensure past communications remain secure even if long-term keys are compromised.',
  },
];

const COMPLIANCE_BADGES = [
  'SOC 2 Type II',
  'GDPR',
  'HIPAA (Enterprise)',
  'ISO 27001',
  'CCPA',
  'FIPS 140-2',
];

export function SecurityPage({ className }: SecurityPageProps): React.ReactElement {
  return React.createElement(
    'div',
    { className: `security-page ${className || ''}` },
    React.createElement(Header, { currentPage: '/security' }),

    React.createElement(
      'section',
      { className: 'security-hero' },
      React.createElement('h1', null, 'Security Without Compromise'),
      React.createElement(
        'p',
        null,
        'Built from the ground up with end-to-end encryption, local-first architecture, and privacy-first design.',
      ),
    ),

    React.createElement(
      'section',
      { className: 'security-features' },
      React.createElement(
        'div',
        { className: 'security-features-grid' },
        SECURITY_FEATURES.map((feature) =>
          React.createElement(
            'div',
            { key: feature.title, className: 'security-feature-item' },
            React.createElement('h3', null, feature.title),
            React.createElement('p', null, feature.description),
          ),
        ),
      ),
    ),

    React.createElement(
      'section',
      { className: 'compliance' },
      React.createElement('h2', null, 'Compliance & Certifications'),
      React.createElement(
        'div',
        { className: 'compliance-badges' },
        COMPLIANCE_BADGES.map((badge) =>
          React.createElement('span', { key: badge, className: 'compliance-badge' }, badge),
        ),
      ),
    ),

    React.createElement(
      'section',
      { className: 'security-whitepaper' },
      React.createElement('h2', null, 'Security Whitepaper'),
      React.createElement(
        'p',
        null,
        'Download our detailed security whitepaper covering our encryption architecture, key management, threat model, and incident response procedures.',
      ),
      React.createElement(
        'a',
        { href: '/security/whitepaper.pdf', className: 'btn-secondary' },
        'Download Whitepaper',
      ),
    ),

    React.createElement(CTASection, {
      headline: 'Your Data. Your Keys. Your Control.',
      subheadline: 'Start with end-to-end encryption from day one.',
      primaryCta: 'Get Started Free',
      primaryHref: '/signup',
      secondaryCta: 'Security Docs',
      secondaryHref: '/docs/security',
    }),

    React.createElement(Footer, null),
  );
}
