import React from 'react';
import { Header } from '../components/Header.js';
import { Footer } from '../components/Footer.js';
import { CTASection } from '../components/CTASection.js';
import { AppShowcase, QUANT_APPS } from '../components/AppShowcase.js';
import { TestimonialCard } from '../components/TestimonialCard.js';

export interface HomePageProps {
  className?: string;
}

const TESTIMONIALS = [
  {
    quote:
      'Quant replaced our entire Google Workspace with better privacy and offline support. The AI features are genuinely useful.',
    author: 'Sarah Chen',
    role: 'CTO',
    company: 'TechForward',
  },
  {
    quote:
      'The local-first architecture means our team works seamlessly whether online or offline. No more lost work.',
    author: 'Marcus Rodriguez',
    role: 'Engineering Lead',
    company: 'DataSync Labs',
  },
  {
    quote:
      'End-to-end encryption by default gave us confidence to move all our sensitive work onto Quant.',
    author: 'Alex Thompson',
    role: 'Security Director',
    company: 'SecureOps Inc',
  },
];

const FEATURE_HIGHLIGHTS = [
  {
    title: 'End-to-End Encrypted',
    description: 'All data encrypted by default. Only you hold the keys.',
  },
  {
    title: 'Local-First Architecture',
    description: 'Your data lives on your device. Work offline seamlessly.',
  },
  {
    title: 'AI-Powered',
    description: 'Smart features that respect your privacy. AI runs on your terms.',
  },
  {
    title: '13 Integrated Apps',
    description:
      'Mail, Drive, Docs, Calendar, Meet, Chat, Tasks, Code, Sheets, Slides, Photos, Notes, Forms.',
  },
  {
    title: 'Real-Time Collaboration',
    description: 'CRDT-based sync for conflict-free teamwork across all apps.',
  },
  {
    title: 'Cross-Platform',
    description: 'Web, desktop, iOS, Android. Your workspace everywhere.',
  },
];

export function HomePage({ className }: HomePageProps): React.ReactElement {
  return React.createElement(
    'div',
    { className: `home-page ${className || ''}` },
    React.createElement(Header, { currentPage: '/' }),

    // Hero Section
    React.createElement(
      'section',
      { className: 'hero' },
      React.createElement(
        'h1',
        { className: 'hero-title' },
        'The Privacy-First Productivity Suite',
      ),
      React.createElement(
        'p',
        { className: 'hero-subtitle' },
        'Replace your entire workspace with 13 integrated apps. End-to-end encrypted, local-first, and AI-powered.',
      ),
      React.createElement(
        'div',
        { className: 'hero-cta' },
        React.createElement('a', { href: '/signup', className: 'btn-primary' }, 'Start Free'),
        React.createElement(
          'a',
          { href: '/features', className: 'btn-secondary' },
          'See All Features',
        ),
      ),
    ),

    // Feature Highlights
    React.createElement(
      'section',
      { className: 'feature-highlights' },
      React.createElement('h2', null, 'Why Teams Choose Quant'),
      React.createElement(
        'div',
        { className: 'features-grid' },
        FEATURE_HIGHLIGHTS.map((feature) =>
          React.createElement(
            'div',
            { key: feature.title, className: 'feature-highlight' },
            React.createElement('h3', null, feature.title),
            React.createElement('p', null, feature.description),
          ),
        ),
      ),
    ),

    // App Showcase
    React.createElement(AppShowcase, { apps: QUANT_APPS, title: '13 Apps, One Ecosystem' }),

    // Social Proof
    React.createElement(
      'section',
      { className: 'testimonials' },
      React.createElement('h2', null, 'Trusted by Forward-Thinking Teams'),
      React.createElement(
        'div',
        { className: 'testimonials-grid' },
        TESTIMONIALS.map((testimonial) =>
          React.createElement(TestimonialCard, { key: testimonial.author, ...testimonial }),
        ),
      ),
    ),

    // CTA
    React.createElement(CTASection, {
      headline: 'Ready to Own Your Data?',
      subheadline: 'Start with 5GB free storage. No credit card required.',
      primaryCta: 'Get Started Free',
      primaryHref: '/signup',
      secondaryCta: 'Talk to Sales',
      secondaryHref: '/contact',
    }),

    React.createElement(Footer, null),
  );
}
