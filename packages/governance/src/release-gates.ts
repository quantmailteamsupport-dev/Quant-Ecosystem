import type { ReleaseGate, ReleaseGateResult, ReleaseValidation, GateSeverity } from './types.js';

export interface ReleaseGateConfig {
  testsPass: boolean;
  securityScanClean: boolean;
  performanceBudgetMet: boolean;
  accessibilityAuditPassed: boolean;
  documentationUpdated: boolean;
  coverageThreshold?: number;
  currentCoverage?: number;
  changelogUpdated?: boolean;
  apiCompatible?: boolean;
}

export class ReleaseGateChecker {
  private gates: ReleaseGate[] = [];

  constructor() {
    this.registerDefaultGates();
  }

  private registerDefaultGates(): void {
    this.gates = [
      {
        id: 'tests-pass',
        name: 'All Tests Pass',
        description: 'All unit, integration, and E2E tests must pass',
        severity: 'blocking',
        check: () => true,
      },
      {
        id: 'security-scan',
        name: 'Security Scan Clean',
        description: 'No critical or high vulnerabilities in dependency scan',
        severity: 'blocking',
        check: () => true,
      },
      {
        id: 'performance-budget',
        name: 'Performance Budget Met',
        description: 'All performance metrics within defined budgets',
        severity: 'blocking',
        check: () => true,
      },
      {
        id: 'accessibility-audit',
        name: 'Accessibility Audit Passed',
        description: 'WCAG 2.1 AA compliance verified',
        severity: 'blocking',
        check: () => true,
      },
      {
        id: 'documentation-updated',
        name: 'Documentation Updated',
        description: 'All public API changes documented',
        severity: 'blocking',
        check: () => true,
      },
      {
        id: 'coverage-threshold',
        name: 'Code Coverage Threshold',
        description: 'Test coverage meets minimum threshold (80%)',
        severity: 'warning',
        check: () => true,
      },
      {
        id: 'changelog-updated',
        name: 'Changelog Updated',
        description: 'CHANGELOG.md reflects all user-facing changes',
        severity: 'warning',
        check: () => true,
      },
      {
        id: 'api-compatibility',
        name: 'API Backward Compatibility',
        description: 'No breaking changes without version bump',
        severity: 'blocking',
        check: () => true,
      },
    ];
  }

  addGate(gate: ReleaseGate): void {
    this.gates.push(gate);
  }

  removeGate(gateId: string): boolean {
    const index = this.gates.findIndex((g) => g.id === gateId);
    if (index === -1) return false;
    this.gates.splice(index, 1);
    return true;
  }

  getGates(): ReleaseGate[] {
    return [...this.gates];
  }

  validate(version: string, config: ReleaseGateConfig): ReleaseValidation {
    const results: ReleaseGateResult[] = [];

    results.push(
      this.checkGate(
        'tests-pass',
        config.testsPass,
        'All tests passed',
        'One or more tests failed',
      ),
    );
    results.push(
      this.checkGate(
        'security-scan',
        config.securityScanClean,
        'No security vulnerabilities found',
        'Security vulnerabilities detected',
      ),
    );
    results.push(
      this.checkGate(
        'performance-budget',
        config.performanceBudgetMet,
        'Performance within budget',
        'Performance budget exceeded',
      ),
    );
    results.push(
      this.checkGate(
        'accessibility-audit',
        config.accessibilityAuditPassed,
        'Accessibility audit passed',
        'Accessibility issues found',
      ),
    );
    results.push(
      this.checkGate(
        'documentation-updated',
        config.documentationUpdated,
        'Documentation is up to date',
        'Documentation needs updating',
      ),
    );

    if (config.currentCoverage !== undefined && config.coverageThreshold !== undefined) {
      const coveragePassed = config.currentCoverage >= config.coverageThreshold;
      results.push(
        this.checkGate(
          'coverage-threshold',
          coveragePassed,
          `Coverage ${config.currentCoverage}% meets threshold ${config.coverageThreshold}%`,
          `Coverage ${config.currentCoverage}% below threshold ${config.coverageThreshold}%`,
        ),
      );
    }

    if (config.changelogUpdated !== undefined) {
      results.push(
        this.checkGate(
          'changelog-updated',
          config.changelogUpdated,
          'Changelog updated',
          'Changelog not updated',
        ),
      );
    }

    if (config.apiCompatible !== undefined) {
      results.push(
        this.checkGate(
          'api-compatibility',
          config.apiCompatible,
          'API is backward compatible',
          'Breaking API changes detected',
        ),
      );
    }

    const blockingFailures = results.filter((r) => !r.passed && r.severity === 'blocking');
    const warnings = results.filter((r) => !r.passed && r.severity === 'warning');
    const allPassed = blockingFailures.length === 0;

    return {
      version,
      results,
      allPassed,
      blockingFailures,
      warnings,
      validatedAt: new Date(),
    };
  }

  private checkGate(
    gateId: string,
    passed: boolean,
    successMessage: string,
    failureMessage: string,
  ): ReleaseGateResult {
    const gate = this.gates.find((g) => g.id === gateId);
    const severity: GateSeverity = gate?.severity ?? 'informational';
    const name = gate?.name ?? gateId;

    return {
      gateId,
      gateName: name,
      passed,
      severity,
      message: passed ? successMessage : failureMessage,
      checkedAt: new Date(),
    };
  }

  getSummary(validation: ReleaseValidation): string {
    const lines: string[] = [
      `Release Validation: ${validation.version}`,
      `Status: ${validation.allPassed ? 'PASSED' : 'FAILED'}`,
      `Checked: ${validation.results.length} gates`,
      `Blocking failures: ${validation.blockingFailures.length}`,
      `Warnings: ${validation.warnings.length}`,
    ];

    if (validation.blockingFailures.length > 0) {
      lines.push('', 'Blocking Issues:');
      for (const failure of validation.blockingFailures) {
        lines.push(`  - [${failure.gateId}] ${failure.message}`);
      }
    }

    if (validation.warnings.length > 0) {
      lines.push('', 'Warnings:');
      for (const warning of validation.warnings) {
        lines.push(`  - [${warning.gateId}] ${warning.message}`);
      }
    }

    return lines.join('\n');
  }
}
