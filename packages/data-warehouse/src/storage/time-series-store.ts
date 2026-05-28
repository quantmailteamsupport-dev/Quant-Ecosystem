import type { TimeSeriesPoint } from '../types.js';

export class TimeSeriesStore {
  private points: TimeSeriesPoint[] = [];

  append(point: TimeSeriesPoint): void {
    this.points.push(point);
  }

  appendBatch(points: TimeSeriesPoint[]): void {
    this.points.push(...points);
  }

  queryByTimeRange(start: number, end: number): TimeSeriesPoint[] {
    return this.points.filter((p) => p.timestamp >= start && p.timestamp <= end);
  }

  queryByApp(app: string): TimeSeriesPoint[] {
    return this.points.filter((p) => p.app === app);
  }

  queryByAction(action: string): TimeSeriesPoint[] {
    return this.points.filter((p) => p.action === action);
  }

  query(opts: { app?: string; action?: string; start?: number; end?: number }): TimeSeriesPoint[] {
    let result = [...this.points];
    if (opts.app) result = result.filter((p) => p.app === opts.app);
    if (opts.action) result = result.filter((p) => p.action === opts.action);
    if (opts.start !== undefined) result = result.filter((p) => p.timestamp >= opts.start!);
    if (opts.end !== undefined) result = result.filter((p) => p.timestamp <= opts.end!);
    return result;
  }

  count(opts?: { app?: string; action?: string }): number {
    if (!opts) return this.points.length;
    return this.query(opts).length;
  }

  sum(opts?: { app?: string; action?: string }): number {
    const data = opts ? this.query(opts) : this.points;
    return data.reduce((acc, p) => acc + p.value, 0);
  }

  avg(opts?: { app?: string; action?: string }): number {
    const data = opts ? this.query(opts) : this.points;
    if (data.length === 0) return 0;
    return data.reduce((acc, p) => acc + p.value, 0) / data.length;
  }

  countPerDay(opts?: { app?: string; action?: string }): Map<string, number> {
    const data = opts ? this.query(opts) : this.points;
    const result = new Map<string, number>();
    for (const p of data) {
      const day = new Date(p.timestamp).toISOString().split('T')[0]!;
      result.set(day, (result.get(day) ?? 0) + 1);
    }
    return result;
  }

  sumPerWeek(opts?: { app?: string; action?: string }): Map<number, number> {
    const data = opts ? this.query(opts) : this.points;
    const result = new Map<number, number>();
    for (const p of data) {
      const weekStart = p.timestamp - (p.timestamp % (7 * 86400000));
      result.set(weekStart, (result.get(weekStart) ?? 0) + p.value);
    }
    return result;
  }

  downsample(intervalMs: number, opts?: { app?: string; action?: string }): TimeSeriesPoint[] {
    const data = opts ? this.query(opts) : [...this.points];
    if (data.length === 0) return [];
    data.sort((a, b) => a.timestamp - b.timestamp);

    const result: TimeSeriesPoint[] = [];
    let bucketStart = data[0]!.timestamp;
    let bucketPoints: TimeSeriesPoint[] = [];

    for (const p of data) {
      if (p.timestamp - bucketStart >= intervalMs) {
        if (bucketPoints.length > 0) {
          const avg = bucketPoints.reduce((acc, bp) => acc + bp.value, 0) / bucketPoints.length;
          result.push({
            timestamp: bucketStart,
            app: bucketPoints[0]!.app,
            action: bucketPoints[0]!.action,
            value: avg,
          });
        }
        bucketStart = p.timestamp;
        bucketPoints = [p];
      } else {
        bucketPoints.push(p);
      }
    }

    if (bucketPoints.length > 0) {
      const avg = bucketPoints.reduce((acc, bp) => acc + bp.value, 0) / bucketPoints.length;
      result.push({
        timestamp: bucketStart,
        app: bucketPoints[0]!.app,
        action: bucketPoints[0]!.action,
        value: avg,
      });
    }

    return result;
  }

  getAll(): TimeSeriesPoint[] {
    return [...this.points];
  }

  clear(): void {
    this.points = [];
  }
}
