// ============================================================================
// Data Plane - Idempotency Key Store
// In-memory idempotency key management with TTL-based expiration
// ============================================================================

/** Default TTL: 24 hours */
const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000;

/** Sweep interval: every 60 seconds */
const SWEEP_INTERVAL_MS = 60_000;

/** Stored entry with expiry */
interface IdempotencyEntry {
  result: unknown;
  expiresAt: number;
}

/**
 * IdempotencyKeyStore - Deduplicates write operations within a TTL window.
 *
 * Stores results of operations keyed by an idempotency key. If the same
 * key is seen again within the TTL, the cached result is returned instead
 * of re-executing the operation.
 *
 * Uses a periodic timer sweep to clean up expired entries.
 */
export class IdempotencyKeyStore {
  private store: Map<string, IdempotencyEntry> = new Map();
  private sweepTimer: ReturnType<typeof setInterval> | null = null;
  private readonly defaultTtlMs: number;

  constructor(defaultTtlMs: number = DEFAULT_TTL_MS) {
    this.defaultTtlMs = defaultTtlMs;
    this.startSweep();
  }

  /**
   * Store a result for a given key with optional TTL.
   */
  set(key: string, result: unknown, ttlMs?: number): void {
    const ttl = ttlMs ?? this.defaultTtlMs;
    this.store.set(key, {
      result,
      expiresAt: Date.now() + ttl,
    });
  }

  /**
   * Get the stored result for a key, or null if not found/expired.
   */
  get(key: string): unknown | null {
    const entry = this.store.get(key);
    if (!entry) return null;

    if (Date.now() >= entry.expiresAt) {
      this.store.delete(key);
      return null;
    }

    return entry.result;
  }

  /**
   * Check if a key exists and is not expired.
   */
  has(key: string): boolean {
    const entry = this.store.get(key);
    if (!entry) return false;

    if (Date.now() >= entry.expiresAt) {
      this.store.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Remove all entries.
   */
  clear(): void {
    this.store.clear();
  }

  /**
   * Get the number of active (non-expired) entries.
   */
  size(): number {
    return this.store.size;
  }

  /**
   * Stop the sweep timer and clean up.
   */
  destroy(): void {
    if (this.sweepTimer) {
      clearInterval(this.sweepTimer);
      this.sweepTimer = null;
    }
    this.store.clear();
  }

  /**
   * Start periodic sweep to remove expired entries.
   */
  private startSweep(): void {
    this.sweepTimer = setInterval(() => {
      this.sweep();
    }, SWEEP_INTERVAL_MS);

    // Allow the process to exit without waiting for the timer
    if (this.sweepTimer.unref) {
      this.sweepTimer.unref();
    }
  }

  /**
   * Remove all expired entries.
   */
  private sweep(): void {
    const now = Date.now();
    for (const [key, entry] of this.store) {
      if (now >= entry.expiresAt) {
        this.store.delete(key);
      }
    }
  }
}

/**
 * Helper function that wraps an async operation with idempotency.
 *
 * If the key already has a stored result, returns it immediately.
 * Otherwise, executes the operation, stores the result, and returns it.
 */
export async function withIdempotency<T>(
  store: IdempotencyKeyStore,
  key: string,
  ttlMs: number,
  operation: () => Promise<T>,
): Promise<T> {
  const cached = store.get(key);
  if (cached !== null) {
    return cached as T;
  }

  const result = await operation();
  store.set(key, result, ttlMs);
  return result;
}
