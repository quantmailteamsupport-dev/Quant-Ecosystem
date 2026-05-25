// ============================================================================
// ML Pipeline - Fraud Detector
// ============================================================================

import type {
  FraudSignal,
  FraudConfig,
  DeviceFingerprint,
  GeoLocation,
  AlertSeverity,
} from '../types';

interface ActionLog {
  action: string;
  timestamp: number;
  userId: string;
}

interface LoginPattern {
  hourHistogram: number[];
  dayHistogram: number[];
  avgSessionDuration: number;
  typicalDevices: Set<string>;
  lastLogin: number;
}

/** Fraud detection engine with behavioral analysis and ensemble scoring */
export class FraudDetector {
  private config: FraudConfig;
  private actionLogs: Map<string, ActionLog[]>;
  private deviceProfiles: Map<string, DeviceFingerprint[]>;
  private locationHistory: Map<string, GeoLocation[]>;
  private loginPatterns: Map<string, LoginPattern>;
  private transactionHistory: Map<string, number[]>;

  constructor(config: Partial<FraudConfig> = {}) {
    this.config = {
      velocityRules: config.velocityRules ?? [
        { action: 'login', maxCount: 10, windowMs: 3600000, severity: 'high' as AlertSeverity },
        {
          action: 'transaction',
          maxCount: 20,
          windowMs: 3600000,
          severity: 'critical' as AlertSeverity,
        },
        {
          action: 'message',
          maxCount: 100,
          windowMs: 3600000,
          severity: 'medium' as AlertSeverity,
        },
      ],
      geoMaxSpeedKmh: config.geoMaxSpeedKmh ?? 900,
      deviceAnomalyThreshold: config.deviceAnomalyThreshold ?? 3.0,
      accountTakeoverThreshold: config.accountTakeoverThreshold ?? 0.7,
      transactionAnomalyThreshold: config.transactionAnomalyThreshold ?? 0.6,
      ensembleWeights: config.ensembleWeights ?? {
        velocity: 0.2,
        device: 0.25,
        geo: 0.2,
        accountTakeover: 0.2,
        transaction: 0.15,
      },
      lookbackWindowMs: config.lookbackWindowMs ?? 86400000,
      maxRiskScore: config.maxRiskScore ?? 1.0,
    };
    this.actionLogs = new Map();
    this.deviceProfiles = new Map();
    this.locationHistory = new Map();
    this.loginPatterns = new Map();
    this.transactionHistory = new Map();
  }

  /** Record an action for velocity tracking */
  recordAction(userId: string, action: string, timestamp: number): void {
    if (!this.actionLogs.has(userId)) {
      this.actionLogs.set(userId, []);
    }
    this.actionLogs.get(userId)!.push({ action, timestamp, userId });

    // Prune old entries
    const cutoff = timestamp - this.config.lookbackWindowMs;
    const logs = this.actionLogs.get(userId)!;
    const pruned = logs.filter((log) => log.timestamp > cutoff);
    this.actionLogs.set(userId, pruned);
  }

  /** Record a device fingerprint */
  recordDevice(userId: string, device: DeviceFingerprint): void {
    if (!this.deviceProfiles.has(userId)) {
      this.deviceProfiles.set(userId, []);
    }
    this.deviceProfiles.get(userId)!.push(device);
  }

  /** Record a geographic location */
  recordLocation(userId: string, location: GeoLocation): void {
    if (!this.locationHistory.has(userId)) {
      this.locationHistory.set(userId, []);
    }
    this.locationHistory.get(userId)!.push(location);
  }

  /** Record login for pattern building */
  recordLogin(userId: string, timestamp: number, deviceId: string): void {
    if (!this.loginPatterns.has(userId)) {
      this.loginPatterns.set(userId, {
        hourHistogram: new Array(24).fill(0),
        dayHistogram: new Array(7).fill(0),
        avgSessionDuration: 0,
        typicalDevices: new Set(),
        lastLogin: 0,
      });
    }
    const pattern = this.loginPatterns.get(userId)!;
    const date = new Date(timestamp);
    const hour = date.getHours();
    const day = date.getDay();
    pattern.hourHistogram[hour] = (pattern.hourHistogram[hour] ?? 0) + 1;
    pattern.dayHistogram[day] = (pattern.dayHistogram[day] ?? 0) + 1;
    pattern.typicalDevices.add(deviceId);
    pattern.lastLogin = timestamp;
  }

  /** Record transaction amount */
  recordTransaction(userId: string, amount: number): void {
    if (!this.transactionHistory.has(userId)) {
      this.transactionHistory.set(userId, []);
    }
    this.transactionHistory.get(userId)!.push(amount);
  }

  /**
   * Behavioral velocity checks using sliding window counters
   * Counts actions within time window and compares against limits
   */
  checkVelocity(userId: string, now?: number): FraudSignal[] {
    const currentTime = now ?? Date.now();
    const signals: FraudSignal[] = [];
    const logs = this.actionLogs.get(userId) ?? [];

    for (const rule of this.config.velocityRules) {
      const windowStart = currentTime - rule.windowMs;
      const count = logs.filter(
        (log) => log.action === rule.action && log.timestamp >= windowStart,
      ).length;

      if (count > rule.maxCount) {
        const riskScore = Math.min(1.0, count / (rule.maxCount * 2));
        signals.push({
          userId,
          signalType: 'velocity_breach',
          riskScore,
          confidence: 0.9,
          timestamp: currentTime,
          details: {
            action: rule.action,
            count,
            maxAllowed: rule.maxCount,
            windowMs: rule.windowMs,
          },
          evidence: [
            `${count} ${rule.action} actions in ${rule.windowMs}ms (limit: ${rule.maxCount})`,
          ],
        });
      }
    }

    return signals;
  }

  /**
   * Device fingerprint anomaly detection using Mahalanobis distance
   * Measures how far a new device is from the user's typical device profile
   */
  checkDeviceAnomaly(userId: string, newDevice: DeviceFingerprint): FraudSignal | null {
    const knownDevices = this.deviceProfiles.get(userId);
    if (!knownDevices || knownDevices.length < 2) return null;

    // Compute mean and covariance of known device features
    const features = knownDevices.map((d) => d.features);
    const n = features.length;
    const firstFeatures = features[0];
    if (!firstFeatures) return null;
    const dim = firstFeatures.length;

    if (dim === 0) return null;

    // Mean vector
    const mean = new Array<number>(dim).fill(0);
    for (const f of features) {
      for (let i = 0; i < dim; i++) {
        mean[i] = (mean[i] ?? 0) + (f[i] ?? 0) / n;
      }
    }

    // Covariance matrix
    const cov: number[][] = Array.from({ length: dim }, () => new Array<number>(dim).fill(0));
    for (const f of features) {
      for (let i = 0; i < dim; i++) {
        for (let j = 0; j < dim; j++) {
          const covRow = cov[i]!;
          covRow[j] =
            (covRow[j] ?? 0) +
            (((f[i] ?? 0) - (mean[i] ?? 0)) * ((f[j] ?? 0) - (mean[j] ?? 0))) / (n - 1);
        }
      }
    }

    // Add regularization to prevent singular matrix
    for (let i = 0; i < dim; i++) {
      const covRow = cov[i]!;
      covRow[i] = (covRow[i] ?? 0) + 1e-6;
    }

    // Compute inverse using Gauss-Jordan elimination
    const covInverse = this.invertMatrix(cov);
    if (!covInverse) return null;

    // Mahalanobis distance: sqrt((x-mu)^T * S^-1 * (x-mu))
    const diff = newDevice.features.map((v, i) => v - (mean[i] ?? 0));
    let mahalanobis = 0;
    for (let i = 0; i < dim; i++) {
      let sum = 0;
      const invRow = covInverse[i]!;
      for (let j = 0; j < dim; j++) {
        sum += (invRow[j] ?? 0) * (diff[j] ?? 0);
      }
      mahalanobis += (diff[i] ?? 0) * sum;
    }
    mahalanobis = Math.sqrt(Math.max(0, mahalanobis));

    if (mahalanobis > this.config.deviceAnomalyThreshold) {
      const riskScore = Math.min(1.0, mahalanobis / (this.config.deviceAnomalyThreshold * 3));
      return {
        userId,
        signalType: 'device_anomaly',
        riskScore,
        confidence: Math.min(0.95, 0.5 + n * 0.05),
        timestamp: Date.now(),
        details: {
          mahalanobisDistance: mahalanobis,
          threshold: this.config.deviceAnomalyThreshold,
          knownDeviceCount: n,
          deviceId: newDevice.deviceId,
        },
        evidence: [
          `Mahalanobis distance ${mahalanobis.toFixed(2)} exceeds threshold ${this.config.deviceAnomalyThreshold}`,
        ],
      };
    }

    return null;
  }

  /**
   * Geographic impossibility detection
   * Checks if travel speed between consecutive locations exceeds max possible speed
   * Uses Haversine formula: d = 2r * arcsin(sqrt(sin^2((lat2-lat1)/2) + cos(lat1)*cos(lat2)*sin^2((lon2-lon1)/2)))
   */
  checkGeoImpossibility(userId: string, newLocation: GeoLocation): FraudSignal | null {
    const history = this.locationHistory.get(userId);
    if (!history || history.length === 0) return null;

    // Get most recent location
    const lastLocation = history[history.length - 1];
    if (!lastLocation) return null;
    const timeDiffHours = (newLocation.timestamp - lastLocation.timestamp) / (1000 * 60 * 60);

    if (timeDiffHours <= 0) return null;

    // Haversine distance calculation
    const R = 6371; // Earth radius in km
    const lat1 = (lastLocation.latitude * Math.PI) / 180;
    const lat2 = (newLocation.latitude * Math.PI) / 180;
    const dLat = ((newLocation.latitude - lastLocation.latitude) * Math.PI) / 180;
    const dLon = ((newLocation.longitude - lastLocation.longitude) * Math.PI) / 180;

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.asin(Math.sqrt(a));
    const distanceKm = R * c;

    const speedKmh = distanceKm / timeDiffHours;

    if (speedKmh > this.config.geoMaxSpeedKmh) {
      const riskScore = Math.min(1.0, speedKmh / (this.config.geoMaxSpeedKmh * 2));
      return {
        userId,
        signalType: 'geo_impossibility',
        riskScore,
        confidence: 0.85,
        timestamp: newLocation.timestamp,
        details: {
          distanceKm,
          timeDiffHours,
          speedKmh,
          maxSpeedKmh: this.config.geoMaxSpeedKmh,
          from: { lat: lastLocation.latitude, lon: lastLocation.longitude },
          to: { lat: newLocation.latitude, lon: newLocation.longitude },
        },
        evidence: [
          `Implied speed ${speedKmh.toFixed(0)} km/h exceeds max ${this.config.geoMaxSpeedKmh} km/h`,
        ],
      };
    }

    return null;
  }

  /**
   * Account takeover detection using login pattern deviation
   * Compares current login behavior against historical patterns
   */
  checkAccountTakeover(
    userId: string,
    loginHour: number,
    loginDay: number,
    deviceId: string,
  ): FraudSignal | null {
    const pattern = this.loginPatterns.get(userId);
    if (!pattern) return null;

    const totalLogins = pattern.hourHistogram.reduce((sum, v) => sum + v, 0);
    if (totalLogins < 5) return null; // Need minimum history

    // Score deviation across multiple dimensions
    let deviationScore = 0;

    // Hour deviation: how unusual is this login hour?
    const hourProb = (pattern.hourHistogram[loginHour] ?? 0) / totalLogins;
    const hourDeviation = 1 - hourProb;
    deviationScore += hourDeviation * 0.3;

    // Day deviation
    const dayProb = (pattern.dayHistogram[loginDay] ?? 0) / totalLogins;
    const dayDeviation = 1 - dayProb;
    deviationScore += dayDeviation * 0.2;

    // Device deviation: is this a known device?
    const isKnownDevice = pattern.typicalDevices.has(deviceId);
    if (!isKnownDevice) {
      deviationScore += 0.5;
    }

    if (deviationScore > this.config.accountTakeoverThreshold) {
      return {
        userId,
        signalType: 'account_takeover',
        riskScore: Math.min(1.0, deviationScore),
        confidence: Math.min(0.9, 0.5 + totalLogins * 0.01),
        timestamp: Date.now(),
        details: {
          hourDeviation,
          dayDeviation,
          isKnownDevice,
          totalHistoricalLogins: totalLogins,
          knownDeviceCount: pattern.typicalDevices.size,
        },
        evidence: [
          `Login pattern deviation score: ${deviationScore.toFixed(3)}`,
          isKnownDevice ? 'Known device' : 'Unknown device',
        ],
      };
    }

    return null;
  }

  /**
   * Transaction anomaly detection using Isolation Forest-inspired random split scoring
   * Anomaly score is based on average path length in random binary trees
   * Shorter paths = more anomalous (easier to isolate)
   */
  checkTransactionAnomaly(userId: string, amount: number): FraudSignal | null {
    const history = this.transactionHistory.get(userId);
    if (!history || history.length < 5) return null;

    // Compute isolation score using random splits
    const numTrees = 50;
    const maxDepth = Math.ceil(Math.log2(history.length));
    let totalPathLength = 0;

    for (let t = 0; t < numTrees; t++) {
      totalPathLength += this.isolationPathLength(amount, history, maxDepth, t);
    }

    const avgPathLength = totalPathLength / numTrees;

    // Expected path length for a normal point: c(n) = 2*(H(n-1)) - 2*(n-1)/n
    // where H(i) is the harmonic number approximation: ln(i) + 0.5772
    const n = history.length;
    const harmonicN = Math.log(n - 1) + 0.5772;
    const expectedPathLength = 2 * harmonicN - (2 * (n - 1)) / n;

    // Anomaly score: s(x, n) = 2^(-avgPathLength / expectedPathLength)
    const anomalyScore = Math.pow(2, -avgPathLength / expectedPathLength);

    if (anomalyScore > this.config.transactionAnomalyThreshold) {
      return {
        userId,
        signalType: 'transaction_anomaly',
        riskScore: anomalyScore,
        confidence: Math.min(0.9, 0.5 + history.length * 0.02),
        timestamp: Date.now(),
        details: {
          amount,
          anomalyScore,
          avgPathLength,
          expectedPathLength,
          historySize: history.length,
          threshold: this.config.transactionAnomalyThreshold,
        },
        evidence: [`Transaction amount ${amount} has isolation score ${anomalyScore.toFixed(3)}`],
      };
    }

    return null;
  }

  /** Compute path length in a random isolation tree */
  private isolationPathLength(
    value: number,
    data: number[],
    maxDepth: number,
    seed: number,
  ): number {
    let depth = 0;
    let currentData = [...data];

    while (depth < maxDepth && currentData.length > 1) {
      // Random split point between min and max
      const min = Math.min(...currentData);
      const max = Math.max(...currentData);
      if (min === max) break;

      // Deterministic random based on seed and depth
      const splitFraction = ((seed * 31 + depth * 17) % 97) / 97;
      const splitPoint = min + splitFraction * (max - min);

      // Partition
      if (value < splitPoint) {
        currentData = currentData.filter((v) => v < splitPoint);
      } else {
        currentData = currentData.filter((v) => v >= splitPoint);
      }

      depth++;
    }

    return depth;
  }

  /**
   * Combine all fraud signals using weighted ensemble scoring
   */
  computeRiskScore(signals: FraudSignal[]): number {
    if (signals.length === 0) return 0;

    const weights = this.config.ensembleWeights;
    let weightedSum = 0;
    let totalWeight = 0;

    for (const signal of signals) {
      let weight: number;
      switch (signal.signalType) {
        case 'velocity_breach':
          weight = weights.velocity;
          break;
        case 'device_anomaly':
          weight = weights.device;
          break;
        case 'geo_impossibility':
          weight = weights.geo;
          break;
        case 'account_takeover':
          weight = weights.accountTakeover;
          break;
        case 'transaction_anomaly':
          weight = weights.transaction;
          break;
        default:
          weight = 0.1;
      }

      weightedSum += signal.riskScore * signal.confidence * weight;
      totalWeight += weight;
    }

    if (totalWeight === 0) return 0;
    return Math.min(this.config.maxRiskScore, weightedSum / totalWeight);
  }

  /** Run all fraud checks for a user */
  analyze(
    userId: string,
    newDevice?: DeviceFingerprint,
    newLocation?: GeoLocation,
    transactionAmount?: number,
    loginHour?: number,
    loginDay?: number,
    deviceId?: string,
    now?: number,
  ): { signals: FraudSignal[]; overallRisk: number } {
    const signals: FraudSignal[] = [];

    // Velocity checks
    signals.push(...this.checkVelocity(userId, now));

    // Device anomaly
    if (newDevice) {
      const deviceSignal = this.checkDeviceAnomaly(userId, newDevice);
      if (deviceSignal) signals.push(deviceSignal);
    }

    // Geographic impossibility
    if (newLocation) {
      const geoSignal = this.checkGeoImpossibility(userId, newLocation);
      if (geoSignal) signals.push(geoSignal);
    }

    // Account takeover
    if (loginHour !== undefined && loginDay !== undefined && deviceId) {
      const atoSignal = this.checkAccountTakeover(userId, loginHour, loginDay, deviceId);
      if (atoSignal) signals.push(atoSignal);
    }

    // Transaction anomaly
    if (transactionAmount !== undefined) {
      const txnSignal = this.checkTransactionAnomaly(userId, transactionAmount);
      if (txnSignal) signals.push(txnSignal);
    }

    const overallRisk = this.computeRiskScore(signals);
    return { signals, overallRisk };
  }

  /** Matrix inversion using Gauss-Jordan elimination */
  private invertMatrix(matrix: number[][]): number[][] | null {
    const n = matrix.length;
    const augmented: number[][] = matrix.map((row, i) => {
      const identityRow = new Array<number>(n).fill(0);
      identityRow[i] = 1;
      return [...row, ...identityRow];
    });

    for (let col = 0; col < n; col++) {
      // Find pivot
      let maxRow = col;
      const colRow = augmented[col]!;
      let maxVal = Math.abs(colRow[col] ?? 0);
      for (let row = col + 1; row < n; row++) {
        const rowArr = augmented[row]!;
        const val = Math.abs(rowArr[col] ?? 0);
        if (val > maxVal) {
          maxVal = val;
          maxRow = row;
        }
      }

      if (maxVal < 1e-10) return null; // Singular matrix

      // Swap rows
      const temp = augmented[col]!;
      augmented[col] = augmented[maxRow]!;
      augmented[maxRow] = temp;

      // Scale pivot row
      const pivotRow = augmented[col]!;
      const pivot = pivotRow[col] ?? 1;
      for (let j = 0; j < 2 * n; j++) {
        pivotRow[j] = (pivotRow[j] ?? 0) / pivot;
      }

      // Eliminate column
      for (let row = 0; row < n; row++) {
        if (row === col) continue;
        const rowArr = augmented[row]!;
        const factor = rowArr[col] ?? 0;
        for (let j = 0; j < 2 * n; j++) {
          rowArr[j] = (rowArr[j] ?? 0) - factor * (pivotRow[j] ?? 0);
        }
      }
    }

    // Extract inverse
    return augmented.map((row) => row.slice(n));
  }
}
