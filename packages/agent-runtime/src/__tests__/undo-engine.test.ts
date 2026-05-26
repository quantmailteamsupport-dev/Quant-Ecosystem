import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { UndoEngine } from '../undo-engine.js';

describe('UndoEngine', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('registers and undoes an action', async () => {
    const engine = new UndoEngine();
    const undoFn = vi.fn().mockResolvedValue(undefined);

    engine.registerAction('action-1', undoFn);
    expect(engine.canUndo('action-1')).toBe(true);

    await engine.undo('action-1');
    expect(undoFn).toHaveBeenCalledOnce();
    expect(engine.canUndo('action-1')).toBe(false);
  });

  it('lists undoable actions', () => {
    const engine = new UndoEngine();
    engine.registerAction('a1', vi.fn().mockResolvedValue(undefined));
    engine.registerAction('a2', vi.fn().mockResolvedValue(undefined));

    const actions = engine.getUndoableActions();
    expect(actions).toContain('a1');
    expect(actions).toContain('a2');
  });

  it('expires actions after TTL', () => {
    const engine = new UndoEngine(5 * 60 * 1000); // 5 min TTL
    engine.registerAction('action-1', vi.fn().mockResolvedValue(undefined));

    expect(engine.canUndo('action-1')).toBe(true);

    // Advance time past TTL
    vi.advanceTimersByTime(5 * 60 * 1000 + 1);

    expect(engine.canUndo('action-1')).toBe(false);
  });

  it('throws when undoing expired action', async () => {
    const engine = new UndoEngine(5 * 60 * 1000);
    engine.registerAction('action-1', vi.fn().mockResolvedValue(undefined));

    vi.advanceTimersByTime(5 * 60 * 1000 + 1);

    await expect(engine.undo('action-1')).rejects.toThrow(/expired/);
  });

  it('throws when undoing non-existent action', async () => {
    const engine = new UndoEngine();
    await expect(engine.undo('nonexistent')).rejects.toThrow(/not found/);
  });

  it('prunes expired actions', () => {
    const engine = new UndoEngine(5 * 60 * 1000);
    engine.registerAction('a1', vi.fn().mockResolvedValue(undefined));

    vi.advanceTimersByTime(5 * 60 * 1000 + 1);

    engine.prune();
    expect(engine.getUndoableActions()).toHaveLength(0);
  });

  it('keeps actions within TTL after prune', () => {
    const engine = new UndoEngine(5 * 60 * 1000);
    engine.registerAction('a1', vi.fn().mockResolvedValue(undefined));

    vi.advanceTimersByTime(2 * 60 * 1000); // Only 2 minutes

    engine.prune();
    expect(engine.getUndoableActions()).toHaveLength(1);
  });
});
