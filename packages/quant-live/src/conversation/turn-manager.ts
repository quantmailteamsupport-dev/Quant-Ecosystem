import type { TurnState } from '../types.js';

type TurnChangeListener = (state: TurnState) => void;

export class TurnManager {
  private state: TurnState = {
    currentSpeaker: 'none',
    canInterrupt: true,
    turnStartedAt: null,
  };
  private listeners: TurnChangeListener[] = [];

  startTurn(speaker: 'user' | 'assistant'): void {
    this.state = {
      currentSpeaker: speaker,
      canInterrupt: speaker === 'assistant',
      turnStartedAt: Date.now(),
    };
    this.notifyListeners();
  }

  endTurn(): void {
    this.state = {
      currentSpeaker: 'none',
      canInterrupt: true,
      turnStartedAt: null,
    };
    this.notifyListeners();
  }

  getCurrentTurn(): TurnState {
    return { ...this.state };
  }

  handleInterruption(): boolean {
    if (this.state.currentSpeaker !== 'assistant' || !this.state.canInterrupt) {
      return false;
    }
    this.state = {
      currentSpeaker: 'user',
      canInterrupt: false,
      turnStartedAt: Date.now(),
    };
    this.notifyListeners();
    return true;
  }

  canUserInterrupt(): boolean {
    return this.state.currentSpeaker === 'assistant' && this.state.canInterrupt;
  }

  onTurnChange(cb: TurnChangeListener): void {
    this.listeners.push(cb);
  }

  private notifyListeners(): void {
    for (const cb of this.listeners) {
      cb(this.getCurrentTurn());
    }
  }
}
