import type { PrivacyAuditEvent, PrivacyAuditEventType } from '../types.js';

export class PrivacyAudit {
  private events: PrivacyAuditEvent[] = [];
  private idCounter = 0;

  record(type: PrivacyAuditEventType, metadata?: Record<string, unknown>): void {
    const event: PrivacyAuditEvent = Object.freeze({
      id: `audit-${++this.idCounter}`,
      type,
      timestamp: Date.now(),
      metadata,
    });
    this.events.push(event);
  }

  query(filter: {
    type?: PrivacyAuditEventType;
    since?: number;
    until?: number;
  }): PrivacyAuditEvent[] {
    return this.events.filter((e) => {
      if (filter.type && e.type !== filter.type) return false;
      if (filter.since && e.timestamp < filter.since) return false;
      if (filter.until && e.timestamp > filter.until) return false;
      return true;
    });
  }

  getLastHour(): PrivacyAuditEvent[] {
    const oneHourAgo = Date.now() - 3600000;
    return this.events.filter((e) => e.timestamp >= oneHourAgo);
  }

  exportJSON(): string {
    return JSON.stringify(this.events);
  }

  clear(): void {
    // Record the clear event before wiping - maintains audit trail integrity
    const event: PrivacyAuditEvent = Object.freeze({
      id: `audit-${++this.idCounter}`,
      type: 'buffer_cleared' as PrivacyAuditEventType,
      timestamp: Date.now(),
      metadata: { reason: 'user_initiated', previousCount: this.events.length },
    });
    this.events = [event];
  }

  getCount(): number {
    return this.events.length;
  }
}
