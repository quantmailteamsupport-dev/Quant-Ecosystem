// ============================================================================
// QuantNeon - Game Service
// Mini game engine, multiplayer state, scoring, game state management
// ============================================================================

interface GameState {
  board?: any[][];
  score: number;
  level: number;
  lives: number;
  combo: number;
  timeRemaining?: number;
  entities?: any[];
  playerPosition?: { x: number; y: number };
  gameOver: boolean;
}

interface ActionResult {
  newState: GameState;
  score: number;
  actionResult: { success: boolean; points: number; message: string; effects?: string[] };
}

class GameService {
  initializeGameState(gameId: string, gameType: string): GameState {
    switch (gameType) {
      case 'puzzle':
        return this.initPuzzleGame();
      case 'casual':
        return this.initRunnerGame();
      case 'trivia':
        return this.initTriviaGame();
      case 'ar':
        return this.initARGame();
      case 'multiplayer':
        return this.initBattleGame();
      default:
        return { score: 0, level: 1, lives: 3, combo: 0, gameOver: false };
    }
  }

  processAction(state: GameState, action: string, data: any): ActionResult {
    switch (action) {
      case 'swap': return this.processSwap(state, data);
      case 'move': return this.processMove(state, data);
      case 'answer': return this.processAnswer(state, data);
      case 'tap': return this.processTap(state, data);
      case 'attack': return this.processAttack(state, data);
      default: return { newState: state, score: state.score, actionResult: { success: false, points: 0, message: 'Unknown action' } };
    }
  }

  private initPuzzleGame(): GameState {
    const board = Array.from({ length: 8 }, () => Array.from({ length: 8 }, () => Math.floor(Math.random() * 6)));
    return { board, score: 0, level: 1, lives: 3, combo: 0, gameOver: false };
  }

  private initRunnerGame(): GameState {
    return { score: 0, level: 1, lives: 3, combo: 0, playerPosition: { x: 1, y: 0 }, entities: [], gameOver: false };
  }

  private initTriviaGame(): GameState {
    return { score: 0, level: 1, lives: 3, combo: 0, timeRemaining: 30, gameOver: false };
  }

  private initARGame(): GameState {
    return { score: 0, level: 1, lives: 3, combo: 0, entities: Array.from({ length: 5 }, (_, i) => ({ id: i, x: Math.random(), y: Math.random(), caught: false })), gameOver: false };
  }

  private initBattleGame(): GameState {
    return { score: 0, level: 1, lives: 100, combo: 0, playerPosition: { x: 50, y: 50 }, entities: [], gameOver: false };
  }

  private processSwap(state: GameState, data: { from: { x: number; y: number }; to: { x: number; y: number } }): ActionResult {
    if (!state.board || state.gameOver) return { newState: state, score: state.score, actionResult: { success: false, points: 0, message: 'Invalid move' } };

    // Simulate match-3 logic
    const matches = this.findMatches(state.board, data.from, data.to);
    if (matches > 0) {
      const points = matches * 10 * (state.combo + 1);
      state.score += points;
      state.combo++;
      // Level up every 500 points
      if (state.score >= state.level * 500) state.level++;
      return { newState: state, score: state.score, actionResult: { success: true, points, message: `${matches} matched! Combo x${state.combo}`, effects: ['sparkle', 'shake'] } };
    }
    state.combo = 0;
    return { newState: state, score: state.score, actionResult: { success: false, points: 0, message: 'No match' } };
  }

  private processMove(state: GameState, data: { direction: string }): ActionResult {
    if (state.gameOver) return { newState: state, score: state.score, actionResult: { success: false, points: 0, message: 'Game over' } };
    const pos = state.playerPosition || { x: 0, y: 0 };
    switch (data.direction) {
      case 'left': pos.x = Math.max(0, pos.x - 1); break;
      case 'right': pos.x = Math.min(2, pos.x + 1); break;
      case 'jump': pos.y = Math.min(3, pos.y + 1); break;
    }
    state.playerPosition = pos;
    state.score += 1;
    return { newState: state, score: state.score, actionResult: { success: true, points: 1, message: `Moved ${data.direction}` } };
  }

  private processAnswer(state: GameState, data: { answer: string; correct: boolean }): ActionResult {
    if (state.gameOver) return { newState: state, score: state.score, actionResult: { success: false, points: 0, message: 'Game over' } };
    if (data.correct) {
      const points = 100 * (state.combo + 1);
      state.score += points;
      state.combo++;
      return { newState: state, score: state.score, actionResult: { success: true, points, message: 'Correct!', effects: ['confetti'] } };
    }
    state.combo = 0;
    state.lives--;
    if (state.lives <= 0) state.gameOver = true;
    return { newState: state, score: state.score, actionResult: { success: false, points: 0, message: 'Wrong answer' } };
  }

  private processTap(state: GameState, data: { targetId: number }): ActionResult {
    if (state.gameOver || !state.entities) return { newState: state, score: state.score, actionResult: { success: false, points: 0, message: 'Invalid' } };
    const entity = state.entities.find((e: any) => e.id === data.targetId && !e.caught);
    if (entity) {
      entity.caught = true;
      const points = 50;
      state.score += points;
      if (state.entities.every((e: any) => e.caught)) state.level++;
      return { newState: state, score: state.score, actionResult: { success: true, points, message: 'Caught!' } };
    }
    return { newState: state, score: state.score, actionResult: { success: false, points: 0, message: 'Missed' } };
  }

  private processAttack(state: GameState, data: { damage: number }): ActionResult {
    const points = data.damage * 5;
    state.score += points;
    return { newState: state, score: state.score, actionResult: { success: true, points, message: `Hit! ${data.damage} damage` } };
  }

  private findMatches(board: any[][], from: { x: number; y: number }, to: { x: number; y: number }): number {
    // Simplified match detection
    if (from.x < 0 || from.x >= 8 || from.y < 0 || from.y >= 8) return 0;
    if (to.x < 0 || to.x >= 8 || to.y < 0 || to.y >= 8) return 0;
    // Swap and check for 3+ in a row
    const temp = board[from.y][from.x];
    board[from.y][from.x] = board[to.y][to.x];
    board[to.y][to.x] = temp;
    let matches = 0;
    // Check horizontal and vertical lines
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 6; x++) {
        if (board[y][x] === board[y][x + 1] && board[y][x] === board[y][x + 2]) matches++;
      }
    }
    for (let x = 0; x < 8; x++) {
      for (let y = 0; y < 6; y++) {
        if (board[y][x] === board[y + 1][x] && board[y][x] === board[y + 2][x]) matches++;
      }
    }
    if (matches === 0) { board[to.y][to.x] = board[from.y][from.x]; board[from.y][from.x] = temp; }
    return matches;
  }
}

export const gameService = new GameService();
