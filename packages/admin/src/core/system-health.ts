// ============================================================================
// Admin & Operations Package - System Health Monitor
// ============================================================================

import type {
  SystemHealth,
  ServiceStatus,
  HealthStatus,
  UptimeRecord,
  ErrorRateMetric,
  LatencyMetric,
  HealthCheck,
  DependencyStatus,
  DependencyType,
  TrendDirection,
} from '../types';

/** Health check result */
interface HealthCheckResult {
  serviceName: string;
  status: HealthStatus;
  responseTimeMs: number;
  timestamp: number;
  error?: string;
}

/** Degradation detection result */
interface DegradationAlert {
  serviceName: string;
  metric: 'error_rate' | 'latency';
  currentValue: number;
  baselineValue: number;
  multiplier: number;
  severity: 'warning' | 'critical';
  timestamp: number;
}

/** Incident correlation */
interface IncidentCorrelation {
  degradedService: string;
  correlatedDependencies: Array<{
    name: string;
    type: DependencyType;
    status: HealthStatus;
    probability: number;
  }>;
  timestamp: number;
}

/**
 * SystemHealthMonitor - Comprehensive health monitoring service
 * Tracks uptime, error rates, latency percentiles, dependency health,
 * degradation detection, and incident correlation.
 */
export class SystemHealthMonitor {
  private services: Map<string, HealthCheck> = new Map();
  private serviceStatuses: Map<string, ServiceStatus> = new Map();
  private healthHistory: Map<string, HealthCheckResult[]> = new Map();
  private dependencies: Map<string, DependencyStatus> = new Map();
  private requestCounts: Map<string, Array<{ timestamp: number; total: number; errors: number }>> = new Map();
  private latencyRecords: Map<string, number[]> = new Map();

  /**
   * Register a service for health monitoring
   */
  public registerService(config: HealthCheck): void {
    this.services.set(config.serviceName, config);
    this.healthHistory.set(config.serviceName, []);
    this.requestCounts.set(config.serviceName, []);
    this.latencyRecords.set(config.serviceName, []);

    this.serviceStatuses.set(config.serviceName, {
      name: config.serviceName,
      status: 'unknown',
      endpoint: config.endpoint,
      responseTimeMs: 0,
      lastChecked: 0,
      errorRate: 0,
      version: '1.0.0',
      metadata: {},
    });
  }

  /**
   * Register an external dependency
   */
  public registerDependency(name: string, type: DependencyType): void {
    this.dependencies.set(name, {
      name,
      type,
      status: 'unknown',
      latencyMs: 0,
      lastChecked: 0,
    });
  }

  /**
   * Record a health check result for a service
   */
  public recordHealthCheck(serviceName: string, responseTimeMs: number, success: boolean, error?: string): void {
    const history = this.healthHistory.get(serviceName);
    if (!history) {
      throw new Error(`Service '${serviceName}' not registered`);
    }

    const result: HealthCheckResult = {
      serviceName,
      status: success ? 'healthy' : 'unhealthy',
      responseTimeMs,
      timestamp: Date.now(),
      error,
    };

    history.push(result);

    // Keep last 10000 records
    if (history.length > 10000) {
      history.splice(0, history.length - 10000);
    }

    // Update current status
    const serviceStatus = this.serviceStatuses.get(serviceName);
    if (serviceStatus) {
      serviceStatus.status = success ? 'healthy' : 'unhealthy';
      serviceStatus.responseTimeMs = responseTimeMs;
      serviceStatus.lastChecked = Date.now();
      this.serviceStatuses.set(serviceName, serviceStatus);
    }
  }

  /**
   * Record request metrics for error rate calculation
   */
  public recordRequests(serviceName: string, total: number, errors: number): void {
    const counts = this.requestCounts.get(serviceName);
    if (!counts) return;

    counts.push({ timestamp: Date.now(), total, errors });

    // Keep last 1000 entries
    if (counts.length > 1000) {
      counts.splice(0, counts.length - 1000);
    }

    // Update service error rate
    const serviceStatus = this.serviceStatuses.get(serviceName);
    if (serviceStatus) {
      const recentCounts = counts.filter(c => c.timestamp > Date.now() - 300000);
      const totalReqs = recentCounts.reduce((sum, c) => sum + c.total, 0);
      const totalErrors = recentCounts.reduce((sum, c) => sum + c.errors, 0);
      serviceStatus.errorRate = totalReqs > 0 ? totalErrors / totalReqs : 0;
      this.serviceStatuses.set(serviceName, serviceStatus);
    }
  }

  /**
   * Record latency measurement
   */
  public recordLatency(serviceName: string, latencyMs: number): void {
    const records = this.latencyRecords.get(serviceName);
    if (!records) return;

    records.push(latencyMs);

    // Keep last 10000 records
    if (records.length > 10000) {
      records.splice(0, records.length - 10000);
    }
  }

  /**
   * Ping all services and record their status
   */
  public checkHealth(): SystemHealth {
    const services = Array.from(this.serviceStatuses.values());

    let overallStatus: HealthStatus = 'healthy';
    let unhealthyCount = 0;
    let degradedCount = 0;

    for (const service of services) {
      if (service.status === 'unhealthy') unhealthyCount++;
      else if (service.status === 'degraded') degradedCount++;
    }

    if (unhealthyCount > 0) overallStatus = 'unhealthy';
    else if (degradedCount > 0) overallStatus = 'degraded';

    // Calculate overall uptime
    const uptimePercentage = this.calculateOverallUptime();

    return {
      overall: overallStatus,
      services,
      lastChecked: Date.now(),
      uptimePercentage,
      activeIncidents: unhealthyCount,
    };
  }

  /**
   * Calculate uptime percentage over a time window
   * 99.9% = 8.76 hours/year downtime
   */
  public getUptime(serviceName: string, windowMs: number = 86400000): UptimeRecord {
    const history = this.healthHistory.get(serviceName) || [];
    const windowStart = Date.now() - windowMs;

    const relevantChecks = history.filter(h => h.timestamp >= windowStart);
    const totalChecks = relevantChecks.length;
    const successfulChecks = relevantChecks.filter(h => h.status === 'healthy').length;

    const uptimePercentage = totalChecks > 0 ? (successfulChecks / totalChecks) * 100 : 100;
    const downtimeMinutes = ((100 - uptimePercentage) / 100) * (windowMs / 60000);

    return {
      serviceName,
      windowStart,
      windowEnd: Date.now(),
      totalChecks,
      successfulChecks,
      uptimePercentage: Math.round(uptimePercentage * 1000) / 1000,
      downtimeMinutes: Math.round(downtimeMinutes * 100) / 100,
    };
  }

  /**
   * Get error rate with trend direction over rolling window
   */
  public getErrorRate(serviceName: string, windowMs: number = 300000): ErrorRateMetric {
    const counts = this.requestCounts.get(serviceName) || [];
    const now = Date.now();
    const windowStart = now - windowMs;
    const prevWindowStart = windowStart - windowMs;

    // Current window
    const currentCounts = counts.filter(c => c.timestamp >= windowStart);
    const currentTotal = currentCounts.reduce((sum, c) => sum + c.total, 0);
    const currentErrors = currentCounts.reduce((sum, c) => sum + c.errors, 0);
    const currentRate = currentTotal > 0 ? currentErrors / currentTotal : 0;

    // Previous window for trend
    const prevCounts = counts.filter(c => c.timestamp >= prevWindowStart && c.timestamp < windowStart);
    const prevTotal = prevCounts.reduce((sum, c) => sum + c.total, 0);
    const prevErrors = prevCounts.reduce((sum, c) => sum + c.errors, 0);
    const prevRate = prevTotal > 0 ? prevErrors / prevTotal : 0;

    let trend: TrendDirection = 'stable';
    if (currentRate > prevRate * 1.1) trend = 'up';
    else if (currentRate < prevRate * 0.9) trend = 'down';

    return {
      serviceName,
      window: `${windowMs / 1000}s`,
      totalRequests: currentTotal,
      errorCount: currentErrors,
      errorRate: Math.round(currentRate * 10000) / 10000,
      trend,
      byStatusCode: {},
    };
  }

  /**
   * Get latency percentiles (p50, p95, p99)
   */
  public getLatency(serviceName: string, sloTarget: number = 500): LatencyMetric {
    const records = this.latencyRecords.get(serviceName) || [];

    if (records.length === 0) {
      return {
        serviceName,
        p50: 0,
        p95: 0,
        p99: 0,
        mean: 0,
        max: 0,
        sloTarget,
        withinSLO: true,
      };
    }

    const sorted = [...records].sort((a, b) => a - b);
    const len = sorted.length;

    const p50 = sorted[Math.floor(len * 0.5)];
    const p95 = sorted[Math.floor(len * 0.95)];
    const p99 = sorted[Math.floor(len * 0.99)];
    const mean = sorted.reduce((a, b) => a + b, 0) / len;
    const max = sorted[len - 1];

    return {
      serviceName,
      p50: Math.round(p50 * 100) / 100,
      p95: Math.round(p95 * 100) / 100,
      p99: Math.round(p99 * 100) / 100,
      mean: Math.round(mean * 100) / 100,
      max,
      sloTarget,
      withinSLO: p99 <= sloTarget,
    };
  }

  /**
   * Check health of all registered dependencies
   */
  public getDependencyHealth(): DependencyStatus[] {
    return Array.from(this.dependencies.values());
  }

  /**
   * Update dependency status
   */
  public updateDependencyStatus(name: string, status: HealthStatus, latencyMs: number, error?: string): void {
    const dep = this.dependencies.get(name);
    if (!dep) {
      throw new Error(`Dependency '${name}' not registered`);
    }

    dep.status = status;
    dep.latencyMs = latencyMs;
    dep.lastChecked = Date.now();
    if (error) dep.lastError = error;

    this.dependencies.set(name, dep);
  }

  /**
   * Detect service degradation - alert if error rate or latency exceeds baseline by 2x
   */
  public detectDegradation(): DegradationAlert[] {
    const alerts: DegradationAlert[] = [];

    for (const [serviceName] of this.services) {
      // Check error rate
      const errorRate = this.getErrorRate(serviceName, 300000);
      const baselineErrorRate = this.getErrorRate(serviceName, 3600000);

      if (baselineErrorRate.errorRate > 0 && errorRate.errorRate > baselineErrorRate.errorRate * 2) {
        const multiplier = errorRate.errorRate / baselineErrorRate.errorRate;
        alerts.push({
          serviceName,
          metric: 'error_rate',
          currentValue: errorRate.errorRate,
          baselineValue: baselineErrorRate.errorRate,
          multiplier,
          severity: multiplier >= 5 ? 'critical' : 'warning',
          timestamp: Date.now(),
        });

        // Update service status
        const status = this.serviceStatuses.get(serviceName);
        if (status) {
          status.status = 'degraded';
          this.serviceStatuses.set(serviceName, status);
        }
      }

      // Check latency
      const latency = this.getLatency(serviceName);
      const records = this.latencyRecords.get(serviceName) || [];
      if (records.length > 100) {
        const baselineMean = records.slice(0, Math.floor(records.length * 0.8))
          .reduce((a, b) => a + b, 0) / Math.floor(records.length * 0.8);

        if (baselineMean > 0 && latency.p99 > baselineMean * 2) {
          const multiplier = latency.p99 / baselineMean;
          alerts.push({
            serviceName,
            metric: 'latency',
            currentValue: latency.p99,
            baselineValue: baselineMean,
            multiplier,
            severity: multiplier >= 5 ? 'critical' : 'warning',
            timestamp: Date.now(),
          });
        }
      }
    }

    return alerts;
  }

  /**
   * When a service degrades, find correlated dependencies
   */
  public getIncidentCorrelation(degradedService: string): IncidentCorrelation {
    const correlations: Array<{
      name: string;
      type: DependencyType;
      status: HealthStatus;
      probability: number;
    }> = [];

    for (const [name, dep] of this.dependencies) {
      if (dep.status === 'unhealthy' || dep.status === 'degraded') {
        // Calculate probability based on dependency status and latency
        let probability = 0.5;
        if (dep.status === 'unhealthy') probability = 0.9;
        else if (dep.status === 'degraded') probability = 0.6;

        // Increase probability if latency is unusually high
        if (dep.latencyMs > 1000) probability = Math.min(probability + 0.2, 1.0);

        correlations.push({
          name,
          type: dep.type,
          status: dep.status,
          probability: Math.round(probability * 100) / 100,
        });
      }
    }

    // Sort by probability descending
    correlations.sort((a, b) => b.probability - a.probability);

    return {
      degradedService,
      correlatedDependencies: correlations,
      timestamp: Date.now(),
    };
  }

  /**
   * Calculate overall uptime across all services
   */
  private calculateOverallUptime(): number {
    const services = Array.from(this.services.keys());
    if (services.length === 0) return 100;

    let totalUptime = 0;
    for (const service of services) {
      const uptime = this.getUptime(service);
      totalUptime += uptime.uptimePercentage;
    }

    return Math.round((totalUptime / services.length) * 1000) / 1000;
  }
}
