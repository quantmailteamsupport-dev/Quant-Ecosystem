import { describe, it, expect, beforeEach } from 'vitest';
import { SunsetChecker } from '../sunset-checker.js';
import type { SunsetCriteria } from '../types.js';

describe('SunsetChecker', () => {
  let checker: SunsetChecker;

  beforeEach(() => {
    checker = new SunsetChecker();
  });

  const createFeature = (overrides?: Partial<SunsetCriteria>): SunsetCriteria => ({
    featureId: 'test-feature',
    featureName: 'Test Feature',
    stage: 'proposed',
    reason: 'Low usage',
    activeUsers: 50,
    totalUsers: 10000,
    usagePercentage: 0.5,
    maintenanceCostMonthly: 5000,
    ...overrides,
  });

  describe('feature management', () => {
    it('should register a feature', () => {
      const feature = createFeature();
      checker.registerFeature(feature);
      expect(checker.getFeature('test-feature')).toBeDefined();
    });

    it('should return undefined for unknown feature', () => {
      expect(checker.getFeature('unknown')).toBeUndefined();
    });

    it('should list all features', () => {
      checker.registerFeature(createFeature({ featureId: 'a' }));
      checker.registerFeature(createFeature({ featureId: 'b' }));
      expect(checker.getAllFeatures()).toHaveLength(2);
    });
  });

  describe('evaluation', () => {
    it('should recommend sunset for low usage with alternative', () => {
      checker.registerFeature(
        createFeature({
          activeUsers: 50,
          totalUsers: 10000,
          maintenanceCostMonthly: 5000,
          alternativeFeature: 'new-feature',
        }),
      );

      const evaluation = checker.evaluate('test-feature');
      expect(evaluation.shouldSunset).toBe(true);
      expect(evaluation.reasons.length).toBeGreaterThan(0);
    });

    it('should not recommend sunset for healthy features', () => {
      checker.registerFeature(
        createFeature({
          activeUsers: 5000,
          totalUsers: 10000,
          maintenanceCostMonthly: 100,
        }),
      );

      const evaluation = checker.evaluate('test-feature');
      expect(evaluation.shouldSunset).toBe(false);
    });

    it('should recommend sunset for high cost ratio', () => {
      checker.registerFeature(
        createFeature({
          activeUsers: 5,
          totalUsers: 10000,
          maintenanceCostMonthly: 50000,
          alternativeFeature: 'better-feature',
        }),
      );

      const evaluation = checker.evaluate('test-feature');
      expect(evaluation.shouldSunset).toBe(true);
      expect(evaluation.costRatio).toBeGreaterThan(5);
    });

    it('should handle unknown feature evaluation', () => {
      const evaluation = checker.evaluate('unknown');
      expect(evaluation.shouldSunset).toBe(false);
      expect(evaluation.reasons).toContain('Feature not found');
    });

    it('should return all sunset candidates', () => {
      checker.registerFeature(
        createFeature({
          featureId: 'low-usage',
          activeUsers: 10,
          totalUsers: 10000,
          alternativeFeature: 'replacement',
        }),
      );
      checker.registerFeature(
        createFeature({
          featureId: 'healthy',
          activeUsers: 8000,
          totalUsers: 10000,
          maintenanceCostMonthly: 100,
        }),
      );

      const candidates = checker.getSunsetCandidates();
      expect(candidates).toHaveLength(1);
      expect(candidates[0]!.featureId).toBe('low-usage');
    });
  });

  describe('stage advancement', () => {
    it('should advance stage from proposed to approved', () => {
      checker.registerFeature(createFeature());
      const newStage = checker.advanceStage('test-feature');
      expect(newStage).toBe('approved');
    });

    it('should set dates when entering notified stage', () => {
      checker.registerFeature(createFeature({ stage: 'approved' }));
      checker.advanceStage('test-feature');

      const feature = checker.getFeature('test-feature');
      expect(feature!.stage).toBe('notified');
      expect(feature!.notificationDate).toBeDefined();
      expect(feature!.sunsetDate).toBeDefined();
      expect(feature!.dataExportDeadline).toBeDefined();
    });

    it('should return undefined for unknown feature', () => {
      const result = checker.advanceStage('unknown');
      expect(result).toBeUndefined();
    });

    it('should not advance past data_deleted', () => {
      checker.registerFeature(createFeature({ stage: 'data_deleted' }));
      const result = checker.advanceStage('test-feature');
      expect(result).toBe('data_deleted');
    });
  });

  describe('migration plans', () => {
    it('should generate a migration plan', () => {
      const plan = checker.generateMigrationPlan('old-feature', 'new-feature', {
        old_field: 'new_field',
      });

      expect(plan.featureId).toBe('old-feature');
      expect(plan.targetFeature).toBe('new-feature');
      expect(plan.automatedMigrationAvailable).toBe(true);
      expect(plan.steps.length).toBeGreaterThan(0);
    });

    it('should retrieve stored migration plan', () => {
      checker.generateMigrationPlan('feat-a', 'feat-b', {});
      const plan = checker.getMigrationPlan('feat-a');
      expect(plan).toBeDefined();
      expect(plan!.targetFeature).toBe('feat-b');
    });

    it('should indicate no automated migration when no mapping', () => {
      const plan = checker.generateMigrationPlan('feat', 'new-feat', {});
      expect(plan.automatedMigrationAvailable).toBe(false);
    });
  });

  describe('days until sunset', () => {
    it('should return undefined when no sunset date', () => {
      checker.registerFeature(createFeature());
      expect(checker.getDaysUntilSunset('test-feature')).toBeUndefined();
    });

    it('should calculate days until sunset', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 45);

      checker.registerFeature(createFeature({ sunsetDate: futureDate }));
      const days = checker.getDaysUntilSunset('test-feature');
      expect(days).toBeGreaterThanOrEqual(44);
      expect(days).toBeLessThanOrEqual(46);
    });
  });

  describe('thresholds', () => {
    it('should use custom thresholds', () => {
      const custom = new SunsetChecker({ minUsagePercentage: 5.0 });
      expect(custom.getThresholds().minUsagePercentage).toBe(5.0);
    });

    it('should use default thresholds when not specified', () => {
      expect(checker.getThresholds().minUsagePercentage).toBe(1.0);
      expect(checker.getThresholds().notificationDays).toBe(90);
    });
  });
});
