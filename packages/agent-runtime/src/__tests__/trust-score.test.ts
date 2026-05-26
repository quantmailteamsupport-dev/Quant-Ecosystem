import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TrustScore, scoreToPermissionLevel } from '../trust-score.js';
import { PermissionLevel } from '../permissions.js';

describe('scoreToPermissionLevel', () => {
  it('maps 0-20 to OBSERVE', () => {
    expect(scoreToPermissionLevel(0)).toBe(PermissionLevel.OBSERVE);
    expect(scoreToPermissionLevel(10)).toBe(PermissionLevel.OBSERVE);
    expect(scoreToPermissionLevel(20)).toBe(PermissionLevel.OBSERVE);
  });

  it('maps 21-40 to SUGGEST', () => {
    expect(scoreToPermissionLevel(21)).toBe(PermissionLevel.SUGGEST);
    expect(scoreToPermissionLevel(30)).toBe(PermissionLevel.SUGGEST);
    expect(scoreToPermissionLevel(40)).toBe(PermissionLevel.SUGGEST);
  });

  it('maps 41-60 to ACT_LOW', () => {
    expect(scoreToPermissionLevel(41)).toBe(PermissionLevel.ACT_LOW);
    expect(scoreToPermissionLevel(50)).toBe(PermissionLevel.ACT_LOW);
    expect(scoreToPermissionLevel(60)).toBe(PermissionLevel.ACT_LOW);
  });

  it('maps 61-80 to ACT_HIGH', () => {
    expect(scoreToPermissionLevel(61)).toBe(PermissionLevel.ACT_HIGH);
    expect(scoreToPermissionLevel(70)).toBe(PermissionLevel.ACT_HIGH);
    expect(scoreToPermissionLevel(80)).toBe(PermissionLevel.ACT_HIGH);
  });

  it('maps 81-100 to FULL_AUTO', () => {
    expect(scoreToPermissionLevel(81)).toBe(PermissionLevel.FULL_AUTO);
    expect(scoreToPermissionLevel(90)).toBe(PermissionLevel.FULL_AUTO);
    expect(scoreToPermissionLevel(100)).toBe(PermissionLevel.FULL_AUTO);
  });
});

describe('TrustScore', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts new agent at score 20 (OBSERVE level)', () => {
    const trust = new TrustScore();
    expect(trust.getScore()).toBe(20);
    expect(trust.getPermissionLevel()).toBe(PermissionLevel.OBSERVE);
  });

  it('increments score on success', () => {
    const trust = new TrustScore();
    trust.recordSuccess();
    expect(trust.getScore()).toBe(22); // +2 before graduation
  });

  it('decrements score on failure', () => {
    const trust = new TrustScore();
    trust.recordFailure();
    expect(trust.getScore()).toBe(10); // -10
  });

  it('does not go below 0', () => {
    const trust = new TrustScore(5);
    trust.recordFailure();
    expect(trust.getScore()).toBe(0);
  });

  it('does not go above 100', () => {
    const trust = new TrustScore(99);
    // Advance 30 days to get graduation bonus
    vi.advanceTimersByTime(31 * 24 * 60 * 60 * 1000);
    trust.recordSuccess();
    expect(trust.getScore()).toBe(100);
  });

  it('graduates to FULL_AUTO after 30 days and high score', () => {
    const thirtyOneDaysAgo = Date.now() - 31 * 24 * 60 * 60 * 1000;
    const trust = new TrustScore(85, thirtyOneDaysAgo);
    expect(trust.canGraduateToFullAuto()).toBe(true);
    expect(trust.getPermissionLevel()).toBe(PermissionLevel.FULL_AUTO);
  });

  it('cannot graduate before 30 days', () => {
    const trust = new TrustScore(90);
    expect(trust.canGraduateToFullAuto()).toBe(false);
  });

  it('increments more after graduation period', () => {
    const thirtyOneDaysAgo = Date.now() - 31 * 24 * 60 * 60 * 1000;
    const trust = new TrustScore(50, thirtyOneDaysAgo);
    trust.recordSuccess();
    expect(trust.getScore()).toBe(55); // +5 after graduation
  });

  it('tracks days active', () => {
    vi.advanceTimersByTime(5 * 24 * 60 * 60 * 1000); // 5 days
    const fiveDaysAgo = Date.now() - 5 * 24 * 60 * 60 * 1000;
    const trust = new TrustScore(20, fiveDaysAgo);
    expect(trust.getDaysActive()).toBe(5);
  });

  it('tracks success and failure counts', () => {
    const trust = new TrustScore();
    trust.recordSuccess();
    trust.recordSuccess();
    trust.recordFailure();
    expect(trust.getSuccessCount()).toBe(2);
    expect(trust.getFailureCount()).toBe(1);
  });
});
