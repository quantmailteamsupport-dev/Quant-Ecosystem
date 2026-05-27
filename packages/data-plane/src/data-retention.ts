// ============================================================================
// Data Retention Policy
// ============================================================================

export interface RetentionRule {
  entityType: string;
  retentionDays: number;
  strategy: 'archive' | 'hard-delete' | 'soft-delete';
}

export interface RetentionEvaluation {
  toArchive: Array<{ id: string; entityType: string; createdAt: number }>;
  toDelete: Array<{ id: string; entityType: string; createdAt: number }>;
  retained: number;
}

export interface ArchiveBatch {
  batchId: string;
  records: Array<{ id: string; entityType: string; data: unknown }>;
  createdAt: number;
}

export class DataRetentionPolicy {
  private rules: Map<string, RetentionRule> = new Map();
  private nextBatchId = 1;

  constructor(rules: RetentionRule[] = []) {
    for (const rule of rules) {
      this.rules.set(rule.entityType, rule);
    }
  }

  evaluate(
    records: Array<{ id: string; entityType: string; createdAt: number }>,
  ): RetentionEvaluation {
    const toArchive: RetentionEvaluation['toArchive'] = [];
    const toDelete: RetentionEvaluation['toDelete'] = [];
    let retained = 0;
    const now = Date.now();

    for (const record of records) {
      const rule = this.rules.get(record.entityType);
      if (!rule) {
        retained++;
        continue;
      }

      const ageMs = now - record.createdAt;
      const retentionMs = rule.retentionDays * 24 * 60 * 60 * 1000;

      if (ageMs > retentionMs) {
        if (rule.strategy === 'archive') {
          toArchive.push(record);
        } else {
          toDelete.push(record);
        }
      } else {
        retained++;
      }
    }

    return { toArchive, toDelete, retained };
  }

  addRule(rule: RetentionRule): void {
    this.rules.set(rule.entityType, rule);
  }

  removeRule(entityType: string): boolean {
    return this.rules.delete(entityType);
  }

  getRules(): RetentionRule[] {
    return [...this.rules.values()];
  }

  createArchiveBatch(
    records: Array<{ id: string; entityType: string; data: unknown }>,
  ): ArchiveBatch {
    const batchId = `archive-batch-${this.nextBatchId++}`;
    return {
      batchId,
      records: [...records],
      createdAt: Date.now(),
    };
  }
}
