// ============================================================================
// Admin & Operations Package - Migration Runner
// ============================================================================

import type {
  Migration,
  MigrationDirection,
  MigrationStatus,
  MigrationFile,
  BatchResult,
} from '../types';

/** Migration lock state */
interface MigrationLock {
  lockedBy: string;
  lockedAt: number;
  expiresAt: number;
}

/** Dry run result */
interface DryRunResult {
  migrations: MigrationFile[];
  operations: string[];
  estimatedDuration: number;
  warnings: string[];
}

/**
 * MigrationRunner - Database migration management
 * Supports timestamped migration files, up/down execution, status tracking,
 * dry-run preview, batch execution with rollback on failure, locking, and
 * destructive operation validation.
 */
export class MigrationRunner {
  private migrations: Map<string, Migration> = new Map();
  private migrationFiles: MigrationFile[] = [];
  private lock: MigrationLock | null = null;
  private batch: number = 0;

  /**
   * Create a migration file with timestamp prefix
   * Format: 20240115_001_add_users_table
   */
  public createMigration(name: string, upOperations: string[], downOperations: string[]): MigrationFile {
    const now = new Date();
    const timestamp = now.toISOString().replace(/[-T:]/g, '').substr(0, 8);
    const sequence = this.migrationFiles.filter(m => m.timestamp === timestamp).length + 1;
    const paddedSequence = String(sequence).padStart(3, '0');
    const sanitizedName = name.replace(/[^a-z0-9_]/gi, '_').toLowerCase();
    const filename = `${timestamp}_${paddedSequence}_${sanitizedName}`;

    const migrationFile: MigrationFile = {
      filename,
      timestamp,
      sequence,
      name: sanitizedName,
      upOperations,
      downOperations,
    };

    this.migrationFiles.push(migrationFile);
    this.migrationFiles.sort((a, b) => a.filename.localeCompare(b.filename));

    // Register as pending migration
    const migration: Migration = {
      id: filename,
      name: sanitizedName,
      filename,
      direction: 'up',
      status: 'pending',
      checksum: this.calculateChecksum(upOperations.join(';') + downOperations.join(';')),
      batch: 0,
    };
    this.migrations.set(filename, migration);

    return migrationFile;
  }

  /**
   * Execute pending migrations in order
   */
  public up(count?: number): Migration[] {
    this.ensureNotLocked();

    const pending = this.getPendingMigrations();
    const toRun = count ? pending.slice(0, count) : pending;

    if (toRun.length === 0) return [];

    this.batch++;
    const executed: Migration[] = [];

    for (const migration of toRun) {
      const record = this.migrations.get(migration.filename);
      if (!record) continue;

      try {
        // Execute up operations
        this.executeMigrationOperations(migration.upOperations);

        record.status = 'applied';
        record.executedAt = Date.now();
        record.batch = this.batch;
        record.direction = 'up';
        record.duration = Math.random() * 1000 + 100; // Simulated duration
        this.migrations.set(migration.filename, record);
        executed.push(record);
      } catch (error) {
        record.status = 'failed';
        this.migrations.set(migration.filename, record);
        throw new Error(`Migration '${migration.filename}' failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return executed;
  }

  /**
   * Rollback last N migrations
   */
  public down(count: number = 1): Migration[] {
    this.ensureNotLocked();

    const applied = this.getAppliedMigrations();
    const toRollback = applied.slice(-count).reverse();

    if (toRollback.length === 0) return [];

    const rolledBack: Migration[] = [];

    for (const migration of toRollback) {
      const file = this.migrationFiles.find(f => f.filename === migration.filename);
      if (!file) continue;

      try {
        // Execute down operations
        this.executeMigrationOperations(file.downOperations);

        migration.status = 'rolled_back';
        migration.direction = 'down';
        this.migrations.set(migration.filename, migration);
        rolledBack.push(migration);
      } catch (error) {
        migration.status = 'failed';
        this.migrations.set(migration.filename, migration);
        throw new Error(`Rollback of '${migration.filename}' failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return rolledBack;
  }

  /**
   * Get migration status - all migrations with applied/pending status
   */
  public getStatus(): Array<{ filename: string; status: MigrationStatus; executedAt?: number; batch: number }> {
    return this.migrationFiles.map(file => {
      const record = this.migrations.get(file.filename);
      return {
        filename: file.filename,
        status: record?.status || 'pending',
        executedAt: record?.executedAt,
        batch: record?.batch || 0,
      };
    });
  }

  /**
   * Dry run - show operations that would execute without applying
   */
  public dryRun(direction: MigrationDirection = 'up', count?: number): DryRunResult {
    const warnings: string[] = [];
    let migrations: MigrationFile[];

    if (direction === 'up') {
      const pending = this.getPendingMigrations();
      migrations = count ? pending.slice(0, count) : pending;
    } else {
      const applied = this.getAppliedMigrations();
      const toRollback = applied.slice(-(count || 1));
      migrations = toRollback.map(m => {
        const file = this.migrationFiles.find(f => f.filename === m.filename);
        return file!;
      }).filter(Boolean);
    }

    const operations: string[] = [];
    for (const migration of migrations) {
      const ops = direction === 'up' ? migration.upOperations : migration.downOperations;
      operations.push(`-- Migration: ${migration.filename}`);
      operations.push(...ops);

      // Check for destructive operations
      for (const op of ops) {
        if (this.isDestructive(op)) {
          warnings.push(`DESTRUCTIVE: ${migration.filename} contains '${op}'`);
        }
      }
    }

    return {
      migrations,
      operations,
      estimatedDuration: migrations.length * 500,
      warnings,
    };
  }

  /**
   * Run up to N migrations in one transaction, rollback all on failure
   */
  public batchMigrate(count: number): BatchResult {
    this.ensureNotLocked();

    const pending = this.getPendingMigrations();
    const toRun = pending.slice(0, count);
    const startTime = Date.now();

    if (toRun.length === 0) {
      return { successful: [], rolledBack: false, duration: 0 };
    }

    this.batch++;
    const successful: Migration[] = [];

    for (const migration of toRun) {
      const record = this.migrations.get(migration.filename);
      if (!record) continue;

      try {
        this.executeMigrationOperations(migration.upOperations);

        record.status = 'applied';
        record.executedAt = Date.now();
        record.batch = this.batch;
        record.direction = 'up';
        record.duration = Date.now() - startTime;
        this.migrations.set(migration.filename, record);
        successful.push(record);
      } catch (error) {
        // Rollback all successful migrations in this batch
        for (const applied of successful.reverse()) {
          const file = this.migrationFiles.find(f => f.filename === applied.filename);
          if (file) {
            this.executeMigrationOperations(file.downOperations);
            applied.status = 'rolled_back';
            this.migrations.set(applied.filename, applied);
          }
        }

        record.status = 'failed';
        this.migrations.set(migration.filename, record);

        return {
          successful: [],
          failed: record,
          error: error instanceof Error ? error.message : 'Unknown error',
          rolledBack: true,
          duration: Date.now() - startTime,
        };
      }
    }

    return {
      successful,
      rolledBack: false,
      duration: Date.now() - startTime,
    };
  }

  /**
   * Lock migrations to prevent concurrent execution
   */
  public lockMigrations(lockedBy: string, durationMs: number = 300000): boolean {
    if (this.lock && this.lock.expiresAt > Date.now()) {
      return false; // Already locked
    }

    this.lock = {
      lockedBy,
      lockedAt: Date.now(),
      expiresAt: Date.now() + durationMs,
    };

    return true;
  }

  /**
   * Unlock migrations
   */
  public unlockMigrations(unlockedBy: string): boolean {
    if (!this.lock) return true;

    if (this.lock.lockedBy !== unlockedBy && this.lock.expiresAt > Date.now()) {
      throw new Error(`Migrations locked by '${this.lock.lockedBy}', cannot unlock`);
    }

    this.lock = null;
    return true;
  }

  /**
   * Validate migration for destructive operations
   */
  public validateMigration(filename: string): { valid: boolean; warnings: string[]; destructive: boolean } {
    const file = this.migrationFiles.find(f => f.filename === filename);
    if (!file) {
      return { valid: false, warnings: ['Migration file not found'], destructive: false };
    }

    const warnings: string[] = [];
    let destructive = false;

    for (const op of file.upOperations) {
      if (this.isDestructive(op)) {
        destructive = true;
        warnings.push(`Destructive operation detected: ${op}`);
      }
    }

    if (file.downOperations.length === 0) {
      warnings.push('No down operations defined - migration cannot be rolled back');
    }

    return { valid: true, warnings, destructive };
  }

  /**
   * Get pending (not yet applied) migrations
   */
  private getPendingMigrations(): MigrationFile[] {
    return this.migrationFiles.filter(file => {
      const record = this.migrations.get(file.filename);
      return !record || record.status === 'pending' || record.status === 'rolled_back';
    });
  }

  /**
   * Get applied migrations sorted by execution order
   */
  private getAppliedMigrations(): Migration[] {
    return Array.from(this.migrations.values())
      .filter(m => m.status === 'applied')
      .sort((a, b) => (a.executedAt || 0) - (b.executedAt || 0));
  }

  /**
   * Check if locked
   */
  private ensureNotLocked(): void {
    if (this.lock && this.lock.expiresAt > Date.now()) {
      throw new Error(`Migrations are locked by '${this.lock.lockedBy}' until ${new Date(this.lock.expiresAt).toISOString()}`);
    }
    // Auto-expire stale locks
    if (this.lock && this.lock.expiresAt <= Date.now()) {
      this.lock = null;
    }
  }

  /**
   * Check if operation is destructive
   */
  private isDestructive(operation: string): boolean {
    const destructivePatterns = [
      'DROP TABLE', 'DROP COLUMN', 'DROP INDEX', 'DROP DATABASE',
      'TRUNCATE', 'DELETE FROM', 'ALTER TABLE.*DROP',
    ];
    const upperOp = operation.toUpperCase();
    return destructivePatterns.some(pattern => new RegExp(pattern).test(upperOp));
  }

  /**
   * Execute migration operations (simulated)
   */
  private executeMigrationOperations(operations: string[]): void {
    for (const op of operations) {
      // Simulated execution - in production would connect to DB
      if (op.includes('FAIL_TEST')) {
        throw new Error(`Simulated failure: ${op}`);
      }
    }
  }

  /**
   * Calculate checksum for tamper detection
   */
  private calculateChecksum(content: string): string {
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16).padStart(8, '0');
  }
}
