// ============================================================================
// Launch Readiness - Capacity Planner
// Traffic forecasting with linear regression, resource estimation, autoscaling,
// cost modeling, and M/M/c queuing theory for connection pool sizing
// ============================================================================

import type {
  CapacityPlan,
  ResourceRequirement,
  ScalingConfig,
  CostEstimate,
  HeadroomConfig,
  CapacityRecommendation,
  ConnectionPoolConfig,
} from '../types';

/** Historical traffic data point */
interface TrafficDataPoint {
  timestamp: number;
  requestsPerSecond: number;
  cpuUtilization: number;
  memoryUtilization: number;
  concurrentUsers: number;
}

/** Linear regression result */
interface LinearRegressionResult {
  slope: number;
  intercept: number;
  rSquared: number;
  standardError: number;
}

/**
 * CapacityPlanner - Capacity planning and resource estimation engine
 *
 * Implements:
 * - Traffic forecasting using linear regression (least squares fit)
 *   y = mx + b where m = (n*sum_xy - sum_x*sum_y) / (n*sum_x2 - sum_x^2)
 * - Resource estimation: cpu_needed = rps * cpu_per_request,
 *   memory = concurrent_users * memory_per_session
 * - Autoscaling config generation: target utilization, min/max instances, cooldowns
 * - Cost modeling: instances * cost_per_instance * hours (on-demand, reserved, spot)
 * - Headroom calculation: plan for 2x normal burst, 10x viral event
 * - Database connection pool sizing using M/M/c queuing theory
 *   Erlang-C formula: C(c, A) where A = lambda/mu (offered load), c = servers
 * - Recommendation generation (upgrade instance, add replicas, optimize)
 */
export class CapacityPlanner {
  private trafficHistory: TrafficDataPoint[] = [];
  private cpuPerRequest: number;
  private memoryPerSessionMb: number;
  private costPerInstanceHour: number;
  private instanceCpuCores: number;
  private instanceMemoryMb: number;

  constructor(
    options: {
      cpuPerRequest?: number;
      memoryPerSessionMb?: number;
      costPerInstanceHour?: number;
      instanceCpuCores?: number;
      instanceMemoryMb?: number;
    } = {},
  ) {
    this.cpuPerRequest = options.cpuPerRequest ?? 0.001; // 1ms of CPU per request
    this.memoryPerSessionMb = options.memoryPerSessionMb ?? 2;
    this.costPerInstanceHour = options.costPerInstanceHour ?? 0.1;
    this.instanceCpuCores = options.instanceCpuCores ?? 4;
    this.instanceMemoryMb = options.instanceMemoryMb ?? 8192;
  }

  /**
   * Add historical traffic data
   */
  addTrafficData(data: TrafficDataPoint[]): void {
    this.trafficHistory.push(...data);
    this.trafficHistory.sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * Forecast future traffic using linear regression
   * y = mx + b where:
   * m = (n*sum_xy - sum_x*sum_y) / (n*sum_x2 - sum_x^2)
   * b = (sum_y - m*sum_x) / n
   */
  forecastTraffic(
    forecastHorizonDays: number,
  ): { timestamp: number; predictedRps: number; confidence: number }[] {
    if (this.trafficHistory.length < 2) {
      throw new Error('Need at least 2 data points for forecasting');
    }

    const regression = this.linearRegression(
      this.trafficHistory.map((d) => d.timestamp),
      this.trafficHistory.map((d) => d.requestsPerSecond),
    );

    const lastTimestamp = this.trafficHistory[this.trafficHistory.length - 1]!.timestamp;
    const hourMs = 60 * 60 * 1000;
    const dayMs = 24 * hourMs;
    const forecasts: { timestamp: number; predictedRps: number; confidence: number }[] = [];

    for (let day = 1; day <= forecastHorizonDays; day++) {
      const futureTimestamp = lastTimestamp + day * dayMs;
      const predictedRps = regression.slope * futureTimestamp + regression.intercept;

      // Confidence decreases with distance from training data
      const distanceFactor = day / forecastHorizonDays;
      const confidence = Math.max(0, regression.rSquared * (1 - distanceFactor * 0.5));

      forecasts.push({
        timestamp: futureTimestamp,
        predictedRps: Math.max(0, predictedRps),
        confidence,
      });
    }

    return forecasts;
  }

  /**
   * Estimate resource requirements based on forecasted traffic
   */
  estimateResources(projectedRps: number, concurrentUsers: number): ResourceRequirement[] {
    // CPU: requests_per_second * cpu_per_request (in core-seconds)
    const cpuNeeded = projectedRps * this.cpuPerRequest;
    const cpuCapacity = this.instanceCpuCores;
    const cpuUtilization = cpuCapacity > 0 ? (cpuNeeded / cpuCapacity) * 100 : 0;

    // Memory: concurrent_users * memory_per_session
    const memoryNeeded = concurrentUsers * this.memoryPerSessionMb;
    const memoryCapacity = this.instanceMemoryMb;
    const memoryUtilization = memoryCapacity > 0 ? (memoryNeeded / memoryCapacity) * 100 : 0;

    // Network: estimated bytes per request * RPS
    const bytesPerRequest = 10 * 1024; // 10KB average
    const networkNeeded = projectedRps * bytesPerRequest;
    const networkCapacity = 1 * 1024 * 1024 * 1024; // 1 Gbps
    const networkUtilization = (networkNeeded / networkCapacity) * 100;

    return [
      {
        resourceType: 'cpu',
        currentUsage: cpuNeeded,
        projectedUsage: cpuNeeded,
        maxCapacity: cpuCapacity,
        utilizationPercent: cpuUtilization,
        unit: 'cores',
      },
      {
        resourceType: 'memory',
        currentUsage: memoryNeeded,
        projectedUsage: memoryNeeded,
        maxCapacity: memoryCapacity,
        utilizationPercent: memoryUtilization,
        unit: 'MB',
      },
      {
        resourceType: 'network',
        currentUsage: networkNeeded,
        projectedUsage: networkNeeded,
        maxCapacity: networkCapacity,
        utilizationPercent: networkUtilization,
        unit: 'bytes/sec',
      },
    ];
  }

  /**
   * Generate autoscaling configuration
   */
  generateScalingConfig(
    targetUtilization: number = 0.7,
    currentRps: number = 0,
    projectedPeakRps: number = 0,
  ): ScalingConfig {
    const rpsPerInstance = (this.instanceCpuCores / this.cpuPerRequest) * targetUtilization;
    const minInstances = Math.max(2, Math.ceil(currentRps / rpsPerInstance));
    const maxInstances = Math.max(minInstances * 2, Math.ceil(projectedPeakRps / rpsPerInstance));

    return {
      targetUtilization,
      minInstances,
      maxInstances,
      scaleUpCooldownMs: 60 * 1000, // 1 minute
      scaleDownCooldownMs: 5 * 60 * 1000, // 5 minutes
      scaleUpThreshold: targetUtilization + 0.1,
      scaleDownThreshold: targetUtilization - 0.2,
    };
  }

  /**
   * Model deployment costs
   */
  estimateCosts(
    instanceCount: number,
    hoursPerMonth: number = 730, // average hours in a month
  ): CostEstimate {
    const onDemandCost = instanceCount * this.costPerInstanceHour * hoursPerMonth;
    const reservedDiscount = 0.4; // 40% discount for reserved
    const spotDiscount = 0.7; // 70% discount for spot

    return {
      monthlyOnDemand: onDemandCost,
      monthlyReserved: onDemandCost * (1 - reservedDiscount),
      monthlySpot: onDemandCost * (1 - spotDiscount),
      instanceType: `${this.instanceCpuCores}vCPU/${this.instanceMemoryMb}MB`,
      instanceCount,
      costPerInstance: this.costPerInstanceHour * hoursPerMonth,
    };
  }

  /**
   * Calculate headroom requirements
   * Normal burst: 2x normal traffic
   * Viral event: 10x normal traffic
   */
  calculateHeadroom(
    currentRps: number,
  ): HeadroomConfig & {
    requiredCapacityRps: number;
    burstCapacityRps: number;
    viralCapacityRps: number;
  } {
    const normalBurstMultiplier = 2;
    const viralEventMultiplier = 10;
    const headroomPercentage = 20;

    const requiredCapacityRps = currentRps * (1 + headroomPercentage / 100);
    const burstCapacityRps = currentRps * normalBurstMultiplier;
    const viralCapacityRps = currentRps * viralEventMultiplier;

    return {
      normalBurstMultiplier,
      viralEventMultiplier,
      headroomPercentage,
      requiredCapacityRps,
      burstCapacityRps,
      viralCapacityRps,
    };
  }

  /**
   * Size database connection pool using M/M/c queuing theory
   * Uses Erlang-C formula approximation for P(wait)
   *
   * Erlang-C: C(c, A) = probability that an arriving customer has to wait
   * where A = lambda/mu (offered load), c = number of servers
   *
   * C(c, A) = [A^c/c! * c/(c-A)] / [sum(k=0 to c-1)(A^k/k!) + A^c/c! * c/(c-A)]
   */
  sizeConnectionPool(
    arrivalRate: number, // requests per second needing a connection
    avgServiceTimeMs: number, // average time holding a connection
    targetWaitProbability: number = 0.01, // P(wait) < 1%
  ): ConnectionPoolConfig {
    const mu = 1000 / avgServiceTimeMs; // service rate (completions per second)
    const offeredLoad = arrivalRate / mu; // A = lambda/mu (in Erlangs)

    // Find minimum c (pool size) where P(wait) < target
    let poolSize = Math.ceil(offeredLoad) + 1; // Must be > offered load for stability
    let waitProbability = 1;

    while (waitProbability > targetWaitProbability && poolSize < 1000) {
      waitProbability = this.erlangC(poolSize, offeredLoad);
      if (waitProbability > targetWaitProbability) {
        poolSize++;
      }
    }

    const utilization = poolSize > 0 ? (offeredLoad / poolSize) * 100 : 0;

    // Max wait time: average wait when waiting occurs
    // E[W|wait] = 1 / (c*mu - lambda) = avgServiceTimeMs / (c - A)
    const denominator = poolSize - offeredLoad;
    const maxWaitTimeMs = denominator > 0 ? avgServiceTimeMs / denominator : avgServiceTimeMs * 10;

    return {
      poolSize,
      maxWaitTimeMs,
      offeredLoad,
      servers: poolSize,
      waitProbability,
      utilizationPercent: utilization,
    };
  }

  /**
   * Generate capacity recommendations
   */
  generateRecommendations(projectedRps: number, concurrentUsers: number): CapacityRecommendation[] {
    const resources = this.estimateResources(projectedRps, concurrentUsers);
    const recommendations: CapacityRecommendation[] = [];

    for (const resource of resources) {
      if (resource.utilizationPercent > 90) {
        recommendations.push({
          type: 'scale_up',
          priority: 'critical',
          description: `${resource.resourceType} utilization at ${resource.utilizationPercent.toFixed(1)}% - immediate scaling required`,
          estimatedCostImpact: this.costPerInstanceHour * 730,
          estimatedPerformanceImpact: 50,
        });
      } else if (resource.utilizationPercent > 70) {
        recommendations.push({
          type: 'add_replicas',
          priority: 'high',
          description: `${resource.resourceType} utilization at ${resource.utilizationPercent.toFixed(1)}% - add capacity before peak`,
          estimatedCostImpact: this.costPerInstanceHour * 730 * 0.5,
          estimatedPerformanceImpact: 30,
        });
      } else if (resource.utilizationPercent < 20) {
        recommendations.push({
          type: 'scale_down',
          priority: 'low',
          description: `${resource.resourceType} utilization at ${resource.utilizationPercent.toFixed(1)}% - consider downsizing`,
          estimatedCostImpact: -this.costPerInstanceHour * 730 * 0.3,
          estimatedPerformanceImpact: -5,
        });
      }
    }

    // Check if instance type upgrade would be more efficient
    const cpuResource = resources.find((r) => r.resourceType === 'cpu');
    const memResource = resources.find((r) => r.resourceType === 'memory');
    if (cpuResource && memResource) {
      if (cpuResource.utilizationPercent > 80 && memResource.utilizationPercent < 30) {
        recommendations.push({
          type: 'upgrade_instance',
          priority: 'medium',
          description:
            'CPU-bound workload with underutilized memory - consider compute-optimized instances',
          estimatedCostImpact: this.costPerInstanceHour * 730 * 0.2,
          estimatedPerformanceImpact: 40,
        });
      } else if (memResource.utilizationPercent > 80 && cpuResource.utilizationPercent < 30) {
        recommendations.push({
          type: 'upgrade_instance',
          priority: 'medium',
          description:
            'Memory-bound workload with underutilized CPU - consider memory-optimized instances',
          estimatedCostImpact: this.costPerInstanceHour * 730 * 0.2,
          estimatedPerformanceImpact: 40,
        });
      }
    }

    recommendations.sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

    return recommendations;
  }

  /**
   * Generate full capacity plan
   */
  generatePlan(
    name: string,
    forecastHorizonDays: number,
    currentRps: number,
    concurrentUsers: number,
  ): CapacityPlan {
    const forecasts =
      this.trafficHistory.length >= 2 ? this.forecastTraffic(forecastHorizonDays) : [];
    const peakForecastedRps =
      forecasts.length > 0 ? Math.max(...forecasts.map((f) => f.predictedRps)) : currentRps * 1.5;

    const resources = this.estimateResources(peakForecastedRps, concurrentUsers);
    const scaling = this.generateScalingConfig(0.7, currentRps, peakForecastedRps);
    const costEstimate = this.estimateCosts(scaling.maxInstances);
    const headroom = this.calculateHeadroom(currentRps);
    const recommendations = this.generateRecommendations(peakForecastedRps, concurrentUsers);

    return {
      id: `plan_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      name,
      generatedAt: Date.now(),
      forecastHorizonDays,
      resources,
      scaling,
      costEstimate,
      headroom: {
        normalBurstMultiplier: headroom.normalBurstMultiplier,
        viralEventMultiplier: headroom.viralEventMultiplier,
        headroomPercentage: headroom.headroomPercentage,
      },
      recommendations,
    };
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  /**
   * Linear regression using least squares method
   * m = (n*sum_xy - sum_x*sum_y) / (n*sum_x2 - sum_x^2)
   * b = (sum_y - m*sum_x) / n
   */
  private linearRegression(x: number[], y: number[]): LinearRegressionResult {
    const n = x.length;
    if (n < 2) return { slope: 0, intercept: 0, rSquared: 0, standardError: 0 };

    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumX2 = 0;
    let sumY2 = 0;

    for (let i = 0; i < n; i++) {
      const xi = x[i]!;
      const yi = y[i]!;
      sumX += xi;
      sumY += yi;
      sumXY += xi * yi;
      sumX2 += xi * xi;
      sumY2 += yi * yi;
    }

    const denominator = n * sumX2 - sumX * sumX;
    if (denominator === 0) return { slope: 0, intercept: sumY / n, rSquared: 0, standardError: 0 };

    const slope = (n * sumXY - sumX * sumY) / denominator;
    const intercept = (sumY - slope * sumX) / n;

    // R-squared
    const yMean = sumY / n;
    let ssRes = 0;
    let ssTot = 0;
    for (let i = 0; i < n; i++) {
      const predicted = slope * x[i]! + intercept;
      const actual = y[i]!;
      ssRes += (actual - predicted) ** 2;
      ssTot += (actual - yMean) ** 2;
    }
    const rSquared = ssTot > 0 ? 1 - ssRes / ssTot : 0;

    // Standard error of regression
    const standardError = n > 2 ? Math.sqrt(ssRes / (n - 2)) : 0;

    return { slope, intercept, rSquared, standardError };
  }

  /**
   * Erlang-C formula: C(c, A)
   * Probability that an arriving customer has to wait
   *
   * C(c, A) = [A^c/c! * c/(c-A)] / [sum(k=0..c-1)(A^k/k!) + A^c/c! * c/(c-A)]
   */
  private erlangC(c: number, A: number): number {
    if (c <= 0 || A <= 0) return 0;
    if (A >= c) return 1; // Unstable system

    // Calculate A^c / c! using log to avoid overflow
    let logNumerator = c * Math.log(A);
    for (let i = 2; i <= c; i++) {
      logNumerator -= Math.log(i);
    }

    // Factor: c / (c - A)
    const factor = c / (c - A);
    const numeratorValue = Math.exp(logNumerator) * factor;

    // Sum: sum(k=0..c-1) A^k / k!
    let sum = 0;
    let logTerm = 0;
    sum += 1; // k=0 term: A^0/0! = 1
    for (let k = 1; k < c; k++) {
      logTerm += Math.log(A) - Math.log(k);
      sum += Math.exp(logTerm);
    }

    const denominator = sum + numeratorValue;
    return denominator > 0 ? numeratorValue / denominator : 0;
  }
}
