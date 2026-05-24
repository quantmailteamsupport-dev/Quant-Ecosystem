// ============================================================================
// QuantTube - Live Streams Page
// Live streams directory with categories and featured streams
// ============================================================================

import type { LiveStream } from '../types';

interface LivePageProps {
  streams: LiveStream[];
  featured: LiveStream[];
  categories: string[];
}

export function LivePage({ streams, featured, categories }: LivePageProps) {
  return {
    type: 'div',
    props: { className: 'live-page' },
    children: [
      { type: 'header', props: { className: 'live-header' }, children: [
        { type: 'h1', props: {}, children: ['Live Now'] },
        { type: 'div', props: { className: 'live-indicator' }, children: [
          { type: 'span', props: { className: 'pulse' }, children: [] },
          { type: 'span', props: {}, children: [`${streams.length} streams live`] },
        ]},
      ]},
      { type: 'nav', props: { className: 'categories' }, children: categories.map(c => ({ type: 'button', props: { className: 'cat-btn' }, children: [c] })) },
      { type: 'section', props: { className: 'featured-streams' }, children: [
        { type: 'h2', props: {}, children: ['Featured'] },
        { type: 'div', props: { className: 'stream-grid' }, children: featured.map(s => renderStreamCard(s)) },
      ]},
      { type: 'section', props: { className: 'all-streams' }, children: [
        { type: 'h2', props: {}, children: ['All Live Streams'] },
        { type: 'div', props: { className: 'stream-grid' }, children: streams.map(s => renderStreamCard(s)) },
      ]},
    ],
  };
}

function renderStreamCard(stream: LiveStream) {
  return {
    type: 'div',
    props: { className: 'stream-card', 'data-id': stream.id },
    children: [
      { type: 'div', props: { className: 'stream-thumb' }, children: [
        { type: 'img', props: { src: stream.thumbnailUrl, alt: stream.title }, children: [] },
        { type: 'span', props: { className: 'live-badge' }, children: ['LIVE'] },
        { type: 'span', props: { className: 'viewer-count' }, children: [`${stream.viewerCount} watching`] },
      ]},
      { type: 'div', props: { className: 'stream-info' }, children: [
        { type: 'h3', props: {}, children: [stream.title] },
        { type: 'p', props: {}, children: [stream.channelName] },
        { type: 'span', props: { className: 'category' }, children: [stream.category] },
      ]},
    ],
  };
}

export default LivePage;
