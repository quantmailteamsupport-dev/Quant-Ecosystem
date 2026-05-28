import type { ToolContext, UndoEntry, UndoRecipe } from './types.js';

const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export class UndoManager {
  private entries = new Map<string, UndoEntry>();

  registerUndo(undoId: string, userId: string, recipe: UndoRecipe, ttlMs?: number): void {
    const now = Date.now();
    this.entries.set(undoId, {
      undoId,
      userId,
      recipe,
      createdAt: now,
      expiresAt: now + (ttlMs ?? DEFAULT_TTL_MS),
      executed: false,
    });
  }

  async executeUndo(undoId: string, context: ToolContext): Promise<void> {
    const entry = this.entries.get(undoId);
    if (!entry) {
      throw new Error(`Undo entry not found: ${undoId}`);
    }
    if (entry.executed) {
      throw new Error(`Undo already executed: ${undoId}`);
    }
    if (Date.now() > entry.expiresAt) {
      throw new Error(`Undo expired: ${undoId}`);
    }
    await entry.recipe.handler(undoId, context);
    entry.executed = true;
  }

  canUndo(undoId: string): boolean {
    const entry = this.entries.get(undoId);
    if (!entry) return false;
    if (entry.executed) return false;
    if (Date.now() > entry.expiresAt) return false;
    return true;
  }

  getUndoableActions(userId: string): UndoEntry[] {
    const now = Date.now();
    const results: UndoEntry[] = [];
    for (const entry of this.entries.values()) {
      if (entry.userId === userId && !entry.executed && now <= entry.expiresAt) {
        results.push(entry);
      }
    }
    return results;
  }

  prune(): number {
    const now = Date.now();
    let pruned = 0;
    for (const [id, entry] of this.entries) {
      if (now > entry.expiresAt) {
        this.entries.delete(id);
        pruned++;
      }
    }
    return pruned;
  }
}
