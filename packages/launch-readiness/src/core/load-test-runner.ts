// ============================================================================
// Launch Readiness - Load Test Runner
// Workload pattern simulation with Little's Law verification, saturation
// detection, Apdex scoring, and statistical result analysis
// ============================================================================

import type {
  LoadTestConfig,
  LoadTestResult,
  LatencyPercentiles,
  ThroughputMetrics,
  LittleLawResult,
  LoadPattern,
} from '../types';

/** Individual request result */
interface RequestResult {
  timestamp: number;
  latencyMs: number;
  success: boolean;
  statusCode: number;
  bytesReceived: number;
  errorCategory?: string;
}

/**
 * LoadTestRunner - Load testing and performance analysis engine
 *
 * Implements workload patterns:
 * - Constant: fixed RPS for duration
 * - Ramp: linear increase from start_rps to end_rps over duration
 * - Spike: sudden jump from base to spike_rps, hold, return
 * - Stress: incrementally increase until failure (find breaking point)
 * - Soak: constant moderate load for extended duration (find leaks)
 *
 * Analysis capabilities:
 * - Virtual user simulation with configurable think time
 * - Little's Law verification: L = lambda * W (concurrency = arrival_rate * response_time)
 * - Saturation detection: when response_time_increase_rate > threshold
 * - Result statistics: min, max, mean, P50, P95, P99, P999, stddev
 * - Throughput measurement (requests/sec, bytes/sec)
 * - Error rate tracking by error category
 * - Apdex score: (satisfied + tolerating/2) / total
 *   where satisfied < T, tolerating < 4T
 */
export class LoadTestRunner {
  private configs: Map<string, LoadTestConfig> = new Map();
  private results: Map<string, LoadTestResult> = new Map();
  private requestResults: Map<string, RequestResult[]> = new Map();
  private apdexThresholdMs: number;

  constructor(apdexThresholdMs: number = 500) {
    this.apdexThresholdMs = apdexThresholdMs;
  }

  /**
   * Register a load test configuration
   */
  registerConfig(config: LoadTestConfig): void {
    this.configs.set(config.id, config);
  }

  /**
   * Generate the RPS schedule for a load pattern
   */
  generateRpsSchedule(
    pattern: LoadPattern,
    durationMs: number,
    intervalMs: number = 1000,
  ): number[] {
    const intervals = Math.ceil(durationMs / intervalMs);
    const schedule: number[] = [];

    switch (pattern.type) {
      case 'constant':
        for (let i = 0; i < intervals; i++) {
          schedule.push(pattern.startRps);
        }
        break;

      case 'ramp': {
        const endRps = pattern.endRps ?? pattern.startRps * 10;
        for (let i = 0; i < intervals; i++) {
          const progress = i / Math.max(intervals - 1, 1);
          schedule.push(pattern.startRps + progress * (endRps - pattern.startRps));
        }
        break;
      }

      case 'spike': {
        const spikeRps = pattern.spikeRps ?? pattern.startRps * 5;
        const spikeDuration = pattern.spikeDurationMs ?? durationMs / 4;
        const spikeIntervals = Math.ceil(spikeDuration / intervalMs);
        const spikeStart = Math.floor((intervals - spikeIntervals) / 2);

        for (let i = 0; i < intervals; i++) {
          if (i >= spikeStart && i < spikeStart + spikeIntervals) {
            schedule.push(spikeRps);
          } else {
            schedule.push(pattern.startRps);
          }
        }
        break;
      }

      case 'stress': {
        const endRps = pattern.endRps ?? pattern.startRps * 20;
        const steps = pattern.rampSteps ?? 10;
        const intervalsPerStep = Math.floor(intervals / steps);
        const rpsPerStep = (endRps - pattern.startRps) / steps;

        for (let i = 0; i < intervals; i++) {
          const step = Math.min(Math.floor(i / Math.max(intervalsPerStep, 1)), steps - 1);
          schedule.push(pattern.startRps + step * rpsPerStep);
        }
        break;
      }

      case 'soak':
        for (let i = 0; i < intervals; i++) {
          schedule.push(pattern.startRps);
        }
        break;
    }

    return schedule;
  }

  /**
   * Simulate a load test and analyze results
   * In production this would make real HTTP calls; here we provide
   * the analysis framework that processes request results.
   */
  analyzeResults(configId: string, requests: RequestResult[]): LoadTestResult {
    const config = this.configs.get(configId);
    if (!config) throw new Error(`Config ${configId} not found`);

    this.requestResults.set(configId, requests);

    if (requests.length === 0) {
      const emptyResult = this.createEmptyResult(configId);
      this.results.set(configId, emptyResult);
      return emptyResult;
    }

    const sorted = [...requests].sort((a, b) => a.timestamp - b.timestamp);
    const startTime = sorted[0]!.timestamp;
    const endTime = sorted[sorted.length - 1]!.timestamp;
    const durationMs = endTime - startTime;

    // Calculate latency stats
    const latencies = requests.filter((r) => r.success).map((r) => r.latencyMs);
    const latencyStats = this.computeLatencyPercentiles(latencies);

    // Calculate throughput
    const throughput = this.computeThroughput(requests, durationMs);

    // Error rate by category
    const errorsByCategory: Record<string, number> = {};
    const failedRequests = requests.filter((r) => !r.success);
    for (const req of failedRequests) {
      const category = req.errorCategory ?? `http_${req.statusCode}`;
      errorsByCategory[category] = (errorsByCategory[category] ?? 0) + 1;
    }

    // Apdex score calculation
    const apdexScore = this.calculateApdex(requests);

    // Little's Law verification
    const littleLaw = this.verifyLittlesLaw(requests, durationMs, config.virtualUsers);

    // Saturation point detection
    const saturationPoint = this.detectSaturation(sorted);

    const result: LoadTestResult = {
      configId,
      startedAt: startTime,
      completedAt: endTime,
      totalRequests: requests.length,
      successfulRequests: requests.length - failedRequests.length,
      failedRequests: failedRequests.length,
      latency: latencyStats,
      throughput,
      errorRate: requests.length > 0 ? failedRequests.length / requests.length : 0,
      errorsByCategory,
      apdexScore,
      saturationPoint,
      littleLawVerification: littleLaw,
    };

    this.results.set(configId, result);
    return result;
  }

  /**
   * Calculate virtual user concurrency using Little's Law
   * L = lambda * W
   * where L = number of concurrent requests, lambda = arrival rate, W = avg response time
   */
  verifyLittlesLaw(
    requests: RequestResult[],
    durationMs: number,
    configuredVirtualUsers: number,
  ): LittleLawResult {
    if (requests.length === 0 || durationMs === 0) {
      return {
        observedConcurrency: 0,
        predictedConcurrency: 0,
        arrivalRate: 0,
        avgResponseTime: 0,
        deviationPercentage: 0,
        isValid: true,
      };
    }

    const arrivalRate = requests.length / (durationMs / 1000); // requests per second
    const avgResponseTime =
      requests.reduce((sum, r) => sum + r.latencyMs, 0) / requests.length / 1000; // seconds

    // L = lambda * W (predicted concurrency)
    const predictedConcurrency = arrivalRate * avgResponseTime;
    const observedConcurrency = configuredVirtualUsers;

    const deviation =
      observedConcurrency > 0
        ? Math.abs(predictedConcurrency - observedConcurrency) / observedConcurrency
        : 0;

    return {
      observedConcurrency,
      predictedConcurrency,
      arrivalRate,
      avgResponseTime,
      deviationPercentage: deviation * 100,
      isValid: deviation < 0.2, // Within 20% is considered valid
    };
  }

  /**
   * Detect saturation point: when response_time_increase_rate > threshold
   * Returns RPS at which saturation was detected, or null if not saturated
   */
  detectSaturation(
    sortedRequests: RequestResult[],
    windowSize: number = 50,
    threshold: number = 2.0,
  ): number | null {
    if (sortedRequests.length < windowSize * 3) return null;

    // Calculate rolling average response time in windows
    const windows: Array<{ avgLatency: number; rps: number }> = [];

    for (let i = 0; i <= sortedRequests.length - windowSize; i += windowSize) {
      const window = sortedRequests.slice(i, i + windowSize);
      const avgLatency = window.reduce((sum, r) => sum + r.latencyMs, 0) / window.length;
      const windowDuration = (window[window.length - 1]!.timestamp - window[0]!.timestamp) / 1000;
      const rps = windowDuration > 0 ? window.length / windowDuration : 0;
      windows.push({ avgLatency, rps });
    }

    // Find point where latency increase rate exceeds threshold
    for (let i = 1; i < windows.length; i++) {
      const prev = windows[i - 1]!;
      const curr = windows[i]!;

      if (prev.avgLatency > 0) {
        const latencyIncreaseRate = curr.avgLatency / prev.avgLatency;
        if (latencyIncreaseRate > threshold) {
          return prev.rps; // Saturation started at previous window's RPS
        }
      }
    }

    return null;
  }

  /**
   * Calculate Apdex score
   * Apdex = (satisfied + tolerating/2) / total
   * Satisfied: response_time < T (threshold)
   * Tolerating: response_time < 4T
   * Frustrated: response_time >= 4T
   */
  calculateApdex(requests: RequestResult[]): number {
    if (requests.length === 0) return 1;

    const t = this.apdexThresholdMs;
    let satisfied = 0;
    let tolerating = 0;

    for (const req of requests) {
      if (!req.success) continue; // Failed requests are frustrated
      if (req.latencyMs <= t) {
        satisfied++;
      } else if (req.latencyMs <= 4 * t) {
        tolerating++;
      }
      // else: frustrated, contributes 0
    }

    return (satisfied + tolerating / 2) / requests.length;
  }

  /**
   * Compute percentile latency statistics
   */
  computeLatencyPercentiles(latencies: number[]): LatencyPercentiles {
    if (latencies.length === 0) {
      return {
        min: 0,
        max: 0,
        mean: 0,
        standardDeviation: 0,
        p50: 0,
        p75: 0,
        p90: 0,
        p95: 0,
        p99: 0,
        p999: 0,
      };
    }

    const sorted = [...latencies].sort((a, b) => a - b);
    const n = sorted.length;
    const sum = sorted.reduce((s, v) => s + v, 0);
    const mean = sum / n;
    const sumSquaredDiffs = sorted.reduce((s, v) => s + (v - mean) ** 2, 0);
    const standardDeviation = Math.sqrt(sumSquaredDiffs / Math.max(n - 1, 1));

    return {
      min: sorted[0]!,
      max: sorted[n - 1]!,
      mean,
      standardDeviation,
      p50: this.percentile(sorted, 50),
      p75: this.percentile(sorted, 75),
      p90: this.percentile(sorted, 90),
      p95: this.percentile(sorted, 95),
      p99: this.percentile(sorted, 99),
      p999: this.percentile(sorted, 99.9),
    };
  }

  /**
   * Compute throughput metrics
   */
  computeThroughput(requests: RequestResult[], durationMs: number): ThroughputMetrics {
    if (durationMs === 0) {
      return { requestsPerSecond: 0, bytesPerSecond: 0, peakRps: 0, sustainedRps: 0 };
    }

    const durationSec = durationMs / 1000;
    const totalBytes = requests.reduce((sum, r) => sum + r.bytesReceived, 0);
    const requestsPerSecond = requests.length / durationSec;
    const bytesPerSecond = totalBytes / durationSec;

    // Calculate peak RPS (max in any 1-second window)
    const sorted = [...requests].sort((a, b) => a.timestamp - b.timestamp);
    let peakRps = 0;
    for (let i = 0; i < sorted.length; i++) {
      const windowStart = sorted[i]!.timestamp;
      let count = 0;
      for (let j = i; j < sorted.length; j++) {
        if (sorted[j]!.timestamp - windowStart <= 1000) {
          count++;
        } else {
          break;
        }
      }
      peakRps = Math.max(peakRps, count);
    }

    // Sustained RPS: average excluding top 10% bursts
    const windowCounts: number[] = [];
    const bucketSize = 1000;
    if (sorted.length > 0) {
      const startTs = sorted[0]!.timestamp;
      const endTs = sorted[sorted.length - 1]!.timestamp;
      for (let t = startTs; t < endTs; t += bucketSize) {
        const count = sorted.filter((r) => r.timestamp >= t && r.timestamp < t + bucketSize).length;
        windowCounts.push(count);
      }
    }
    const sortedWindows = [...windowCounts].sort((a, b) => a - b);
    const sustainedEnd = Math.floor(sortedWindows.length * 0.9);
    const sustainedSlice = sortedWindows.slice(0, sustainedEnd);
    const sustainedRps =
      sustainedSlice.length > 0
        ? sustainedSlice.reduce((sum, v) => sum + v, 0) / sustainedSlice.length
        : requestsPerSecond;

    return { requestsPerSecond, bytesPerSecond, peakRps, sustainedRps };
  }

  /**
   * Get test result by config ID
   */
  getResult(configId: string): LoadTestResult | undefined {
    return this.results.get(configId);
  }

  /**
   * Get all results
   */
  getAllResults(): LoadTestResult[] {
    return Array.from(this.results.values());
  }

  /**
   * Compare two test results
   */
  compareResults(
    configIdA: string,
    configIdB: string,
  ): { metric: string; valueA: number; valueB: number; changePercent: number }[] {
    const resultA = this.results.get(configIdA);
    const resultB = this.results.get(configIdB);
    if (!resultA || !resultB) return [];

    const comparisons: { metric: string; valueA: number; valueB: number; changePercent: number }[] =
      [];

    const addComparison = (metric: string, a: number, b: number) => {
      const changePercent = a !== 0 ? ((b - a) / a) * 100 : b !== 0 ? 100 : 0;
      comparisons.push({ metric, valueA: a, valueB: b, changePercent });
    };

    addComparison('p50_latency', resultA.latency.p50, resultB.latency.p50);
    addComparison('p99_latency', resultA.latency.p99, resultB.latency.p99);
    addComparison(
      'throughput_rps',
      resultA.throughput.requestsPerSecond,
      resultB.throughput.requestsPerSecond,
    );
    addComparison('error_rate', resultA.errorRate, resultB.errorRate);
    addComparison('apdex', resultA.apdexScore, resultB.apdexScore);

    return comparisons;
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  private percentile(sorted: number[], p: number): number {
    if (sorted.length === 0) return 0;
    const index = (p / 100) * (sorted.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const lowerVal = sorted[lower] ?? 0;
    const upperVal = sorted[upper] ?? 0;
    const fraction = index - lower;
    return lowerVal + fraction * (upperVal - lowerVal);
  }

  private createEmptyResult(configId: string): LoadTestResult {
    return {
      configId,
      startedAt: 0,
      completedAt: 0,
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      latency: {
        min: 0,
        max: 0,
        mean: 0,
        standardDeviation: 0,
        p50: 0,
        p75: 0,
        p90: 0,
        p95: 0,
        p99: 0,
        p999: 0,
      },
      throughput: { requestsPerSecond: 0, bytesPerSecond: 0, peakRps: 0, sustainedRps: 0 },
      errorRate: 0,
      errorsByCategory: {},
      apdexScore: 1,
      saturationPoint: null,
      littleLawVerification: {
        observedConcurrency: 0,
        predictedConcurrency: 0,
        arrivalRate: 0,
        avgResponseTime: 0,
        deviationPercentage: 0,
        isValid: true,
      },
    };
  }
}
