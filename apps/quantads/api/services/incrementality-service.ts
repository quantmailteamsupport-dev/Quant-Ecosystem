// ============================================================================
// QuantAds - Incrementality Testing Service
// Lift measurement, control/exposed assignment, significance testing
// ============================================================================

interface IncrementalityTest {
  id: string;
  campaignId: string;
  name: string;
  status: 'setup' | 'running' | 'completed' | 'cancelled';
  controlGroup: TestGroup;
  exposedGroup: TestGroup;
  startDate: Date;
  endDate: Date | null;
  targetMetric: 'conversions' | 'revenue' | 'signups' | 'purchases';
  confidenceLevel: number;
  results: TestResults | null;
  createdAt: Date;
}

interface TestGroup {
  name: string;
  userCount: number;
  users: string[];
  splitPercentage: number;
  metrics: GroupMetrics;
}

interface GroupMetrics {
  conversions: number;
  revenue: number;
  avgOrderValue: number;
  conversionRate: number;
  impressions: number;
}

interface TestResults {
  incrementalLift: number;
  absoluteLift: number;
  confidence: number;
  pValue: number;
  significant: boolean;
  incrementalConversions: number;
  incrementalRevenue: number;
  costPerIncrementalConversion: number;
  roi: number;
  sampleSizeAdequate: boolean;
}

interface ConfidenceInterval {
  lower: number;
  upper: number;
  mean: number;
  width: number;
  level: number;
}

export class IncrementalityService {
  private tests: Map<string, IncrementalityTest> = new Map();
  private campaignTestIndex: Map<string, string[]> = new Map();

  async createTest(campaignId: string, config: {
    name: string;
    targetMetric: IncrementalityTest['targetMetric'];
    controlSplit: number;
    confidenceLevel?: number;
    duration?: number;
  }): Promise<IncrementalityTest> {
    if (!config.name) throw new Error('Test name is required');
    if (config.controlSplit < 5 || config.controlSplit > 50) {
      throw new Error('Control split must be between 5% and 50%');
    }

    const testId = `incr_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const endDate = config.duration
      ? new Date(Date.now() + config.duration * 86400000)
      : null;

    const test: IncrementalityTest = {
      id: testId,
      campaignId,
      name: config.name,
      status: 'setup',
      controlGroup: {
        name: 'Control (No Ads)',
        userCount: 0,
        users: [],
        splitPercentage: config.controlSplit,
        metrics: { conversions: 0, revenue: 0, avgOrderValue: 0, conversionRate: 0, impressions: 0 },
      },
      exposedGroup: {
        name: 'Exposed (Ads Shown)',
        userCount: 0,
        users: [],
        splitPercentage: 100 - config.controlSplit,
        metrics: { conversions: 0, revenue: 0, avgOrderValue: 0, conversionRate: 0, impressions: 0 },
      },
      startDate: new Date(),
      endDate,
      targetMetric: config.targetMetric,
      confidenceLevel: config.confidenceLevel || 95,
      results: null,
      createdAt: new Date(),
    };

    this.tests.set(testId, test);
    const campaignTests = this.campaignTestIndex.get(campaignId) || [];
    campaignTests.push(testId);
    this.campaignTestIndex.set(campaignId, campaignTests);

    return test;
  }

  async assignControl(testId: string, userIds: string[]): Promise<{ assigned: number; group: string }> {
    const test = this.tests.get(testId);
    if (!test) throw new Error('Test not found');
    if (test.status === 'completed') throw new Error('Test already completed');

    const newUsers = userIds.filter(id => !test.controlGroup.users.includes(id) && !test.exposedGroup.users.includes(id));
    test.controlGroup.users.push(...newUsers);
    test.controlGroup.userCount = test.controlGroup.users.length;

    if (test.status === 'setup') test.status = 'running';

    return { assigned: newUsers.length, group: 'control' };
  }

  async assignExposed(testId: string, userIds: string[]): Promise<{ assigned: number; group: string }> {
    const test = this.tests.get(testId);
    if (!test) throw new Error('Test not found');
    if (test.status === 'completed') throw new Error('Test already completed');

    const newUsers = userIds.filter(id => !test.exposedGroup.users.includes(id) && !test.controlGroup.users.includes(id));
    test.exposedGroup.users.push(...newUsers);
    test.exposedGroup.userCount = test.exposedGroup.users.length;

    if (test.status === 'setup') test.status = 'running';

    return { assigned: newUsers.length, group: 'exposed' };
  }

  async assignAutomatically(testId: string, userIds: string[]): Promise<{ control: number; exposed: number }> {
    const test = this.tests.get(testId);
    if (!test) throw new Error('Test not found');

    let controlCount = 0;
    let exposedCount = 0;

    for (const userId of userIds) {
      if (test.controlGroup.users.includes(userId) || test.exposedGroup.users.includes(userId)) continue;

      // Deterministic assignment based on user ID hash
      const hash = this.hashUserId(userId);
      const threshold = test.controlGroup.splitPercentage;

      if (hash < threshold) {
        test.controlGroup.users.push(userId);
        controlCount++;
      } else {
        test.exposedGroup.users.push(userId);
        exposedCount++;
      }
    }

    test.controlGroup.userCount = test.controlGroup.users.length;
    test.exposedGroup.userCount = test.exposedGroup.users.length;
    if (test.status === 'setup') test.status = 'running';

    return { control: controlCount, exposed: exposedCount };
  }

  async recordConversion(testId: string, userId: string, value: number): Promise<void> {
    const test = this.tests.get(testId);
    if (!test) throw new Error('Test not found');
    if (test.status !== 'running') throw new Error('Test is not running');

    if (test.controlGroup.users.includes(userId)) {
      test.controlGroup.metrics.conversions++;
      test.controlGroup.metrics.revenue += value;
      test.controlGroup.metrics.avgOrderValue = test.controlGroup.metrics.revenue / test.controlGroup.metrics.conversions;
      test.controlGroup.metrics.conversionRate = test.controlGroup.userCount > 0 ? test.controlGroup.metrics.conversions / test.controlGroup.userCount : 0;
    } else if (test.exposedGroup.users.includes(userId)) {
      test.exposedGroup.metrics.conversions++;
      test.exposedGroup.metrics.revenue += value;
      test.exposedGroup.metrics.avgOrderValue = test.exposedGroup.metrics.revenue / test.exposedGroup.metrics.conversions;
      test.exposedGroup.metrics.conversionRate = test.exposedGroup.userCount > 0 ? test.exposedGroup.metrics.conversions / test.exposedGroup.userCount : 0;
    }
  }

  async measureLift(testId: string): Promise<TestResults> {
    const test = this.tests.get(testId);
    if (!test) throw new Error('Test not found');

    const control = test.controlGroup.metrics;
    const exposed = test.exposedGroup.metrics;
    const controlRate = test.controlGroup.userCount > 0 ? control.conversions / test.controlGroup.userCount : 0;
    const exposedRate = test.exposedGroup.userCount > 0 ? exposed.conversions / test.exposedGroup.userCount : 0;

    const absoluteLift = exposedRate - controlRate;
    const incrementalLift = controlRate > 0 ? ((exposedRate - controlRate) / controlRate) * 100 : 0;

    // Calculate statistical significance
    const { pValue, significant } = this.calculateSignificance(
      control.conversions, test.controlGroup.userCount,
      exposed.conversions, test.exposedGroup.userCount,
      test.confidenceLevel
    );

    const incrementalConversions = Math.max(0, exposed.conversions - (controlRate * test.exposedGroup.userCount));
    const incrementalRevenue = incrementalConversions * exposed.avgOrderValue;
    const totalSpend = exposed.impressions * 0.005; // Estimated CPM cost
    const costPerIncremental = incrementalConversions > 0 ? totalSpend / incrementalConversions : 0;
    const roi = totalSpend > 0 ? ((incrementalRevenue - totalSpend) / totalSpend) * 100 : 0;

    const minSampleSize = this.calculateMinSampleSize(test.confidenceLevel, controlRate);
    const sampleSizeAdequate = test.controlGroup.userCount >= minSampleSize && test.exposedGroup.userCount >= minSampleSize;

    const results: TestResults = {
      incrementalLift: Math.round(incrementalLift * 100) / 100,
      absoluteLift: Math.round(absoluteLift * 10000) / 10000,
      confidence: Math.round((1 - pValue) * 100),
      pValue: Math.round(pValue * 10000) / 10000,
      significant,
      incrementalConversions: Math.round(incrementalConversions),
      incrementalRevenue: Math.round(incrementalRevenue * 100) / 100,
      costPerIncrementalConversion: Math.round(costPerIncremental * 100) / 100,
      roi: Math.round(roi * 100) / 100,
      sampleSizeAdequate,
    };

    test.results = results;
    return results;
  }

  async getSignificance(testId: string): Promise<{ significant: boolean; pValue: number; confidence: number; recommendation: string }> {
    const test = this.tests.get(testId);
    if (!test) throw new Error('Test not found');

    const results = test.results || await this.measureLift(testId);
    let recommendation: string;

    if (!results.sampleSizeAdequate) {
      recommendation = 'Continue test - insufficient sample size';
    } else if (results.significant && results.incrementalLift > 0) {
      recommendation = 'Ads are driving incremental conversions - scale up';
    } else if (results.significant && results.incrementalLift <= 0) {
      recommendation = 'Ads showing negative lift - review targeting';
    } else {
      recommendation = 'No significant difference detected - continue testing';
    }

    return { significant: results.significant, pValue: results.pValue, confidence: results.confidence, recommendation };
  }

  async getConfidenceInterval(testId: string): Promise<ConfidenceInterval> {
    const test = this.tests.get(testId);
    if (!test) throw new Error('Test not found');

    const results = test.results || await this.measureLift(testId);
    const se = Math.sqrt(
      (results.absoluteLift * (1 - results.absoluteLift)) / Math.max(1, test.controlGroup.userCount + test.exposedGroup.userCount)
    );

    const zScore = test.confidenceLevel === 99 ? 2.576 : test.confidenceLevel === 95 ? 1.96 : 1.645;
    const margin = zScore * se;

    return {
      lower: Math.round((results.incrementalLift - margin * 100) * 100) / 100,
      upper: Math.round((results.incrementalLift + margin * 100) * 100) / 100,
      mean: results.incrementalLift,
      width: Math.round(margin * 200 * 100) / 100,
      level: test.confidenceLevel,
    };
  }

  async exportResults(testId: string): Promise<Record<string, any>> {
    const test = this.tests.get(testId);
    if (!test) throw new Error('Test not found');

    const results = test.results || await this.measureLift(testId);
    const ci = await this.getConfidenceInterval(testId);

    return {
      testName: test.name,
      campaignId: test.campaignId,
      duration: test.endDate ? Math.ceil((test.endDate.getTime() - test.startDate.getTime()) / 86400000) : null,
      targetMetric: test.targetMetric,
      controlGroup: { users: test.controlGroup.userCount, metrics: test.controlGroup.metrics },
      exposedGroup: { users: test.exposedGroup.userCount, metrics: test.exposedGroup.metrics },
      results,
      confidenceInterval: ci,
      exportedAt: new Date(),
    };
  }

  async endTest(testId: string): Promise<IncrementalityTest> {
    const test = this.tests.get(testId);
    if (!test) throw new Error('Test not found');
    if (test.status === 'completed') throw new Error('Test already completed');

    test.status = 'completed';
    test.endDate = new Date();

    if (!test.results) await this.measureLift(testId);

    return test;
  }

  private calculateSignificance(controlConv: number, controlN: number, exposedConv: number, exposedN: number, level: number): { pValue: number; significant: boolean } {
    if (controlN === 0 || exposedN === 0) return { pValue: 1, significant: false };

    const p1 = controlConv / controlN;
    const p2 = exposedConv / exposedN;
    const pPooled = (controlConv + exposedConv) / (controlN + exposedN);
    const se = Math.sqrt(pPooled * (1 - pPooled) * (1 / controlN + 1 / exposedN));

    if (se === 0) return { pValue: 1, significant: false };

    const z = Math.abs(p2 - p1) / se;
    // Approximate p-value from z-score
    const pValue = Math.max(0.001, Math.exp(-0.5 * z * z) / Math.sqrt(2 * Math.PI));
    const alpha = (100 - level) / 100;
    const significant = pValue < alpha;

    return { pValue: Math.round(pValue * 10000) / 10000, significant };
  }

  private calculateMinSampleSize(confidenceLevel: number, baseRate: number): number {
    const z = confidenceLevel === 99 ? 2.576 : confidenceLevel === 95 ? 1.96 : 1.645;
    const mde = 0.1; // 10% minimum detectable effect
    const p = baseRate || 0.05;
    return Math.ceil((2 * p * (1 - p) * Math.pow(z / mde, 2)));
  }

  private hashUserId(userId: string): number {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      const char = userId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash) % 100;
  }
}

export const incrementalityService = new IncrementalityService();
