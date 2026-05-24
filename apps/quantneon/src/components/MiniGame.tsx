// ============================================================================
// QuantNeon - MiniGame Component (game container/engine)
// ============================================================================

import type { Game, GameSession } from '../types';

interface MiniGameProps { game: Game; session: GameSession | null; onAction: (action: string, data: any) => void; }

export function MiniGame({ game, session, onAction }: MiniGameProps) {
  return {
    type: 'div', props: { className: `mini-game mini-game--${game.type}` }, children: [
      { type: 'div', props: { className: 'game-header' }, children: [{ type: 'h3', props: {}, children: [game.title] }, session ? { type: 'span', props: { className: 'score' }, children: [`Score: ${session.score}`] } : null].filter(Boolean) },
      { type: 'div', props: { className: 'game-board', 'data-type': game.type }, children: [
        session?.state?.board ? renderBoard(session.state.board) : { type: 'div', props: { className: 'game-placeholder' }, children: [] },
      ]},
      { type: 'div', props: { className: 'game-actions' }, children: game.type === 'casual' ? [{ type: 'button', props: { className: 'action-left' }, children: ['Left'] }, { type: 'button', props: { className: 'action-jump' }, children: ['Jump'] }, { type: 'button', props: { className: 'action-right' }, children: ['Right'] }] : [] },
    ],
  };
}

function renderBoard(board: any[][]) {
  return { type: 'div', props: { className: 'board-grid' }, children: board.map((row, y) => ({ type: 'div', props: { className: 'board-row' }, children: row.map((cell, x) => ({ type: 'div', props: { className: `cell cell-${cell}`, 'data-x': x, 'data-y': y }, children: [] })) })) };
}
export default MiniGame;
