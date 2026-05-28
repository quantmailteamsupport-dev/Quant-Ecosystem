import type { LatencyMetrics, PipelineStage } from '../types.js';

const DEFAULT_WINDOW_SIZE = 100;

export class LatencyTracker {
  private measurements: Map<PipelineStage, number[]> = new Map();
  private pending: Map<string, number> = new Map();
  private windowSize: number;

  constructor(windowSize = DEFAULT_WINDOW_SIZE) {
    this.windowSize = windowSize;
  }

  startMeasure(stage: PipelineStage, id: string): void {
    this.pending.set(`${stage}:${id}`, performance.now());
  }

  endMeasure(stage: PipelineStage, id: string): number {
    const key = `${stage}:${id}`;
    const start = this.pending.get(key);
    if (start === undefined) {
      throw new Error(`No pending measurement for ${key}`);
    }
    this.pending.delete(key);
    const duration = performance.now() - start;

    let values = this.measurements.get(stage);
    if (!values) {
      values = [];
      this.measurements.set(stage, values);
    }
    values.push(duration);

    // Sliding window
    if (values.length > this.windowSize) {
      values.shift();
    }

    return duration;
  }

  getMetrics(stage: PipelineStage): LatencyMetrics | undefined {
    const values = this.measurements.get(stage);
    if (!values || values.length === 0) {
      return undefined;
    }
    return this.computeMetrics(stage, values);
  }

  getAllMetrics(): LatencyMetrics[] {
    const results: LatencyMetrics[] = [];
    for (const [stage, values] of this.measurements.entries()) {
      if (values.length > 0) {
        results.push(this.computeMetrics(stage, values));
      }
    }
    return results;
  }

  reset(): void {
    this.measurements.clear();
    this.pending.clear();
  }

  private computeMetrics(stage: PipelineStage, values: number[]): LatencyMetrics {
    const sorted = [...values].sort((a, b) => a - b);
    const len = sorted.length;
    return {
      stage,
      p50: sorted[Math.floor(len * 0.5)] ?? 0,
      p95: sorted[Math.floor(len * 0.95)] ?? 0,
      p99: sorted[Math.floor(len * 0.99)] ?? 0,
      samples: len,
      lastValue: values[values.length - 1] ?? 0,
    };
  }
}
