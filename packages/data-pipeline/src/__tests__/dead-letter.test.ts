import { describe, it, expect, beforeEach } from 'vitest';
import { DeadLetterQueue } from '../dead-letter.js';
import type { StreamEvent } from '../types.js';

function createEvent(id = 'evt-1'): StreamEvent {
  return {
    id,
    type: 'page_view',
    source: 'web',
    timestamp: Date.now(),
    data: { url: '/home' },
  };
}

describe('DeadLetterQueue', () => {
  let dlq: DeadLetterQueue;

  beforeEach(() => {
    dlq = new DeadLetterQueue();
  });

  describe('enqueue', () => {
    it('should add a failed event', () => {
      const event = createEvent();
      const entry = dlq.enqueue({
        stream: 'events:analytics',
        group: 'group-1',
        event,
        error: 'Processing failed',
        attempts: 1,
      });

      expect(entry.id).toBeDefined();
      expect(entry.stream).toBe('events:analytics');
      expect(entry.group).toBe('group-1');
      expect(entry.event).toEqual(event);
      expect(entry.error).toBe('Processing failed');
      expect(entry.attempts).toBe(1);
      expect(dlq.size()).toBe(1);
    });

    it('should update existing entry for same event', () => {
      const event = createEvent();
      dlq.enqueue({
        stream: 'events:analytics',
        group: 'group-1',
        event,
        error: 'First failure',
        attempts: 1,
      });

      const updated = dlq.enqueue({
        stream: 'events:analytics',
        group: 'group-1',
        event,
        error: 'Second failure',
        attempts: 2,
      });

      expect(dlq.size()).toBe(1);
      expect(updated.attempts).toBe(2);
      expect(updated.error).toBe('Second failure');
    });
  });

  describe('replay', () => {
    it('should mark an entry as replayed', () => {
      const event = createEvent();
      const entry = dlq.enqueue({
        stream: 'events:analytics',
        group: 'group-1',
        event,
        error: 'Failed',
        attempts: 1,
      });

      const replayed = dlq.replay(entry.id);

      expect(replayed).not.toBeNull();
      expect(replayed!.replayedAt).toBeDefined();
    });

    it('should return null for unknown id', () => {
      expect(dlq.replay('unknown-id')).toBeNull();
    });
  });

  describe('replayAll', () => {
    it('should replay all unreplayed entries', () => {
      dlq.enqueue({
        stream: 's1',
        group: 'g1',
        event: createEvent('e1'),
        error: 'err',
        attempts: 1,
      });
      dlq.enqueue({
        stream: 's2',
        group: 'g1',
        event: createEvent('e2'),
        error: 'err',
        attempts: 1,
      });

      const replayed = dlq.replayAll();
      expect(replayed).toHaveLength(2);
    });

    it('should filter by stream', () => {
      dlq.enqueue({
        stream: 's1',
        group: 'g1',
        event: createEvent('e1'),
        error: 'err',
        attempts: 1,
      });
      dlq.enqueue({
        stream: 's2',
        group: 'g1',
        event: createEvent('e2'),
        error: 'err',
        attempts: 1,
      });

      const replayed = dlq.replayAll('s1');
      expect(replayed).toHaveLength(1);
      expect(replayed[0]!.stream).toBe('s1');
    });
  });

  describe('getStats', () => {
    it('should return stats broken down by stream and group', () => {
      dlq.enqueue({
        stream: 's1',
        group: 'g1',
        event: createEvent('e1'),
        error: 'err',
        attempts: 1,
      });
      dlq.enqueue({
        stream: 's1',
        group: 'g2',
        event: createEvent('e2'),
        error: 'err',
        attempts: 1,
      });
      dlq.enqueue({
        stream: 's2',
        group: 'g1',
        event: createEvent('e3'),
        error: 'err',
        attempts: 1,
      });

      const stats = dlq.getStats();

      expect(stats.total).toBe(3);
      expect(stats.byStream['s1']).toBe(2);
      expect(stats.byStream['s2']).toBe(1);
      expect(stats.byGroup['g1']).toBe(2);
      expect(stats.byGroup['g2']).toBe(1);
      expect(stats.oldestEntry).toBeDefined();
      expect(stats.newestEntry).toBeDefined();
    });

    it('should return nulls for empty DLQ', () => {
      const stats = dlq.getStats();
      expect(stats.total).toBe(0);
      expect(stats.oldestEntry).toBeNull();
      expect(stats.newestEntry).toBeNull();
    });
  });

  describe('purge', () => {
    it('should remove old entries', () => {
      const entry = dlq.enqueue({
        stream: 's1',
        group: 'g1',
        event: createEvent(),
        error: 'err',
        attempts: 1,
      });

      // Manually set lastFailedAt to past
      const stored = dlq.get(entry.id);
      if (stored) {
        stored.lastFailedAt = Date.now() - 10000;
      }

      const removed = dlq.purge(5000);
      expect(removed).toBe(1);
      expect(dlq.size()).toBe(0);
    });
  });

  describe('clear', () => {
    it('should remove all entries', () => {
      dlq.enqueue({
        stream: 's1',
        group: 'g1',
        event: createEvent('e1'),
        error: 'err',
        attempts: 1,
      });
      dlq.enqueue({
        stream: 's2',
        group: 'g1',
        event: createEvent('e2'),
        error: 'err',
        attempts: 1,
      });

      dlq.clear();
      expect(dlq.size()).toBe(0);
    });
  });
});
