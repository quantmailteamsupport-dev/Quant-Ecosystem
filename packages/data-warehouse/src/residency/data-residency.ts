import type { DataResidency } from '../types.js';

interface ResidencyPolicy {
  region: string;
  allowedRegions: string[];
  enforced: boolean;
}

interface ComplianceReport {
  id: string;
  timestamp: number;
  totalRecords: number;
  compliant: number;
  violations: string[];
}

export class DataResidencyManager {
  private records = new Map<string, DataResidency>();
  private policies: ResidencyPolicy[] = [];

  track(id: string, region: string, shard: string, encrypted: boolean): DataResidency {
    const r: DataResidency = { recordId: id, region, shard, encrypted, movedAt: null };
    this.records.set(id, r);
    return r;
  }

  getResidency(id: string): DataResidency | null {
    return this.records.get(id) ?? null;
  }

  moveToRegion(id: string, region: string): boolean {
    const r = this.records.get(id);
    if (!r) return false;

    // Check policy enforcement
    const policy = this.policies.find((p) => p.region === r.region && p.enforced);
    if (policy && !policy.allowedRegions.includes(region)) {
      return false;
    }

    r.region = region;
    r.movedAt = Date.now();
    return true;
  }

  getByRegion(region: string): DataResidency[] {
    return [...this.records.values()].filter((r) => r.region === region);
  }

  getUnencrypted(): DataResidency[] {
    return [...this.records.values()].filter((r) => !r.encrypted);
  }

  encryptRecord(id: string): void {
    const r = this.records.get(id);
    if (r) r.encrypted = true;
  }

  addPolicy(region: string, allowedRegions: string[], enforced: boolean): void {
    this.policies.push({ region, allowedRegions, enforced });
  }

  getPolicies(): ResidencyPolicy[] {
    return [...this.policies];
  }

  checkCompliance(recordId: string): boolean {
    const r = this.records.get(recordId);
    if (!r) return false;
    const policy = this.policies.find((p) => p.region === r.region && p.enforced);
    if (!policy) return true;
    return policy.allowedRegions.includes(r.region);
  }

  generateComplianceReport(): ComplianceReport {
    const violations: string[] = [];
    let compliant = 0;
    const total = this.records.size;

    for (const [id, record] of this.records) {
      const policy = this.policies.find((p) => p.enforced && p.region === record.region);
      if (!policy || policy.allowedRegions.includes(record.region)) {
        compliant++;
      } else {
        violations.push(`Record ${id} in ${record.region} violates policy`);
      }
    }

    // Also flag unencrypted records
    for (const [id, record] of this.records) {
      if (!record.encrypted) {
        violations.push(`Record ${id} is not encrypted`);
      }
    }

    return {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      totalRecords: total,
      compliant,
      violations,
    };
  }

  getLocations(): Map<string, number> {
    const result = new Map<string, number>();
    for (const r of this.records.values()) {
      result.set(r.region, (result.get(r.region) ?? 0) + 1);
    }
    return result;
  }
}
