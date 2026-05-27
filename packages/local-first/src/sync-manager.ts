import type {
  LocalFirstConfig,
  SyncState,
  ReplicationLog,
  ReplicationEntry,
  VersionVector,
} from './types.js';

export type MergeStrategy = 'three-way' | 'operational-transform' | 'crdt';

export interface SyncManagerConfig {
  localConfig: LocalFirstConfig;
  mergeStrategy: MergeStrategy;
  maxRetries: number;
  retryBackoffMs: number;
}

export class SyncManager {
  private config: SyncManagerConfig;
  private replicationLog: ReplicationLog;
  private syncState: SyncState;
  private syncInterval: ReturnType<typeof setInterval> | null;
  private nodeId: string;
  private versionVector: VersionVector;
  private running: boolean;

  constructor(config: SyncManagerConfig) {
    this.config = config;
    this.nodeId = `sync-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    this.replicationLog = { entries: [], lastSequence: 0, nodeId: this.nodeId };
    this.syncState = {
      status: 'idle',
      lastSyncAt: null,
      pendingChanges: 0,
      conflicts: [],
      version: 0,
      isOnline: true,
    };
    this.syncInterval = null;
    this.versionVector = {};
    this.running = false;
  }

  getConfig(): SyncManagerConfig {
    return { ...this.config };
  }

  getNodeId(): string {
    return this.nodeId;
  }

  getSyncState(): SyncState {
    return { ...this.syncState };
  }

  getReplicationLog(): ReplicationLog {
    return { ...this.replicationLog, entries: [...this.replicationLog.entries] };
  }

  getVersionVector(): VersionVector {
    return { ...this.versionVector };
  }

  isRunning(): boolean {
    return this.running;
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.syncState.status = 'idle';
  }

  stop(): void {
    if (!this.running) return;
    this.running = false;
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    this.syncState.status = 'idle';
  }

  setOnline(online: boolean): void {
    this.syncState.isOnline = online;
    if (!online) {
      this.syncState.status = 'offline';
    } else if (this.running) {
      this.syncState.status = 'idle';
    }
  }

  recordChange(
    operation: 'create' | 'update' | 'delete',
    collection: string,
    key: string,
  ): ReplicationEntry {
    const sequence = this.replicationLog.lastSequence + 1;
    this.replicationLog.lastSequence = sequence;

    const currentVersion = (this.versionVector[this.nodeId] ?? 0) + 1;
    this.versionVector[this.nodeId] = currentVersion;

    const entry: ReplicationEntry = {
      sequence,
      operation,
      collection,
      key,
      timestamp: new Date(),
      nodeId: this.nodeId,
      version: currentVersion,
    };

    this.replicationLog.entries.push(entry);
    this.syncState.pendingChanges++;
    return entry;
  }

  applyRemoteEntries(entries: ReplicationEntry[]): number {
    let applied = 0;

    for (const entry of entries) {
      const localVersion = this.versionVector[entry.nodeId] ?? 0;

      if (entry.version > localVersion) {
        this.versionVector[entry.nodeId] = entry.version;
        applied++;
      }
    }

    if (applied > 0) {
      this.syncState.version++;
      this.syncState.lastSyncAt = new Date();
    }

    return applied;
  }

  async sync(): Promise<{ sent: number; received: number }> {
    if (!this.syncState.isOnline || !this.running) {
      return { sent: 0, received: 0 };
    }

    this.syncState.status = 'syncing';

    const sent = this.syncState.pendingChanges;
    this.syncState.pendingChanges = 0;
    this.syncState.status = 'idle';
    this.syncState.lastSyncAt = new Date();
    this.syncState.version++;

    return { sent, received: 0 };
  }

  detectConflicts(localVector: VersionVector, remoteVector: VersionVector): boolean {
    let localAhead = false;
    let remoteAhead = false;
    const allNodes = new Set([...Object.keys(localVector), ...Object.keys(remoteVector)]);

    for (const nodeId of allNodes) {
      const lv = localVector[nodeId] ?? 0;
      const rv = remoteVector[nodeId] ?? 0;
      if (lv > rv) localAhead = true;
      if (rv > lv) remoteAhead = true;
    }

    return localAhead && remoteAhead;
  }

  getMergeStrategy(): MergeStrategy {
    return this.config.mergeStrategy;
  }
}

export function createSyncManager(config: Partial<SyncManagerConfig> = {}): SyncManager {
  const fullConfig: SyncManagerConfig = {
    localConfig: config.localConfig ?? {
      dbName: 'quant-local',
      version: 1,
      autoSync: true,
      syncIntervalMs: 5000,
      conflictStrategy: 'crdt-merge',
      maxOfflineQueueSize: 1000,
      enableCompression: false,
    },
    mergeStrategy: config.mergeStrategy ?? 'crdt',
    maxRetries: config.maxRetries ?? 3,
    retryBackoffMs: config.retryBackoffMs ?? 1000,
  };
  return new SyncManager(fullConfig);
}
