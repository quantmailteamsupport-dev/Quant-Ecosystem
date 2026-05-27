import { describe, it, expect, beforeEach } from 'vitest';
import { ReleaseGateChecker } from '../release-gates.js';
import type { ReleaseGateConfig } from '../release-gates.js';

describe('ReleaseGateChecker', () => {
  let checker: ReleaseGateChecker;

  beforeEach(() => {
    checker = new ReleaseGateChecker();
  });

  describe('gate management', () => {
    it('should initialize with default gates', () => {
      const gates = checker.getGates();
      expect(gates.length).toBeGreaterThanOrEqual(5);
    });

    it('should add a custom gate', () => {
      checker.addGate({
        id: 'custom-gate',
        name: 'Custom Gate',
        description: 'A custom gate',
        severity: 'warning',
        check: () => true,
      });

      const gates = checker.getGates();
      expect(gates.find((g) => g.id === 'custom-gate')).toBeDefined();
    });

    it('should remove a gate', () => {
      const removed = checker.removeGate('changelog-updated');
      expect(removed).toBe(true);

      const gates = checker.getGates();
      expect(gates.find((g) => g.id === 'changelog-updated')).toBeUndefined();
    });

    it('should return false when removing non-existent gate', () => {
      const removed = checker.removeGate('non-existent');
      expect(removed).toBe(false);
    });
  });

  describe('validation', () => {
    it('should pass when all gates pass', () => {
      const config: ReleaseGateConfig = {
        testsPass: true,
        securityScanClean: true,
        performanceBudgetMet: true,
        accessibilityAuditPassed: true,
        documentationUpdated: true,
      };

      const result = checker.validate('1.0.0', config);
      expect(result.allPassed).toBe(true);
      expect(result.blockingFailures).toHaveLength(0);
      expect(result.version).toBe('1.0.0');
    });

    it('should fail when tests do not pass', () => {
      const config: ReleaseGateConfig = {
        testsPass: false,
        securityScanClean: true,
        performanceBudgetMet: true,
        accessibilityAuditPassed: true,
        documentationUpdated: true,
      };

      const result = checker.validate('1.0.0', config);
      expect(result.allPassed).toBe(false);
      expect(result.blockingFailures.length).toBeGreaterThan(0);
    });

    it('should fail when security scan has issues', () => {
      const config: ReleaseGateConfig = {
        testsPass: true,
        securityScanClean: false,
        performanceBudgetMet: true,
        accessibilityAuditPassed: true,
        documentationUpdated: true,
      };

      const result = checker.validate('1.0.0', config);
      expect(result.allPassed).toBe(false);
      expect(result.blockingFailures.some((f) => f.gateId === 'security-scan')).toBe(true);
    });

    it('should report warnings for non-blocking failures', () => {
      const config: ReleaseGateConfig = {
        testsPass: true,
        securityScanClean: true,
        performanceBudgetMet: true,
        accessibilityAuditPassed: true,
        documentationUpdated: true,
        changelogUpdated: false,
      };

      const result = checker.validate('1.0.0', config);
      expect(result.allPassed).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('should validate coverage threshold', () => {
      const config: ReleaseGateConfig = {
        testsPass: true,
        securityScanClean: true,
        performanceBudgetMet: true,
        accessibilityAuditPassed: true,
        documentationUpdated: true,
        coverageThreshold: 80,
        currentCoverage: 75,
      };

      const result = checker.validate('1.0.0', config);
      expect(result.warnings.some((w) => w.gateId === 'coverage-threshold')).toBe(true);
    });

    it('should validate API compatibility', () => {
      const config: ReleaseGateConfig = {
        testsPass: true,
        securityScanClean: true,
        performanceBudgetMet: true,
        accessibilityAuditPassed: true,
        documentationUpdated: true,
        apiCompatible: false,
      };

      const result = checker.validate('2.0.0', config);
      expect(result.allPassed).toBe(false);
      expect(result.blockingFailures.some((f) => f.gateId === 'api-compatibility')).toBe(true);
    });
  });

  describe('summary', () => {
    it('should generate a summary for passed validation', () => {
      const config: ReleaseGateConfig = {
        testsPass: true,
        securityScanClean: true,
        performanceBudgetMet: true,
        accessibilityAuditPassed: true,
        documentationUpdated: true,
      };

      const result = checker.validate('1.0.0', config);
      const summary = checker.getSummary(result);

      expect(summary).toContain('PASSED');
      expect(summary).toContain('1.0.0');
    });

    it('should generate a summary for failed validation', () => {
      const config: ReleaseGateConfig = {
        testsPass: false,
        securityScanClean: false,
        performanceBudgetMet: true,
        accessibilityAuditPassed: true,
        documentationUpdated: true,
      };

      const result = checker.validate('1.0.0', config);
      const summary = checker.getSummary(result);

      expect(summary).toContain('FAILED');
      expect(summary).toContain('Blocking Issues');
    });
  });
});
