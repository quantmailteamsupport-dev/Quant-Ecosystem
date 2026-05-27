export type {
  LocalFirstConfig,
  ConflictStrategy,
  SyncStatus,
  SyncState,
  ConflictRecord,
  ConflictResolution,
  OfflineQueueItem,
  OfflineQueue,
  ReplicationLog,
  ReplicationEntry,
  VersionVector,
  CRDTValue,
} from './types.js';

export { OfflineStore, createOfflineStore } from './offline-store.js';

export { SyncManager, createSyncManager } from './sync-manager.js';
export type { SyncManagerConfig, MergeStrategy } from './sync-manager.js';
