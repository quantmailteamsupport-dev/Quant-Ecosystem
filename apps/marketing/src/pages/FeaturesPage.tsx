import React from 'react';
import { Header } from '../components/Header.js';
import { Footer } from '../components/Footer.js';
import { FeatureCard } from '../components/FeatureCard.js';
import { AppShowcase, QUANT_APPS } from '../components/AppShowcase.js';
import { CTASection } from '../components/CTASection.js';

export interface FeaturesPageProps {
  className?: string;
}

const DIFFERENTIATORS = [
  {
    title: 'End-to-End Encryption',
    description: 'Zero-knowledge architecture means even Quant cannot read your data.',
    icon: 'lock',
    highlights: [
      'AES-256 encryption',
      'Zero-knowledge proofs',
      'Client-side key management',
      'Forward secrecy',
    ],
  },
  {
    title: 'Local-First Architecture',
    description: 'Your data lives on your device first. Cloud sync is optional and encrypted.',
    icon: 'device',
    highlights: ['Instant responsiveness', 'Works offline', 'CRDT-based sync', 'No vendor lock-in'],
  },
  {
    title: 'AI That Respects Privacy',
    description: 'On-device AI processing with optional cloud inference for complex tasks.',
    icon: 'brain',
    highlights: [
      'On-device models',
      'Opt-in cloud AI',
      'No training on your data',
      'Transparent processing',
    ],
  },
  {
    title: 'Real-Time Collaboration',
    description: 'Conflict-free editing across all apps with presence and comments.',
    icon: 'users',
    highlights: [
      'CRDT-based merging',
      'Real-time cursors',
      'Comments and threads',
      'Version history',
    ],
  },
  {
    title: 'Cross-Platform',
    description: 'Native apps for every platform with seamless sync between devices.',
    icon: 'globe',
    highlights: [
      'Web, macOS, Windows, Linux',
      'iOS and Android',
      'Browser extensions',
      'CLI tools',
    ],
  },
  {
    title: 'Open Standards',
    description: 'Built on open protocols. Export your data anytime in standard formats.',
    icon: 'code',
    highlights: ['CalDAV/CardDAV', 'IMAP/SMTP', 'WebDAV', 'Standard file formats'],
  },
];

export function FeaturesPage({ className }: FeaturesPageProps): React.ReactElement {
  return React.createElement(
    'div',
    { className: `features-page ${className || ''}` },
    React.createElement(Header, { currentPage: '/features' }),

    React.createElement(
      'section',
      { className: 'features-hero' },
      React.createElement('h1', null, '13 Apps. One Privacy-First Ecosystem.'),
      React.createElement(
        'p',
        null,
        'Every app you need for work and life, designed from the ground up for privacy, speed, and collaboration.',
      ),
    ),

    React.createElement(AppShowcase, { apps: QUANT_APPS, title: 'The Quant App Suite' }),

    React.createElement(
      'section',
      { className: 'differentiators' },
      React.createElement('h2', null, 'What Makes Quant Different'),
      React.createElement(
        'div',
        { className: 'differentiators-grid' },
        DIFFERENTIATORS.map((diff) =>
          React.createElement(FeatureCard, { key: diff.title, ...diff }),
        ),
      ),
    ),

    React.createElement(CTASection, {
      headline: 'Experience the Difference',
      subheadline: 'Try all 13 apps free. No credit card required.',
      primaryCta: 'Get Started',
      primaryHref: '/signup',
      secondaryCta: 'View Pricing',
      secondaryHref: '/pricing',
    }),

    React.createElement(Footer, null),
  );
}
