import React from 'react';

export interface FeatureCardProps {
  title: string;
  description: string;
  icon: string;
  highlights: string[];
}

export function FeatureCard({
  title,
  description,
  icon,
  highlights,
}: FeatureCardProps): React.ReactElement {
  return React.createElement(
    'div',
    { className: 'feature-card' },
    React.createElement('div', { className: 'feature-card-icon' }, icon),
    React.createElement('h3', { className: 'feature-card-title' }, title),
    React.createElement('p', { className: 'feature-card-description' }, description),
    React.createElement(
      'ul',
      { className: 'feature-card-highlights' },
      highlights.map((highlight, index) => React.createElement('li', { key: index }, highlight)),
    ),
  );
}
