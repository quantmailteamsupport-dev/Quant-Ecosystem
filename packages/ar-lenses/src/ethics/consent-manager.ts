import type { ConsentRecord } from '../types.js';

export class ConsentManager {
  private records: ConsentRecord[] = [];

  grant(userId: string, faceId: string, purpose: string): ConsentRecord {
    const record: ConsentRecord = {
      id: `consent_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
      userId,
      faceId,
      granted: true,
      timestamp: Date.now(),
      purpose,
      revoked: false,
    };
    this.records.push(record);
    return record;
  }

  revoke(consentId: string): boolean {
    const record = this.records.find((r) => r.id === consentId);
    if (!record || record.revoked) return false;

    record.revoked = true;
    record.revokedAt = Date.now();
    return true;
  }

  hasConsent(userId: string, faceId: string, purpose: string): boolean {
    return this.records.some(
      (r) =>
        r.userId === userId &&
        r.faceId === faceId &&
        r.purpose === purpose &&
        r.granted &&
        !r.revoked,
    );
  }

  getAuditTrail(userId?: string): ConsentRecord[] {
    if (userId) {
      return this.records.filter((r) => r.userId === userId);
    }
    return [...this.records];
  }

  getActiveConsents(userId: string): ConsentRecord[] {
    return this.records.filter((r) => r.userId === userId && r.granted && !r.revoked);
  }

  revokeAll(userId: string): number {
    let count = 0;
    for (const record of this.records) {
      if (record.userId === userId && !record.revoked) {
        record.revoked = true;
        record.revokedAt = Date.now();
        count++;
      }
    }
    return count;
  }
}
