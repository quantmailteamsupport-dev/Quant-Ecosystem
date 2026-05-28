import type { AuditEntry } from './types.js';
import { AuditEntrySchema } from './types.js';

const DEFAULT_MAX_ENTRIES = 10000;

export class ToolAuditTrail {
  private entries: AuditEntry[] = [];
  private maxEntries: number;

  constructor(maxEntries?: number) {
    this.maxEntries = maxEntries ?? DEFAULT_MAX_ENTRIES;
  }

  log(entry: AuditEntry): void {
    const parsed = AuditEntrySchema.parse(entry);
    this.entries.push(parsed as AuditEntry);
    if (this.entries.length > this.maxEntries) {
      this.entries.splice(0, this.entries.length - this.maxEntries);
    }
  }

  getByTool(toolId: string): AuditEntry[] {
    return this.entries.filter((e) => e.toolId === toolId);
  }

  getByUser(userId: string): AuditEntry[] {
    return this.entries.filter((e) => e.userId === userId);
  }

  getRecent(limit: number): AuditEntry[] {
    return this.entries
      .slice()
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  getAll(): AuditEntry[] {
    return [...this.entries];
  }
}
