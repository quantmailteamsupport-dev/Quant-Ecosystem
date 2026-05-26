import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('quality-gates.yml workflow', () => {
  const workflowPath = resolve(__dirname, '../../../../.github/workflows/quality-gates.yml');
  const content = readFileSync(workflowPath, 'utf8');

  it('is valid YAML with correct name', () => {
    expect(content).toContain('name: Quality Gates');
  });

  it('triggers on push to main and pull requests', () => {
    expect(content).toContain('push:');
    expect(content).toContain('branches: [main]');
    expect(content).toContain('pull_request:');
  });

  it('contains test-and-coverage job', () => {
    expect(content).toContain('test-and-coverage:');
    expect(content).toContain('--coverage');
  });

  it('contains coverage-gate job enforcing 80% threshold', () => {
    expect(content).toContain('coverage-gate:');
    expect(content).toContain('80');
    expect(content).toContain('packages/auth');
    expect(content).toContain('packages/payments');
    expect(content).toContain('packages/security');
  });

  it('contains mutation-testing job targeting critical packages', () => {
    expect(content).toContain('mutation-testing:');
    expect(content).toContain('stryker');
    expect(content).toContain('60');
  });

  it('contains e2e-tests job with Playwright', () => {
    expect(content).toContain('e2e-tests:');
    expect(content).toContain('playwright');
  });

  it('contains load-tests job with k6', () => {
    expect(content).toContain('load-tests:');
    expect(content).toContain('k6');
    expect(content).toContain('chat-fanout');
    expect(content).toContain('feed-ranking');
    expect(content).toContain('search');
  });
});

describe('security-scan.yml workflow', () => {
  const workflowPath = resolve(__dirname, '../../../../.github/workflows/security-scan.yml');
  const content = readFileSync(workflowPath, 'utf8');

  it('contains snyk scanning job', () => {
    expect(content).toContain('snyk:');
    expect(content).toContain('SNYK_TOKEN');
    expect(content).toContain('severity-threshold=high');
  });

  it('retains existing trivy-scan job', () => {
    expect(content).toContain('trivy-scan:');
  });

  it('retains existing sast job', () => {
    expect(content).toContain('sast:');
  });

  it('retains existing dast job', () => {
    expect(content).toContain('dast:');
  });
});
