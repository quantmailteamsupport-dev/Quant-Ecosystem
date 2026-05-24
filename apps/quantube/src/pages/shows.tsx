// ============================================================================
// QuantTube - Shows Page
// Shows/series catalog with categories, originals, continue watching
// ============================================================================

import type { Show, WatchProgress } from '../types';

interface ShowsPageProps {
  shows: Show[];
  originals: Show[];
  continueWatching: WatchProgress[];
  categories: string[];
  selectedCategory: string | null;
}

export function ShowsPage({ shows, originals, continueWatching, categories, selectedCategory }: ShowsPageProps) {
  return {
    type: 'div',
    props: { className: 'shows-page' },
    children: [
      renderShowsHeader(),
      renderCategories(categories, selectedCategory),
      continueWatching.length > 0 ? renderContinueWatching(continueWatching) : null,
      renderOriginals(originals),
      renderShowGrid(shows),
    ].filter(Boolean),
  };
}

function renderShowsHeader() {
  return {
    type: 'header',
    props: { className: 'shows-header' },
    children: [
      { type: 'h1', props: {}, children: ['QuantTube Shows'] },
      { type: 'p', props: {}, children: ['Series, movies, and originals'] },
    ],
  };
}

function renderCategories(categories: string[], selected: string | null) {
  return {
    type: 'nav',
    props: { className: 'category-nav' },
    children: [
      { type: 'button', props: { className: `cat-btn ${!selected ? 'active' : ''}` }, children: ['All'] },
      ...categories.map(cat => ({ type: 'button', props: { className: `cat-btn ${selected === cat ? 'active' : ''}` }, children: [cat] })),
    ],
  };
}

function renderContinueWatching(progress: WatchProgress[]) {
  return {
    type: 'section',
    props: { className: 'continue-watching' },
    children: [
      { type: 'h2', props: {}, children: ['Continue Watching'] },
      { type: 'div', props: { className: 'progress-cards' }, children: progress.map(p => ({
        type: 'div', props: { className: 'progress-card' }, children: [
          { type: 'div', props: { className: 'progress-bar', style: `width: ${(p.position / p.duration) * 100}%` }, children: [] },
          { type: 'span', props: {}, children: [`${Math.floor((p.position / p.duration) * 100)}% complete`] },
        ],
      }))},
    ],
  };
}

function renderOriginals(originals: Show[]) {
  return {
    type: 'section',
    props: { className: 'originals-section' },
    children: [
      { type: 'h2', props: {}, children: ['QuantTube Originals'] },
      { type: 'div', props: { className: 'originals-scroll' }, children: originals.map(show => ({
        type: 'div', props: { className: 'original-card' }, children: [
          { type: 'img', props: { src: show.bannerUrl, alt: show.title }, children: [] },
          { type: 'h3', props: {}, children: [show.title] },
          { type: 'span', props: { className: 'badge' }, children: ['ORIGINAL'] },
        ],
      }))},
    ],
  };
}

function renderShowGrid(shows: Show[]) {
  return {
    type: 'section',
    props: { className: 'shows-grid' },
    children: [
      { type: 'h2', props: {}, children: ['All Shows'] },
      { type: 'div', props: { className: 'grid' }, children: shows.map(show => ({
        type: 'div', props: { className: 'show-card', 'data-id': show.id }, children: [
          { type: 'img', props: { src: show.posterUrl, alt: show.title, className: 'poster' }, children: [] },
          { type: 'h3', props: {}, children: [show.title] },
          { type: 'p', props: { className: 'meta' }, children: [`${show.year} - ${show.rating}`] },
          { type: 'div', props: { className: 'genres' }, children: show.genre.map(g => ({ type: 'span', props: { className: 'genre-tag' }, children: [g] })) },
          { type: 'span', props: { className: `status status--${show.status}` }, children: [show.status] },
        ],
      }))},
    ],
  };
}

export default ShowsPage;
