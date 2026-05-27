import React from 'react';

export interface FooterLink {
  label: string;
  href: string;
}

export interface FooterSection {
  title: string;
  links: FooterLink[];
}

const FOOTER_SECTIONS: FooterSection[] = [
  {
    title: 'Product',
    links: [
      { label: 'Features', href: '/features' },
      { label: 'Pricing', href: '/pricing' },
      { label: 'Security', href: '/security' },
      { label: 'Status', href: 'https://status.quant.app' },
    ],
  },
  {
    title: 'Resources',
    links: [
      { label: 'Documentation', href: '/docs' },
      { label: 'API Reference', href: '/docs/api' },
      { label: 'Help Center', href: '/help' },
      { label: 'Community', href: '/community' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About', href: '/about' },
      { label: 'Blog', href: '/blog' },
      { label: 'Careers', href: '/careers' },
      { label: 'Contact', href: '/contact' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Privacy Policy', href: '/privacy' },
      { label: 'Terms of Service', href: '/terms' },
      { label: 'Cookie Policy', href: '/cookies' },
      { label: 'GDPR', href: '/gdpr' },
    ],
  },
];

export function Footer(): React.ReactElement {
  return React.createElement(
    'footer',
    { className: 'footer' },
    React.createElement(
      'div',
      { className: 'footer-sections' },
      FOOTER_SECTIONS.map((section) =>
        React.createElement(
          'div',
          { key: section.title, className: 'footer-section' },
          React.createElement('h3', null, section.title),
          React.createElement(
            'ul',
            null,
            section.links.map((link) =>
              React.createElement(
                'li',
                { key: link.href },
                React.createElement('a', { href: link.href }, link.label),
              ),
            ),
          ),
        ),
      ),
    ),
    React.createElement(
      'div',
      { className: 'footer-bottom' },
      React.createElement(
        'p',
        null,
        `Copyright ${new Date().getFullYear()} Quant. All rights reserved.`,
      ),
      React.createElement('p', null, 'Privacy-first, local-first productivity.'),
    ),
  );
}
