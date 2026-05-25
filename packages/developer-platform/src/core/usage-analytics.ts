// ============================================================================
// Quant Developer Platform - Usage Analytics
// ============================================================================

import {
  UsageRecord,
  UsageStats,
  EndpointStats,
  LatencyPercentiles,
  ErrorBreakdown,
  TimeSeriesData,
} from '../types';

// ============================================================================
// Helpers
// ============================================================================

function generateId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 32; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

function percentile(sortedValues: number[], p: number): number {
  if (sortedValues.length === 0) return 0;
  const index = Math.ceil((p / 100) * sortedValues.length) - 1;
  return sortedValues[Math.max(0, Math.min(index, sortedValues.length - 1))];
}

// ============================================================================
// Usage Analytics Class
// ============================================================================

export class UsageAnalytics {
  private records: Map<string, UsageRecord[]> = new Map(); // keyId -> records
  private allRecords: UsageRecord[] = [];

  /**
   * Record a request with all relevant metadata
   */
  public recordRequest(params: {
    keyId: string;
    endpoint: string;
    method: string;
    statusCode: number;
    latencyMs: number;
    requestBytes: number;
    responseBytes: number;
    userAgent?: string;
    ipAddress?: string;
    region?: string;
  }): UsageRecord {
    const record: UsageRecord = {
      id: generateId(),
      keyId: params.keyId,
      endpoint: params.endpoint,
      method: params.method,
      statusCode: params.statusCode,
      latencyMs: params.latencyMs,
      requestBytes: params.requestBytes,
      responseBytes: params.responseBytes,
      timestamp: Date.now(),
      userAgent: params.userAgent || 'unknown',
      ipAddress: params.ipAddress || '0.0.0.0',
      region: params.region || 'unknown',
    };

    // Store by key
    const keyRecords = this.records.get(params.keyId) || [];
    keyRecords.push(record);
    this.records.set(params.keyId, keyRecords);

    // Store globally
    this.allRecords.push(record);

    return record;
  }

  /**
   * Get aggregate stats for a key over a time range
   */
  public getStats(keyId: string, startTime?: number, endTime?: number): UsageStats {
    const keyRecords = this.records.get(keyId) || [];
    const start = startTime || 0;
    const end = endTime || Date.now();

    const filteredRecords = keyRecords.filter(r => r.timestamp >= start && r.timestamp <= end);

    const totalRequests = filteredRecords.length;
    const successfulRequests = filteredRecords.filter(r => r.statusCode >= 200 && r.statusCode < 300).length;
    const failedRequests = totalRequests - successfulRequests;
    const totalLatencyMs = filteredRecords.reduce((sum, r) => sum + r.latencyMs, 0);
    const avgLatencyMs = totalRequests > 0 ? totalLatencyMs / totalRequests : 0;
    const totalRequestBytes = filteredRecords.reduce((sum, r) => sum + r.requestBytes, 0);
    const totalResponseBytes = filteredRecords.reduce((sum, r) => sum + r.responseBytes, 0);

    // Unique endpoints
    const endpoints = new Set(filteredRecords.map(r => `${r.method}:${r.endpoint}`));

    // Top endpoints
    const endpointCounts = new Map<string, UsageRecord[]>();
    for (const record of filteredRecords) {
      const key = `${record.method}:${record.endpoint}`;
      const existing = endpointCounts.get(key) || [];
      existing.push(record);
      endpointCounts.set(key, existing);
    }

    const topEndpoints: EndpointStats[] = Array.from(endpointCounts.entries())
      .map(([key, records]) => {
        const [method, endpoint] = key.split(':');
        const latencies = records.map(r => r.latencyMs).sort((a, b) => a - b);
        const errors = records.filter(r => r.statusCode >= 400).length;

        return {
          endpoint,
          method,
          requestCount: records.length,
          avgLatencyMs: records.reduce((s, r) => s + r.latencyMs, 0) / records.length,
          errorRate: records.length > 0 ? errors / records.length : 0,
          p50LatencyMs: percentile(latencies, 50),
          p95LatencyMs: percentile(latencies, 95),
          p99LatencyMs: percentile(latencies, 99),
        };
      })
      .sort((a, b) => b.requestCount - a.requestCount)
      .slice(0, 10);

    return {
      keyId,
      period: `${new Date(start).toISOString()} - ${new Date(end).toISOString()}`,
      totalRequests,
      successfulRequests,
      failedRequests,
      totalLatencyMs,
      avgLatencyMs,
      totalRequestBytes,
      totalResponseBytes,
      uniqueEndpoints: endpoints.size,
      topEndpoints,
    };
  }

  /**
   * Calculate latency percentiles from recorded data
   */
  public getLatencyPercentiles(keyId: string, startTime?: number, endTime?: number): LatencyPercentiles {
    const keyRecords = this.records.get(keyId) || [];
    const start = startTime || 0;
    const end = endTime || Date.now();

    const latencies = keyRecords
      .filter(r => r.timestamp >= start && r.timestamp <= end)
      .map(r => r.latencyMs)
      .sort((a, b) => a - b);

    if (latencies.length === 0) {
      return { p50: 0, p75: 0, p90: 0, p95: 0, p99: 0, min: 0, max: 0, mean: 0 };
    }

    const sum = latencies.reduce((s, v) => s + v, 0);

    return {
      p50: percentile(latencies, 50),
      p75: percentile(latencies, 75),
      p90: percentile(latencies, 90),
      p95: percentile(latencies, 95),
      p99: percentile(latencies, 99),
      min: latencies[0],
      max: latencies[latencies.length - 1],
      mean: sum / latencies.length,
    };
  }

  /**
   * Get error breakdown by status code
   */
  public getErrorBreakdown(keyId: string, startTime?: number, endTime?: number): ErrorBreakdown {
    const keyRecords = this.records.get(keyId) || [];
    const start = startTime || 0;
    const end = endTime || Date.now();

    const errors = keyRecords.filter(r =>
      r.timestamp >= start && r.timestamp <= end && r.statusCode >= 400
    );

    const clientErrors = errors.filter(r => r.statusCode >= 400 && r.statusCode < 500).length;
    const serverErrors = errors.filter(r => r.statusCode >= 500).length;
    const timeouts = errors.filter(r => r.statusCode === 408 || r.statusCode === 504).length;

    const byStatusCode: Record<number, number> = {};
    for (const error of errors) {
      byStatusCode[error.statusCode] = (byStatusCode[error.statusCode] || 0) + 1;
    }

    const topErrors = Object.entries(byStatusCode)
      .map(([code, count]) => ({
        code: parseInt(code, 10),
        count,
        message: this.getStatusMessage(parseInt(code, 10)),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      total: errors.length,
      clientErrors,
      serverErrors,
      timeouts,
      byStatusCode,
      topErrors,
    };
  }

  private getStatusMessage(code: number): string {
    const messages: Record<number, string> = {
      400: 'Bad Request',
      401: 'Unauthorized',
      403: 'Forbidden',
      404: 'Not Found',
      408: 'Request Timeout',
      409: 'Conflict',
      422: 'Unprocessable Entity',
      429: 'Too Many Requests',
      500: 'Internal Server Error',
      502: 'Bad Gateway',
      503: 'Service Unavailable',
      504: 'Gateway Timeout',
    };
    return messages[code] || `HTTP ${code}`;
  }

  /**
   * Get most called endpoints by volume
   */
  public getTopEndpoints(keyId?: string, limit: number = 10, startTime?: number, endTime?: number): EndpointStats[] {
    const records = keyId ? (this.records.get(keyId) || []) : this.allRecords;
    const start = startTime || 0;
    const end = endTime || Date.now();

    const filtered = records.filter(r => r.timestamp >= start && r.timestamp <= end);

    const endpointMap = new Map<string, UsageRecord[]>();
    for (const record of filtered) {
      const key = `${record.method}:${record.endpoint}`;
      const existing = endpointMap.get(key) || [];
      existing.push(record);
      endpointMap.set(key, existing);
    }

    return Array.from(endpointMap.entries())
      .map(([key, recs]) => {
        const [method, endpoint] = key.split(':');
        const latencies = recs.map(r => r.latencyMs).sort((a, b) => a - b);
        const errors = recs.filter(r => r.statusCode >= 400).length;

        return {
          endpoint,
          method,
          requestCount: recs.length,
          avgLatencyMs: recs.reduce((s, r) => s + r.latencyMs, 0) / recs.length,
          errorRate: recs.length > 0 ? errors / recs.length : 0,
          p50LatencyMs: percentile(latencies, 50),
          p95LatencyMs: percentile(latencies, 95),
          p99LatencyMs: percentile(latencies, 99),
        };
      })
      .sort((a, b) => b.requestCount - a.requestCount)
      .slice(0, limit);
  }

  /**
   * Get time series data with configurable granularity
   */
  public getTimeSeries(keyId: string, granularity: 'minute' | 'hour' | 'day' | 'week', startTime?: number, endTime?: number): TimeSeriesData {
    const keyRecords = this.records.get(keyId) || [];
    const end = endTime || Date.now();
    const start = startTime || (end - this.getGranularityMs(granularity) * 24);

    const filtered = keyRecords.filter(r => r.timestamp >= start && r.timestamp <= end);
    const granularityMs = this.getGranularityMs(granularity);

    // Group by time bucket
    const buckets = new Map<number, { count: number; errors: number; latencySum: number }>();

    for (const record of filtered) {
      const bucket = Math.floor(record.timestamp / granularityMs) * granularityMs;
      const existing = buckets.get(bucket) || { count: 0, errors: 0, latencySum: 0 };
      existing.count++;
      if (record.statusCode >= 400) existing.errors++;
      existing.latencySum += record.latencyMs;
      buckets.set(bucket, existing);
    }

    // Fill gaps and create data points
    const dataPoints: Array<{ timestamp: number; value: number; metadata?: Record<string, number> }> = [];
    let currentBucket = Math.floor(start / granularityMs) * granularityMs;

    while (currentBucket <= end) {
      const bucketData = buckets.get(currentBucket);
      dataPoints.push({
        timestamp: currentBucket,
        value: bucketData?.count || 0,
        metadata: bucketData ? {
          errors: bucketData.errors,
          avgLatency: bucketData.count > 0 ? bucketData.latencySum / bucketData.count : 0,
        } : undefined,
      });
      currentBucket += granularityMs;
    }

    return {
      granularity,
      startTime: start,
      endTime: end,
      dataPoints,
    };
  }

  private getGranularityMs(granularity: 'minute' | 'hour' | 'day' | 'week'): number {
    switch (granularity) {
      case 'minute': return 60000;
      case 'hour': return 3600000;
      case 'day': return 86400000;
      case 'week': return 604800000;
    }
  }

  /**
   * Export usage report for billing purposes
   */
  public exportReport(keyId: string, startTime: number, endTime: number): {
    keyId: string;
    period: { start: number; end: number };
    summary: UsageStats;
    latency: LatencyPercentiles;
    errors: ErrorBreakdown;
    topEndpoints: EndpointStats[];
    dailyBreakdown: Array<{ date: string; requests: number; errors: number; bandwidth: number }>;
  } {
    const summary = this.getStats(keyId, startTime, endTime);
    const latency = this.getLatencyPercentiles(keyId, startTime, endTime);
    const errors = this.getErrorBreakdown(keyId, startTime, endTime);
    const topEndpoints = this.getTopEndpoints(keyId, 20, startTime, endTime);

    // Daily breakdown
    const keyRecords = this.records.get(keyId) || [];
    const filtered = keyRecords.filter(r => r.timestamp >= startTime && r.timestamp <= endTime);
    const dailyMap = new Map<string, { requests: number; errors: number; bandwidth: number }>();

    for (const record of filtered) {
      const date = new Date(record.timestamp).toISOString().split('T')[0];
      const existing = dailyMap.get(date) || { requests: 0, errors: 0, bandwidth: 0 };
      existing.requests++;
      if (record.statusCode >= 400) existing.errors++;
      existing.bandwidth += record.requestBytes + record.responseBytes;
      dailyMap.set(date, existing);
    }

    const dailyBreakdown = Array.from(dailyMap.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      keyId,
      period: { start: startTime, end: endTime },
      summary,
      latency,
      errors,
      topEndpoints,
      dailyBreakdown,
    };
  }

  /**
   * Get total records count for a key
   */
  public getRecordCount(keyId?: string): number {
    if (keyId) {
      return (this.records.get(keyId) || []).length;
    }
    return this.allRecords.length;
  }

  /**
   * Clear records older than a given timestamp
   */
  public pruneRecords(olderThan: number): number {
    let pruned = 0;

    for (const [keyId, records] of this.records.entries()) {
      const before = records.length;
      const filtered = records.filter(r => r.timestamp >= olderThan);
      this.records.set(keyId, filtered);
      pruned += before - filtered.length;
    }

    const beforeAll = this.allRecords.length;
    this.allRecords = this.allRecords.filter(r => r.timestamp >= olderThan);
    pruned = Math.max(pruned, beforeAll - this.allRecords.length);

    return pruned;
  }
}
