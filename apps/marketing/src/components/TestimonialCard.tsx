import React from 'react';

export interface TestimonialCardProps {
  quote: string;
  author: string;
  role: string;
  company: string;
  avatar?: string;
}

export function TestimonialCard({
  quote,
  author,
  role,
  company,
  avatar,
}: TestimonialCardProps): React.ReactElement {
  return React.createElement(
    'div',
    { className: 'testimonial-card' },
    React.createElement('blockquote', { className: 'testimonial-quote' }, quote),
    React.createElement(
      'div',
      { className: 'testimonial-author' },
      avatar
        ? React.createElement('img', { src: avatar, alt: author, className: 'testimonial-avatar' })
        : null,
      React.createElement(
        'div',
        { className: 'testimonial-info' },
        React.createElement('strong', null, author),
        React.createElement('span', null, `${role}, ${company}`),
      ),
    ),
  );
}
