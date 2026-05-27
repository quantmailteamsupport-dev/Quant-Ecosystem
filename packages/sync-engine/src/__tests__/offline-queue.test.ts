import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { OfflineOperationQueue } from '../offline-queue.js';

describe('OfflineOperationQueue', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should enqueue and track operations', () => {
    const queue = new OfflineOperationQueue();
    queue.enqueue({ id: 'op-1', key: 'user/1', payload: { name: 'Alice' } });

    expect(queue.size()).toBe(1);
  });

  it('should dequeue the highest priority operation', () => {
    const queue = new OfflineOperationQueue();
    queue.enqueue({ id: 'op-1', key: 'k1', priority: 1, payload: 'low' });
    queue.enqueue({ id: 'op-2', key: 'k2', priority: 10, payload: 'high' });
    queue.enqueue({ id: 'op-3', key: 'k3', priority: 5, payload: 'mid' });

    const op = queue.dequeue();
    expect(op).not.toBeNull();
    expect(op!.payload).toBe('high');
    expect(queue.size()).toBe(2);
  });

  it('should return null when dequeuing empty queue', () => {
    const queue = new OfflineOperationQueue();
    expect(queue.dequeue()).toBeNull();
  });

  it('should deduplicate by key, newer operation wins', () => {
    const queue = new OfflineOperationQueue();
    queue.enqueue({ id: 'op-1', key: 'user/1', payload: { name: 'Alice' } });
    queue.enqueue({ id: 'op-2', key: 'user/1', payload: { name: 'Bob' } });

    expect(queue.size()).toBe(1);
    const op = queue.dequeue();
    expect(op!.id).toBe('op-2');
    expect(op!.payload).toEqual({ name: 'Bob' });
  });

  it('should peek all operations sorted by priority', () => {
    const queue = new OfflineOperationQueue();
    queue.enqueue({ id: 'op-1', key: 'k1', priority: 1, payload: 'low' });
    queue.enqueue({ id: 'op-2', key: 'k2', priority: 10, payload: 'high' });

    const peeked = queue.peek();
    expect(peeked).toHaveLength(2);
    expect(peeked[0]!.priority).toBe(10);
    expect(peeked[1]!.priority).toBe(1);
    // peek should not remove items
    expect(queue.size()).toBe(2);
  });

  it('should remove expired operations', () => {
    const queue = new OfflineOperationQueue();
    queue.enqueue({ id: 'op-1', key: 'k1', payload: 'data', maxAge: 5000 });
    queue.enqueue({ id: 'op-2', key: 'k2', payload: 'data', maxAge: 60000 });

    vi.advanceTimersByTime(10000);

    const removed = queue.removeExpired();
    expect(removed).toBe(1);
    expect(queue.size()).toBe(1);
  });

  it('should use default maxAge of 7 days', () => {
    const queue = new OfflineOperationQueue();
    queue.enqueue({ id: 'op-1', key: 'k1', payload: 'data' });

    // Advance 6 days - should still be there
    vi.advanceTimersByTime(6 * 24 * 60 * 60 * 1000);
    expect(queue.removeExpired()).toBe(0);

    // Advance past 7 days
    vi.advanceTimersByTime(2 * 24 * 60 * 60 * 1000);
    expect(queue.removeExpired()).toBe(1);
  });

  it('should replay all operations with concurrency', async () => {
    const queue = new OfflineOperationQueue();
    queue.enqueue({ id: 'op-1', key: 'k1', priority: 1, payload: 'a' });
    queue.enqueue({ id: 'op-2', key: 'k2', priority: 2, payload: 'b' });
    queue.enqueue({ id: 'op-3', key: 'k3', priority: 3, payload: 'c' });

    const sender = vi.fn().mockResolvedValue(true);
    const result = await queue.replayAll(sender, 2);

    expect(result.successful).toBe(3);
    expect(result.failed).toBe(0);
    expect(queue.size()).toBe(0);
    expect(sender).toHaveBeenCalledTimes(3);
  });

  it('should handle replay failures gracefully', async () => {
    const queue = new OfflineOperationQueue();
    queue.enqueue({ id: 'op-1', key: 'k1', payload: 'a' });
    queue.enqueue({ id: 'op-2', key: 'k2', payload: 'b' });

    const sender = vi.fn().mockResolvedValueOnce(true).mockResolvedValueOnce(false);

    const result = await queue.replayAll(sender);

    expect(result.successful).toBe(1);
    expect(result.failed).toBe(1);
    expect(queue.size()).toBe(1); // failed op remains
  });

  it('should handle replay sender throwing errors', async () => {
    const queue = new OfflineOperationQueue();
    queue.enqueue({ id: 'op-1', key: 'k1', payload: 'a' });

    const sender = vi.fn().mockRejectedValue(new Error('network error'));

    const result = await queue.replayAll(sender);

    expect(result.successful).toBe(0);
    expect(result.failed).toBe(1);
    expect(queue.size()).toBe(1);
  });

  it('should clear all operations', () => {
    const queue = new OfflineOperationQueue();
    queue.enqueue({ id: 'op-1', key: 'k1', payload: 'a' });
    queue.enqueue({ id: 'op-2', key: 'k2', payload: 'b' });

    queue.clear();
    expect(queue.size()).toBe(0);
  });
});
