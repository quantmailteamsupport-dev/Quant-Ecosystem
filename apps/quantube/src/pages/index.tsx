// ============================================================================
// QuantTube - Home Feed Page
// Video, music, and show recommendations with personalized sections
// ============================================================================

import type { Video, Track, Show, Recommendation } from '../types';

interface HomeFeedSection {
  type: string;
  title: string;
  items: any[];
}

interface HomeFeedProps {
  sections: HomeFeedSection[];
  recommendations: Recommendation[];
  isLoading: boolean;
}

export function HomeFeed({ sections, recommendations, isLoading }: HomeFeedProps) {
  if (isLoading) {
    return renderSkeleton();
  }

  return {
    type: 'div',
    props: { className: 'home-feed' },
    children: [
      renderHeroBanner(),
      renderShortsShelf(),
      ...sections.map(section => renderSection(section)),
      renderRecommendations(recommendations),
    ],
  };
}

function renderHeroBanner() {
  return {
    type: 'section',
    props: { className: 'hero-banner' },
    children: [
      { type: 'div', props: { className: 'hero-content' }, children: [
        { type: 'h1', props: {}, children: ['Welcome to QuantTube'] },
        { type: 'p', props: {}, children: ['Watch, Listen, Stream - All in one place'] },
        { type: 'div', props: { className: 'hero-actions' }, children: [
          { type: 'button', props: { className: 'btn-primary' }, children: ['Explore Videos'] },
          { type: 'button', props: { className: 'btn-secondary' }, children: ['Listen to Music'] },
          { type: 'button', props: { className: 'btn-secondary' }, children: ['Watch Shows'] },
        ]},
      ]},
    ],
  };
}

function renderShortsShelf() {
  return {
    type: 'section',
    props: { className: 'shorts-shelf' },
    children: [
      { type: 'h2', props: {}, children: ['Shorts'] },
      { type: 'div', props: { className: 'shorts-scroll' }, children: [] },
    ],
  };
}

function renderSection(section: HomeFeedSection) {
  return {
    type: 'section',
    props: { className: `feed-section feed-section--${section.type}` },
    children: [
      { type: 'div', props: { className: 'section-header' }, children: [
        { type: 'h2', props: {}, children: [section.title] },
        { type: 'button', props: { className: 'see-all' }, children: ['See All'] },
      ]},
      { type: 'div', props: { className: 'content-grid' }, children: section.items.map(item => renderContentCard(item)) },
    ],
  };
}

function renderContentCard(item: any) {
  return {
    type: 'div',
    props: { className: 'content-card', 'data-id': item.contentId || item.id },
    children: [
      { type: 'div', props: { className: 'thumbnail' }, children: [
        { type: 'img', props: { src: item.thumbnailUrl || '', alt: item.title || '' } },
        { type: 'span', props: { className: 'duration' }, children: [formatDuration(item.duration || 0)] },
      ]},
      { type: 'div', props: { className: 'card-info' }, children: [
        { type: 'h3', props: {}, children: [item.title || 'Untitled'] },
        { type: 'p', props: { className: 'channel' }, children: [item.channelName || item.artistName || ''] },
        { type: 'p', props: { className: 'meta' }, children: [`${formatViews(item.views || 0)} views`] },
      ]},
    ],
  };
}

function renderRecommendations(recommendations: Recommendation[]) {
  return {
    type: 'section',
    props: { className: 'recommendations' },
    children: [
      { type: 'h2', props: {}, children: ['Recommended For You'] },
      { type: 'div', props: { className: 'recommendation-grid' }, children: recommendations.map(rec => ({
        type: 'div',
        props: { className: 'rec-card', 'data-score': rec.score.toFixed(2) },
        children: [
          { type: 'span', props: { className: 'rec-reason' }, children: [rec.reason] },
          { type: 'span', props: { className: 'rec-type' }, children: [rec.contentType] },
        ],
      }))},
    ],
  };
}

function renderSkeleton() {
  return { type: 'div', props: { className: 'skeleton-feed' }, children: Array.from({ length: 12 }, (_, i) => ({ type: 'div', props: { className: 'skeleton-card', key: i }, children: [] })) };
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatViews(views: number): string {
  if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M`;
  if (views >= 1000) return `${(views / 1000).toFixed(1)}K`;
  return views.toString();
}

export default HomeFeed;
