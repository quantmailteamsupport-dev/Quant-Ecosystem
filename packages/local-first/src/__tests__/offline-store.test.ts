import { describe, expect, it } from 'vitest';
import { OfflineStore, createOfflineStore } from '../offline-store.js';

describe('OfflineStore', () => {
  it('creates a store with default config', () => {
    const store = createOfflineStore();
    const config = store.getConfig();

    expect(config.dbName).toBe('quant-local');
    expect(config.autoSync).toBe(true);
    expect(config.conflictStrategy).toBe('crdt-merge');
    expect(config.maxOfflineQueueSize).toBe(1000);
  });

  it('creates a store with custom config', () => {
    const store = createOfflineStore({
      dbName: 'my-app',
      conflictStrategy: 'last-write-wins',
      maxOfflineQueueSize: 500,
    });
    const config = store.getConfig();

    expect(config.dbName).toBe('my-app');
    expect(config.conflictStrategy).toBe('last-write-wins');
    expect(config.maxOfflineQueueSize).toBe(500);
  });

  it('puts and gets data in collections', async () => {
    const store = createOfflineStore();
    await store.put('users', 'user-1', { name: 'Alice' });

    const result = await store.get('users', 'user-1');
    expect(result).toEqual({ name: 'Alice' });
  });

  it('returns null for missing keys', async () => {
    const store = createOfflineStore();
    const result = await store.get('users', 'nonexistent');
    expect(result).toBeNull();
  });

  it('deletes data from collections', async () => {
    const store = createOfflineStore();
    await store.put('users', 'user-1', { name: 'Alice' });

    const deleted = await store.delete('users', 'user-1');
    expect(deleted).toBe(true);

    const result = await store.get('users', 'user-1');
    expect(result).toBeNull();
  });

  it('returns false when deleting non-existent key', async () => {
    const store = createOfflineStore();
    const deleted = await store.delete('users', 'nonexistent');
    expect(deleted).toBe(false);
  });

  it('queues operations for sync', async () => {
    const store = createOfflineStore();
    await store.put('messages', 'msg-1', { text: 'hello' });
    await store.put('messages', 'msg-2', { text: 'world' });

    const queue = store.getQueue();
    expect(queue.items).toHaveLength(2);
    expect(queue.items[0]!.operation).toBe('create');
    expect(queue.items[0]!.collection).toBe('messages');
  });

  it('supports offline mode', () => {
    const store = createOfflineStore();
    store.setOnline(false);

    const state = store.getSyncState();
    expect(state.isOnline).toBe(false);
    expect(state.status).toBe('offline');
  });

  it('processes queue when online', async () => {
    const store = createOfflineStore();
    await store.put('data', 'key-1', 'value-1');
    await store.put('data', 'key-2', 'value-2');

    const processed = await store.processQueue();
    expect(processed).toBe(2);
    expect(store.getQueue().items).toHaveLength(0);
  });

  it('does not process queue when offline', async () => {
    const store = createOfflineStore();
    await store.put('data', 'key-1', 'value-1');
    store.setOnline(false);

    const processed = await store.processQueue();
    expect(processed).toBe(0);
    expect(store.getQueue().items).toHaveLength(1);
  });

  it('handles CRDT merge with last-write-wins', () => {
    const store = createOfflineStore({ conflictStrategy: 'last-write-wins' });
    store.put('data', 'key-1', 'local-value');

    const remote = {
      value: 'remote-value',
      vector: { 'remote-node': 1 },
      timestamp: new Date(Date.now() + 1000),
      nodeId: 'remote-node',
    };

    const conflict = store.mergeCRDT('data', 'key-1', remote);
    expect(conflict).toBeNull();
  });

  it('detects conflicts with concurrent versions', async () => {
    const store = new OfflineStore({
      dbName: 'test',
      version: 1,
      autoSync: true,
      syncIntervalMs: 5000,
      conflictStrategy: 'manual',
      maxOfflineQueueSize: 1000,
      enableCompression: false,
    });

    await store.put('data', 'key-1', 'local-value');

    const remote = {
      value: 'remote-value',
      vector: { 'other-node': 2 },
      timestamp: new Date(),
      nodeId: 'other-node',
    };

    const conflict = store.mergeCRDT('data', 'key-1', remote);
    expect(conflict).not.toBeNull();
    expect(conflict!.localValue).toBe('local-value');
    expect(conflict!.remoteValue).toBe('remote-value');
  });

  it('resolves conflicts', async () => {
    const store = new OfflineStore({
      dbName: 'test',
      version: 1,
      autoSync: true,
      syncIntervalMs: 5000,
      conflictStrategy: 'manual',
      maxOfflineQueueSize: 1000,
      enableCompression: false,
    });

    await store.put('data', 'key-1', 'local');
    const remote = {
      value: 'remote',
      vector: { 'other-node': 2 },
      timestamp: new Date(),
      nodeId: 'other-node',
    };

    const conflict = store.mergeCRDT('data', 'key-1', remote);
    expect(conflict).not.toBeNull();

    const resolved = store.resolveConflict(conflict!.id, {
      strategy: 'manual',
      resolvedValue: 'merged',
      resolvedAt: new Date(),
      resolvedBy: 'user',
    });
    expect(resolved).toBe(true);
  });

  it('supports full account offline-first with getAll', async () => {
    const store = createOfflineStore();
    await store.put('account', 'profile', { name: 'User' });
    await store.put('account', 'settings', { theme: 'dark' });

    const all = await store.getAll('account');
    expect(all.size).toBe(2);
    expect(all.get('profile')).toEqual({ name: 'User' });
    expect(all.get('settings')).toEqual({ theme: 'dark' });
  });
});
