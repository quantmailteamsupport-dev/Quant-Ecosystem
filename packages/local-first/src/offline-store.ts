import type {
  LocalFirstConfig,
  SyncState,
  OfflineQueue,
  OfflineQueueItem,
  CRDTValue,
  VersionVector,
  ConflictRecord,
  ConflictResolution,
} from './types.js';

export class OfflineStore {
  private config: LocalFirstConfig;
  private collections: Map<string, Map<string, CRDTValue>>;
  private queue: OfflineQueue;
  private syncState: SyncState;
  private nodeId: string;
  private versionVector: VersionVector;

  constructor(config: LocalFirstConfig) {
    this.config = config;
    this.nodeId = this.generateNodeId();
    this.collections = new Map();
    this.queue = { items: [], maxSize: config.maxOfflineQueueSize, processing: false };
    this.syncState = {
      status: 'idle',
      lastSyncAt: null,
      pendingChanges: 0,
      conflicts: [],
      version: 0,
      isOnline: true,
    };
    this.versionVector = {};
  }

  getConfig(): LocalFirstConfig {
    return { ...this.config };
  }

  getNodeId(): string {
    return this.nodeId;
  }

  getSyncState(): SyncState {
    return { ...this.syncState, conflicts: [...this.syncState.conflicts] };
  }

  getQueue(): OfflineQueue {
    return { ...this.queue, items: [...this.queue.items] };
  }

  getVersionVector(): VersionVector {
    return { ...this.versionVector };
  }

  setOnline(online: boolean): void {
    this.syncState.isOnline = online;
    this.syncState.status = online ? 'idle' : 'offline';
  }

  async put(collection: string, key: string, value: unknown): Promise<void> {
    if (!this.collections.has(collection)) {
      this.collections.set(collection, new Map());
    }

    const currentVersion = (this.versionVector[this.nodeId] ?? 0) + 1;
    this.versionVector[this.nodeId] = currentVersion;

    const crdtValue: CRDTValue = {
      value,
      vector: { ...this.versionVector },
      timestamp: new Date(),
      nodeId: this.nodeId,
    };

    this.collections.get(collection)!.set(key, crdtValue);

    const queueItem: OfflineQueueItem = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      operation: 'create',
      collection,
      key,
      data: value,
      timestamp: new Date(),
      retryCount: 0,
      maxRetries: 3,
    };

    this.enqueue(queueItem);
  }

  async get(collection: string, key: string): Promise<unknown | null> {
    const col = this.collections.get(collection);
    if (!col) return null;
    const entry = col.get(key);
    return entry ? entry.value : null;
  }

  async delete(collection: string, key: string): Promise<boolean> {
    const col = this.collections.get(collection);
    if (!col || !col.has(key)) return false;

    col.delete(key);

    const queueItem: OfflineQueueItem = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      operation: 'delete',
      collection,
      key,
      data: null,
      timestamp: new Date(),
      retryCount: 0,
      maxRetries: 3,
    };

    this.enqueue(queueItem);
    return true;
  }

  async getAll(collection: string): Promise<Map<string, unknown>> {
    const col = this.collections.get(collection);
    if (!col) return new Map();
    const result = new Map<string, unknown>();
    for (const [key, crdtVal] of col) {
      result.set(key, crdtVal.value);
    }
    return result;
  }

  mergeCRDT(collection: string, key: string, remote: CRDTValue): ConflictRecord | null {
    if (!this.collections.has(collection)) {
      this.collections.set(collection, new Map());
    }

    const col = this.collections.get(collection)!;
    const local = col.get(key);

    if (!local) {
      col.set(key, remote);
      return null;
    }

    if (this.isRemoteNewer(local.vector, remote.vector)) {
      col.set(key, remote);
      return null;
    }

    if (this.isConcurrent(local.vector, remote.vector)) {
      if (this.config.conflictStrategy === 'last-write-wins') {
        const winner = remote.timestamp.getTime() >= local.timestamp.getTime() ? remote : local;
        col.set(key, winner);
        return null;
      }

      if (this.config.conflictStrategy === 'server-wins') {
        col.set(key, remote);
        return null;
      }

      const conflict: ConflictRecord = {
        id: `conflict-${Date.now()}`,
        key,
        localValue: local.value,
        remoteValue: remote.value,
        timestamp: new Date(),
        resolved: false,
      };
      this.syncState.conflicts.push(conflict);
      this.syncState.status = 'conflict';
      return conflict;
    }

    return null;
  }

  resolveConflict(conflictId: string, resolution: ConflictResolution): boolean {
    const conflict = this.syncState.conflicts.find((c) => c.id === conflictId);
    if (!conflict) return false;

    conflict.resolved = true;
    conflict.resolution = resolution;

    const unresolvedCount = this.syncState.conflicts.filter((c) => !c.resolved).length;
    if (unresolvedCount === 0) {
      this.syncState.status = this.syncState.isOnline ? 'idle' : 'offline';
    }

    return true;
  }

  private enqueue(item: OfflineQueueItem): void {
    if (this.queue.items.length >= this.queue.maxSize) {
      this.queue.items.shift();
    }
    this.queue.items.push(item);
    this.syncState.pendingChanges = this.queue.items.length;
  }

  async processQueue(): Promise<number> {
    if (this.queue.processing || !this.syncState.isOnline) return 0;

    this.queue.processing = true;
    this.syncState.status = 'syncing';

    let processed = 0;
    const remaining: OfflineQueueItem[] = [];

    for (const item of this.queue.items) {
      if (this.syncState.isOnline) {
        processed++;
      } else {
        remaining.push(item);
      }
    }

    this.queue.items = remaining;
    this.queue.processing = false;
    this.syncState.pendingChanges = remaining.length;
    this.syncState.status = this.syncState.isOnline ? 'idle' : 'offline';
    this.syncState.lastSyncAt = new Date();
    this.syncState.version++;

    return processed;
  }

  private isRemoteNewer(local: VersionVector, remote: VersionVector): boolean {
    let remoteHasGreater = false;
    const allNodes = new Set([...Object.keys(local), ...Object.keys(remote)]);
    for (const nodeId of allNodes) {
      const rv = remote[nodeId] ?? 0;
      const lv = local[nodeId] ?? 0;
      if (rv > lv) remoteHasGreater = true;
      if (lv > rv) return false;
    }
    return remoteHasGreater;
  }

  private isConcurrent(local: VersionVector, remote: VersionVector): boolean {
    let localHasGreater = false;
    let remoteHasGreater = false;
    const allNodes = new Set([...Object.keys(local), ...Object.keys(remote)]);
    for (const nodeId of allNodes) {
      const lv = local[nodeId] ?? 0;
      const rv = remote[nodeId] ?? 0;
      if (lv > rv) localHasGreater = true;
      if (rv > lv) remoteHasGreater = true;
    }
    return localHasGreater && remoteHasGreater;
  }

  private generateNodeId(): string {
    return `node-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }
}

export function createOfflineStore(config: Partial<LocalFirstConfig> = {}): OfflineStore {
  const fullConfig: LocalFirstConfig = {
    dbName: config.dbName ?? 'quant-local',
    version: config.version ?? 1,
    syncUrl: config.syncUrl,
    autoSync: config.autoSync ?? true,
    syncIntervalMs: config.syncIntervalMs ?? 5000,
    conflictStrategy: config.conflictStrategy ?? 'crdt-merge',
    maxOfflineQueueSize: config.maxOfflineQueueSize ?? 1000,
    enableCompression: config.enableCompression ?? false,
  };
  return new OfflineStore(fullConfig);
}
