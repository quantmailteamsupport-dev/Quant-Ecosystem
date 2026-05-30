import type { StreamEvent, ProcessorHandler } from '../types.js';

export interface AnalyticsBucket {
  key: string;
  count: number;
  lastUpdated: number;
}

export interface AnalyticsProcessorOptions {
  bucketIntervalMs: number;
  onFlush?: (buckets: Map<string, AnalyticsBucket>) => Promise<void>;
}

export class AnalyticsProcessor {
  private readonly buckets: Map<string, AnalyticsBucket> = new Map();
  private readonly bucketIntervalMs: number;
  private readonly onFlush?: (buckets: Map<string, AnalyticsBucket>) => Promise<void>;

  constructor(options: AnalyticsProcessorOptions) {
    this.bucketIntervalMs = options.bucketIntervalMs;
    this.onFlush = options.onFlush;
  }

  get handler(): ProcessorHandler {
    return this.process.bind(this);
  }

  async process(events: StreamEvent[]): Promise<void> {
    for (const event of events) {
      switch (event.type) {
        case 'page_view':
        case 'click':
        case 'session_start':
        case 'session_end':
          this.aggregate(event);
          break;
        default:
          break;
      }
    }

    if (this.onFlush && this.shouldFlush()) {
      await this.onFlush(this.buckets);
    }
  }

  getBuckets(): Map<string, AnalyticsBucket> {
    return new Map(this.buckets);
  }

  reset(): void {
    this.buckets.clear();
  }

  private aggregate(event: StreamEvent): void {
    const bucketTime = Math.floor(event.timestamp / this.bucketIntervalMs) * this.bucketIntervalMs;
    const key = `${event.type}:${bucketTime}`;

    const existing = this.buckets.get(key);
    if (existing) {
      existing.count += 1;
      existing.lastUpdated = event.timestamp;
    } else {
      this.buckets.set(key, {
        key,
        count: 1,
        lastUpdated: event.timestamp,
      });
    }
  }

  private shouldFlush(): boolean {
    if (this.buckets.size === 0) return false;
    const now = Date.now();
    for (const bucket of this.buckets.values()) {
      if (now - bucket.lastUpdated > this.bucketIntervalMs) {
        return true;
      }
    }
    return false;
  }
}
