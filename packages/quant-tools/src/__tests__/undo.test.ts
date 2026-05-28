import { describe, it, expect, vi } from 'vitest';
import { UndoManager } from '../undo.js';
import type { ToolContext, UndoRecipe } from '../types.js';

function createMockContext(): ToolContext {
  return {
    userId: 'user_001',
    sessionId: 'sess_001',
    requestedBy: 'user',
  };
}

function createMockRecipe(
  handler?: (undoId: string, ctx: ToolContext) => Promise<void>,
): UndoRecipe {
  return {
    description: 'Undo the action',
    handler: handler ?? vi.fn().mockResolvedValue(undefined),
  };
}

describe('UndoManager', () => {
  it('should register and execute undo', async () => {
    const manager = new UndoManager();
    const handler = vi.fn().mockResolvedValue(undefined);
    const recipe = createMockRecipe(handler);
    manager.registerUndo('undo_001', 'user_001', recipe);
    const context = createMockContext();
    await manager.executeUndo('undo_001', context);
    expect(handler).toHaveBeenCalledWith('undo_001', context);
  });

  it('should return true for canUndo when valid', () => {
    const manager = new UndoManager();
    manager.registerUndo('undo_001', 'user_001', createMockRecipe());
    expect(manager.canUndo('undo_001')).toBe(true);
  });

  it('should return false for canUndo when expired', () => {
    const manager = new UndoManager();
    // Register with -1ms TTL so it is immediately in the past
    manager.registerUndo('undo_001', 'user_001', createMockRecipe(), -1);
    expect(manager.canUndo('undo_001')).toBe(false);
  });

  it('should return false for canUndo after execution', async () => {
    const manager = new UndoManager();
    manager.registerUndo('undo_001', 'user_001', createMockRecipe());
    const context = createMockContext();
    await manager.executeUndo('undo_001', context);
    expect(manager.canUndo('undo_001')).toBe(false);
  });

  it('should prune expired entries', () => {
    const manager = new UndoManager();
    manager.registerUndo('undo_001', 'user_001', createMockRecipe(), -1);
    manager.registerUndo('undo_002', 'user_001', createMockRecipe(), 999999999);
    const pruned = manager.prune();
    expect(pruned).toBe(1);
    expect(manager.canUndo('undo_001')).toBe(false);
    expect(manager.canUndo('undo_002')).toBe(true);
  });

  it('should get undoable actions filtered by user', () => {
    const manager = new UndoManager();
    manager.registerUndo('undo_001', 'alice', createMockRecipe());
    manager.registerUndo('undo_002', 'bob', createMockRecipe());
    manager.registerUndo('undo_003', 'alice', createMockRecipe());
    const aliceActions = manager.getUndoableActions('alice');
    expect(aliceActions).toHaveLength(2);
    const bobActions = manager.getUndoableActions('bob');
    expect(bobActions).toHaveLength(1);
  });

  it('should throw when executing nonexistent undo', async () => {
    const manager = new UndoManager();
    const context = createMockContext();
    await expect(manager.executeUndo('nonexistent', context)).rejects.toThrow(
      'Undo entry not found',
    );
  });
});
