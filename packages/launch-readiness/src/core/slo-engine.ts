// ============================================================================
// Launch Readiness - SLO Engine
// Service Level Objective management with error budgets, burn rate alerting,
// multi-window alerts, and compliance reporting
// ============================================================================

import type {
  SLODefinition,
  ErrorBudget,
  BurnRate,
  BurnRateAlert,
  BudgetPolicyAction,
  SLOComplianceReport,
  IncidentSeverity,
} from '../types';

/** Measurement data point */
interface MeasurementPoint {
  timestamp: number;
  success: boolean;
  latencyMs?: number;
  errorCode?: string;
}

/**
 * SLOEngine - Service Level Objective management engine
 *
 * Implements comprehensive SLO management:
 * - SLO definition: target%, measurement window, indicator type
 * - Error budget: (1 - target) * total_requests = allowed_failures
 * - Budget consumption tracking (remaining = budget - failures_in_window)
 * - Burn rate: actual_failure_rate / allowed_failure_rate
 *   - 1x = normal rate, consuming budget at expected pace
 *   - >1x = burning fast, will exhaust budget before window ends
 *   - 14.4x = will exhaust in 1 hour on a 30-day window
 * - Multi-window alerts: short window (5min) catches spikes, long window (1h) confirms
 * - Alert thresholds: burn_rate_short > 14.4 AND burn_rate_long > 6 -> page
 * - Budget policy: remaining < 10% -> freeze deployments, < 25% -> require approval
 * - Monthly SLO compliance report generation
 */
export class SLOEngine {
  private slos: Map<string, SLODefinition> = new Map();
  private measurements: Map<string, MeasurementPoint[]> = new Map();
  private budgetHistory: Map<string, ErrorBudget[]> = new Map();

  constructor() {}

  /**
   * Register an SLO definition
   */
  defineSLO(slo: SLODefinition): void {
    this.slos.set(slo.id, slo);
    this.measurements.set(slo.id, []);
    this.budgetHistory.set(slo.id, []);
  }

  /**
   * Record a measurement against an SLO
   */
  recordMeasurement(sloId: string, measurement: MeasurementPoint): void {
    const measurements = this.measurements.get(sloId);
    if (!measurements) {
      throw new Error(`SLO ${sloId} not found`);
    }
    measurements.push(measurement);
  }

  /**
   * Record a batch of measurements
   */
  recordBatch(sloId: string, measurements: MeasurementPoint[]): void {
    for (const m of measurements) {
      this.recordMeasurement(sloId, m);
    }
  }

  /**
   * Calculate error budget for an SLO
   * Error budget = (1 - target) * total_requests
   */
  calculateErrorBudget(sloId: string, windowStartMs?: number): ErrorBudget {
    const slo = this.slos.get(sloId);
    if (!slo) throw new Error(`SLO ${sloId} not found`);

    const measurements = this.getMeasurementsInWindow(sloId, windowStartMs);
    const totalRequests = measurements.length;
    const failedRequests = measurements.filter((m) => !m.success).length;

    // Error budget = (1 - target) * total_requests
    const allowedFailureRate = 1 - slo.target;
    const totalBudget = Math.floor(allowedFailureRate * totalRequests);
    const consumed = failedRequests;
    const remaining = Math.max(0, totalBudget - consumed);
    const remainingPercentage = totalBudget > 0 ? (remaining / totalBudget) * 100 : 100;

    // Burn rate = actual_failure_rate / allowed_failure_rate
    const actualFailureRate = totalRequests > 0 ? failedRequests / totalRequests : 0;
    const burnRate = allowedFailureRate > 0 ? actualFailureRate / allowedFailureRate : 0;

    // Project when budget will be exhausted
    let projectedExhaustionMs: number | null = null;
    if (burnRate > 1 && remaining > 0) {
      const budgetRemainingFraction = remaining / Math.max(totalBudget, 1);
      const windowRemainingFraction = budgetRemainingFraction / burnRate;
      projectedExhaustionMs = windowRemainingFraction * slo.windowDurationMs;
    }

    // Determine policy action
    const policyAction = this.determinePolicyAction(remainingPercentage);

    const budget: ErrorBudget = {
      sloId,
      totalBudget,
      consumed,
      remaining,
      remainingPercentage,
      burnRate,
      projectedExhaustionMs,
      policyAction,
    };

    // Store in history
    const history = this.budgetHistory.get(sloId) ?? [];
    history.push(budget);
    this.budgetHistory.set(sloId, history);

    return budget;
  }

  /**
   * Calculate multi-window burn rates for alert evaluation
   * Short window (5min): catches sudden spikes
   * Long window (1h): confirms sustained issues
   */
  calculateBurnRate(sloId: string): BurnRate {
    const slo = this.slos.get(sloId);
    if (!slo) throw new Error(`SLO ${sloId} not found`);

    const now = Date.now();
    const shortWindowMs = 5 * 60 * 1000; // 5 minutes
    const longWindowMs = 60 * 60 * 1000; // 1 hour

    const shortWindowMeasurements = this.getMeasurementsInWindow(sloId, now - shortWindowMs);
    const longWindowMeasurements = this.getMeasurementsInWindow(sloId, now - longWindowMs);

    const shortBurnRate = this.computeBurnRateForWindow(shortWindowMeasurements, 1 - slo.target);
    const longBurnRate = this.computeBurnRateForWindow(longWindowMeasurements, 1 - slo.target);

    // Evaluate alert conditions
    let isAlerting = false;
    let alertSeverity: IncidentSeverity | null = null;

    for (const alert of slo.burnRateThresholds) {
      if (
        shortBurnRate >= alert.shortWindowMultiplier &&
        longBurnRate >= alert.longWindowMultiplier
      ) {
        isAlerting = true;
        alertSeverity = alert.severity;
        break; // Use first matching (assumed ordered by severity)
      }
    }

    return {
      shortWindow: shortBurnRate,
      longWindow: longBurnRate,
      shortWindowDurationMs: shortWindowMs,
      longWindowDurationMs: longWindowMs,
      isAlerting,
      alertSeverity,
    };
  }

  /**
   * Check if deployments should be frozen based on error budget
   */
  shouldFreezeDeployments(sloId: string): boolean {
    const budget = this.calculateErrorBudget(sloId);
    return budget.policyAction === 'freeze_deployments' || budget.policyAction === 'emergency';
  }

  /**
   * Check if extra approval is required for deployment
   */
  requiresExtraApproval(sloId: string): boolean {
    const budget = this.calculateErrorBudget(sloId);
    return budget.policyAction !== 'normal';
  }

  /**
   * Generate monthly SLO compliance report
   */
  generateComplianceReport(sloId: string, periodLabel: string): SLOComplianceReport {
    const slo = this.slos.get(sloId);
    if (!slo) throw new Error(`SLO ${sloId} not found`);

    const measurements = this.measurements.get(sloId) ?? [];
    const totalRequests = measurements.length;
    const failedRequests = measurements.filter((m) => !m.success).length;
    const achieved = totalRequests > 0 ? 1 - failedRequests / totalRequests : 1;

    // Count incidents (consecutive failure sequences)
    let incidents = 0;
    let longestOutageMs = 0;
    let currentOutageStart: number | null = null;
    let inOutage = false;

    const sorted = [...measurements].sort((a, b) => a.timestamp - b.timestamp);
    for (const m of sorted) {
      if (!m.success) {
        if (!inOutage) {
          inOutage = true;
          incidents++;
          currentOutageStart = m.timestamp;
        }
      } else {
        if (inOutage && currentOutageStart !== null) {
          const outageDuration = m.timestamp - currentOutageStart;
          if (outageDuration > longestOutageMs) {
            longestOutageMs = outageDuration;
          }
          inOutage = false;
          currentOutageStart = null;
        }
      }
    }

    // Handle ongoing outage
    if (inOutage && currentOutageStart !== null && sorted.length > 0) {
      const lastPoint = sorted[sorted.length - 1]!;
      const outageDuration = lastPoint.timestamp - currentOutageStart;
      if (outageDuration > longestOutageMs) {
        longestOutageMs = outageDuration;
      }
    }

    const allowedFailureRate = 1 - slo.target;
    const errorBudgetTotal = Math.floor(allowedFailureRate * totalRequests);
    const errorBudgetUsed = errorBudgetTotal > 0 ? failedRequests / errorBudgetTotal : 0;

    return {
      sloId,
      sloName: slo.name,
      period: periodLabel,
      target: slo.target,
      achieved,
      compliant: achieved >= slo.target,
      totalRequests,
      failedRequests,
      errorBudgetUsed: Math.min(errorBudgetUsed, 1),
      incidents,
      longestOutageMs,
    };
  }

  /**
   * Get all registered SLOs
   */
  getSLOs(): SLODefinition[] {
    return Array.from(this.slos.values());
  }

  /**
   * Get SLO by ID
   */
  getSLO(sloId: string): SLODefinition | undefined {
    return this.slos.get(sloId);
  }

  /**
   * Get budget history
   */
  getBudgetHistory(sloId: string): ErrorBudget[] {
    return this.budgetHistory.get(sloId) ?? [];
  }

  /**
   * Create default burn rate alert thresholds
   * Based on Google SRE workbook recommendations
   */
  static createDefaultAlertThresholds(): BurnRateAlert[] {
    return [
      {
        // 2% budget consumed in 1 hour -> page
        shortWindowMultiplier: 14.4,
        longWindowMultiplier: 6,
        severity: 'P1',
        action: 'page_immediately',
      },
      {
        // 5% budget consumed in 6 hours -> ticket
        shortWindowMultiplier: 6,
        longWindowMultiplier: 3,
        severity: 'P2',
        action: 'create_ticket',
      },
      {
        // 10% budget consumed in 3 days -> email
        shortWindowMultiplier: 3,
        longWindowMultiplier: 1,
        severity: 'P3',
        action: 'email_notification',
      },
    ];
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  private getMeasurementsInWindow(sloId: string, windowStartMs?: number): MeasurementPoint[] {
    const all = this.measurements.get(sloId) ?? [];
    if (windowStartMs === undefined) return all;
    return all.filter((m) => m.timestamp >= windowStartMs);
  }

  private computeBurnRateForWindow(
    measurements: MeasurementPoint[],
    allowedFailureRate: number,
  ): number {
    if (measurements.length === 0 || allowedFailureRate <= 0) return 0;
    const failures = measurements.filter((m) => !m.success).length;
    const actualFailureRate = failures / measurements.length;
    return actualFailureRate / allowedFailureRate;
  }

  private determinePolicyAction(remainingPercentage: number): BudgetPolicyAction {
    if (remainingPercentage <= 0) return 'emergency';
    if (remainingPercentage < 10) return 'freeze_deployments';
    if (remainingPercentage < 25) return 'caution';
    return 'normal';
  }
}
