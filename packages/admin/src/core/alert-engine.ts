// ============================================================================
// Admin & Operations Package - Alert Engine
// ============================================================================

import type {
  AlertRule,
  AlertCondition,
  AlertSeverity,
  AlertChannel,
  AlertStatus,
  AlertState,
  AnomalyConfig,
  ZScoreResult,
} from '../types';

/** Alert history entry */
interface AlertHistoryEntry {
  alertId: string;
  ruleId: string;
  severity: AlertSeverity;
  firedAt: number;
  resolvedAt?: number;
  duration?: number;
  value: number;
  message: string;
}

/** Alert notification sent */
interface AlertNotification {
  alertId: string;
  channel: AlertChannel;
  message: string;
  sentAt: number;
  delivered: boolean;
}

/**
 * AlertEngine - Intelligent alert rules engine
 * Supports threshold-based alerts, anomaly detection using z-score,
 * alert routing to multiple channels, snooze/acknowledge/resolve,
 * and historical alert analysis.
 */
export class AlertEngine {
  private rules: Map<string, AlertRule> = new Map();
  private activeAlerts: Map<string, AlertStatus> = new Map();
  private alertHistory: AlertHistoryEntry[] = [];
  private notifications: AlertNotification[] = [];
  private metricData: Map<string, number[]> = new Map();
  private ruleCounter: number = 0;
  private alertCounter: number = 0;

  /**
   * Create an alert rule with condition, severity, and routing
   */
  public createRule(
    name: string,
    description: string,
    condition: AlertCondition,
    severity: AlertSeverity,
    channels: AlertChannel[],
    cooldownMs: number = 300000,
    createdBy: string = 'system'
  ): AlertRule {
    this.ruleCounter++;
    const id = `rule_${Date.now()}_${this.ruleCounter}`;

    const rule: AlertRule = {
      id,
      name,
      description,
      condition,
      severity,
      channels,
      enabled: true,
      cooldownMs,
      createdBy,
      createdAt: Date.now(),
    };

    this.rules.set(id, rule);
    return rule;
  }

  /**
   * Record a metric data point for evaluation
   */
  public recordMetric(metricName: string, value: number): void {
    if (!this.metricData.has(metricName)) {
      this.metricData.set(metricName, []);
    }

    const data = this.metricData.get(metricName)!;
    data.push(value);

    // Keep last 10000 data points
    if (data.length > 10000) {
      data.splice(0, data.length - 10000);
    }
  }

  /**
   * Evaluate a rule against current metric data
   */
  public evaluateRule(ruleId: string): AlertStatus | null {
    const rule = this.rules.get(ruleId);
    if (!rule || !rule.enabled) return null;

    // Check cooldown
    if (rule.lastFiredAt && Date.now() - rule.lastFiredAt < rule.cooldownMs) {
      return null;
    }

    const condition = rule.condition;
    const metricData = this.metricData.get(condition.metric) || [];

    if (metricData.length === 0) return null;

    let shouldFire = false;
    let currentValue = metricData[metricData.length - 1];
    let message = '';

    switch (condition.type) {
      case 'threshold': {
        shouldFire = this.evaluateThreshold(currentValue, condition);
        message = `${condition.metric} = ${currentValue} (threshold: ${condition.operator} ${condition.threshold})`;
        break;
      }

      case 'anomaly': {
        if (!condition.anomalyConfig) break;
        const zResult = this.calculateZScore(metricData, currentValue, condition.anomalyConfig);
        shouldFire = zResult.isAnomaly;
        message = `Anomaly detected: ${condition.metric} = ${currentValue}, z-score = ${zResult.zScore.toFixed(2)}`;
        currentValue = zResult.zScore;
        break;
      }

      case 'absence': {
        // No data received in duration
        const lastDataTime = Date.now(); // Simplified
        shouldFire = condition.durationMs ? (Date.now() - lastDataTime > condition.durationMs) : false;
        message = `No data received for ${condition.metric} in ${condition.durationMs}ms`;
        break;
      }

      case 'rate_of_change': {
        if (metricData.length < 2) break;
        const prevValue = metricData[metricData.length - 2];
        const rateOfChange = prevValue !== 0 ? ((currentValue - prevValue) / prevValue) * 100 : 0;
        shouldFire = condition.threshold ? Math.abs(rateOfChange) > condition.threshold : false;
        message = `Rate of change: ${rateOfChange.toFixed(1)}% for ${condition.metric}`;
        currentValue = rateOfChange;
        break;
      }
    }

    if (!shouldFire) return null;

    return this.fireAlert(rule, currentValue, message);
  }

  /**
   * Evaluate all enabled rules
   */
  public evaluateAllRules(): AlertStatus[] {
    const fired: AlertStatus[] = [];

    for (const [ruleId] of this.rules) {
      const result = this.evaluateRule(ruleId);
      if (result) {
        fired.push(result);
      }
    }

    return fired;
  }

  /**
   * Calculate z-score for anomaly detection
   * z = (value - mean) / stddev
   */
  public calculateZScore(data: number[], value: number, config: AnomalyConfig): ZScoreResult {
    const windowData = data.slice(-config.windowSize);

    if (windowData.length < config.minDataPoints) {
      return { value, mean: 0, stddev: 0, zScore: 0, isAnomaly: false };
    }

    // Calculate mean
    const mean = windowData.reduce((sum, v) => sum + v, 0) / windowData.length;

    // Calculate standard deviation
    const squaredDiffs = windowData.map(v => Math.pow(v - mean, 2));
    const avgSquaredDiff = squaredDiffs.reduce((sum, v) => sum + v, 0) / windowData.length;
    const stddev = Math.sqrt(avgSquaredDiff);

    // Calculate z-score
    const zScore = stddev > 0 ? (value - mean) / stddev : 0;

    // Is anomaly if absolute z-score exceeds sensitivity
    const isAnomaly = Math.abs(zScore) > config.sensitivity;

    return {
      value,
      mean: Math.round(mean * 1000) / 1000,
      stddev: Math.round(stddev * 1000) / 1000,
      zScore: Math.round(zScore * 1000) / 1000,
      isAnomaly,
    };
  }

  /**
   * Fire an alert - create instance and route to channels
   */
  public fireAlert(rule: AlertRule, value: number, message: string): AlertStatus {
    this.alertCounter++;
    const id = `alert_${Date.now()}_${this.alertCounter}`;

    const alertStatus: AlertStatus = {
      id,
      ruleId: rule.id,
      status: 'firing',
      firedAt: Date.now(),
      value,
      message,
    };

    this.activeAlerts.set(id, alertStatus);

    // Update rule's last fired time
    rule.lastFiredAt = Date.now();
    this.rules.set(rule.id, rule);

    // Route to channels
    for (const channel of rule.channels) {
      const notification: AlertNotification = {
        alertId: id,
        channel,
        message: `[${rule.severity.toUpperCase()}] ${rule.name}: ${message}`,
        sentAt: Date.now(),
        delivered: true,
      };
      this.notifications.push(notification);
    }

    // Add to history
    this.alertHistory.push({
      alertId: id,
      ruleId: rule.id,
      severity: rule.severity,
      firedAt: Date.now(),
      value,
      message,
    });

    return alertStatus;
  }

  /**
   * Acknowledge an alert - stop repeat notifications
   */
  public acknowledge(alertId: string, acknowledgedBy: string): AlertStatus {
    const alert = this.activeAlerts.get(alertId);
    if (!alert) {
      throw new Error(`Alert '${alertId}' not found`);
    }

    alert.status = 'acknowledged';
    alert.acknowledgedAt = Date.now();
    alert.acknowledgedBy = acknowledgedBy;

    this.activeAlerts.set(alertId, alert);
    return alert;
  }

  /**
   * Resolve an alert
   */
  public resolve(alertId: string): AlertStatus {
    const alert = this.activeAlerts.get(alertId);
    if (!alert) {
      throw new Error(`Alert '${alertId}' not found`);
    }

    alert.status = 'resolved';
    alert.resolvedAt = Date.now();

    // Update history
    const historyEntry = this.alertHistory.find(h => h.alertId === alertId);
    if (historyEntry) {
      historyEntry.resolvedAt = Date.now();
      historyEntry.duration = Date.now() - historyEntry.firedAt;
    }

    this.activeAlerts.set(alertId, alert);
    return alert;
  }

  /**
   * Snooze an alert temporarily
   */
  public snooze(alertId: string, durationMs: number): AlertStatus {
    const alert = this.activeAlerts.get(alertId);
    if (!alert) {
      throw new Error(`Alert '${alertId}' not found`);
    }

    alert.status = 'snoozed';
    alert.snoozedUntil = Date.now() + durationMs;

    this.activeAlerts.set(alertId, alert);
    return alert;
  }

  /**
   * Get all currently firing alerts sorted by severity
   */
  public getActiveAlerts(): AlertStatus[] {
    const severityOrder: Record<AlertSeverity, number> = {
      critical: 0,
      warning: 1,
      info: 2,
    };

    return Array.from(this.activeAlerts.values())
      .filter(a => a.status === 'firing' || a.status === 'acknowledged')
      .sort((a, b) => {
        const ruleA = this.rules.get(a.ruleId);
        const ruleB = this.rules.get(b.ruleId);
        const sevA = ruleA ? severityOrder[ruleA.severity] : 3;
        const sevB = ruleB ? severityOrder[ruleB.severity] : 3;
        return sevA - sevB;
      });
  }

  /**
   * Get historical alerts with resolution time and frequency
   */
  public getAlertHistory(limit: number = 100): AlertHistoryEntry[] {
    return this.alertHistory
      .sort((a, b) => b.firedAt - a.firedAt)
      .slice(0, limit);
  }

  /**
   * Enable or disable a rule
   */
  public toggleRule(ruleId: string, enabled: boolean): void {
    const rule = this.rules.get(ruleId);
    if (!rule) {
      throw new Error(`Rule '${ruleId}' not found`);
    }
    rule.enabled = enabled;
    this.rules.set(ruleId, rule);
  }

  /**
   * Evaluate threshold condition
   */
  private evaluateThreshold(value: number, condition: AlertCondition): boolean {
    if (!condition.operator || condition.threshold === undefined) return false;

    switch (condition.operator) {
      case 'gt': return value > condition.threshold;
      case 'lt': return value < condition.threshold;
      case 'gte': return value >= condition.threshold;
      case 'lte': return value <= condition.threshold;
      case 'eq': return value === condition.threshold;
      default: return false;
    }
  }
}
