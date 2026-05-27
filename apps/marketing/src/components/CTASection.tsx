import React from 'react';

export interface CTASectionProps {
  headline: string;
  subheadline: string;
  primaryCta: string;
  primaryHref: string;
  secondaryCta?: string;
  secondaryHref?: string;
}

export function CTASection({
  headline,
  subheadline,
  primaryCta,
  primaryHref,
  secondaryCta,
  secondaryHref,
}: CTASectionProps): React.ReactElement {
  return React.createElement(
    'section',
    { className: 'cta-section' },
    React.createElement('h2', { className: 'cta-headline' }, headline),
    React.createElement('p', { className: 'cta-subheadline' }, subheadline),
    React.createElement(
      'div',
      { className: 'cta-buttons' },
      React.createElement('a', { href: primaryHref, className: 'btn-primary' }, primaryCta),
      secondaryCta && secondaryHref
        ? React.createElement(
            'a',
            { href: secondaryHref, className: 'btn-secondary' },
            secondaryCta,
          )
        : null,
    ),
  );
}
