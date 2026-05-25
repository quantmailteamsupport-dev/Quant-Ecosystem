// ============================================================================
// Analytics - Predictive Analytics
// Time-series forecasting using Triple Exponential Smoothing (Holt-Winters)
// with trend decomposition, anomaly detection, and scenario modeling
// ============================================================================

import type {
  ForecastConfig,
  ForecastResult,
  ConfidenceInterval,
  DecompositionResult,
  WhatIfScenario,
  ScenarioResult,
  TimeSeriesPoint,
} from '../types';

/** Default forecast configuration */
const DEFAULT_FORECAST_CONFIG: ForecastConfig = {
  alpha: 0.3,
  beta: 0.1,
  gamma: 0.2,
  seasonalPeriod: 12,
  seasonalModel: 'multiplicative',
  forecastHorizon: 12,
  confidenceLevel: 0.95,
  anomalyThreshold: 2.0,
};

/**
 * PredictiveAnalytics - Time-series forecasting engine
 *
 * Implements Triple Exponential Smoothing (Holt-Winters method) with both
 * additive and multiplicative seasonal variants. Provides trend decomposition,
 * confidence intervals, anomaly detection, and what-if scenario modeling.
 *
 * Mathematical foundations:
 * - Multiplicative: L_t = alpha * y_t/S_{t-m} + (1-alpha) * (L_{t-1} + T_{t-1})
 * - Trend: T_t = beta * (L_t - L_{t-1}) + (1-beta) * T_{t-1}
 * - Season: S_t = gamma * y_t/L_t + (1-gamma) * S_{t-m}
 * - Forecast: F_{t+h} = (L_t + h*T_t) * S_{t-m+h_mod_m}
 */
export class PredictiveAnalytics {
  private config: ForecastConfig;
  private historicalData: TimeSeriesPoint[] = [];
  private levels: number[] = [];
  private trends: number[] = [];
  private seasonals: number[] = [];
  private fittedValues: number[] = [];
  private residuals: number[] = [];
  private isFitted: boolean = false;

  constructor(config: Partial<ForecastConfig> = {}) {
    this.config = { ...DEFAULT_FORECAST_CONFIG, ...config };
  }

  /**
   * Fit the Holt-Winters model to historical data
   */
  fit(data: TimeSeriesPoint[]): void {
    if (data.length < this.config.seasonalPeriod * 2) {
      throw new Error(
        `Need at least ${this.config.seasonalPeriod * 2} data points for seasonal decomposition`,
      );
    }

    this.historicalData = [...data];
    const values = data.map((d) => d.value);
    const m = this.config.seasonalPeriod;

    // Initialize level and trend using first two complete seasons
    const firstSeasonMean = this.mean(values.slice(0, m));
    const secondSeasonMean = this.mean(values.slice(m, m * 2));
    let level = firstSeasonMean;
    let trend = (secondSeasonMean - firstSeasonMean) / m;

    // Initialize seasonal components
    const seasonalInit: number[] = new Array(m);
    for (let i = 0; i < m; i++) {
      const firstVal = values[i];
      if (firstVal !== undefined) {
        if (this.config.seasonalModel === 'multiplicative') {
          seasonalInit[i] = firstSeasonMean !== 0 ? firstVal / firstSeasonMean : 1;
        } else {
          seasonalInit[i] = firstVal - firstSeasonMean;
        }
      } else {
        seasonalInit[i] = this.config.seasonalModel === 'multiplicative' ? 1 : 0;
      }
    }

    this.levels = [level];
    this.trends = [trend];
    this.seasonals = [...seasonalInit];
    this.fittedValues = [];
    this.residuals = [];

    const { alpha, beta, gamma } = this.config;

    // Apply Holt-Winters recursion
    for (let t = 0; t < values.length; t++) {
      const y = values[t];
      if (y === undefined) continue;

      const seasonIndex = t % m;
      const prevSeasonal = this.seasonals[seasonIndex];

      if (prevSeasonal === undefined) continue;

      let newLevel: number;
      let fitted: number;

      if (this.config.seasonalModel === 'multiplicative') {
        // Multiplicative: L_t = alpha * y_t/S_{t-m} + (1-alpha) * (L_{t-1} + T_{t-1})
        const safeSeasonal = prevSeasonal !== 0 ? prevSeasonal : 1;
        newLevel = alpha * (y / safeSeasonal) + (1 - alpha) * (level + trend);
        fitted = (level + trend) * prevSeasonal;
      } else {
        // Additive: L_t = alpha * (y_t - S_{t-m}) + (1-alpha) * (L_{t-1} + T_{t-1})
        newLevel = alpha * (y - prevSeasonal) + (1 - alpha) * (level + trend);
        fitted = level + trend + prevSeasonal;
      }

      // Trend: T_t = beta * (L_t - L_{t-1}) + (1-beta) * T_{t-1}
      const newTrend = beta * (newLevel - level) + (1 - beta) * trend;

      // Seasonal: S_t = gamma * y_t/L_t + (1-gamma) * S_{t-m}
      let newSeasonal: number;
      if (this.config.seasonalModel === 'multiplicative') {
        const safeLevel = newLevel !== 0 ? newLevel : 1;
        newSeasonal = gamma * (y / safeLevel) + (1 - gamma) * prevSeasonal;
      } else {
        newSeasonal = gamma * (y - newLevel) + (1 - gamma) * prevSeasonal;
      }

      this.seasonals[seasonIndex] = newSeasonal;
      level = newLevel;
      trend = newTrend;

      this.levels.push(level);
      this.trends.push(trend);
      this.fittedValues.push(fitted);
      this.residuals.push(y - fitted);
    }

    this.isFitted = true;
  }

  /**
   * Generate multi-step ahead forecasts with confidence intervals
   */
  forecast(horizon?: number): ForecastResult[] {
    if (!this.isFitted) {
      throw new Error('Model must be fitted before forecasting');
    }

    const h = horizon ?? this.config.forecastHorizon;
    const m = this.config.seasonalPeriod;
    const lastLevel = this.levels[this.levels.length - 1];
    const lastTrend = this.trends[this.trends.length - 1];

    if (lastLevel === undefined || lastTrend === undefined) {
      throw new Error('Model state is invalid');
    }

    const residualStd = this.standardDeviation(this.residuals);
    const results: ForecastResult[] = [];
    const lastTimestamp =
      this.historicalData.length > 0
        ? (this.historicalData[this.historicalData.length - 1]?.timestamp ?? 0)
        : 0;
    const avgInterval = this.estimateInterval();

    for (let step = 1; step <= h; step++) {
      const seasonIndex = (this.historicalData.length + step - 1) % m;
      const seasonal =
        this.seasonals[seasonIndex] ?? (this.config.seasonalModel === 'multiplicative' ? 1 : 0);

      let predicted: number;
      if (this.config.seasonalModel === 'multiplicative') {
        // F_{t+h} = (L_t + h*T_t) * S_{t-m+h_mod_m}
        predicted = (lastLevel + step * lastTrend) * seasonal;
      } else {
        predicted = lastLevel + step * lastTrend + seasonal;
      }

      // Confidence interval widens with forecast horizon
      const standardError = residualStd * Math.sqrt(step);
      const zScore = this.getZScore(this.config.confidenceLevel);
      const margin = zScore * standardError;

      const confidence: ConfidenceInterval = {
        lower: predicted - margin,
        upper: predicted + margin,
        level: this.config.confidenceLevel,
        standardError,
      };

      results.push({
        timestamp: lastTimestamp + step * avgInterval,
        predicted,
        confidence,
        isAnomaly: false,
        anomalyScore: 0,
        components: {
          level: lastLevel + step * lastTrend,
          trend: lastTrend * step,
          seasonal,
          residual: 0,
        },
      });
    }

    return results;
  }

  /**
   * Detect anomalies by comparing actual values against forecast
   */
  detectAnomalies(data: TimeSeriesPoint[]): ForecastResult[] {
    if (!this.isFitted) {
      throw new Error('Model must be fitted before detecting anomalies');
    }

    const residualStd = this.standardDeviation(this.residuals);
    const results: ForecastResult[] = [];
    const m = this.config.seasonalPeriod;
    let level = this.levels[this.levels.length - 1] ?? 0;
    let trend = this.trends[this.trends.length - 1] ?? 0;

    for (let i = 0; i < data.length; i++) {
      const point = data[i];
      if (!point) continue;

      const seasonIndex = (this.historicalData.length + i) % m;
      const seasonal =
        this.seasonals[seasonIndex] ?? (this.config.seasonalModel === 'multiplicative' ? 1 : 0);

      let predicted: number;
      if (this.config.seasonalModel === 'multiplicative') {
        predicted = (level + trend) * seasonal;
      } else {
        predicted = level + trend + seasonal;
      }

      const residual = point.value - predicted;
      const anomalyScore = residualStd !== 0 ? Math.abs(residual) / residualStd : 0;
      const isAnomaly = anomalyScore > this.config.anomalyThreshold;

      const standardError = residualStd;
      const zScore = this.getZScore(this.config.confidenceLevel);

      results.push({
        timestamp: point.timestamp,
        predicted,
        actual: point.value,
        confidence: {
          lower: predicted - zScore * standardError,
          upper: predicted + zScore * standardError,
          level: this.config.confidenceLevel,
          standardError,
        },
        isAnomaly,
        anomalyScore,
        components: {
          level,
          trend,
          seasonal,
          residual,
        },
      });

      // Update state for next step
      const { alpha, beta, gamma } = this.config;
      if (this.config.seasonalModel === 'multiplicative') {
        const safeSeasonal = seasonal !== 0 ? seasonal : 1;
        const newLevel = alpha * (point.value / safeSeasonal) + (1 - alpha) * (level + trend);
        const newTrend = beta * (newLevel - level) + (1 - beta) * trend;
        const safeLevel = newLevel !== 0 ? newLevel : 1;
        this.seasonals[seasonIndex] = gamma * (point.value / safeLevel) + (1 - gamma) * seasonal;
        level = newLevel;
        trend = newTrend;
      } else {
        const newLevel = alpha * (point.value - seasonal) + (1 - alpha) * (level + trend);
        const newTrend = beta * (newLevel - level) + (1 - beta) * trend;
        this.seasonals[seasonIndex] = gamma * (point.value - newLevel) + (1 - gamma) * seasonal;
        level = newLevel;
        trend = newTrend;
      }
    }

    return results;
  }

  /**
   * Decompose time series into trend, seasonal, and residual components
   * using centered moving average method
   */
  decompose(data: TimeSeriesPoint[]): DecompositionResult {
    const values = data.map((d) => d.value);
    const m = this.config.seasonalPeriod;
    const n = values.length;

    // Step 1: Compute centered moving average for trend
    const trendComponent: number[] = new Array(n).fill(0);
    const halfWindow = Math.floor(m / 2);

    for (let i = halfWindow; i < n - halfWindow; i++) {
      let sum = 0;
      let count = 0;
      for (let j = i - halfWindow; j <= i + halfWindow; j++) {
        const val = values[j];
        if (val !== undefined) {
          sum += val;
          count++;
        }
      }
      trendComponent[i] = count > 0 ? sum / count : 0;
    }

    // Fill edges using linear extrapolation
    for (let i = 0; i < halfWindow; i++) {
      trendComponent[i] = trendComponent[halfWindow] ?? 0;
    }
    for (let i = n - halfWindow; i < n; i++) {
      trendComponent[i] = trendComponent[n - halfWindow - 1] ?? 0;
    }

    // Step 2: Compute seasonal component
    const seasonalComponent: number[] = new Array(n).fill(0);
    const seasonalAverages: number[] = new Array(m).fill(0);
    const seasonalCounts: number[] = new Array(m).fill(0);

    for (let i = 0; i < n; i++) {
      const val = values[i];
      const trendVal = trendComponent[i];
      if (val !== undefined && trendVal !== undefined && trendVal !== 0) {
        const idx = i % m;
        if (this.config.seasonalModel === 'multiplicative') {
          seasonalAverages[idx] = (seasonalAverages[idx] ?? 0) + val / trendVal;
        } else {
          seasonalAverages[idx] = (seasonalAverages[idx] ?? 0) + (val - trendVal);
        }
        seasonalCounts[idx] = (seasonalCounts[idx] ?? 0) + 1;
      }
    }

    // Normalize seasonal averages
    for (let i = 0; i < m; i++) {
      const count = seasonalCounts[i] ?? 1;
      seasonalAverages[i] =
        count > 0
          ? (seasonalAverages[i] ?? 0) / count
          : this.config.seasonalModel === 'multiplicative'
            ? 1
            : 0;
    }

    for (let i = 0; i < n; i++) {
      seasonalComponent[i] = seasonalAverages[i % m] ?? 0;
    }

    // Step 3: Compute residual
    const residualComponent: number[] = new Array(n).fill(0);
    for (let i = 0; i < n; i++) {
      const val = values[i] ?? 0;
      const trendVal = trendComponent[i] ?? 0;
      const seasonVal = seasonalComponent[i] ?? 0;
      if (this.config.seasonalModel === 'multiplicative') {
        const product = trendVal * seasonVal;
        residualComponent[i] = product !== 0 ? val / product : 0;
      } else {
        residualComponent[i] = val - trendVal - seasonVal;
      }
    }

    return {
      trend: trendComponent,
      seasonal: seasonalComponent,
      residual: residualComponent,
      observed: values,
    };
  }

  /**
   * What-if scenario modeling: perturb parameters and reforecast
   */
  whatIfScenario(scenarios: WhatIfScenario[]): ScenarioResult[] {
    if (!this.isFitted) {
      throw new Error('Model must be fitted before scenario modeling');
    }

    const results: ScenarioResult[] = [];

    for (const scenario of scenarios) {
      const scenarioConfig: ForecastConfig = {
        ...this.config,
        ...scenario.parameterOverrides,
      };

      // Create a new instance with modified parameters
      const scenarioModel = new PredictiveAnalytics(scenarioConfig);

      // Apply data adjustments if any
      let adjustedData = [...this.historicalData];
      if (scenario.dataAdjustments) {
        for (const adj of scenario.dataAdjustments) {
          const point = adjustedData[adj.index];
          if (point) {
            adjustedData[adj.index] = { ...point, value: point.value * adj.factor };
          }
        }
      }

      scenarioModel.fit(adjustedData);
      const forecasts = scenarioModel.forecast();

      // Calculate fit metrics on training data
      const fitted = scenarioModel.getFittedValues();
      const actual = adjustedData.map((d) => d.value);
      const rmse = this.calculateRMSE(actual, fitted);
      const mape = this.calculateMAPE(actual, fitted);

      results.push({
        scenarioName: scenario.name,
        forecasts,
        rmse,
        mape,
      });
    }

    return results;
  }

  /**
   * Optimize parameters using grid search on holdout RMSE
   */
  optimizeParameters(
    data: TimeSeriesPoint[],
    holdoutRatio: number = 0.2,
    gridResolution: number = 5,
  ): ForecastConfig {
    const splitIndex = Math.floor(data.length * (1 - holdoutRatio));
    const trainData = data.slice(0, splitIndex);
    const holdoutData = data.slice(splitIndex);

    let bestConfig = { ...this.config };
    let bestRMSE = Infinity;

    const step = 1 / gridResolution;

    for (let alpha = step; alpha <= 1; alpha += step) {
      for (let beta = step; beta <= 1; beta += step) {
        for (let gamma = step; gamma <= 1; gamma += step) {
          const testConfig: ForecastConfig = {
            ...this.config,
            alpha,
            beta,
            gamma,
          };

          try {
            const testModel = new PredictiveAnalytics(testConfig);
            testModel.fit(trainData);
            const forecasts = testModel.forecast(holdoutData.length);

            const predicted = forecasts.map((f) => f.predicted);
            const actual = holdoutData.map((d) => d.value);
            const rmse = this.calculateRMSE(actual, predicted);

            if (rmse < bestRMSE) {
              bestRMSE = rmse;
              bestConfig = testConfig;
            }
          } catch {
            // Skip invalid parameter combinations
          }
        }
      }
    }

    return bestConfig;
  }

  /**
   * Get fitted values from the model
   */
  getFittedValues(): number[] {
    return [...this.fittedValues];
  }

  /**
   * Get residuals from the model
   */
  getResiduals(): number[] {
    return [...this.residuals];
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  private mean(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, v) => sum + v, 0) / values.length;
  }

  private standardDeviation(values: number[]): number {
    if (values.length < 2) return 0;
    const avg = this.mean(values);
    const sumSquaredDiffs = values.reduce((sum, v) => sum + (v - avg) ** 2, 0);
    return Math.sqrt(sumSquaredDiffs / (values.length - 1));
  }

  private getZScore(confidenceLevel: number): number {
    // Approximation using inverse error function for common confidence levels
    const alpha = 1 - confidenceLevel;
    const halfAlpha = alpha / 2;

    // Rational approximation of inverse normal CDF
    if (halfAlpha <= 0) return 3.5;
    if (halfAlpha >= 0.5) return 0;

    const t = Math.sqrt(-2 * Math.log(halfAlpha));
    const c0 = 2.515517;
    const c1 = 0.802853;
    const c2 = 0.010328;
    const d1 = 1.432788;
    const d2 = 0.189269;
    const d3 = 0.001308;

    return t - (c0 + c1 * t + c2 * t * t) / (1 + d1 * t + d2 * t * t + d3 * t * t * t);
  }

  private estimateInterval(): number {
    if (this.historicalData.length < 2) return 1;
    const first = this.historicalData[0];
    const last = this.historicalData[this.historicalData.length - 1];
    if (!first || !last) return 1;
    return (last.timestamp - first.timestamp) / (this.historicalData.length - 1);
  }

  private calculateRMSE(actual: number[], predicted: number[]): number {
    const n = Math.min(actual.length, predicted.length);
    if (n === 0) return 0;
    let sumSquaredError = 0;
    for (let i = 0; i < n; i++) {
      const a = actual[i] ?? 0;
      const p = predicted[i] ?? 0;
      sumSquaredError += (a - p) ** 2;
    }
    return Math.sqrt(sumSquaredError / n);
  }

  private calculateMAPE(actual: number[], predicted: number[]): number {
    const n = Math.min(actual.length, predicted.length);
    if (n === 0) return 0;
    let sumAbsPercentError = 0;
    let validCount = 0;
    for (let i = 0; i < n; i++) {
      const a = actual[i] ?? 0;
      const p = predicted[i] ?? 0;
      if (a !== 0) {
        sumAbsPercentError += Math.abs((a - p) / a);
        validCount++;
      }
    }
    return validCount > 0 ? (sumAbsPercentError / validCount) * 100 : 0;
  }
}
