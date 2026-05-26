import { describe, it, expect } from 'vitest';
import { SpendingLimit } from '../spending-limit.js';

describe('SpendingLimit', () => {
  const defaultConfig = {
    dailyCap: 100,
    weeklyCap: 500,
    monthlyCap: 1500,
  };

  it('allows spending within limits', () => {
    const limit = new SpendingLimit(defaultConfig);
    expect(limit.canSpend(50)).toBe(true);
    limit.recordSpend(50);
    expect(limit.canSpend(50)).toBe(true);
  });

  it('blocks spending over daily cap', () => {
    const limit = new SpendingLimit(defaultConfig);
    limit.recordSpend(90);
    expect(limit.canSpend(20)).toBe(false);
  });

  it('blocks spending over weekly cap', () => {
    const limit = new SpendingLimit({ dailyCap: 500, weeklyCap: 300, monthlyCap: 1500 });
    limit.recordSpend(150);
    limit.recordSpend(100);
    expect(limit.canSpend(60)).toBe(false);
  });

  it('blocks spending over monthly cap', () => {
    const limit = new SpendingLimit({ dailyCap: 2000, weeklyCap: 5000, monthlyCap: 100 });
    limit.recordSpend(80);
    expect(limit.canSpend(30)).toBe(false);
  });

  it('throws when attempting to spend over cap', () => {
    const limit = new SpendingLimit(defaultConfig);
    limit.recordSpend(95);
    expect(() => limit.recordSpend(10)).toThrow(/cap exceeded/);
  });

  it('throws on negative spend amounts', () => {
    const limit = new SpendingLimit(defaultConfig);
    expect(() => limit.recordSpend(-5)).toThrow(/positive/);
  });

  it('reports remaining budget', () => {
    const limit = new SpendingLimit(defaultConfig);
    limit.recordSpend(30);
    expect(limit.getRemainingBudget('daily')).toBe(70);
    expect(limit.getRemainingBudget('weekly')).toBe(470);
    expect(limit.getRemainingBudget('monthly')).toBe(1470);
  });

  it('resets period spending', () => {
    const limit = new SpendingLimit(defaultConfig);
    limit.recordSpend(50);
    limit.reset('daily');
    expect(limit.getRemainingBudget('daily')).toBe(100);
    // Weekly and monthly still tracked
    expect(limit.getRemainingBudget('weekly')).toBe(450);
  });

  it('validates config with Zod', () => {
    expect(() => new SpendingLimit({ dailyCap: -1, weeklyCap: 500, monthlyCap: 1500 })).toThrow();
  });

  it('returns a copy of config', () => {
    const limit = new SpendingLimit(defaultConfig);
    const config = limit.getConfig();
    expect(config.dailyCap).toBe(100);
  });
});
