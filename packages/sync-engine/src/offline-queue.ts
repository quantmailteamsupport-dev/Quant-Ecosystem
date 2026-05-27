// ============================================================================
// Offline Operation Queue
// ============================================================================

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export interface OfflineOperation {
  id: string;
  key: string;
  priority: number;
  payload: unknown;
  createdAt: number;
  maxAge: number;
}

export interface ReplayResult {
  successful: number;
  failed: number;
}

export class OfflineOperationQueue {
  private readonly operations: Map<string, OfflineOperation> = new Map();

  enqueue(
    operation: Partial<OfflineOperation> & { id: string; key: string; payload: unknown },
  ): void {
    const op: OfflineOperation = {
      id: operation.id,
      key: operation.key,
      priority: operation.priority ?? 0,
      payload: operation.payload,
      createdAt: operation.createdAt ?? Date.now(),
      maxAge: operation.maxAge ?? SEVEN_DAYS_MS,
    };

    // Deduplicate by key - newer wins
    const existing = this.findByKey(op.key);
    if (existing) {
      this.operations.delete(existing.id);
    }

    this.operations.set(op.id, op);
  }

  dequeue(): OfflineOperation | null {
    const sorted = this.getSorted();
    if (sorted.length === 0) {
      return null;
    }
    const op = sorted[0]!;
    this.operations.delete(op.id);
    return op;
  }

  peek(): OfflineOperation[] {
    return this.getSorted();
  }

  size(): number {
    return this.operations.size;
  }

  removeExpired(): number {
    const now = Date.now();
    let removed = 0;
    for (const [id, op] of this.operations) {
      if (now - op.createdAt > op.maxAge) {
        this.operations.delete(id);
        removed++;
      }
    }
    return removed;
  }

  async replayAll(
    sender: (op: OfflineOperation) => Promise<boolean>,
    concurrency = 3,
  ): Promise<ReplayResult> {
    const sorted = this.getSorted();
    let successful = 0;
    let failed = 0;

    // Process in batches of concurrency
    for (let i = 0; i < sorted.length; i += concurrency) {
      const batch = sorted.slice(i, i + concurrency);
      const results = await Promise.all(
        batch.map(async (op) => {
          try {
            const success = await sender(op);
            return { op, success };
          } catch {
            return { op, success: false };
          }
        }),
      );

      for (const result of results) {
        if (result.success) {
          successful++;
          this.operations.delete(result.op.id);
        } else {
          failed++;
        }
      }
    }

    return { successful, failed };
  }

  clear(): void {
    this.operations.clear();
  }

  private findByKey(key: string): OfflineOperation | undefined {
    for (const op of this.operations.values()) {
      if (op.key === key) {
        return op;
      }
    }
    return undefined;
  }

  private getSorted(): OfflineOperation[] {
    return [...this.operations.values()].sort((a, b) => b.priority - a.priority);
  }
}
