import { describe, it, expect, beforeEach } from 'vitest';
import { ManagedDatabaseService } from '../services/managed-db.service';
import type { ProvisionDatabaseInput } from '../services/managed-db.service';

describe('ManagedDatabaseService', () => {
  let service: ManagedDatabaseService;

  const defaultInput: ProvisionDatabaseInput = {
    name: 'test-db',
    type: 'postgresql',
    region: 'us-east-1',
    config: {
      cpu: 2,
      memory: 4096,
      storage: 100,
      replicas: 1,
      highAvailability: false,
    },
  };

  beforeEach(() => {
    service = new ManagedDatabaseService();
  });

  describe('provisionDatabase', () => {
    it('creates a database with correct properties', () => {
      const db = service.provisionDatabase(defaultInput);

      expect(db.id).toBeDefined();
      expect(db.name).toBe('test-db');
      expect(db.type).toBe('postgresql');
      expect(db.version).toBe('16.0');
      expect(db.status).toBe('running');
      expect(db.region).toBe('us-east-1');
      expect(db.config.cpu).toBe(2);
      expect(db.config.memory).toBe(4096);
      expect(db.config.storage).toBe(100);
      expect(db.config.replicas).toBe(1);
      expect(db.endpoint).toContain('postgresql');
      expect(db.createdAt).toBeInstanceOf(Date);
    });

    it('provisions different database types', () => {
      const redis = service.provisionDatabase({ ...defaultInput, type: 'redis', name: 'cache' });
      const mongo = service.provisionDatabase({ ...defaultInput, type: 'mongodb', name: 'docs' });
      const vector = service.provisionDatabase({
        ...defaultInput,
        type: 'vector',
        name: 'embeddings',
      });

      expect(redis.type).toBe('redis');
      expect(redis.version).toBe('7.2');
      expect(mongo.type).toBe('mongodb');
      expect(mongo.version).toBe('7.0');
      expect(vector.type).toBe('vector');
      expect(vector.version).toBe('0.5');
    });

    it('generates unique ids', () => {
      const db1 = service.provisionDatabase(defaultInput);
      const db2 = service.provisionDatabase({ ...defaultInput, name: 'db-2' });

      expect(db1.id).not.toBe(db2.id);
    });
  });

  describe('deleteDatabase', () => {
    it('removes a database from the store', () => {
      const db = service.provisionDatabase(defaultInput);
      service.deleteDatabase(db.id);

      expect(() => service.deleteDatabase(db.id)).toThrow('Database not found');
    });

    it('throws if database does not exist', () => {
      expect(() => service.deleteDatabase('non-existent')).toThrow('Database not found');
    });
  });

  describe('scaleDatabase', () => {
    it('scales CPU and memory', () => {
      const db = service.provisionDatabase(defaultInput);

      const scaled = service.scaleDatabase(db.id, { cpu: 8, memory: 16384 });

      expect(scaled.config.cpu).toBe(8);
      expect(scaled.config.memory).toBe(16384);
      expect(scaled.config.storage).toBe(100);
    });

    it('scales storage up', () => {
      const db = service.provisionDatabase(defaultInput);

      const scaled = service.scaleDatabase(db.id, { storage: 500 });

      expect(scaled.config.storage).toBe(500);
    });

    it('throws if trying to shrink storage', () => {
      const db = service.provisionDatabase(defaultInput);

      expect(() => service.scaleDatabase(db.id, { storage: 50 })).toThrow('Cannot shrink storage');
    });

    it('throws if database is not running', () => {
      const db = service.provisionDatabase(defaultInput);
      service.deleteDatabase(db.id);

      expect(() => service.scaleDatabase(db.id, { cpu: 4 })).toThrow('Database not found');
    });

    it('scales replicas', () => {
      const db = service.provisionDatabase(defaultInput);

      const scaled = service.scaleDatabase(db.id, { replicas: 3 });

      expect(scaled.config.replicas).toBe(3);
    });
  });

  describe('createBackup', () => {
    it('creates a backup for a database', () => {
      const db = service.provisionDatabase(defaultInput);

      const backup = service.createBackup(db.id, 'daily-backup');

      expect(backup.id).toBeDefined();
      expect(backup.dbId).toBe(db.id);
      expect(backup.name).toBe('daily-backup');
      expect(backup.status).toBe('available');
      expect(backup.size).toBeGreaterThan(0);
      expect(backup.createdAt).toBeInstanceOf(Date);
    });

    it('throws if database does not exist', () => {
      expect(() => service.createBackup('non-existent', 'backup')).toThrow('Database not found');
    });
  });

  describe('restoreBackup', () => {
    it('restores a database from backup', () => {
      const db = service.provisionDatabase(defaultInput);
      const backup = service.createBackup(db.id, 'restore-test');

      const restored = service.restoreBackup(db.id, backup.id);

      expect(restored.id).toBe(db.id);
      expect(restored.updatedAt).toBeInstanceOf(Date);
    });

    it('throws if backup does not exist', () => {
      const db = service.provisionDatabase(defaultInput);

      expect(() => service.restoreBackup(db.id, 'non-existent')).toThrow('Backup not found');
    });

    it('throws if backup does not belong to the database', () => {
      const db1 = service.provisionDatabase(defaultInput);
      const db2 = service.provisionDatabase({ ...defaultInput, name: 'db-2' });
      const backup = service.createBackup(db1.id, 'backup-1');

      expect(() => service.restoreBackup(db2.id, backup.id)).toThrow(
        'Backup does not belong to this database',
      );
    });
  });

  describe('getConnectionString', () => {
    it('returns postgresql connection string', () => {
      const db = service.provisionDatabase(defaultInput);

      const connStr = service.getConnectionString(db.id);

      expect(connStr).toContain('postgresql://');
      expect(connStr).toContain(db.endpoint);
    });

    it('returns redis connection string', () => {
      const db = service.provisionDatabase({ ...defaultInput, type: 'redis', name: 'cache' });

      const connStr = service.getConnectionString(db.id);

      expect(connStr).toContain('redis://');
    });

    it('returns mongodb connection string', () => {
      const db = service.provisionDatabase({ ...defaultInput, type: 'mongodb', name: 'docs' });

      const connStr = service.getConnectionString(db.id);

      expect(connStr).toContain('mongodb://');
    });

    it('returns vector connection string', () => {
      const db = service.provisionDatabase({ ...defaultInput, type: 'vector', name: 'vec' });

      const connStr = service.getConnectionString(db.id);

      expect(connStr).toContain('http://');
    });
  });

  describe('getMetrics', () => {
    it('returns metrics for a database', () => {
      const db = service.provisionDatabase(defaultInput);

      const metrics = service.getMetrics(db.id);

      expect(metrics.dbId).toBe(db.id);
      expect(metrics.connections).toBeGreaterThanOrEqual(0);
      expect(metrics.queriesPerSecond).toBeGreaterThanOrEqual(0);
      expect(metrics.cpuUsage).toBeGreaterThanOrEqual(0);
      expect(metrics.memoryUsage).toBeGreaterThanOrEqual(0);
      expect(metrics.timestamp).toBeInstanceOf(Date);
    });

    it('throws if database does not exist', () => {
      expect(() => service.getMetrics('non-existent')).toThrow('Database not found');
    });
  });

  describe('listDatabases', () => {
    it('returns all databases', () => {
      service.provisionDatabase(defaultInput);
      service.provisionDatabase({ ...defaultInput, name: 'db-2', type: 'redis' });

      const databases = service.listDatabases();

      expect(databases).toHaveLength(2);
    });

    it('returns empty array when no databases', () => {
      const databases = service.listDatabases();

      expect(databases).toHaveLength(0);
    });
  });
});
