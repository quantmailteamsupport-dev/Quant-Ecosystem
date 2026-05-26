export interface UndoAction {
  id: string;
  undoFn: () => Promise<void>;
  registeredAt: number;
}

const DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 minutes

export class UndoEngine {
  private actions: Map<string, UndoAction> = new Map();
  private readonly ttlMs: number;

  constructor(ttlMs: number = DEFAULT_TTL_MS) {
    this.ttlMs = ttlMs;
  }

  registerAction(id: string, undoFn: () => Promise<void>): void {
    this.prune();
    this.actions.set(id, { id, undoFn, registeredAt: Date.now() });
  }

  canUndo(actionId: string): boolean {
    this.prune();
    const action = this.actions.get(actionId);
    if (!action) return false;
    return !this.isExpired(action);
  }

  async undo(actionId: string): Promise<void> {
    this.prune();
    const action = this.actions.get(actionId);
    if (!action) {
      throw new Error(`Action ${actionId} not found or has expired`);
    }
    if (this.isExpired(action)) {
      this.actions.delete(actionId);
      throw new Error(`Action ${actionId} has expired (TTL: ${this.ttlMs}ms)`);
    }
    await action.undoFn();
    this.actions.delete(actionId);
  }

  getUndoableActions(): string[] {
    this.prune();
    return Array.from(this.actions.keys());
  }

  prune(): void {
    const now = Date.now();
    for (const [id, action] of this.actions) {
      if (now - action.registeredAt > this.ttlMs) {
        this.actions.delete(id);
      }
    }
  }

  private isExpired(action: UndoAction): boolean {
    return Date.now() - action.registeredAt > this.ttlMs;
  }
}
