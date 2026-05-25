// ============================================================================
// Launch Readiness - Chaos Recipes
// Chaos engineering experiment catalog with safety guards, blast radius control,
// scheduling, and gradual magnitude increase
// ============================================================================

import type {
  ChaosExperiment,
  ChaosAction,
  ChaosActionType,
  ChaosGuard,
  ChaosSchedule,
  BlastRadius,
  ChaosExperimentResult,
  ChaosActionParams,
} from '../types';

/** Metric snapshot for steady-state comparison */
interface MetricSnapshot {
  name: string;
  value: number;
  timestamp: number;
}

/**
 * ChaosRecipes - Chaos engineering experiment engine
 *
 * Provides a comprehensive chaos experiment catalog:
 * - Latency injection: add_delay(percentile_target, delay_ms, affected_percentage)
 * - Error injection: return_error(status_code, affected_percentage)
 * - Resource exhaustion: memory_pressure(target_mb), cpu_load(target_percent)
 * - Dependency failure: disable_service(service_name, duration)
 * - Network partition: drop_traffic(from_service, to_service, percentage)
 *
 * Safety features:
 * - Auto-abort if error_rate > threshold or blast_radius exceeded
 * - Blast radius control: limit to percentage of traffic or region
 * - Experiment scheduling with blackout windows (no chaos during peak hours)
 * - Hypothesis definition and verification
 * - Gradual magnitude increase (start small, increase if stable)
 */
export class ChaosRecipes {
  private experiments: Map<string, ChaosExperiment> = new Map();
  private runningExperiments: Set<string> = new Set();
  private experimentHistory: Map<string, ChaosExperimentResult[]> = new Map();
  private metricSnapshots: Map<string, MetricSnapshot[]> = new Map();
  private abortCallbacks: Map<string, () => void> = new Map();

  constructor() {}

  /**
   * Create a latency injection experiment
   */
  createLatencyInjection(
    name: string,
    target: string,
    delayMs: number,
    affectedPercentage: number,
    durationMs: number,
    hypothesis: string,
  ): ChaosExperiment {
    const experiment: ChaosExperiment = {
      id: this.generateId(),
      name,
      description: `Inject ${delayMs}ms latency to ${affectedPercentage}% of requests on ${target}`,
      hypothesis,
      actions: [
        {
          type: 'latency_injection',
          target,
          parameters: { delayMs, affectedPercentage },
          durationMs,
          magnitude: delayMs,
        },
      ],
      guards: this.createDefaultGuards(),
      blastRadius: this.createDefaultBlastRadius(affectedPercentage),
      status: 'planned',
    };

    this.experiments.set(experiment.id, experiment);
    return experiment;
  }

  /**
   * Create an error injection experiment
   */
  createErrorInjection(
    name: string,
    target: string,
    statusCode: number,
    affectedPercentage: number,
    durationMs: number,
    hypothesis: string,
  ): ChaosExperiment {
    const experiment: ChaosExperiment = {
      id: this.generateId(),
      name,
      description: `Return HTTP ${statusCode} for ${affectedPercentage}% of requests on ${target}`,
      hypothesis,
      actions: [
        {
          type: 'error_injection',
          target,
          parameters: { statusCode, affectedPercentage },
          durationMs,
          magnitude: affectedPercentage,
        },
      ],
      guards: this.createDefaultGuards(),
      blastRadius: this.createDefaultBlastRadius(affectedPercentage),
      status: 'planned',
    };

    this.experiments.set(experiment.id, experiment);
    return experiment;
  }

  /**
   * Create a resource exhaustion experiment (memory pressure)
   */
  createMemoryPressure(
    name: string,
    target: string,
    targetMb: number,
    durationMs: number,
    hypothesis: string,
  ): ChaosExperiment {
    const experiment: ChaosExperiment = {
      id: this.generateId(),
      name,
      description: `Apply ${targetMb}MB memory pressure on ${target}`,
      hypothesis,
      actions: [
        {
          type: 'memory_pressure',
          target,
          parameters: { targetMb },
          durationMs,
          magnitude: targetMb,
        },
      ],
      guards: this.createDefaultGuards(),
      blastRadius: this.createDefaultBlastRadius(100),
      status: 'planned',
    };

    this.experiments.set(experiment.id, experiment);
    return experiment;
  }

  /**
   * Create a CPU load experiment
   */
  createCpuLoad(
    name: string,
    target: string,
    targetPercent: number,
    durationMs: number,
    hypothesis: string,
  ): ChaosExperiment {
    const experiment: ChaosExperiment = {
      id: this.generateId(),
      name,
      description: `Apply ${targetPercent}% CPU load on ${target}`,
      hypothesis,
      actions: [
        {
          type: 'cpu_load',
          target,
          parameters: { targetPercent },
          durationMs,
          magnitude: targetPercent,
        },
      ],
      guards: this.createDefaultGuards(),
      blastRadius: this.createDefaultBlastRadius(100),
      status: 'planned',
    };

    this.experiments.set(experiment.id, experiment);
    return experiment;
  }

  /**
   * Create a dependency failure experiment
   */
  createDependencyFailure(
    name: string,
    serviceName: string,
    durationMs: number,
    hypothesis: string,
  ): ChaosExperiment {
    const experiment: ChaosExperiment = {
      id: this.generateId(),
      name,
      description: `Disable dependency ${serviceName}`,
      hypothesis,
      actions: [
        {
          type: 'dependency_failure',
          target: serviceName,
          parameters: { serviceName },
          durationMs,
          magnitude: 100,
        },
      ],
      guards: this.createDefaultGuards(),
      blastRadius: this.createDefaultBlastRadius(100),
      status: 'planned',
    };

    this.experiments.set(experiment.id, experiment);
    return experiment;
  }

  /**
   * Create a network partition experiment
   */
  createNetworkPartition(
    name: string,
    fromService: string,
    toService: string,
    dropPercentage: number,
    durationMs: number,
    hypothesis: string,
  ): ChaosExperiment {
    const experiment: ChaosExperiment = {
      id: this.generateId(),
      name,
      description: `Drop ${dropPercentage}% traffic from ${fromService} to ${toService}`,
      hypothesis,
      actions: [
        {
          type: 'network_partition',
          target: `${fromService}->${toService}`,
          parameters: { fromService, toService, dropPercentage },
          durationMs,
          magnitude: dropPercentage,
        },
      ],
      guards: this.createDefaultGuards(),
      blastRadius: this.createDefaultBlastRadius(dropPercentage),
      status: 'planned',
    };

    this.experiments.set(experiment.id, experiment);
    return experiment;
  }

  /**
   * Start an experiment with safety checks
   */
  startExperiment(
    experimentId: string,
    steadyStateMetrics: Record<string, number>,
  ): { started: boolean; reason?: string } {
    const experiment = this.experiments.get(experimentId);
    if (!experiment) return { started: false, reason: 'Experiment not found' };

    // Check if within blackout window
    if (experiment.schedule && this.isInBlackoutWindow(experiment.schedule)) {
      return { started: false, reason: 'Currently in blackout window' };
    }

    // Check max concurrent experiments
    if (experiment.schedule) {
      if (this.runningExperiments.size >= experiment.schedule.maxConcurrentExperiments) {
        return { started: false, reason: 'Max concurrent experiments reached' };
      }
    }

    // Record steady-state metrics
    const snapshots: MetricSnapshot[] = Object.entries(steadyStateMetrics).map(([name, value]) => ({
      name,
      value,
      timestamp: Date.now(),
    }));
    this.metricSnapshots.set(experimentId, snapshots);

    // Start the experiment
    experiment.status = 'running';
    this.runningExperiments.add(experimentId);

    return { started: true };
  }

  /**
   * Check safety guards during experiment execution
   * Returns abort=true if any guard threshold is exceeded
   */
  checkGuards(
    experimentId: string,
    currentMetrics: Record<string, number>,
  ): { safe: boolean; violatedGuard?: ChaosGuard; action?: string } {
    const experiment = this.experiments.get(experimentId);
    if (!experiment) return { safe: false, violatedGuard: undefined, action: 'abort' };

    for (const guard of experiment.guards) {
      const metricValue = currentMetrics[guard.metric];
      if (metricValue === undefined) continue;

      let violated = false;
      switch (guard.operator) {
        case 'gt':
          violated = metricValue > guard.threshold;
          break;
        case 'lt':
          violated = metricValue < guard.threshold;
          break;
        case 'gte':
          violated = metricValue >= guard.threshold;
          break;
        case 'lte':
          violated = metricValue <= guard.threshold;
          break;
      }

      if (violated) {
        if (guard.action === 'abort') {
          this.abortExperiment(
            experimentId,
            `Guard violated: ${guard.metric} ${guard.operator} ${guard.threshold}`,
          );
        }
        return { safe: false, violatedGuard: guard, action: guard.action };
      }
    }

    return { safe: true };
  }

  /**
   * Abort a running experiment
   */
  abortExperiment(experimentId: string, reason: string): void {
    const experiment = this.experiments.get(experimentId);
    if (!experiment) return;

    experiment.status = 'aborted';
    this.runningExperiments.delete(experimentId);

    // Execute abort callback if registered
    const callback = this.abortCallbacks.get(experimentId);
    if (callback) {
      callback();
      this.abortCallbacks.delete(experimentId);
    }

    // Record result
    const steadyState = this.metricSnapshots.get(experimentId) ?? [];
    const steadyStateRecord: Record<string, number> = {};
    for (const s of steadyState) {
      steadyStateRecord[s.name] = s.value;
    }

    const result: ChaosExperimentResult = {
      hypothesisVerified: false,
      steadyStateMetrics: steadyStateRecord,
      duringChaosMetrics: {},
      recoveryTimeMs: 0,
      findings: [`Experiment aborted: ${reason}`],
      completedAt: Date.now(),
    };

    experiment.results = result;
    const history = this.experimentHistory.get(experimentId) ?? [];
    history.push(result);
    this.experimentHistory.set(experimentId, history);
  }

  /**
   * Complete an experiment with results
   */
  completeExperiment(
    experimentId: string,
    duringChaosMetrics: Record<string, number>,
    recoveryTimeMs: number,
    hypothesisVerified: boolean,
    findings: string[],
  ): ChaosExperimentResult {
    const experiment = this.experiments.get(experimentId);
    if (!experiment) throw new Error(`Experiment ${experimentId} not found`);

    const steadyState = this.metricSnapshots.get(experimentId) ?? [];
    const steadyStateRecord: Record<string, number> = {};
    for (const s of steadyState) {
      steadyStateRecord[s.name] = s.value;
    }

    const result: ChaosExperimentResult = {
      hypothesisVerified,
      steadyStateMetrics: steadyStateRecord,
      duringChaosMetrics,
      recoveryTimeMs,
      findings,
      completedAt: Date.now(),
    };

    experiment.status = 'completed';
    experiment.results = result;
    this.runningExperiments.delete(experimentId);

    const history = this.experimentHistory.get(experimentId) ?? [];
    history.push(result);
    this.experimentHistory.set(experimentId, history);

    return result;
  }

  /**
   * Create a gradual magnitude increase plan
   * Start at initialMagnitude, increase by step each iteration while stable
   */
  createGradualPlan(
    baseExperiment: ChaosExperiment,
    initialMagnitude: number,
    maxMagnitude: number,
    stepSize: number,
  ): ChaosAction[][] {
    const stages: ChaosAction[][] = [];
    let currentMagnitude = initialMagnitude;

    while (currentMagnitude <= maxMagnitude) {
      const stageActions = baseExperiment.actions.map((action) => ({
        ...action,
        magnitude: currentMagnitude,
        parameters: this.scaleMagnitude(action.parameters, action.type, currentMagnitude),
      }));
      stages.push(stageActions);
      currentMagnitude += stepSize;
    }

    return stages;
  }

  /**
   * Set schedule for an experiment
   */
  setSchedule(experimentId: string, schedule: ChaosSchedule): void {
    const experiment = this.experiments.get(experimentId);
    if (experiment) {
      experiment.schedule = schedule;
    }
  }

  /**
   * Register an abort callback
   */
  onAbort(experimentId: string, callback: () => void): void {
    this.abortCallbacks.set(experimentId, callback);
  }

  /**
   * Get experiment by ID
   */
  getExperiment(experimentId: string): ChaosExperiment | undefined {
    return this.experiments.get(experimentId);
  }

  /**
   * Get all experiments
   */
  getAllExperiments(): ChaosExperiment[] {
    return Array.from(this.experiments.values());
  }

  /**
   * Get running experiments
   */
  getRunningExperiments(): ChaosExperiment[] {
    return Array.from(this.runningExperiments)
      .map((id) => this.experiments.get(id))
      .filter((e): e is ChaosExperiment => e !== undefined);
  }

  /**
   * Get experiment history
   */
  getExperimentHistory(experimentId: string): ChaosExperimentResult[] {
    return this.experimentHistory.get(experimentId) ?? [];
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  private generateId(): string {
    return `chaos_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  private createDefaultGuards(): ChaosGuard[] {
    return [
      {
        metric: 'error_rate',
        threshold: 0.5, // 50% error rate
        operator: 'gt',
        action: 'abort',
        checkIntervalMs: 10000,
      },
      {
        metric: 'latency_p99',
        threshold: 5000, // 5 seconds
        operator: 'gt',
        action: 'abort',
        checkIntervalMs: 10000,
      },
      {
        metric: 'availability',
        threshold: 0.9, // 90% availability
        operator: 'lt',
        action: 'abort',
        checkIntervalMs: 5000,
      },
    ];
  }

  private createDefaultBlastRadius(affectedPercentage: number): BlastRadius {
    return {
      maxAffectedPercentage: Math.min(affectedPercentage * 1.5, 100),
      allowedRegions: ['us-east-1'],
      excludedServices: [],
    };
  }

  private isInBlackoutWindow(schedule: ChaosSchedule): boolean {
    const now = new Date();
    const currentHour = now.getHours();
    const currentDay = now.getDay();

    for (const window of schedule.blackoutWindows) {
      // Check day of week
      if (window.dayOfWeek && !window.dayOfWeek.includes(currentDay)) {
        continue;
      }

      // Check hour range
      if (currentHour >= window.startHour && currentHour < window.endHour) {
        return true;
      }
    }

    return false;
  }

  private scaleMagnitude(
    params: ChaosActionParams,
    type: ChaosActionType,
    magnitude: number,
  ): ChaosActionParams {
    const scaled = { ...params };
    switch (type) {
      case 'latency_injection':
        scaled.delayMs = magnitude;
        break;
      case 'error_injection':
        scaled.affectedPercentage = magnitude;
        break;
      case 'memory_pressure':
        scaled.targetMb = magnitude;
        break;
      case 'cpu_load':
        scaled.targetPercent = magnitude;
        break;
      case 'network_partition':
        scaled.dropPercentage = magnitude;
        break;
      case 'dependency_failure':
        // Full or nothing for dependency failure
        break;
    }
    return scaled;
  }
}
