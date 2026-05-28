import type { DataInspectorResult, DataLocation } from '../types.js';

interface DataRecord {
  id: string;
  userId: string;
  region: string;
  shard: string;
  sizeBytes: number;
  encrypted: boolean;
  retentionDays: number;
  createdAt: number;
  service: string;
}

export class DataInspector {
  private records: DataRecord[] = [];

  addRecord(record: DataRecord): void {
    this.records.push(record);
  }

  addRecords(records: DataRecord[]): void {
    this.records.push(...records);
  }

  inspect(userId: string): DataInspectorResult {
    const userRecords = this.records.filter((r) => r.userId === userId);
    if (userRecords.length === 0) {
      return { userId, locations: [], totalSize: 0, oldestRecord: 0, newestRecord: 0 };
    }

    const locationMap = new Map<string, DataLocation>();
    let totalSize = 0;
    let oldest = Infinity;
    let newest = 0;

    for (const r of userRecords) {
      const key = `${r.region}:${r.shard}`;
      const loc = locationMap.get(key);
      if (loc) {
        loc.recordCount++;
        loc.sizeBytes += r.sizeBytes;
        if (!r.encrypted) loc.encrypted = false;
      } else {
        locationMap.set(key, {
          region: r.region,
          shard: r.shard,
          recordCount: 1,
          sizeBytes: r.sizeBytes,
          encrypted: r.encrypted,
          retentionDays: r.retentionDays,
        });
      }
      totalSize += r.sizeBytes;
      if (r.createdAt < oldest) oldest = r.createdAt;
      if (r.createdAt > newest) newest = r.createdAt;
    }

    return {
      userId,
      locations: [...locationMap.values()],
      totalSize,
      oldestRecord: oldest,
      newestRecord: newest,
    };
  }

  getDataFlowMap(userId: string): Map<string, string[]> {
    const userRecords = this.records.filter((r) => r.userId === userId);
    const serviceRegions = new Map<string, Set<string>>();
    for (const r of userRecords) {
      if (!serviceRegions.has(r.service)) serviceRegions.set(r.service, new Set());
      serviceRegions.get(r.service)!.add(r.region);
    }
    const result = new Map<string, string[]>();
    for (const [service, regions] of serviceRegions) {
      result.set(service, [...regions]);
    }
    return result;
  }

  getServicesCopy(userId: string): string[] {
    const services = new Set<string>();
    for (const r of this.records) {
      if (r.userId === userId) services.add(r.service);
    }
    return [...services];
  }

  getTotalSizeByRegion(): Map<string, number> {
    const result = new Map<string, number>();
    for (const r of this.records) {
      result.set(r.region, (result.get(r.region) ?? 0) + r.sizeBytes);
    }
    return result;
  }

  getEncryptionStatus(): { encrypted: number; unencrypted: number } {
    let encrypted = 0;
    let unencrypted = 0;
    for (const r of this.records) {
      if (r.encrypted) encrypted++;
      else unencrypted++;
    }
    return { encrypted, unencrypted };
  }
}
