// ============================================================================
// Admin & Operations Package - Deployment Manager
// ============================================================================

import type {
  Deployment,
  DeploymentStrategy,
  DeploymentStatus,
  CanaryConfig,
  MetricsGate,
  RollbackInfo,
  ApprovalWorkflow,
  ApprovalRecord,
} from '../types';

/** Blue-green deployment state */
interface BlueGreenState {
  activeSlot: 'blue' | 'green';
  blueVersion: string;
  greenVersion: string;
  healthChecksPassed: boolean;
}

/** Version comparison result */
interface VersionComparison {
  currentVersion: string;
  newVersion: string;
  changedServices: string[];
  changedConfigs: string[];
  schemaChanges: string[];
  riskLevel: 'low' | 'medium' | 'high';
}

/**
 * DeploymentManager - Full deployment lifecycle management
 * Supports blue-green, canary with metrics gates, rolling deployments,
 * instant rollback, deployment history, and approval workflows.
 */
export class DeploymentManager {
  private deployments: Map<string, Deployment> = new Map();
  private blueGreenStates: Map<string, BlueGreenState> = new Map();
  private approvalWorkflows: Map<string, ApprovalWorkflow> = new Map();
  private deploymentCounter: number = 0;

  /**
   * Create a new deployment with strategy selection
   */
  public createDeployment(
    service: string,
    version: string,
    strategy: DeploymentStrategy,
    initiatedBy: string,
    options?: {
      canaryConfig?: Partial<CanaryConfig>;
      metricsGates?: MetricsGate[];
      requiredApprovers?: string[];
    }
  ): Deployment {
    this.deploymentCounter++;
    const id = `dep_${Date.now()}_${this.deploymentCounter}`;

    // Get previous version
    const previousVersion = this.getCurrentVersion(service);

    // Default metrics gates
    const metricsGates: MetricsGate[] = options?.metricsGates || [
      { metric: 'error_rate', operator: 'lt', threshold: 0.01, window: '5m' },
      { metric: 'latency_p99', operator: 'lt', threshold: 500, window: '5m' },
    ];

    // Canary config
    let canaryConfig: CanaryConfig | undefined;
    if (strategy === 'canary') {
      canaryConfig = {
        initialPercentage: options?.canaryConfig?.initialPercentage || 5,
        incrementPercentage: options?.canaryConfig?.incrementPercentage || 15,
        intervalMs: options?.canaryConfig?.intervalMs || 300000,
        maxPercentage: options?.canaryConfig?.maxPercentage || 100,
        currentPercentage: options?.canaryConfig?.initialPercentage || 5,
        metricsGates,
      };
    }

    const needsApproval = options?.requiredApprovers && options.requiredApprovers.length > 0;

    const deployment: Deployment = {
      id,
      service,
      version,
      previousVersion,
      strategy,
      status: needsApproval ? 'pending_approval' : 'in_progress',
      initiatedBy,
      startedAt: Date.now(),
      canaryConfig,
      approvals: [],
      metricsGates,
    };

    this.deployments.set(id, deployment);

    // Create approval workflow if needed
    if (needsApproval && options?.requiredApprovers) {
      const workflow: ApprovalWorkflow = {
        deploymentId: id,
        requiredApprovers: options.requiredApprovers,
        approvals: [],
        status: 'pending',
      };
      this.approvalWorkflows.set(id, workflow);
    }

    return deployment;
  }

  /**
   * Execute blue-green deployment: deploy to inactive, health check, switch traffic
   */
  public blueGreen(deploymentId: string): Deployment {
    const deployment = this.deployments.get(deploymentId);
    if (!deployment) {
      throw new Error(`Deployment '${deploymentId}' not found`);
    }

    if (deployment.strategy !== 'blue_green') {
      throw new Error(`Deployment '${deploymentId}' is not a blue-green deployment`);
    }

    const service = deployment.service;
    let state = this.blueGreenStates.get(service);

    if (!state) {
      state = {
        activeSlot: 'blue',
        blueVersion: deployment.previousVersion,
        greenVersion: '',
        healthChecksPassed: false,
      };
    }

    // Deploy to inactive slot
    const inactiveSlot = state.activeSlot === 'blue' ? 'green' : 'blue';
    if (inactiveSlot === 'blue') {
      state.blueVersion = deployment.version;
    } else {
      state.greenVersion = deployment.version;
    }

    // Run health checks on inactive slot
    const healthCheckPassed = this.runHealthChecks(deployment);
    state.healthChecksPassed = healthCheckPassed;

    if (!healthCheckPassed) {
      deployment.status = 'failed';
      this.deployments.set(deploymentId, deployment);
      throw new Error('Health checks failed on inactive slot');
    }

    // Switch traffic
    state.activeSlot = inactiveSlot;
    this.blueGreenStates.set(service, state);

    deployment.status = 'completed';
    deployment.completedAt = Date.now();
    this.deployments.set(deploymentId, deployment);

    return deployment;
  }

  /**
   * Execute canary deployment: route small % to new version, monitor metrics
   */
  public canaryDeploy(deploymentId: string): Deployment {
    const deployment = this.deployments.get(deploymentId);
    if (!deployment) {
      throw new Error(`Deployment '${deploymentId}' not found`);
    }

    if (deployment.strategy !== 'canary') {
      throw new Error(`Deployment '${deploymentId}' is not a canary deployment`);
    }

    if (!deployment.canaryConfig) {
      throw new Error('Canary configuration missing');
    }

    deployment.status = 'canary_testing';
    deployment.canaryConfig.currentPercentage = deployment.canaryConfig.initialPercentage;

    // Check metrics gates
    const gateResults = this.evaluateMetricsGates(deployment.metricsGates);
    const allPassed = gateResults.every(g => g.passed);

    if (!allPassed) {
      // Auto-rollback on gate failure
      this.rollback(deploymentId, 'Metrics gates failed during canary', 'system', true);
      return this.deployments.get(deploymentId)!;
    }

    this.deployments.set(deploymentId, deployment);
    return deployment;
  }

  /**
   * Promote canary: gradually increase traffic (5% -> 25% -> 50% -> 100%)
   */
  public promoteCanary(deploymentId: string): Deployment {
    const deployment = this.deployments.get(deploymentId);
    if (!deployment) {
      throw new Error(`Deployment '${deploymentId}' not found`);
    }

    if (!deployment.canaryConfig) {
      throw new Error('Canary configuration missing');
    }

    const config = deployment.canaryConfig;
    const newPercentage = Math.min(
      config.currentPercentage + config.incrementPercentage,
      config.maxPercentage
    );

    // Check metrics gates before promotion
    const gateResults = this.evaluateMetricsGates(deployment.metricsGates);
    const allPassed = gateResults.every(g => g.passed);

    if (!allPassed) {
      throw new Error('Cannot promote: metrics gates not passing');
    }

    config.currentPercentage = newPercentage;

    if (newPercentage >= config.maxPercentage) {
      deployment.status = 'completed';
      deployment.completedAt = Date.now();
    } else {
      deployment.status = 'promoting';
    }

    this.deployments.set(deploymentId, deployment);
    return deployment;
  }

  /**
   * Instant rollback to previous version
   */
  public rollback(deploymentId: string, reason: string, initiatedBy: string, automatic: boolean = false): Deployment {
    const deployment = this.deployments.get(deploymentId);
    if (!deployment) {
      throw new Error(`Deployment '${deploymentId}' not found`);
    }

    if (deployment.status === 'rolled_back') {
      throw new Error(`Deployment '${deploymentId}' is already rolled back`);
    }

    deployment.status = 'rolled_back';
    deployment.rollbackInfo = {
      rolledBackAt: Date.now(),
      reason,
      initiatedBy,
      targetVersion: deployment.previousVersion,
      automatic,
    };
    deployment.completedAt = Date.now();

    // For blue-green, switch back
    if (deployment.strategy === 'blue_green') {
      const state = this.blueGreenStates.get(deployment.service);
      if (state) {
        state.activeSlot = state.activeSlot === 'blue' ? 'green' : 'blue';
        this.blueGreenStates.set(deployment.service, state);
      }
    }

    this.deployments.set(deploymentId, deployment);
    return deployment;
  }

  /**
   * Get deployment history for a service
   */
  public getDeploymentHistory(service?: string): Deployment[] {
    let deployments = Array.from(this.deployments.values());

    if (service) {
      deployments = deployments.filter(d => d.service === service);
    }

    return deployments.sort((a, b) => b.startedAt - a.startedAt);
  }

  /**
   * Request approval before production deployment
   */
  public requestApproval(deploymentId: string, approverId: string, decision: 'approved' | 'rejected', comment: string): ApprovalWorkflow | null {
    const workflow = this.approvalWorkflows.get(deploymentId);
    if (!workflow) return null;

    if (!workflow.requiredApprovers.includes(approverId)) {
      throw new Error(`'${approverId}' is not a required approver`);
    }

    // Check for duplicate approval
    if (workflow.approvals.find(a => a.approverId === approverId)) {
      throw new Error(`'${approverId}' has already responded`);
    }

    const approval: ApprovalRecord = {
      approverId,
      decision,
      comment,
      timestamp: Date.now(),
    };

    workflow.approvals.push(approval);

    // Check if any rejection
    if (decision === 'rejected') {
      workflow.status = 'rejected';
      const deployment = this.deployments.get(deploymentId);
      if (deployment) {
        deployment.status = 'failed';
        deployment.completedAt = Date.now();
        this.deployments.set(deploymentId, deployment);
      }
    }

    // Check if all approved
    const allApproved = workflow.requiredApprovers.every(
      approver => workflow.approvals.find(a => a.approverId === approver && a.decision === 'approved')
    );

    if (allApproved) {
      workflow.status = 'approved';
      const deployment = this.deployments.get(deploymentId);
      if (deployment) {
        deployment.status = 'in_progress';
        deployment.approvals = workflow.approvals;
        this.deployments.set(deploymentId, deployment);
      }
    }

    this.approvalWorkflows.set(deploymentId, workflow);
    return workflow;
  }

  /**
   * Compare versions between current and new deployment
   */
  public compareVersions(service: string, newVersion: string): VersionComparison {
    const currentVersion = this.getCurrentVersion(service);

    // Parse version numbers for risk assessment
    const currentParts = currentVersion.split('.').map(Number);
    const newParts = newVersion.split('.').map(Number);

    let riskLevel: 'low' | 'medium' | 'high' = 'low';
    if (currentParts[0] !== newParts[0]) riskLevel = 'high';
    else if (currentParts[1] !== newParts[1]) riskLevel = 'medium';

    return {
      currentVersion,
      newVersion,
      changedServices: [service],
      changedConfigs: [],
      schemaChanges: [],
      riskLevel,
    };
  }

  /**
   * Get current active version for a service
   */
  private getCurrentVersion(service: string): string {
    const serviceDeployments = Array.from(this.deployments.values())
      .filter(d => d.service === service && d.status === 'completed')
      .sort((a, b) => b.startedAt - a.startedAt);

    return serviceDeployments.length > 0 ? serviceDeployments[0].version : '0.0.0';
  }

  /**
   * Run health checks (simulated)
   */
  private runHealthChecks(deployment: Deployment): boolean {
    // Evaluate all metrics gates
    const gateResults = this.evaluateMetricsGates(deployment.metricsGates);
    return gateResults.every(g => g.passed);
  }

  /**
   * Evaluate metrics gates for deployment validation
   * Error rate gate: < 1% (or < 2x baseline)
   * Latency gate: p99 < 500ms (or < 1.5x baseline)
   */
  private evaluateMetricsGates(gates: MetricsGate[]): MetricsGate[] {
    return gates.map(gate => {
      // Simulated metric evaluation
      let currentValue: number;

      switch (gate.metric) {
        case 'error_rate':
          currentValue = 0.005; // Simulated 0.5% error rate
          break;
        case 'latency_p99':
          currentValue = 250; // Simulated 250ms p99
          break;
        default:
          currentValue = 0;
      }

      let passed: boolean;
      switch (gate.operator) {
        case 'lt':
          passed = currentValue < gate.threshold;
          break;
        case 'gt':
          passed = currentValue > gate.threshold;
          break;
        case 'lte':
          passed = currentValue <= gate.threshold;
          break;
        case 'gte':
          passed = currentValue >= gate.threshold;
          break;
        default:
          passed = true;
      }

      return { ...gate, currentValue, passed };
    });
  }
}
