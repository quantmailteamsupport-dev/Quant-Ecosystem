import React from 'react';

export interface PricingFeature {
  text: string;
  included: boolean;
}

export interface PricingCardProps {
  name: string;
  price: string;
  period?: string;
  description: string;
  features: PricingFeature[];
  cta: string;
  highlighted?: boolean;
}

export function PricingCard({
  name,
  price,
  period,
  description,
  features,
  cta,
  highlighted = false,
}: PricingCardProps): React.ReactElement {
  return React.createElement(
    'div',
    {
      className: `pricing-card ${highlighted ? 'pricing-card-highlighted' : ''}`,
    },
    React.createElement('h3', { className: 'pricing-card-name' }, name),
    React.createElement(
      'div',
      { className: 'pricing-card-price' },
      React.createElement('span', { className: 'price' }, price),
      period ? React.createElement('span', { className: 'period' }, `/${period}`) : null,
    ),
    React.createElement('p', { className: 'pricing-card-description' }, description),
    React.createElement(
      'ul',
      { className: 'pricing-card-features' },
      features.map((feature, index) =>
        React.createElement(
          'li',
          {
            key: index,
            className: feature.included ? 'included' : 'excluded',
          },
          feature.text,
        ),
      ),
    ),
    React.createElement('button', { className: 'pricing-card-cta' }, cta),
  );
}
