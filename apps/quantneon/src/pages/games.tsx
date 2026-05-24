// ============================================================================
// QuantNeon - Games Hub Page
// ============================================================================

import type { Game } from '../types';

interface GamesPageProps { games: Game[]; featured: Game[]; rewards: { coins: number; level: number }; }

export function GamesPage({ games, featured, rewards }: GamesPageProps) {
  return {
    type: 'div', props: { className: 'games-page' }, children: [
      { type: 'header', props: { className: 'games-header' }, children: [{ type: 'h1', props: {}, children: ['Games'] }, { type: 'div', props: { className: 'rewards-badge' }, children: [`${rewards.coins} coins - Level ${rewards.level}`] }] },
      { type: 'section', props: { className: 'featured-games' }, children: [{ type: 'h2', props: {}, children: ['Featured'] }, { type: 'div', props: { className: 'games-carousel' }, children: featured.map(g => ({ type: 'div', props: { className: 'game-featured-card' }, children: [{ type: 'img', props: { src: g.thumbnailUrl }, children: [] }, { type: 'h3', props: {}, children: [g.title] }, { type: 'span', props: {}, children: [`${g.playCount} plays`] }] })) }] },
      { type: 'section', props: { className: 'all-games' }, children: [{ type: 'h2', props: {}, children: ['All Games'] }, { type: 'div', props: { className: 'games-grid' }, children: games.map(g => ({ type: 'div', props: { className: 'game-card', 'data-id': g.id }, children: [{ type: 'img', props: { src: g.thumbnailUrl }, children: [] }, { type: 'h3', props: {}, children: [g.title] }, { type: 'p', props: {}, children: [g.description] }, { type: 'span', props: { className: 'game-rating' }, children: [`${g.rating}/5`] }, { type: 'button', props: { className: 'play-btn' }, children: ['Play'] }] })) }] },
    ],
  };
}
export default GamesPage;
