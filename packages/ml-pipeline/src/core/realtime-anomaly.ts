// ============================================================================
// ML Pipeline - Realtime Anomaly Detection
// ============================================================================

import type {
  AnomalyStreamConfig,
  AnomalyAlert,
  AnomalySeverity,
  EWMAState,
  SeasonalComponent,
} from '../types';

interface MetricWindow {
  values: number[];
  timestamps: number[];
  mean: number;
  variance: number;
  count: number;
}

interface AlertDeduplication {
  alertId: string;
  metricName: string;
  firstSeen: number;
  lastSeen: number;
  count: number;
  rootCauseGroup: string | null;
}

/** Streaming anomaly detection engine with multiple detection methods */
export class RealtimeAnomaly {
  private config: AnomalyStreamConfig;
  private metricWindows: Map<string, MetricWindow>;
  private ewmaStates: Map<string, EWMAState>;
  private seasonalHistory: Map<string, number[]>;
  private recentAlerts: Map<string, AlertDeduplication>;
  private metricCorrelations: Map<string, Map<string, number>>;
  private alertCounter: number;

  constructor(config: Partial<AnomalyStreamConfig> = {}) {
    this.config = {
      windowSize: config.windowSize ?? 100,
      zScoreThreshold: config.zScoreThreshold ?? 3.0,
      ewmaAlpha: config.ewmaAlpha ?? 0.3,
      controlLimitK: config.controlLimitK ?? 3.0,
      seasonalPeriod: config.seasonalPeriod ?? 24,
      correlationThreshold: config.correlationThreshold ?? 0.8,
      deduplicationWindowMs: config.deduplicationWindowMs ?? 300000,
      minDataPoints: config.minDataPoints ?? 10,
    };
    this.metricWindows = new Map();
    this.ewmaStates = new Map();
    this.seasonalHistory = new Map();
    this.recentAlerts = new Map();
    this.metricCorrelations = new Map();
    this.alertCounter = 0;
  }

  /** Ingest a new data point for a metric */
  ingest(metricName: string, value: number, timestamp?: number): AnomalyAlert[] {
    const ts = timestamp ?? Date.now();
    const alerts: AnomalyAlert[] = [];

    // Update sliding window
    this.updateWindow(metricName, value, ts);

    // Update seasonal history
    this.updateSeasonalHistory(metricName, value);

    const window = this.metricWindows.get(metricName)!;

    // Only detect anomalies after sufficient data
    if (window.count < this.config.minDataPoints) {
      return alerts;
    }

    // Z-score detection
    const zScoreAlert = this.detectZScoreAnomaly(metricName, value, ts);
    if (zScoreAlert) alerts.push(zScoreAlert);

    // EWMA detection
    const ewmaAlert = this.detectEWMAAnomaly(metricName, value, ts);
    if (ewmaAlert) alerts.push(ewmaAlert);

    // Seasonal detection
    const seasonalAlert = this.detectSeasonalAnomaly(metricName, value, ts);
    if (seasonalAlert) alerts.push(seasonalAlert);

    // Deduplicate alerts
    return this.deduplicateAlerts(alerts, ts);
  }

  /** Update sliding window with Welford's online algorithm for mean/variance */
  private updateWindow(metricName: string, value: number, timestamp: number): void {
    if (!this.metricWindows.has(metricName)) {
      this.metricWindows.set(metricName, {
        values: [],
        timestamps: [],
        mean: 0,
        variance: 0,
        count: 0,
      });
    }

    const window = this.metricWindows.get(metricName)!;

    // Add new value
    window.values.push(value);
    window.timestamps.push(timestamp);
    window.count++;

    // Maintain window size
    while (window.values.length > this.config.windowSize) {
      window.values.shift();
      window.timestamps.shift();
    }

    // Welford's online algorithm for mean and variance
    const n = window.values.length;
    if (n === 1) {
      window.mean = value;
      window.variance = 0;
    } else {
      // Recompute from window (for accuracy after evictions)
      let sum = 0;
      for (const v of window.values) {
        sum += v;
      }
      window.mean = sum / n;

      let sumSquaredDiff = 0;
      for (const v of window.values) {
        sumSquaredDiff += (v - window.mean) * (v - window.mean);
      }
      window.variance = n > 1 ? sumSquaredDiff / (n - 1) : 0;
    }
  }

  /** Update seasonal history for decomposition */
  private updateSeasonalHistory(metricName: string, value: number): void {
    if (!this.seasonalHistory.has(metricName)) {
      this.seasonalHistory.set(metricName, []);
    }
    const history = this.seasonalHistory.get(metricName)!;
    history.push(value);

    // Keep enough history for seasonal decomposition
    const maxHistory = this.config.seasonalPeriod * 5;
    while (history.length > maxHistory) {
      history.shift();
    }
  }

  /**
   * Streaming Z-score anomaly detection on sliding windows
   * Z = (x - mu) / sigma
   */
  detectZScoreAnomaly(metricName: string, value: number, timestamp: number): AnomalyAlert | null {
    const window = this.metricWindows.get(metricName);
    if (!window || window.count < this.config.minDataPoints) return null;

    const std = Math.sqrt(window.variance);
    if (std === 0) return null;

    const zScore = Math.abs(value - window.mean) / std;

    if (zScore > this.config.zScoreThreshold) {
      const severity = this.classifySeverity(zScore, this.config.zScoreThreshold);
      return {
        id: `alert-${++this.alertCounter}`,
        metricName,
        severity,
        value,
        expected: window.mean,
        deviation: zScore,
        timestamp,
        detectionMethod: 'z_score',
        rootCauseGroup: null,
        deduplicated: false,
      };
    }

    return null;
  }

  /**
   * EWMA (Exponentially Weighted Moving Average) with dynamic control limits
   * EWMA_t = alpha * x_t + (1 - alpha) * EWMA_{t-1}
   * UCL = mu + k * sigma * sqrt(alpha / (2 - alpha))
   * LCL = mu - k * sigma * sqrt(alpha / (2 - alpha))
   */
  detectEWMAAnomaly(metricName: string, value: number, timestamp: number): AnomalyAlert | null {
    if (!this.ewmaStates.has(metricName)) {
      this.ewmaStates.set(metricName, {
        mean: value,
        variance: 0,
        ucl: value,
        lcl: value,
        sampleCount: 1,
        lastUpdate: timestamp,
      });
      return null;
    }

    const state = this.ewmaStates.get(metricName)!;
    const alpha = this.config.ewmaAlpha;
    const k = this.config.controlLimitK;

    // Update EWMA
    const oldMean = state.mean;
    state.mean = alpha * value + (1 - alpha) * state.mean;

    // Update variance estimate
    const diff = value - oldMean;
    state.variance = (1 - alpha) * (state.variance + alpha * diff * diff);

    state.sampleCount++;
    state.lastUpdate = timestamp;

    // Compute control limits
    const sigma = Math.sqrt(state.variance);
    const ewmaStdFactor = Math.sqrt(alpha / (2 - alpha));
    state.ucl = state.mean + k * sigma * ewmaStdFactor;
    state.lcl = state.mean - k * sigma * ewmaStdFactor;

    // Check if value breaches control limits
    if (state.sampleCount >= this.config.minDataPoints) {
      if (value > state.ucl || value < state.lcl) {
        const deviation = sigma > 0 ? Math.abs(value - state.mean) / sigma : 0;
        const severity = this.classifySeverity(deviation, k);
        return {
          id: `alert-${++this.alertCounter}`,
          metricName,
          severity,
          value,
          expected: state.mean,
          deviation,
          timestamp,
          detectionMethod: 'ewma',
          rootCauseGroup: null,
          deduplicated: false,
        };
      }
    }

    return null;
  }

  /**
   * Seasonal decomposition (STL-lite) using centered moving averages
   * Decomposes time series into trend + seasonal + residual
   */
  computeSeasonalDecomposition(metricName: string): SeasonalComponent | null {
    const history = this.seasonalHistory.get(metricName);
    if (!history || history.length < this.config.seasonalPeriod * 2) return null;

    const period = this.config.seasonalPeriod;
    const n = history.length;

    // Compute trend using centered moving average
    const trend = new Array(n).fill(0);
    const halfPeriod = Math.floor(period / 2);

    for (let i = halfPeriod; i < n - halfPeriod; i++) {
      let sum = 0;
      for (let j = i - halfPeriod; j <= i + halfPeriod; j++) {
        sum += history[j] ?? 0;
      }
      trend[i] = sum / period;
    }

    // Fill edges of trend
    for (let i = 0; i < halfPeriod; i++) {
      trend[i] = trend[halfPeriod];
    }
    for (let i = n - halfPeriod; i < n; i++) {
      trend[i] = trend[n - halfPeriod - 1];
    }

    // Compute seasonal component
    const detrended = history.map((v, i) => v - trend[i]);
    const seasonal = new Array(n).fill(0);

    // Average detrended values at each seasonal position
    for (let pos = 0; pos < period; pos++) {
      let sum = 0;
      let count = 0;
      for (let i = pos; i < n; i += period) {
        sum += detrended[i] ?? 0;
        count++;
      }
      const avgSeasonal = count > 0 ? sum / count : 0;
      for (let i = pos; i < n; i += period) {
        seasonal[i] = avgSeasonal;
      }
    }

    // Residual = original - trend - seasonal
    const residual = history.map((v, i) => v - (trend[i] ?? 0) - (seasonal[i] ?? 0));

    return { trend, seasonal, residual, period };
  }

  /** Detect anomaly using seasonal decomposition residuals */
  detectSeasonalAnomaly(metricName: string, value: number, timestamp: number): AnomalyAlert | null {
    const decomposition = this.computeSeasonalDecomposition(metricName);
    if (!decomposition) return null;

    const residuals = decomposition.residual;
    if (residuals.length < this.config.minDataPoints) return null;

    // Compute statistics of residuals
    let sum = 0;
    for (const r of residuals) {
      sum += r;
    }
    const meanResidual = sum / residuals.length;

    let sumSquared = 0;
    for (const r of residuals) {
      sumSquared += (r - meanResidual) * (r - meanResidual);
    }
    const stdResidual = Math.sqrt(sumSquared / (residuals.length - 1));

    if (stdResidual === 0) return null;

    // Check if latest residual is anomalous
    const lastResidual = residuals[residuals.length - 1] ?? 0;
    const zScore = Math.abs(lastResidual - meanResidual) / stdResidual;

    if (zScore > this.config.zScoreThreshold) {
      const expectedValue = value - lastResidual + meanResidual;
      const severity = this.classifySeverity(zScore, this.config.zScoreThreshold);
      return {
        id: `alert-${++this.alertCounter}`,
        metricName,
        severity,
        value,
        expected: expectedValue,
        deviation: zScore,
        timestamp,
        detectionMethod: 'seasonal',
        rootCauseGroup: null,
        deduplicated: false,
      };
    }

    return null;
  }

  /**
   * Multi-metric correlation for cascading failure detection
   * Detects when multiple correlated metrics simultaneously deviate
   */
  detectCorrelatedAnomalies(alerts: AnomalyAlert[]): AnomalyAlert[] {
    if (alerts.length < 2) return alerts;

    // Group alerts by time proximity
    const timeGrouped = new Map<string, AnomalyAlert[]>();
    for (const alert of alerts) {
      const timeKey = Math.floor(alert.timestamp / this.config.deduplicationWindowMs).toString();
      if (!timeGrouped.has(timeKey)) {
        timeGrouped.set(timeKey, []);
      }
      timeGrouped.get(timeKey)!.push(alert);
    }

    // For groups with multiple alerts, check metric correlations
    const enrichedAlerts: AnomalyAlert[] = [];

    for (const group of timeGrouped.values()) {
      if (group.length >= 2) {
        // These metrics are likely correlated (cascading failure)
        const rootCause = this.identifyRootCause(group);
        for (const alert of group) {
          enrichedAlerts.push({
            ...alert,
            rootCauseGroup: rootCause,
          });
        }
      } else {
        enrichedAlerts.push(...group);
      }
    }

    return enrichedAlerts;
  }

  /** Identify likely root cause from a group of correlated alerts */
  private identifyRootCause(alerts: AnomalyAlert[]): string {
    // The metric with the highest deviation is likely the root cause
    let maxDeviation = 0;
    const firstAlert = alerts[0]!;
    let rootCauseMetric = firstAlert.metricName;

    for (const alert of alerts) {
      if (alert.deviation > maxDeviation) {
        maxDeviation = alert.deviation;
        rootCauseMetric = alert.metricName;
      }
    }

    return rootCauseMetric;
  }

  /** Update metric correlations based on concurrent observations */
  updateCorrelations(metricA: string, metricB: string): void {
    const windowA = this.metricWindows.get(metricA);
    const windowB = this.metricWindows.get(metricB);
    if (!windowA || !windowB) return;

    const minLen = Math.min(windowA.values.length, windowB.values.length);
    if (minLen < this.config.minDataPoints) return;

    // Compute Pearson correlation
    const valuesA = windowA.values.slice(-minLen);
    const valuesB = windowB.values.slice(-minLen);

    const meanA = valuesA.reduce((s, v) => s + v, 0) / minLen;
    const meanB = valuesB.reduce((s, v) => s + v, 0) / minLen;

    let numerator = 0;
    let denomA = 0;
    let denomB = 0;

    for (let i = 0; i < minLen; i++) {
      const dA = (valuesA[i] ?? 0) - meanA;
      const dB = (valuesB[i] ?? 0) - meanB;
      numerator += dA * dB;
      denomA += dA * dA;
      denomB += dB * dB;
    }

    const denom = Math.sqrt(denomA * denomB);
    const correlation = denom > 0 ? numerator / denom : 0;

    if (!this.metricCorrelations.has(metricA)) {
      this.metricCorrelations.set(metricA, new Map());
    }
    this.metricCorrelations.get(metricA)!.set(metricB, correlation);
  }

  /** Get correlated metrics for a given metric */
  getCorrelatedMetrics(metricName: string): Array<{ metric: string; correlation: number }> {
    const correlations = this.metricCorrelations.get(metricName);
    if (!correlations) return [];

    return Array.from(correlations.entries())
      .filter(([, corr]) => Math.abs(corr) >= this.config.correlationThreshold)
      .map(([metric, correlation]) => ({ metric, correlation }))
      .sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation));
  }

  /**
   * Alert deduplication with root cause grouping
   * Prevents alert fatigue by grouping repeated alerts
   */
  private deduplicateAlerts(alerts: AnomalyAlert[], timestamp: number): AnomalyAlert[] {
    const deduplicated: AnomalyAlert[] = [];

    for (const alert of alerts) {
      const dedupeKey = `${alert.metricName}:${alert.detectionMethod}`;
      const existing = this.recentAlerts.get(dedupeKey);

      if (existing && timestamp - existing.lastSeen < this.config.deduplicationWindowMs) {
        // Update existing deduplication record
        existing.lastSeen = timestamp;
        existing.count++;
        // Mark as deduplicated but still include for correlation analysis
        deduplicated.push({ ...alert, deduplicated: true });
      } else {
        // New alert
        this.recentAlerts.set(dedupeKey, {
          alertId: alert.id,
          metricName: alert.metricName,
          firstSeen: timestamp,
          lastSeen: timestamp,
          count: 1,
          rootCauseGroup: alert.rootCauseGroup,
        });
        deduplicated.push(alert);
      }
    }

    // Clean up old deduplication entries
    for (const [key, entry] of this.recentAlerts) {
      if (timestamp - entry.lastSeen > this.config.deduplicationWindowMs * 2) {
        this.recentAlerts.delete(key);
      }
    }

    return deduplicated.filter((a) => !a.deduplicated);
  }

  /** Classify anomaly severity based on deviation magnitude */
  private classifySeverity(deviation: number, threshold: number): AnomalySeverity {
    const ratio = deviation / threshold;
    if (ratio >= 3.0) return 'emergency';
    if (ratio >= 2.0) return 'critical';
    if (ratio >= 1.5) return 'warning';
    return 'info';
  }

  /** Get EWMA state for a metric */
  getEWMAState(metricName: string): EWMAState | undefined {
    return this.ewmaStates.get(metricName);
  }

  /** Get current window statistics for a metric */
  getWindowStats(
    metricName: string,
  ): { mean: number; variance: number; count: number } | undefined {
    const window = this.metricWindows.get(metricName);
    if (!window) return undefined;
    return { mean: window.mean, variance: window.variance, count: window.count };
  }

  /** Reset all state for a metric */
  resetMetric(metricName: string): void {
    this.metricWindows.delete(metricName);
    this.ewmaStates.delete(metricName);
    this.seasonalHistory.delete(metricName);
  }

  /** Get all monitored metrics */
  getMonitoredMetrics(): string[] {
    return Array.from(this.metricWindows.keys());
  }
}
