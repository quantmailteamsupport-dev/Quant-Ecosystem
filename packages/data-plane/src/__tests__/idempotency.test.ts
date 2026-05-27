// ============================================================================
// Idempotency Key Store - Tests
// ============================================================================

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { IdempotencyKeyStore, withIdempotency } from '../idempotency';

describe('IdempotencyKeyStore', () => {
  let store: IdempotencyKeyStore;

  beforeEach(() => {
    vi.useFakeTimers();
    store = new IdempotencyKeyStore();
  });

  afterEach(() => {
    store.destroy();
    vi.useRealTimers();
  });

  describe('set/get', () => {
    it('should store and retrieve a result', () => {
      store.set('key-1', { status: 'ok', id: 123 });
      const result = store.get('key-1');
      expect(result).toEqual({ status: 'ok', id: 123 });
    });

    it('should return null for non-existent key', () => {
      const result = store.get('nonexistent');
      expect(result).toBeNull();
    });

    it('should store null values as a result', () => {
      store.set('key-null', null);
      // null is a valid stored result, but get() returns null for "not found" too
      // so has() should differentiate
      expect(store.has('key-null')).toBe(true);
    });
  });

  describe('has', () => {
    it('should return true for existing key', () => {
      store.set('key-1', 'value');
      expect(store.has('key-1')).toBe(true);
    });

    it('should return false for non-existent key', () => {
      expect(store.has('nonexistent')).toBe(false);
    });
  });

  describe('expiration', () => {
    it('should expire entries after TTL', () => {
      store.set('key-1', 'value', 5000);

      expect(store.has('key-1')).toBe(true);

      vi.advanceTimersByTime(5001);

      expect(store.has('key-1')).toBe(false);
      expect(store.get('key-1')).toBeNull();
    });

    it('should not expire entries before TTL', () => {
      store.set('key-1', 'value', 10000);

      vi.advanceTimersByTime(9999);

      expect(store.has('key-1')).toBe(true);
      expect(store.get('key-1')).toBe('value');
    });

    it('should use default TTL when not specified', () => {
      const customStore = new IdempotencyKeyStore(1000);
      customStore.set('key-1', 'value');

      expect(customStore.has('key-1')).toBe(true);

      vi.advanceTimersByTime(1001);

      expect(customStore.has('key-1')).toBe(false);
      customStore.destroy();
    });
  });

  describe('clear', () => {
    it('should remove all entries', () => {
      store.set('key-1', 'value1');
      store.set('key-2', 'value2');

      store.clear();

      expect(store.has('key-1')).toBe(false);
      expect(store.has('key-2')).toBe(false);
      expect(store.size()).toBe(0);
    });
  });

  describe('size', () => {
    it('should return the number of entries', () => {
      expect(store.size()).toBe(0);

      store.set('key-1', 'value1');
      expect(store.size()).toBe(1);

      store.set('key-2', 'value2');
      expect(store.size()).toBe(2);
    });
  });
});

describe('withIdempotency', () => {
  let store: IdempotencyKeyStore;

  beforeEach(() => {
    vi.useFakeTimers();
    store = new IdempotencyKeyStore();
  });

  afterEach(() => {
    store.destroy();
    vi.useRealTimers();
  });

  it('should execute operation on first call', async () => {
    const operation = vi.fn().mockResolvedValue({ id: 'result-1' });

    const result = await withIdempotency(store, 'op-1', 5000, operation);

    expect(result).toEqual({ id: 'result-1' });
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('should return cached result on subsequent calls', async () => {
    const operation = vi.fn().mockResolvedValue({ id: 'result-1' });

    await withIdempotency(store, 'op-1', 5000, operation);
    const result = await withIdempotency(store, 'op-1', 5000, operation);

    expect(result).toEqual({ id: 'result-1' });
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('should re-execute operation after TTL expires', async () => {
    const operation = vi
      .fn()
      .mockResolvedValueOnce({ id: 'result-1' })
      .mockResolvedValueOnce({ id: 'result-2' });

    await withIdempotency(store, 'op-1', 5000, operation);

    vi.advanceTimersByTime(5001);

    const result = await withIdempotency(store, 'op-1', 5000, operation);

    expect(result).toEqual({ id: 'result-2' });
    expect(operation).toHaveBeenCalledTimes(2);
  });

  it('should handle different keys independently', async () => {
    const op1 = vi.fn().mockResolvedValue('result-a');
    const op2 = vi.fn().mockResolvedValue('result-b');

    const result1 = await withIdempotency(store, 'key-a', 5000, op1);
    const result2 = await withIdempotency(store, 'key-b', 5000, op2);

    expect(result1).toBe('result-a');
    expect(result2).toBe('result-b');
    expect(op1).toHaveBeenCalledTimes(1);
    expect(op2).toHaveBeenCalledTimes(1);
  });
});
