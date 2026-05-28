import type { AuditEntry } from './types.js';
import { AuditEntrySchema } from './types.js';

export class ToolAuditTrail {
  private entries: AuditEntry[] = [];

  log(entry: AuditEntry): void {
    const parsed = AuditEntrySchema.parse(entry);
    this.entries.push(parsed as AuditEntry);
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
