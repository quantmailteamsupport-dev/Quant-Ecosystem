// ============================================================================
// Launch Readiness - Runbook Engine
// Structured runbook management with automated execution, escalation chains,
// incident severity classification, and post-incident review generation
// ============================================================================

import type {
  RunbookDefinition,
  RunbookStep,
  RunbookExecution,
  StepExecutionResult,
  EscalationLevel,
  IncidentSeverity,
  PostIncidentReview,
  TimelineEntry,
  ActionItem,
  HealthCheck,
  HealthStatus,
  OnCallRotation,
  OnCallOverride,
} from '../types';

/** Response time SLAs by severity */
const SEVERITY_RESPONSE_SLAS: Record<IncidentSeverity, number> = {
  P1: 15 * 60 * 1000, // 15 minutes
  P2: 60 * 60 * 1000, // 1 hour
  P3: 4 * 60 * 60 * 1000, // 4 hours
  P4: 24 * 60 * 60 * 1000, // 24 hours
  P5: 7 * 24 * 60 * 60 * 1000, // Best effort (7 days)
};

/**
 * RunbookEngine - Incident response and runbook management engine
 *
 * Implements comprehensive runbook management:
 * - Runbook definition: trigger conditions, steps, verification, rollback
 * - Step types: manual (instructions), automated (command), decision (if-then)
 * - Automated step execution with timeout and success verification
 * - Escalation chain: if not acknowledged in SLA, escalate to next level
 * - Severity classification: P1 (15min), P2 (1hr), P3 (4hr), P4 (24hr), P5 (best effort)
 * - Post-incident review template generation
 * - Runbook coverage tracking (which alerts have runbooks)
 * - Execution history with duration and outcome tracking
 * - On-call rotation management
 */
export class RunbookEngine {
  private runbooks: Map<string, RunbookDefinition> = new Map();
  private executions: Map<string, RunbookExecution> = new Map();
  private healthChecks: Map<string, HealthCheck> = new Map();
  private healthStatuses: Map<string, HealthStatus> = new Map();
  private rotations: Map<string, OnCallRotation> = new Map();
  private alertRunbookMapping: Map<string, string> = new Map();
  private incidentTimelines: Map<string, TimelineEntry[]> = new Map();

  constructor() {}

  /**
   * Register a runbook definition
   */
  registerRunbook(runbook: RunbookDefinition): void {
    this.runbooks.set(runbook.id, runbook);

    // Map trigger conditions to runbook
    for (const trigger of runbook.triggerConditions) {
      this.alertRunbookMapping.set(trigger, runbook.id);
    }
  }

  /**
   * Start runbook execution for an incident
   */
  startExecution(runbookId: string, executedBy: string, incidentId?: string): RunbookExecution {
    const runbook = this.runbooks.get(runbookId);
    if (!runbook) throw new Error(`Runbook ${runbookId} not found`);

    const sortedSteps = runbook.steps.sort((a, b) => a.order - b.order);
    const firstStep = sortedSteps[0];
    if (!firstStep) throw new Error(`Runbook ${runbookId} has no steps`);

    const execution: RunbookExecution = {
      id: `exec_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      runbookId,
      startedAt: Date.now(),
      status: 'in_progress',
      currentStepId: firstStep.id,
      stepResults: [],
      executedBy,
      incidentId,
    };

    this.executions.set(execution.id, execution);

    // Start timeline tracking
    if (incidentId) {
      const timeline: TimelineEntry[] = [
        {
          timestamp: Date.now(),
          event: `Runbook "${runbook.name}" execution started`,
          actor: executedBy,
        },
      ];
      this.incidentTimelines.set(incidentId, timeline);
    }

    return execution;
  }

  /**
   * Execute the current step in a runbook execution
   */
  executeCurrentStep(
    executionId: string,
    stepOutput?: string,
  ): { result: StepExecutionResult; nextStep: RunbookStep | null; decision?: string } {
    const execution = this.executions.get(executionId);
    if (!execution) throw new Error(`Execution ${executionId} not found`);

    const runbook = this.runbooks.get(execution.runbookId);
    if (!runbook) throw new Error(`Runbook ${execution.runbookId} not found`);

    const currentStep = runbook.steps.find((s) => s.id === execution.currentStepId);
    if (!currentStep) throw new Error(`Step ${execution.currentStepId} not found`);

    const startedAt = Date.now();

    // Simulate step execution
    let status: StepExecutionResult['status'] = 'success';
    let error: string | undefined;

    if (currentStep.type === 'automated') {
      // Check timeout
      if (currentStep.timeoutMs && stepOutput === 'timeout') {
        status = 'timeout';
        error = `Step timed out after ${currentStep.timeoutMs}ms`;
      }
      // Check success criteria
      if (currentStep.successCriteria && stepOutput !== currentStep.successCriteria) {
        if (status !== 'timeout') {
          status = stepOutput === 'failed' ? 'failed' : 'success';
        }
      }
    }

    const result: StepExecutionResult = {
      stepId: currentStep.id,
      status,
      startedAt,
      completedAt: Date.now(),
      output: stepOutput,
      error,
    };

    execution.stepResults.push(result);

    // Add to timeline
    if (execution.incidentId) {
      const timeline = this.incidentTimelines.get(execution.incidentId) ?? [];
      timeline.push({
        timestamp: Date.now(),
        event: `Step "${currentStep.title}" ${status}`,
        actor: execution.executedBy,
      });
      this.incidentTimelines.set(execution.incidentId, timeline);
    }

    // Determine next step
    let nextStep: RunbookStep | null = null;

    if (currentStep.type === 'decision' && currentStep.decisionBranches) {
      // For decision steps, find matching branch
      const matchingBranch = currentStep.decisionBranches.find((b) => b.condition === stepOutput);
      if (matchingBranch) {
        nextStep = runbook.steps.find((s) => s.id === matchingBranch.nextStepId) ?? null;
      }
    } else {
      // Linear progression
      const sortedSteps = runbook.steps.sort((a, b) => a.order - b.order);
      const currentIdx = sortedSteps.findIndex((s) => s.id === currentStep.id);
      nextStep = sortedSteps[currentIdx + 1] ?? null;
    }

    if (nextStep) {
      execution.currentStepId = nextStep.id;
    } else {
      execution.status = result.status === 'failed' ? 'failed' : 'completed';
      execution.completedAt = Date.now();
    }

    return { result, nextStep, decision: stepOutput };
  }

  /**
   * Check if escalation is needed based on acknowledgement SLA
   */
  checkEscalation(executionId: string): {
    needsEscalation: boolean;
    currentLevel: number;
    nextLevel?: EscalationLevel;
    timeRemaining: number;
  } {
    const execution = this.executions.get(executionId);
    if (!execution) throw new Error(`Execution ${executionId} not found`);

    const runbook = this.runbooks.get(execution.runbookId);
    if (!runbook) throw new Error(`Runbook ${execution.runbookId} not found`);

    const severity = runbook.severity;
    const responseSLA = SEVERITY_RESPONSE_SLAS[severity];
    const elapsed = Date.now() - execution.startedAt;

    // Find current escalation level based on elapsed time
    let currentLevel = 0;
    for (let i = 0; i < runbook.escalationChain.length; i++) {
      const level = runbook.escalationChain[i]!;
      if (elapsed > level.acknowledgeWithinMs * (i + 1)) {
        currentLevel = i + 1;
      }
    }

    const nextLevel = runbook.escalationChain[currentLevel];
    const needsEscalation = elapsed > responseSLA && execution.status === 'in_progress';
    const timeRemaining = Math.max(0, responseSLA - elapsed);

    if (needsEscalation) {
      execution.status = 'escalated';
      if (execution.incidentId) {
        const timeline = this.incidentTimelines.get(execution.incidentId) ?? [];
        timeline.push({
          timestamp: Date.now(),
          event: `Escalated to level ${currentLevel + 1}: ${nextLevel?.respondersGroup ?? 'unknown'}`,
          actor: 'system',
        });
        this.incidentTimelines.set(execution.incidentId, timeline);
      }
    }

    return { needsEscalation, currentLevel, nextLevel, timeRemaining };
  }

  /**
   * Classify incident severity
   */
  classifySeverity(
    impactedUsers: number,
    revenueImpactPerHour: number,
    isDataLoss: boolean,
    isSecurityBreach: boolean,
  ): IncidentSeverity {
    if (isSecurityBreach || isDataLoss) return 'P1';
    if (impactedUsers > 10000 || revenueImpactPerHour > 10000) return 'P1';
    if (impactedUsers > 1000 || revenueImpactPerHour > 1000) return 'P2';
    if (impactedUsers > 100 || revenueImpactPerHour > 100) return 'P3';
    if (impactedUsers > 10) return 'P4';
    return 'P5';
  }

  /**
   * Generate post-incident review template
   */
  generatePostIncidentReview(
    incidentId: string,
    title: string,
    severity: IncidentSeverity,
    impact: string,
    rootCause: string,
    contributingFactors: string[],
    lessonsLearned: string[],
  ): PostIncidentReview {
    const timeline = this.incidentTimelines.get(incidentId) ?? [];

    // Generate action items from contributing factors
    const actionItems: ActionItem[] = contributingFactors.map((factor, idx) => ({
      id: `action_${incidentId}_${idx}`,
      description: `Address contributing factor: ${factor}`,
      owner: 'TBD',
      priority: idx < 2 ? ('high' as const) : ('medium' as const),
      dueDate: Date.now() + (idx < 2 ? 7 : 14) * 24 * 60 * 60 * 1000,
      status: 'open' as const,
    }));

    return {
      incidentId,
      title,
      severity,
      timeline,
      impact,
      rootCause,
      contributingFactors,
      actionItems,
      lessonsLearned,
      generatedAt: Date.now(),
    };
  }

  /**
   * Track runbook coverage: which alerts have runbooks
   */
  getRunbookCoverage(): {
    totalAlerts: number;
    coveredAlerts: number;
    coveragePercentage: number;
    uncoveredAlerts: string[];
  } {
    const allAlerts = new Set<string>();
    const coveredAlerts = new Set<string>();

    // Collect all known alerts from health checks
    for (const [checkId] of this.healthChecks) {
      allAlerts.add(checkId);
    }

    // Check which alerts have runbook mappings
    for (const alertName of this.alertRunbookMapping.keys()) {
      coveredAlerts.add(alertName);
      allAlerts.add(alertName);
    }

    const uncoveredAlerts = Array.from(allAlerts).filter((a) => !coveredAlerts.has(a));
    const coveragePercentage =
      allAlerts.size > 0 ? (coveredAlerts.size / allAlerts.size) * 100 : 100;

    return {
      totalAlerts: allAlerts.size,
      coveredAlerts: coveredAlerts.size,
      coveragePercentage,
      uncoveredAlerts,
    };
  }

  /**
   * Get execution history for a runbook
   */
  getExecutionHistory(runbookId: string): RunbookExecution[] {
    return Array.from(this.executions.values()).filter((e) => e.runbookId === runbookId);
  }

  /**
   * Get execution statistics
   */
  getExecutionStats(runbookId: string): {
    totalExecutions: number;
    successRate: number;
    averageDurationMs: number;
    medianDurationMs: number;
  } {
    const executions = this.getExecutionHistory(runbookId);
    const completed = executions.filter((e) => e.completedAt);

    if (completed.length === 0) {
      return { totalExecutions: 0, successRate: 0, averageDurationMs: 0, medianDurationMs: 0 };
    }

    const successful = completed.filter((e) => e.status === 'completed');
    const durations = completed
      .filter((e) => e.completedAt)
      .map((e) => e.completedAt! - e.startedAt)
      .sort((a, b) => a - b);

    const avgDuration = durations.reduce((sum, d) => sum + d, 0) / durations.length;
    const medianDuration = durations.length > 0 ? durations[Math.floor(durations.length / 2)]! : 0;

    return {
      totalExecutions: executions.length,
      successRate: successful.length / completed.length,
      averageDurationMs: avgDuration,
      medianDurationMs: medianDuration,
    };
  }

  // ============================================================================
  // Health Checks
  // ============================================================================

  /**
   * Register a health check
   */
  registerHealthCheck(check: HealthCheck): void {
    this.healthChecks.set(check.id, check);
    this.healthStatuses.set(check.id, {
      checkId: check.id,
      status: 'unknown',
      lastCheckedAt: 0,
      responseTimeMs: 0,
      consecutiveFailures: 0,
    });
  }

  /**
   * Record health check result
   */
  recordHealthCheckResult(
    checkId: string,
    healthy: boolean,
    responseTimeMs: number,
    message?: string,
  ): HealthStatus {
    const existingStatus = this.healthStatuses.get(checkId);
    const consecutiveFailures = healthy ? 0 : (existingStatus?.consecutiveFailures ?? 0) + 1;

    let status: HealthStatus['status'];
    if (healthy) {
      status = 'healthy';
    } else if (consecutiveFailures >= 3) {
      status = 'unhealthy';
    } else {
      status = 'degraded';
    }

    const healthStatus: HealthStatus = {
      checkId,
      status,
      lastCheckedAt: Date.now(),
      responseTimeMs,
      consecutiveFailures,
      message,
    };

    this.healthStatuses.set(checkId, healthStatus);
    return healthStatus;
  }

  /**
   * Get all health statuses
   */
  getHealthStatuses(): HealthStatus[] {
    return Array.from(this.healthStatuses.values());
  }

  // ============================================================================
  // On-Call Rotation
  // ============================================================================

  /**
   * Create an on-call rotation
   */
  createRotation(teamName: string, members: string[], rotationIntervalMs: number): OnCallRotation {
    if (members.length === 0) throw new Error('Rotation must have at least one member');

    const rotation: OnCallRotation = {
      id: `rotation_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      teamName,
      members,
      currentOnCall: members[0]!,
      rotationIntervalMs,
      nextRotationAt: Date.now() + rotationIntervalMs,
      overrides: [],
    };

    this.rotations.set(rotation.id, rotation);
    return rotation;
  }

  /**
   * Get current on-call person (considering overrides)
   */
  getCurrentOnCall(rotationId: string): string {
    const rotation = this.rotations.get(rotationId);
    if (!rotation) throw new Error(`Rotation ${rotationId} not found`);

    const now = Date.now();

    // Check for active overrides
    for (const override of rotation.overrides) {
      if (now >= override.startAt && now < override.endAt) {
        return override.person;
      }
    }

    // Check if rotation should advance
    if (now >= rotation.nextRotationAt) {
      const currentIdx = rotation.members.indexOf(rotation.currentOnCall);
      const nextIdx = (currentIdx + 1) % rotation.members.length;
      rotation.currentOnCall = rotation.members[nextIdx]!;
      rotation.nextRotationAt = now + rotation.rotationIntervalMs;
    }

    return rotation.currentOnCall;
  }

  /**
   * Add an on-call override
   */
  addOverride(rotationId: string, override: OnCallOverride): void {
    const rotation = this.rotations.get(rotationId);
    if (!rotation) throw new Error(`Rotation ${rotationId} not found`);
    rotation.overrides.push(override);
  }

  /**
   * Get all runbooks
   */
  getRunbooks(): RunbookDefinition[] {
    return Array.from(this.runbooks.values());
  }

  /**
   * Get runbook by alert name
   */
  getRunbookForAlert(alertName: string): RunbookDefinition | undefined {
    const runbookId = this.alertRunbookMapping.get(alertName);
    if (!runbookId) return undefined;
    return this.runbooks.get(runbookId);
  }

  /**
   * Find runbook for a trigger condition
   */
  findRunbook(triggerCondition: string): RunbookDefinition | undefined {
    const runbookId = this.alertRunbookMapping.get(triggerCondition);
    return runbookId ? this.runbooks.get(runbookId) : undefined;
  }
}
