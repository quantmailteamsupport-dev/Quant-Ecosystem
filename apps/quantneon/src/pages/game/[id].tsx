// ============================================================================
// QuantNeon - Individual Game Player Page
// ============================================================================

import type { Game, GameSession } from '../../types';

interface GamePlayerProps { game: Game | null; session: GameSession | null; isPlaying: boolean; }

export function GamePlayerPage({ game, session, isPlaying }: GamePlayerProps) {
  if (!game) return { type: 'div', props: { className: 'loading' }, children: ['Loading game...'] };
  return {
    type: 'div', props: { className: 'game-player-page' }, children: [
      { type: 'div', props: { className: 'game-hud' }, children: [
        { type: 'span', props: { className: 'game-score' }, children: [`Score: ${session?.score || 0}`] },
        { type: 'span', props: { className: 'game-level' }, children: [`Level: ${session?.level || 1}`] },
        { type: 'span', props: { className: 'game-lives' }, children: [`Lives: ${session?.lives || 3}`] },
      ]},
      { type: 'div', props: { className: 'game-canvas', 'data-game-id': game.id, 'data-playing': isPlaying }, children: [
        { type: 'div', props: { className: 'game-area' }, children: [] },
      ]},
      !isPlaying ? { type: 'div', props: { className: 'game-start-overlay' }, children: [
        { type: 'h2', props: {}, children: [game.title] },
        { type: 'p', props: {}, children: [game.description] },
        { type: 'button', props: { className: 'start-btn' }, children: ['Start Game'] },
      ]} : null,
    ].filter(Boolean),
  };
}
export default GamePlayerPage;
