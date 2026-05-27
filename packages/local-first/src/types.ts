export interface LocalFirstConfig {
  dbName: string;
  version: number;
  syncUrl?: string;
  autoSync: boolean;
  syncIntervalMs: number;
  conflictStrategy: ConflictStrategy;
  maxOfflineQueueSize: number;
  enableCompression: boolean;
}

export type ConflictStrategy = 'last-write-wins' | 'crdt-merge' | 'manual' | 'server-wins';

export type SyncStatus = 'idle' | 'syncing' | 'error' | 'offline' | 'conflict';

export interface SyncState {
  status: SyncStatus;
  lastSyncAt: Date | null;
  pendingChanges: number;
  conflicts: ConflictRecord[];
  version: number;
  isOnline: boolean;
}

export interface ConflictRecord {
  id: string;
  key: string;
  localValue: unknown;
  remoteValue: unknown;
  timestamp: Date;
  resolved: boolean;
  resolution?: ConflictResolution;
}

export interface ConflictResolution {
  strategy: ConflictStrategy;
  resolvedValue: unknown;
  resolvedAt: Date;
  resolvedBy: 'auto' | 'user';
}

export interface OfflineQueueItem {
  id: string;
  operation: 'create' | 'update' | 'delete';
  collection: string;
  key: string;
  data: unknown;
  timestamp: Date;
  retryCount: number;
  maxRetries: number;
}

export interface OfflineQueue {
  items: OfflineQueueItem[];
  maxSize: number;
  processing: boolean;
}

export interface ReplicationLog {
  entries: ReplicationEntry[];
  lastSequence: number;
  nodeId: string;
}

export interface ReplicationEntry {
  sequence: number;
  operation: 'create' | 'update' | 'delete';
  collection: string;
  key: string;
  timestamp: Date;
  nodeId: string;
  version: number;
}

export interface VersionVector {
  [nodeId: string]: number;
}

export interface CRDTValue<T = unknown> {
  value: T;
  vector: VersionVector;
  timestamp: Date;
  nodeId: string;
}
