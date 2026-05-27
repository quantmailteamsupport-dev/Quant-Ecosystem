import React from 'react';
import { Header } from '../components/Header.js';
import { Footer } from '../components/Footer.js';
import { CTASection } from '../components/CTASection.js';

export interface AboutPageProps {
  className?: string;
}

export interface TeamMember {
  name: string;
  role: string;
  bio: string;
}

export interface CompanyValue {
  title: string;
  description: string;
}

const TEAM_MEMBERS: TeamMember[] = [
  {
    name: 'Jordan Lee',
    role: 'CEO & Co-Founder',
    bio: 'Former privacy researcher at MIT. Passionate about building tools that respect user autonomy.',
  },
  {
    name: 'Priya Patel',
    role: 'CTO & Co-Founder',
    bio: '15 years in distributed systems. Previously built real-time infrastructure at scale.',
  },
  {
    name: 'Sam Nakamura',
    role: 'VP Engineering',
    bio: 'Expert in CRDT-based systems and local-first architectures. Open source contributor.',
  },
  {
    name: 'Elena Vasquez',
    role: 'VP Design',
    bio: 'Human-centered design advocate. Making privacy accessible and delightful for everyone.',
  },
  {
    name: 'David Kim',
    role: 'Head of Security',
    bio: 'Former security lead at a major cloud provider. Cryptography PhD from Stanford.',
  },
  {
    name: 'Rachel Green',
    role: 'VP Product',
    bio: 'Product leader focused on building tools that teams actually love to use.',
  },
];

const VALUES: CompanyValue[] = [
  {
    title: 'Privacy is a Right',
    description:
      'We believe everyone deserves tools that protect their data. Privacy should not be a premium feature.',
  },
  {
    title: 'Local-First Always',
    description: 'Your device is the source of truth. Cloud is a convenience, not a dependency.',
  },
  {
    title: 'Open and Transparent',
    description:
      'Open source core, transparent security practices, and honest communication with our community.',
  },
  {
    title: 'User Autonomy',
    description: 'You own your data. Export anytime, in standard formats. No vendor lock-in, ever.',
  },
  {
    title: 'Accessible Excellence',
    description:
      'World-class tools should be available to everyone, not just enterprise customers.',
  },
  {
    title: 'Sustainable Business',
    description:
      'We build a sustainable business through fair pricing, not surveillance capitalism.',
  },
];

export function AboutPage({ className }: AboutPageProps): React.ReactElement {
  return React.createElement(
    'div',
    { className: `about-page ${className || ''}` },
    React.createElement(Header, { currentPage: '/about' }),

    React.createElement(
      'section',
      { className: 'about-hero' },
      React.createElement('h1', null, 'Building the Future of Private Productivity'),
      React.createElement(
        'p',
        null,
        'We started Quant because we believe you should not have to trade your privacy for productivity. Our mission is to build the best productivity suite that keeps your data truly yours.',
      ),
    ),

    React.createElement(
      'section',
      { className: 'mission' },
      React.createElement('h2', null, 'Our Mission'),
      React.createElement(
        'p',
        null,
        'To provide a complete, integrated productivity ecosystem where end-to-end encryption, local-first architecture, and AI assistance coexist without compromise. We are proving that privacy and productivity are not mutually exclusive.',
      ),
    ),

    React.createElement(
      'section',
      { className: 'values' },
      React.createElement('h2', null, 'Our Values'),
      React.createElement(
        'div',
        { className: 'values-grid' },
        VALUES.map((value) =>
          React.createElement(
            'div',
            { key: value.title, className: 'value-item' },
            React.createElement('h3', null, value.title),
            React.createElement('p', null, value.description),
          ),
        ),
      ),
    ),

    React.createElement(
      'section',
      { className: 'team' },
      React.createElement('h2', null, 'Leadership Team'),
      React.createElement(
        'div',
        { className: 'team-grid' },
        TEAM_MEMBERS.map((member) =>
          React.createElement(
            'div',
            { key: member.name, className: 'team-member' },
            React.createElement('h3', null, member.name),
            React.createElement('span', { className: 'team-role' }, member.role),
            React.createElement('p', null, member.bio),
          ),
        ),
      ),
    ),

    React.createElement(CTASection, {
      headline: 'Join the Movement',
      subheadline: 'Be part of building a privacy-first future for productivity.',
      primaryCta: 'Get Started Free',
      primaryHref: '/signup',
      secondaryCta: 'View Careers',
      secondaryHref: '/careers',
    }),

    React.createElement(Footer, null),
  );
}
