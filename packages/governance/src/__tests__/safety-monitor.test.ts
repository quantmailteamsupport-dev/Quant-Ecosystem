import { describe, it, expect, beforeEach } from 'vitest';
import { AISafetyMonitor } from '../safety-monitor.js';
import type { BiasMetric } from '../types.js';

describe('AISafetyMonitor', () => {
  let monitor: AISafetyMonitor;

  beforeEach(() => {
    monitor = new AISafetyMonitor();
  });

  describe('accuracy check', () => {
    it('should pass when accuracy meets threshold', () => {
      const check = monitor.runAccuracyCheck('model-1', 0.97);
      expect(check.status).toBe('passed');
      expect(check.score).toBe(0.97);
    });

    it('should fail when accuracy is below threshold', () => {
      const check = monitor.runAccuracyCheck('model-1', 0.9);
      expect(check.status).toBe('failed');
    });
  });

  describe('hallucination check', () => {
    it('should pass when hallucination rate is low', () => {
      const check = monitor.runHallucinationCheck('model-1', 0.01);
      expect(check.status).toBe('passed');
    });

    it('should fail when hallucination rate is high', () => {
      const check = monitor.runHallucinationCheck('model-1', 0.05);
      expect(check.status).toBe('failed');
    });
  });

  describe('toxicity check', () => {
    it('should pass with zero toxicity', () => {
      const check = monitor.runToxicityCheck('model-1', 0.0);
      expect(check.status).toBe('passed');
    });

    it('should fail with any toxicity', () => {
      const check = monitor.runToxicityCheck('model-1', 0.01);
      expect(check.status).toBe('failed');
    });
  });

  describe('bias check', () => {
    it('should pass when no bias detected', () => {
      const metrics: BiasMetric[] = [
        {
          attribute: 'gender',
          group: 'female',
          metric: 'accuracy',
          value: 0.95,
          threshold: 0.95,
          passed: true,
        },
        {
          attribute: 'gender',
          group: 'male',
          metric: 'accuracy',
          value: 0.96,
          threshold: 0.95,
          passed: true,
        },
      ];

      const check = monitor.runBiasCheck('model-1', metrics);
      expect(check.status).toBe('passed');
    });

    it('should fail when bias is detected', () => {
      const metrics: BiasMetric[] = [
        {
          attribute: 'race',
          group: 'group-a',
          metric: 'accuracy',
          value: 0.7,
          threshold: 0.95,
          passed: false,
        },
        {
          attribute: 'race',
          group: 'group-b',
          metric: 'accuracy',
          value: 0.96,
          threshold: 0.95,
          passed: true,
        },
      ];

      const check = monitor.runBiasCheck('model-1', metrics);
      expect(check.status).toBe('failed');
      expect(check.details).toContain('race/group-a');
    });
  });

  describe('adversarial check', () => {
    it('should pass with high resistance', () => {
      const check = monitor.runAdversarialCheck('model-1', 0.995);
      expect(check.status).toBe('passed');
    });

    it('should fail with low resistance', () => {
      const check = monitor.runAdversarialCheck('model-1', 0.85);
      expect(check.status).toBe('failed');
    });
  });

  describe('privacy check', () => {
    it('should pass with zero PII leaks', () => {
      const check = monitor.runPrivacyCheck('model-1', 0.0);
      expect(check.status).toBe('passed');
    });

    it('should fail with any PII leaks', () => {
      const check = monitor.runPrivacyCheck('model-1', 0.001);
      expect(check.status).toBe('failed');
    });
  });

  describe('report generation', () => {
    it('should generate passing report when all checks pass', () => {
      monitor.runAccuracyCheck('model-1', 0.97);
      monitor.runHallucinationCheck('model-1', 0.01);
      monitor.runToxicityCheck('model-1', 0.0);

      const report = monitor.generateReport('model-1', 'v1.0');
      expect(report.overallStatus).toBe('passed');
      expect(report.criticalFailures).toHaveLength(0);
      expect(report.passRate).toBe(1.0);
    });

    it('should generate failing report when checks fail', () => {
      monitor.runAccuracyCheck('model-1', 0.8);
      monitor.runToxicityCheck('model-1', 0.05);

      const report = monitor.generateReport('model-1', 'v1.0');
      expect(report.overallStatus).toBe('failed');
      expect(report.criticalFailures.length).toBeGreaterThan(0);
    });

    it('should return skipped status when no checks run', () => {
      const report = monitor.generateReport('model-2', 'v1.0');
      expect(report.overallStatus).toBe('skipped');
    });

    it('should store and retrieve reports', () => {
      monitor.runAccuracyCheck('model-1', 0.97);
      monitor.generateReport('model-1', 'v1.0');

      const retrieved = monitor.getReport('model-1', 'v1.0');
      expect(retrieved).toBeDefined();
      expect(retrieved!.modelVersion).toBe('v1.0');
    });
  });

  describe('deployment blocking', () => {
    it('should block deployment for failed reports', () => {
      monitor.runAccuracyCheck('model-1', 0.5);
      const report = monitor.generateReport('model-1', 'v1.0');
      expect(monitor.shouldBlockDeployment(report)).toBe(true);
    });

    it('should not block deployment for passing reports', () => {
      monitor.runAccuracyCheck('model-1', 0.99);
      const report = monitor.generateReport('model-1', 'v1.0');
      expect(monitor.shouldBlockDeployment(report)).toBe(false);
    });
  });

  describe('recommendations', () => {
    it('should provide recommendations for failures', () => {
      monitor.runAccuracyCheck('model-1', 0.5);
      monitor.runToxicityCheck('model-1', 0.1);
      const report = monitor.generateReport('model-1', 'v1.0');

      const recommendations = monitor.getRecommendations(report);
      expect(recommendations.length).toBeGreaterThan(0);
    });

    it('should provide no recommendations for passing report', () => {
      monitor.runAccuracyCheck('model-1', 0.99);
      const report = monitor.generateReport('model-1', 'v1.0');

      const recommendations = monitor.getRecommendations(report);
      expect(recommendations).toHaveLength(0);
    });
  });

  describe('threshold customization', () => {
    it('should allow custom thresholds', () => {
      const custom = new AISafetyMonitor({ minAccuracy: 0.9 });
      const check = custom.runAccuracyCheck('model-1', 0.92);
      expect(check.status).toBe('passed');
    });

    it('should return threshold values', () => {
      const thresholds = monitor.getThresholds();
      expect(thresholds.minAccuracy).toBe(0.95);
      expect(thresholds.maxHallucinationRate).toBe(0.02);
    });
  });

  describe('check management', () => {
    it('should list all checks', () => {
      monitor.runAccuracyCheck('model-1', 0.97);
      monitor.runToxicityCheck('model-1', 0.0);
      expect(monitor.getChecks()).toHaveLength(2);
    });

    it('should clear checks', () => {
      monitor.runAccuracyCheck('model-1', 0.97);
      monitor.clearChecks();
      expect(monitor.getChecks()).toHaveLength(0);
    });

    it('should track bias metrics', () => {
      const metrics: BiasMetric[] = [
        {
          attribute: 'age',
          group: '18-25',
          metric: 'recall',
          value: 0.9,
          threshold: 0.9,
          passed: true,
        },
      ];
      monitor.runBiasCheck('model-1', metrics);
      expect(monitor.getBiasMetrics()).toHaveLength(1);
    });
  });
});
