import { describe, it, expect, vi } from 'vitest';
import { TurnManager } from '../conversation/turn-manager.js';

describe('TurnManager', () => {
  it('starts with no speaker', () => {
    const tm = new TurnManager();
    const state = tm.getCurrentTurn();
    expect(state.currentSpeaker).toBe('none');
    expect(state.turnStartedAt).toBeNull();
  });

  it('starts a user turn', () => {
    const tm = new TurnManager();
    tm.startTurn('user');
    const state = tm.getCurrentTurn();
    expect(state.currentSpeaker).toBe('user');
    expect(state.canInterrupt).toBe(false);
    expect(state.turnStartedAt).toBeTypeOf('number');
  });

  it('starts an assistant turn with interruptible flag', () => {
    const tm = new TurnManager();
    tm.startTurn('assistant');
    const state = tm.getCurrentTurn();
    expect(state.currentSpeaker).toBe('assistant');
    expect(state.canInterrupt).toBe(true);
  });

  it('ends a turn returning to no speaker', () => {
    const tm = new TurnManager();
    tm.startTurn('user');
    tm.endTurn();
    const state = tm.getCurrentTurn();
    expect(state.currentSpeaker).toBe('none');
    expect(state.turnStartedAt).toBeNull();
  });

  it('canUserInterrupt returns true during assistant turn', () => {
    const tm = new TurnManager();
    tm.startTurn('assistant');
    expect(tm.canUserInterrupt()).toBe(true);
  });

  it('canUserInterrupt returns false during user turn', () => {
    const tm = new TurnManager();
    tm.startTurn('user');
    expect(tm.canUserInterrupt()).toBe(false);
  });

  it('canUserInterrupt returns false when no one is speaking', () => {
    const tm = new TurnManager();
    expect(tm.canUserInterrupt()).toBe(false);
  });

  it('handleInterruption switches from assistant to user', () => {
    const tm = new TurnManager();
    tm.startTurn('assistant');
    const result = tm.handleInterruption();
    expect(result).toBe(true);
    const state = tm.getCurrentTurn();
    expect(state.currentSpeaker).toBe('user');
  });

  it('handleInterruption returns false if not assistant turn', () => {
    const tm = new TurnManager();
    tm.startTurn('user');
    expect(tm.handleInterruption()).toBe(false);
  });

  it('handleInterruption returns false when no one is speaking', () => {
    const tm = new TurnManager();
    expect(tm.handleInterruption()).toBe(false);
  });

  it('notifies listeners on turn change', () => {
    const tm = new TurnManager();
    const listener = vi.fn();
    tm.onTurnChange(listener);

    tm.startTurn('assistant');
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0]?.[0].currentSpeaker).toBe('assistant');

    tm.handleInterruption();
    expect(listener).toHaveBeenCalledTimes(2);
    expect(listener.mock.calls[1]?.[0].currentSpeaker).toBe('user');
  });
});
