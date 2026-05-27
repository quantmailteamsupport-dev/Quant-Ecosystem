import type { SunsetCriteria, SunsetEvaluation, SunsetStage, MigrationPlan } from './types.js';

export interface SunsetThresholds {
  /** Minimum usage percentage below which sunset is considered */
  minUsagePercentage: number;
  /** Maximum cost ratio (maintenance cost / value) before sunset */
  maxCostRatio: number;
  /** Number of consecutive months below usage threshold */
  consecutiveMonthsBelow: number;
  /** Notification period in days */
  notificationDays: number;
  /** Data retention period after sunset in days */
  dataRetentionDays: number;
}

const DEFAULT_THRESHOLDS: SunsetThresholds = {
  minUsagePercentage: 1.0,
  maxCostRatio: 5.0,
  consecutiveMonthsBelow: 3,
  notificationDays: 90,
  dataRetentionDays: 30,
};

export class SunsetChecker {
  private thresholds: SunsetThresholds;
  private features: Map<string, SunsetCriteria> = new Map();
  private migrationPlans: Map<string, MigrationPlan> = new Map();

  constructor(thresholds?: Partial<SunsetThresholds>) {
    this.thresholds = { ...DEFAULT_THRESHOLDS, ...thresholds };
  }

  getThresholds(): SunsetThresholds {
    return { ...this.thresholds };
  }

  registerFeature(criteria: SunsetCriteria): void {
    this.features.set(criteria.featureId, criteria);
  }

  getFeature(featureId: string): SunsetCriteria | undefined {
    return this.features.get(featureId);
  }

  getAllFeatures(): SunsetCriteria[] {
    return Array.from(this.features.values());
  }

  evaluate(featureId: string): SunsetEvaluation {
    const feature = this.features.get(featureId);
    if (!feature) {
      return {
        featureId,
        shouldSunset: false,
        reasons: ['Feature not found'],
        usagePercentage: 0,
        costRatio: 0,
        hasAlternative: false,
      };
    }

    const reasons: string[] = [];
    const usagePercentage =
      feature.totalUsers > 0 ? (feature.activeUsers / feature.totalUsers) * 100 : 0;
    const costRatio =
      feature.activeUsers > 0 ? feature.maintenanceCostMonthly / feature.activeUsers : Infinity;
    const hasAlternative = feature.alternativeFeature !== undefined;

    // Check usage threshold
    if (usagePercentage < this.thresholds.minUsagePercentage) {
      reasons.push(
        `Usage ${usagePercentage.toFixed(2)}% is below threshold ${this.thresholds.minUsagePercentage}%`,
      );
    }

    // Check cost ratio
    if (costRatio > this.thresholds.maxCostRatio) {
      reasons.push(
        `Cost ratio ${costRatio.toFixed(2)} exceeds maximum ${this.thresholds.maxCostRatio}`,
      );
    }

    // Check if alternative exists
    if (hasAlternative) {
      reasons.push(`Alternative feature available: ${feature.alternativeFeature}`);
    }

    const shouldSunset = reasons.length >= 2 || (reasons.length >= 1 && hasAlternative);

    return {
      featureId,
      shouldSunset,
      reasons,
      usagePercentage,
      costRatio,
      hasAlternative,
    };
  }

  evaluateAll(): SunsetEvaluation[] {
    return Array.from(this.features.keys()).map((id) => this.evaluate(id));
  }

  getSunsetCandidates(): SunsetEvaluation[] {
    return this.evaluateAll().filter((e) => e.shouldSunset);
  }

  advanceStage(featureId: string): SunsetStage | undefined {
    const feature = this.features.get(featureId);
    if (!feature) return undefined;

    const stageOrder: SunsetStage[] = [
      'proposed',
      'approved',
      'notified',
      'migrating',
      'read_only',
      'disabled',
      'data_deleted',
    ];

    const currentIndex = stageOrder.indexOf(feature.stage);
    if (currentIndex === -1 || currentIndex >= stageOrder.length - 1) {
      return feature.stage;
    }

    const nextStage = stageOrder[currentIndex + 1]!;
    feature.stage = nextStage;

    // Set dates based on stage transitions
    if (nextStage === 'notified') {
      feature.notificationDate = new Date();
      const sunsetDate = new Date();
      sunsetDate.setDate(sunsetDate.getDate() + this.thresholds.notificationDays);
      feature.sunsetDate = sunsetDate;

      const exportDeadline = new Date(sunsetDate);
      exportDeadline.setDate(exportDeadline.getDate() + this.thresholds.dataRetentionDays);
      feature.dataExportDeadline = exportDeadline;
    }

    this.features.set(featureId, feature);
    return nextStage;
  }

  generateMigrationPlan(
    featureId: string,
    targetFeature: string,
    dataMapping: Record<string, string>,
  ): MigrationPlan {
    const plan: MigrationPlan = {
      featureId,
      targetFeature,
      steps: [
        `Export data from ${featureId}`,
        `Map data fields to ${targetFeature} schema`,
        `Import data into ${targetFeature}`,
        'Verify data integrity',
        'Update user preferences and settings',
        'Notify user of successful migration',
      ],
      automatedMigrationAvailable: Object.keys(dataMapping).length > 0,
      estimatedDuration: '5-15 minutes',
      dataMapping,
    };

    this.migrationPlans.set(featureId, plan);
    return plan;
  }

  getMigrationPlan(featureId: string): MigrationPlan | undefined {
    return this.migrationPlans.get(featureId);
  }

  getDaysUntilSunset(featureId: string): number | undefined {
    const feature = this.features.get(featureId);
    if (!feature?.sunsetDate) return undefined;

    const now = new Date();
    const diffMs = feature.sunsetDate.getTime() - now.getTime();
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  }
}
