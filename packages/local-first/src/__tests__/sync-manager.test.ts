import { describe, expect, it } from 'vitest';
import { createSyncManager } from '../sync-manager.js';

describe('SyncManager', () => {
  it('creates with default config', () => {
    const manager = createSyncManager();
    const config = manager.getConfig();

    expect(config.mergeStrategy).toBe('crdt');
    expect(config.maxRetries).toBe(3);
    expect(config.retryBackoffMs).toBe(1000);
  });

  it('starts and stops sync', () => {
    const manager = createSyncManager();
    expect(manager.isRunning()).toBe(false);

    manager.start();
    expect(manager.isRunning()).toBe(true);

    manager.stop();
    expect(manager.isRunning()).toBe(false);
  });

  it('records local changes with version vectors', () => {
    const manager = createSyncManager();
    manager.start();

    const entry = manager.recordChange('create', 'messages', 'msg-1');
    expect(entry.operation).toBe('create');
    expect(entry.collection).toBe('messages');
    expect(entry.key).toBe('msg-1');
    expect(entry.sequence).toBe(1);
    expect(entry.version).toBe(1);

    const entry2 = manager.recordChange('update', 'messages', 'msg-1');
    expect(entry2.sequence).toBe(2);
    expect(entry2.version).toBe(2);
  });

  it('tracks pending changes', () => {
    const manager = createSyncManager();
    manager.start();

    manager.recordChange('create', 'docs', 'doc-1');
    manager.recordChange('create', 'docs', 'doc-2');

    const state = manager.getSyncState();
    expect(state.pendingChanges).toBe(2);
  });

  it('handles offline mode', () => {
    const manager = createSyncManager();
    manager.start();
    manager.setOnline(false);

    const state = manager.getSyncState();
    expect(state.isOnline).toBe(false);
    expect(state.status).toBe('offline');
  });

  it('syncs when online', async () => {
    const manager = createSyncManager();
    manager.start();

    manager.recordChange('create', 'docs', 'doc-1');
    manager.recordChange('update', 'docs', 'doc-1');

    const result = await manager.sync();
    expect(result.sent).toBe(2);

    const state = manager.getSyncState();
    expect(state.pendingChanges).toBe(0);
    expect(state.lastSyncAt).not.toBeNull();
  });

  it('does not sync when offline', async () => {
    const manager = createSyncManager();
    manager.start();
    manager.setOnline(false);

    manager.recordChange('create', 'docs', 'doc-1');
    const result = await manager.sync();
    expect(result.sent).toBe(0);
  });

  it('applies remote entries and updates version vector', () => {
    const manager = createSyncManager();
    manager.start();

    const remoteEntries = [
      {
        sequence: 1,
        operation: 'create' as const,
        collection: 'docs',
        key: 'doc-remote-1',
        timestamp: new Date(),
        nodeId: 'remote-node-1',
        version: 1,
      },
      {
        sequence: 2,
        operation: 'update' as const,
        collection: 'docs',
        key: 'doc-remote-1',
        timestamp: new Date(),
        nodeId: 'remote-node-1',
        version: 2,
      },
    ];

    const applied = manager.applyRemoteEntries(remoteEntries);
    expect(applied).toBe(2);

    const vector = manager.getVersionVector();
    expect(vector['remote-node-1']).toBe(2);
  });

  it('detects conflicts between concurrent version vectors', () => {
    const manager = createSyncManager();

    const localVector = { 'node-a': 2, 'node-b': 1 };
    const remoteVector = { 'node-a': 1, 'node-b': 2 };

    expect(manager.detectConflicts(localVector, remoteVector)).toBe(true);
  });

  it('detects no conflict when remote is strictly ahead', () => {
    const manager = createSyncManager();

    const localVector = { 'node-a': 1 };
    const remoteVector = { 'node-a': 2 };

    expect(manager.detectConflicts(localVector, remoteVector)).toBe(false);
  });

  it('returns replication log', () => {
    const manager = createSyncManager();
    manager.start();

    manager.recordChange('create', 'data', 'key-1');
    const log = manager.getReplicationLog();

    expect(log.entries).toHaveLength(1);
    expect(log.lastSequence).toBe(1);
    expect(log.nodeId).toBe(manager.getNodeId());
  });
});
