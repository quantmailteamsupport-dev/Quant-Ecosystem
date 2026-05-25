// ============================================================================
// Launch Readiness - Deployment Strategies
// Blue-green, canary progressive deployment with chi-squared metrics comparison,
// automatic rollback triggers, and feature flag integration
// ============================================================================

import type {
  DeploymentStrategy,
  DeploymentStage,
  CanaryConfig,
  CanaryMetrics,
  RollbackTrigger,
  BlueGreenState,
  DeploymentVelocity,
  DeploymentStrategyType,
} from '../types';

/** Deployment record */
interface DeploymentRecord {
  id: string;
  strategy: DeploymentStrategyType;
  version: string;
  startedAt: number;
  completedAt?: number;
  status: 'in_progress' | 'completed' | 'rolled_back' | 'failed';
  currentStage: number;
  metricsHistory: CanaryMetrics[];
}

/** Feature flag state */
interface FeatureFlag {
  name: string;
  enabled: boolean;
  rolloutPercentage: number;
  targetSegments: string[];
  version: string;
}

/**
 * DeploymentStrategies - Deployment orchestration engine
 *
 * Implements multiple deployment strategies:
 * - Blue-green: two environments, atomic traffic switch, instant rollback
 * - Canary progressive: 1% -> 5% -> 25% -> 50% -> 100% with configurable hold
 * - Canary metrics comparison using chi-squared test:
 *   chi2 = sum((observed - expected)^2 / expected) for error rate comparison
 * - Automatic rollback triggers: error_rate > baseline * (1 + threshold)
 *   or p99_latency > SLO target
 * - Feature flag integration for dark launches
 * - Stage gate approvals (auto-advance if metrics pass)
 * - Deployment velocity tracking (commit to production time)
 * - Rollback speed measurement
 */
export class DeploymentStrategies {
  private blueGreenState: BlueGreenState;
  private canaryConfig: CanaryConfig | null = null;
  private deployments: Map<string, DeploymentRecord> = new Map();
  private featureFlags: Map<string, FeatureFlag> = new Map();
  private velocityHistory: DeploymentVelocity[] = [];
  private strategies: Map<string, DeploymentStrategy> = new Map();

  constructor() {
    this.blueGreenState = {
      activeEnvironment: 'blue',
      blueVersion: '',
      greenVersion: '',
      blueHealthy: true,
      greenHealthy: true,
      lastSwitchAt: 0,
      trafficDistribution: { blue: 100, green: 0 },
    };
  }

  /**
   * Register a deployment strategy
   */
  registerStrategy(id: string, strategy: DeploymentStrategy): void {
    this.strategies.set(id, strategy);
  }

  /**
   * Configure canary deployment
   */
  configureCanary(config: CanaryConfig): void {
    this.canaryConfig = config;
  }

  // ============================================================================
  // Blue-Green Deployment
  // ============================================================================

  /**
   * Deploy new version to inactive environment (blue-green)
   */
  deployToInactive(version: string): BlueGreenState {
    if (this.blueGreenState.activeEnvironment === 'blue') {
      this.blueGreenState.greenVersion = version;
    } else {
      this.blueGreenState.blueVersion = version;
    }
    return { ...this.blueGreenState };
  }

  /**
   * Switch traffic atomically between blue and green
   */
  switchTraffic(): BlueGreenState {
    const previousActive = this.blueGreenState.activeEnvironment;
    this.blueGreenState.activeEnvironment = previousActive === 'blue' ? 'green' : 'blue';
    this.blueGreenState.lastSwitchAt = Date.now();

    if (this.blueGreenState.activeEnvironment === 'blue') {
      this.blueGreenState.trafficDistribution = { blue: 100, green: 0 };
    } else {
      this.blueGreenState.trafficDistribution = { blue: 0, green: 100 };
    }

    return { ...this.blueGreenState };
  }

  /**
   * Instant rollback by switching back to previous environment
   */
  rollbackBlueGreen(): BlueGreenState {
    return this.switchTraffic();
  }

  /**
   * Get current blue-green state
   */
  getBlueGreenState(): BlueGreenState {
    return { ...this.blueGreenState };
  }

  /**
   * Update health status for an environment
   */
  updateHealth(environment: 'blue' | 'green', healthy: boolean): void {
    if (environment === 'blue') {
      this.blueGreenState.blueHealthy = healthy;
    } else {
      this.blueGreenState.greenHealthy = healthy;
    }
  }

  // ============================================================================
  // Canary Deployment
  // ============================================================================

  /**
   * Start a canary deployment with progressive traffic shifting
   * Default stages: 1% -> 5% -> 25% -> 50% -> 100%
   */
  startCanaryDeployment(version: string): DeploymentRecord {
    const config = this.canaryConfig;
    if (!config) {
      throw new Error('Canary config must be set before starting deployment');
    }

    const record: DeploymentRecord = {
      id: `deploy_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      strategy: 'canary',
      version,
      startedAt: Date.now(),
      status: 'in_progress',
      currentStage: 0,
      metricsHistory: [],
    };

    this.deployments.set(record.id, record);
    return record;
  }

  /**
   * Compare canary metrics against baseline using chi-squared test
   * Tests H0: canary error rate = baseline error rate
   *
   * chi2 = sum((observed - expected)^2 / expected)
   */
  compareCanaryMetrics(
    deploymentId: string,
    baselineRequests: number,
    baselineErrors: number,
    canaryRequests: number,
    canaryErrors: number,
    baselineLatencyP99: number,
    canaryLatencyP99: number,
  ): CanaryMetrics {
    const deployment = this.deployments.get(deploymentId);
    if (!deployment) throw new Error(`Deployment ${deploymentId} not found`);

    const config = this.canaryConfig!;
    const stage = config.stages[deployment.currentStage];
    const stageName = stage?.name ?? `stage_${deployment.currentStage}`;

    const baselineErrorRate = baselineRequests > 0 ? baselineErrors / baselineRequests : 0;
    const canaryErrorRate = canaryRequests > 0 ? canaryErrors / canaryRequests : 0;

    // Chi-squared test for error rate comparison
    const totalRequests = baselineRequests + canaryRequests;
    const totalErrors = baselineErrors + canaryErrors;
    const totalSuccess = totalRequests - totalErrors;

    let chiSquared = 0;
    if (totalRequests > 0 && totalErrors > 0 && totalSuccess > 0) {
      // Expected values under null hypothesis (equal error rates)
      const expectedBaselineErrors = (baselineRequests * totalErrors) / totalRequests;
      const expectedBaselineSuccess = (baselineRequests * totalSuccess) / totalRequests;
      const expectedCanaryErrors = (canaryRequests * totalErrors) / totalRequests;
      const expectedCanarySuccess = (canaryRequests * totalSuccess) / totalRequests;

      const baselineSuccess = baselineRequests - baselineErrors;
      const canarySuccess = canaryRequests - canaryErrors;

      if (expectedBaselineErrors > 0) {
        chiSquared += Math.pow(baselineErrors - expectedBaselineErrors, 2) / expectedBaselineErrors;
      }
      if (expectedBaselineSuccess > 0) {
        chiSquared +=
          Math.pow(baselineSuccess - expectedBaselineSuccess, 2) / expectedBaselineSuccess;
      }
      if (expectedCanaryErrors > 0) {
        chiSquared += Math.pow(canaryErrors - expectedCanaryErrors, 2) / expectedCanaryErrors;
      }
      if (expectedCanarySuccess > 0) {
        chiSquared += Math.pow(canarySuccess - expectedCanarySuccess, 2) / expectedCanarySuccess;
      }
    }

    // P-value approximation for chi-squared with 1 degree of freedom
    const pValue = this.chiSquaredPValue(chiSquared);
    const isSignificant = pValue < 1 - config.confidenceLevel;

    // Determine recommendation
    let recommendation: 'advance' | 'rollback' | 'hold' = 'hold';

    if (isSignificant && canaryErrorRate > baselineErrorRate) {
      recommendation = 'rollback';
    } else if (canaryLatencyP99 > baselineLatencyP99 * 1.5) {
      recommendation = 'rollback';
    } else if (canaryRequests >= config.minSampleSize && !isSignificant) {
      recommendation = 'advance';
    }

    const metrics: CanaryMetrics = {
      stage: stageName,
      baselineErrorRate,
      canaryErrorRate,
      baselineLatencyP99,
      canaryLatencyP99,
      chiSquared,
      pValue,
      isSignificant,
      recommendation,
    };

    deployment.metricsHistory.push(metrics);
    return metrics;
  }

  /**
   * Advance canary to next stage
   */
  advanceCanary(deploymentId: string): {
    advanced: boolean;
    newStage?: DeploymentStage;
    completed?: boolean;
  } {
    const deployment = this.deployments.get(deploymentId);
    if (!deployment) return { advanced: false };

    const config = this.canaryConfig;
    if (!config) return { advanced: false };

    deployment.currentStage++;

    if (deployment.currentStage >= config.stages.length) {
      deployment.status = 'completed';
      deployment.completedAt = Date.now();
      this.recordVelocity(deployment);
      return { advanced: true, completed: true };
    }

    const newStage = config.stages[deployment.currentStage];
    return { advanced: true, newStage, completed: false };
  }

  /**
   * Check rollback triggers against current metrics
   */
  checkRollbackTriggers(
    strategy: DeploymentStrategy,
    currentMetrics: Record<string, number>,
    baselineMetrics: Record<string, number>,
  ): { shouldRollback: boolean; triggeredRule?: RollbackTrigger } {
    for (const trigger of strategy.rollbackTriggers) {
      const currentValue = currentMetrics[trigger.metric];
      if (currentValue === undefined) continue;

      let shouldTrigger = false;

      if (trigger.condition === 'absolute') {
        shouldTrigger = currentValue > trigger.threshold;
      } else if (trigger.condition === 'relative') {
        const baseline = baselineMetrics[trigger.metric] ?? 0;
        const multiplier = trigger.baselineMultiplier ?? 1.5;
        shouldTrigger = currentValue > baseline * multiplier;
      }

      if (shouldTrigger) {
        return { shouldRollback: true, triggeredRule: trigger };
      }
    }

    return { shouldRollback: false };
  }

  /**
   * Rollback a canary deployment
   */
  rollbackCanary(deploymentId: string): void {
    const deployment = this.deployments.get(deploymentId);
    if (!deployment) return;

    deployment.status = 'rolled_back';
    deployment.completedAt = Date.now();
    this.recordVelocity(deployment);
  }

  // ============================================================================
  // Feature Flags
  // ============================================================================

  /**
   * Create a feature flag for dark launch
   */
  createFeatureFlag(name: string, version: string): FeatureFlag {
    const flag: FeatureFlag = {
      name,
      enabled: false,
      rolloutPercentage: 0,
      targetSegments: [],
      version,
    };
    this.featureFlags.set(name, flag);
    return flag;
  }

  /**
   * Enable feature flag with percentage rollout
   */
  enableFeatureFlag(name: string, percentage: number, segments?: string[]): void {
    const flag = this.featureFlags.get(name);
    if (flag) {
      flag.enabled = true;
      flag.rolloutPercentage = Math.min(100, Math.max(0, percentage));
      if (segments) flag.targetSegments = segments;
    }
  }

  /**
   * Check if a feature flag is enabled for a given user
   */
  isFeatureEnabled(name: string, userId: string, userSegments?: string[]): boolean {
    const flag = this.featureFlags.get(name);
    if (!flag || !flag.enabled) return false;

    // Check segment targeting
    if (flag.targetSegments.length > 0 && userSegments) {
      const hasMatchingSegment = userSegments.some((s) => flag.targetSegments.includes(s));
      if (!hasMatchingSegment) return false;
    }

    // Deterministic hash-based rollout
    const hash = this.hashString(`${name}:${userId}`);
    const normalizedHash = (hash % 100) + 1;
    return normalizedHash <= flag.rolloutPercentage;
  }

  /**
   * Get all feature flags
   */
  getFeatureFlags(): FeatureFlag[] {
    return Array.from(this.featureFlags.values());
  }

  // ============================================================================
  // Stage Gates & Approvals
  // ============================================================================

  /**
   * Evaluate stage gate: auto-advance if metrics pass, otherwise hold
   */
  evaluateStageGate(
    stage: DeploymentStage,
    currentMetrics: Record<string, number>,
    thresholds: Record<string, number>,
  ): { pass: boolean; failedMetrics: string[] } {
    const failedMetrics: string[] = [];

    for (const metricName of stage.metricsToCheck) {
      const currentValue = currentMetrics[metricName];
      const threshold = thresholds[metricName];

      if (currentValue !== undefined && threshold !== undefined) {
        if (currentValue > threshold) {
          failedMetrics.push(metricName);
        }
      }
    }

    const pass = failedMetrics.length === 0;
    return { pass, failedMetrics };
  }

  // ============================================================================
  // Deployment Velocity
  // ============================================================================

  /**
   * Get deployment velocity metrics
   */
  getVelocityMetrics(): {
    averageDeployTime: number;
    averageRollbackTime: number;
    deploymentsPerDay: number;
    successRate: number;
  } {
    if (this.velocityHistory.length === 0) {
      return { averageDeployTime: 0, averageRollbackTime: 0, deploymentsPerDay: 0, successRate: 0 };
    }

    const avgDeployTime =
      this.velocityHistory.reduce((sum, v) => sum + v.deployToProductionMs, 0) /
      this.velocityHistory.length;

    const rollbacks = this.velocityHistory.filter((v) => v.rollbackTimeMs > 0);
    const avgRollbackTime =
      rollbacks.length > 0
        ? rollbacks.reduce((sum, v) => sum + v.rollbackTimeMs, 0) / rollbacks.length
        : 0;

    const avgDeploymentsPerDay =
      this.velocityHistory.reduce((sum, v) => sum + v.deploymentsPerDay, 0) /
      this.velocityHistory.length;

    const avgSuccessRate =
      this.velocityHistory.reduce((sum, v) => sum + v.successRate, 0) / this.velocityHistory.length;

    return {
      averageDeployTime: avgDeployTime,
      averageRollbackTime: avgRollbackTime,
      deploymentsPerDay: avgDeploymentsPerDay,
      successRate: avgSuccessRate,
    };
  }

  /**
   * Get deployment by ID
   */
  getDeployment(deploymentId: string): DeploymentRecord | undefined {
    return this.deployments.get(deploymentId);
  }

  /**
   * Get all deployments
   */
  getAllDeployments(): DeploymentRecord[] {
    return Array.from(this.deployments.values());
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  /**
   * Chi-squared p-value approximation (1 degree of freedom)
   * Using normal distribution approximation
   */
  private chiSquaredPValue(chiSquared: number): number {
    if (chiSquared <= 0) return 1;

    // For 1 df, chi-squared is the square of a standard normal
    const z = Math.sqrt(chiSquared);

    // Abramowitz and Stegun approximation for erfc
    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const p = 0.3275911;

    const t = 1.0 / (1.0 + p * z);
    const t2 = t * t;
    const t3 = t2 * t;
    const t4 = t3 * t;
    const t5 = t4 * t;

    const erfApprox = 1 - (a1 * t + a2 * t2 + a3 * t3 + a4 * t4 + a5 * t5) * Math.exp((-z * z) / 2);
    const cdf = 0.5 * (1 + erfApprox);
    return 2 * (1 - cdf); // Two-tailed
  }

  /**
   * Simple string hashing for deterministic feature flag rollout
   */
  private hashString(str: string): number {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
      hash = (hash * 33) ^ str.charCodeAt(i);
    }
    return Math.abs(hash);
  }

  /**
   * Record deployment velocity for tracking
   */
  private recordVelocity(deployment: DeploymentRecord): void {
    const completedAt = deployment.completedAt ?? Date.now();
    const deployTime = completedAt - deployment.startedAt;

    const velocity: DeploymentVelocity = {
      commitToDeployMs: deployTime, // Simplified: assume commit is at start
      deployToProductionMs: deployTime,
      rollbackTimeMs: deployment.status === 'rolled_back' ? deployTime : 0,
      deploymentsPerDay: 1, // Will be aggregated later
      successRate: deployment.status === 'completed' ? 1 : 0,
    };

    this.velocityHistory.push(velocity);
  }
}
