import React from 'react';

export interface HeaderProps {
  currentPage?: string;
}

export interface NavItem {
  label: string;
  href: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Features', href: '/features' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'Security', href: '/security' },
  { label: 'About', href: '/about' },
];

export function Header({ currentPage }: HeaderProps): React.ReactElement {
  return React.createElement(
    'header',
    { className: 'header' },
    React.createElement(
      'div',
      { className: 'header-brand' },
      React.createElement('a', { href: '/' }, 'Quant'),
    ),
    React.createElement(
      'nav',
      { className: 'header-nav' },
      NAV_ITEMS.map((item) =>
        React.createElement(
          'a',
          {
            key: item.href,
            href: item.href,
            className: currentPage === item.href ? 'active' : undefined,
          },
          item.label,
        ),
      ),
    ),
    React.createElement(
      'div',
      { className: 'header-actions' },
      React.createElement('a', { href: '/login', className: 'btn-secondary' }, 'Sign In'),
      React.createElement('a', { href: '/signup', className: 'btn-primary' }, 'Get Started'),
    ),
  );
}
