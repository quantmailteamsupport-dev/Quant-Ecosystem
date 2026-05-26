import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { createAppError } from '@quant/server-core';

export type DatabaseType = 'postgresql' | 'redis' | 'mongodb' | 'vector';

export interface ManagedDB {
  id: string;
  name: string;
  type: DatabaseType;
  version: string;
  status: 'provisioning' | 'running' | 'stopped' | 'maintenance' | 'terminated';
  region: string;
  config: DBConfig;
  endpoint: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DBConfig {
  cpu: number;
  memory: number;
  storage: number;
  replicas: number;
  highAvailability: boolean;
}

export interface Backup {
  id: string;
  dbId: string;
  name: string;
  size: number;
  status: 'creating' | 'available' | 'restoring' | 'error';
  createdAt: Date;
}

export interface DBMetrics {
  dbId: string;
  connections: number;
  queriesPerSecond: number;
  cpuUsage: number;
  memoryUsage: number;
  storageUsed: number;
  replicationLag: number;
  timestamp: Date;
}

export const ProvisionDatabaseSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(['postgresql', 'redis', 'mongodb', 'vector']),
  region: z.string().min(1),
  version: z.string().optional(),
  config: z
    .object({
      cpu: z.number().int().min(1).max(64).optional().default(2),
      memory: z.number().int().min(1024).max(262144).optional().default(4096),
      storage: z.number().int().min(10).max(10000).optional().default(100),
      replicas: z.number().int().min(0).max(5).optional().default(0),
      highAvailability: z.boolean().optional().default(false),
    })
    .optional()
    .default({}),
});

export type ProvisionDatabaseInput = z.infer<typeof ProvisionDatabaseSchema>;

export const ScaleDatabaseSchema = z.object({
  cpu: z.number().int().min(1).max(64).optional(),
  memory: z.number().int().min(1024).max(262144).optional(),
  storage: z.number().int().min(10).max(10000).optional(),
  replicas: z.number().int().min(0).max(5).optional(),
});

export type ScaleDatabaseInput = z.infer<typeof ScaleDatabaseSchema>;

const DEFAULT_VERSIONS: Record<DatabaseType, string> = {
  postgresql: '16.0',
  redis: '7.2',
  mongodb: '7.0',
  vector: '0.5',
};

export class ManagedDatabaseService {
  private readonly databases = new Map<string, ManagedDB>();
  private readonly backups = new Map<string, Backup>();

  provisionDatabase(input: ProvisionDatabaseInput): ManagedDB {
    const parsed = ProvisionDatabaseSchema.parse(input);

    const db: ManagedDB = {
      id: randomUUID(),
      name: parsed.name,
      type: parsed.type,
      version: parsed.version ?? DEFAULT_VERSIONS[parsed.type],
      status: 'running',
      region: parsed.region,
      config: {
        cpu: parsed.config.cpu,
        memory: parsed.config.memory,
        storage: parsed.config.storage,
        replicas: parsed.config.replicas,
        highAvailability: parsed.config.highAvailability,
      },
      endpoint: `${parsed.type}-${randomUUID().slice(0, 8)}.db.quantcloud.io`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.databases.set(db.id, db);
    return db;
  }

  deleteDatabase(dbId: string): void {
    const db = this.getDatabase(dbId);
    db.status = 'terminated';
    db.updatedAt = new Date();
    this.databases.delete(dbId);
  }

  scaleDatabase(dbId: string, newConfig: ScaleDatabaseInput): ManagedDB {
    const db = this.getDatabase(dbId);
    const parsed = ScaleDatabaseSchema.parse(newConfig);

    if (db.status !== 'running') {
      throw createAppError('Database must be running to scale', 400, 'DB_NOT_RUNNING');
    }

    if (parsed.cpu !== undefined) {
      db.config.cpu = parsed.cpu;
    }
    if (parsed.memory !== undefined) {
      db.config.memory = parsed.memory;
    }
    if (parsed.storage !== undefined) {
      if (parsed.storage < db.config.storage) {
        throw createAppError('Cannot shrink storage', 400, 'CANNOT_SHRINK_STORAGE');
      }
      db.config.storage = parsed.storage;
    }
    if (parsed.replicas !== undefined) {
      db.config.replicas = parsed.replicas;
    }

    db.updatedAt = new Date();
    return db;
  }

  createBackup(dbId: string, name: string): Backup {
    this.getDatabase(dbId);

    const backup: Backup = {
      id: randomUUID(),
      dbId,
      name,
      size: Math.floor(Math.random() * 5000) + 100,
      status: 'available',
      createdAt: new Date(),
    };

    this.backups.set(backup.id, backup);
    return backup;
  }

  restoreBackup(dbId: string, backupId: string): ManagedDB {
    const db = this.getDatabase(dbId);
    const backup = this.backups.get(backupId);

    if (!backup) {
      throw createAppError('Backup not found', 404, 'BACKUP_NOT_FOUND');
    }

    if (backup.dbId !== dbId) {
      throw createAppError('Backup does not belong to this database', 400, 'BACKUP_MISMATCH');
    }

    db.updatedAt = new Date();
    return db;
  }

  getConnectionString(dbId: string): string {
    const db = this.getDatabase(dbId);

    switch (db.type) {
      case 'postgresql':
        return `postgresql://admin:****@${db.endpoint}:5432/${db.name}`;
      case 'redis':
        return `redis://admin:****@${db.endpoint}:6379`;
      case 'mongodb':
        return `mongodb://admin:****@${db.endpoint}:27017/${db.name}`;
      case 'vector':
        return `http://${db.endpoint}:8080`;
      default:
        return `${db.type}://${db.endpoint}`;
    }
  }

  getMetrics(dbId: string): DBMetrics {
    this.getDatabase(dbId);

    return {
      dbId,
      connections: Math.floor(Math.random() * 100),
      queriesPerSecond: Math.floor(Math.random() * 5000),
      cpuUsage: Math.random() * 100,
      memoryUsage: Math.random() * 100,
      storageUsed: Math.floor(Math.random() * 10000),
      replicationLag: Math.random() * 100,
      timestamp: new Date(),
    };
  }

  listDatabases(): ManagedDB[] {
    return Array.from(this.databases.values());
  }

  private getDatabase(dbId: string): ManagedDB {
    const db = this.databases.get(dbId);
    if (!db) {
      throw createAppError('Database not found', 404, 'DB_NOT_FOUND');
    }
    return db;
  }
}
