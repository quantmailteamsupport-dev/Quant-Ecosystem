import type { DataExport, ExportFormat, TimeSeriesPoint } from '../types.js';

interface ExportSchedule {
  id: string;
  format: ExportFormat;
  intervalMs: number;
  lastRun: number | null;
  appId: string | null;
}

export class DataExporter {
  private exports = new Map<string, DataExport>();
  private schedules: ExportSchedule[] = [];
  private progress = new Map<string, number>();

  exportApp(appId: string | null, format: ExportFormat): DataExport {
    const e: DataExport = {
      id: crypto.randomUUID(),
      format,
      appId,
      status: 'pending',
      createdAt: Date.now(),
      sizeBytes: null,
    };
    this.exports.set(e.id, e);
    this.progress.set(e.id, 0);
    return e;
  }

  exportAll(format: ExportFormat): DataExport {
    return this.exportApp(null, format);
  }

  getExport(id: string): DataExport | null {
    return this.exports.get(id) ?? null;
  }

  markReady(id: string, size: number): void {
    const e = this.exports.get(id);
    if (e) {
      e.status = 'ready';
      e.sizeBytes = size;
      this.progress.set(id, 100);
    }
  }

  getProgress(id: string): number {
    return this.progress.get(id) ?? 0;
  }

  setProgress(id: string, percent: number): void {
    this.progress.set(id, Math.min(100, Math.max(0, percent)));
  }

  exportToCsv(data: TimeSeriesPoint[]): string {
    const headers = 'timestamp,app,action,value';
    const rows = data.map((p) => {
      const ts = String(p.timestamp);
      const app = this.escapeCsv(p.app);
      const action = this.escapeCsv(p.action);
      return `${ts},${app},${action},${p.value}`;
    });
    return [headers, ...rows].join('\n');
  }

  exportToJson(data: TimeSeriesPoint[]): string {
    return JSON.stringify(data, null, 2);
  }

  exportToJsonStream(data: TimeSeriesPoint[], chunkSize: number): string[] {
    const chunks: string[] = [];
    for (let i = 0; i < data.length; i += chunkSize) {
      chunks.push(JSON.stringify(data.slice(i, i + chunkSize)));
    }
    return chunks;
  }

  scheduleExport(format: ExportFormat, intervalMs: number, appId?: string | null): string {
    const id = crypto.randomUUID();
    this.schedules.push({ id, format, intervalMs, lastRun: null, appId: appId ?? null });
    return id;
  }

  getSchedules(): ExportSchedule[] {
    return [...this.schedules];
  }

  getDueSchedules(): ExportSchedule[] {
    const now = Date.now();
    return this.schedules.filter((s) => s.lastRun === null || now - s.lastRun >= s.intervalMs);
  }

  markScheduleRun(id: string): void {
    const s = this.schedules.find((sc) => sc.id === id);
    if (s) s.lastRun = Date.now();
  }

  supportRTBF(appId?: string): void {
    for (const e of this.exports.values()) {
      if (!appId || e.appId === appId || e.appId === null) e.status = 'expired';
    }
  }

  private escapeCsv(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }
}
