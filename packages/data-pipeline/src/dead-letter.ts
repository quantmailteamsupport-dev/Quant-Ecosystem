import { randomUUID } from 'node:crypto';
import type { StreamEvent, DeadLetterEntry } from './types.js';

export interface DeadLetterStats {
  total: number;
  byStream: Record<string, number>;
  byGroup: Record<string, number>;
  oldestEntry: number | null;
  newestEntry: number | null;
}

export class DeadLetterQueue {
  private entries: Map<string, DeadLetterEntry> = new Map();

  enqueue(params: {
    stream: string;
    group: string;
    event: StreamEvent;
    error: string;
    attempts: number;
  }): DeadLetterEntry {
    const existing = this.findByEventId(params.event.id, params.stream);
    if (existing) {
      existing.attempts = params.attempts;
      existing.lastFailedAt = Date.now();
      existing.error = params.error;
      return existing;
    }

    const entry: DeadLetterEntry = {
      id: randomUUID(),
      stream: params.stream,
      group: params.group,
      event: params.event,
      error: params.error,
      attempts: params.attempts,
      firstFailedAt: Date.now(),
      lastFailedAt: Date.now(),
    };

    this.entries.set(entry.id, entry);
    return entry;
  }

  replay(id: string): DeadLetterEntry | null {
    const entry = this.entries.get(id);
    if (!entry) return null;
    entry.replayedAt = Date.now();
    return entry;
  }

  replayAll(stream?: string): DeadLetterEntry[] {
    const now = Date.now();
    const replayed: DeadLetterEntry[] = [];

    for (const entry of this.entries.values()) {
      if (stream && entry.stream !== stream) continue;
      if (entry.replayedAt) continue;
      entry.replayedAt = now;
      replayed.push(entry);
    }

    return replayed;
  }

  get(id: string): DeadLetterEntry | null {
    return this.entries.get(id) ?? null;
  }

  getAll(stream?: string): DeadLetterEntry[] {
    const all = Array.from(this.entries.values());
    if (stream) {
      return all.filter((e) => e.stream === stream);
    }
    return all;
  }

  getStats(): DeadLetterStats {
    const byStream: Record<string, number> = {};
    const byGroup: Record<string, number> = {};
    let oldest: number | null = null;
    let newest: number | null = null;

    for (const entry of this.entries.values()) {
      byStream[entry.stream] = (byStream[entry.stream] ?? 0) + 1;
      byGroup[entry.group] = (byGroup[entry.group] ?? 0) + 1;

      if (oldest === null || entry.firstFailedAt < oldest) {
        oldest = entry.firstFailedAt;
      }
      if (newest === null || entry.lastFailedAt > newest) {
        newest = entry.lastFailedAt;
      }
    }

    return {
      total: this.entries.size,
      byStream,
      byGroup,
      oldestEntry: oldest,
      newestEntry: newest,
    };
  }

  purge(olderThanMs: number): number {
    const cutoff = Date.now() - olderThanMs;
    let removed = 0;

    for (const [id, entry] of this.entries) {
      if (entry.lastFailedAt < cutoff) {
        this.entries.delete(id);
        removed++;
      }
    }

    return removed;
  }

  remove(id: string): boolean {
    return this.entries.delete(id);
  }

  size(): number {
    return this.entries.size;
  }

  clear(): void {
    this.entries.clear();
  }

  private findByEventId(eventId: string, stream: string): DeadLetterEntry | undefined {
    for (const entry of this.entries.values()) {
      if (entry.event.id === eventId && entry.stream === stream) {
        return entry;
      }
    }
    return undefined;
  }
}
