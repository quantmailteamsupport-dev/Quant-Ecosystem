import { z } from 'zod';

export const SpendingLimitConfigSchema = z.object({
  dailyCap: z.number().positive(),
  weeklyCap: z.number().positive(),
  monthlyCap: z.number().positive(),
});

export type SpendingLimitConfig = z.infer<typeof SpendingLimitConfigSchema>;

export type SpendingPeriod = 'daily' | 'weekly' | 'monthly';

export class SpendingLimit {
  private readonly config: SpendingLimitConfig;
  private dailySpend: number = 0;
  private weeklySpend: number = 0;
  private monthlySpend: number = 0;

  constructor(config: SpendingLimitConfig) {
    this.config = SpendingLimitConfigSchema.parse(config);
  }

  recordSpend(amount: number): void {
    if (amount <= 0) {
      throw new Error('Spend amount must be positive');
    }
    if (!this.canSpend(amount)) {
      throw new Error(
        `Spending cap exceeded. Daily: ${this.dailySpend + amount}/${this.config.dailyCap}, ` +
          `Weekly: ${this.weeklySpend + amount}/${this.config.weeklyCap}, ` +
          `Monthly: ${this.monthlySpend + amount}/${this.config.monthlyCap}`,
      );
    }
    this.dailySpend += amount;
    this.weeklySpend += amount;
    this.monthlySpend += amount;
  }

  canSpend(amount: number): boolean {
    if (this.dailySpend + amount > this.config.dailyCap) return false;
    if (this.weeklySpend + amount > this.config.weeklyCap) return false;
    if (this.monthlySpend + amount > this.config.monthlyCap) return false;
    return true;
  }

  getRemainingBudget(period: SpendingPeriod): number {
    switch (period) {
      case 'daily':
        return Math.max(0, this.config.dailyCap - this.dailySpend);
      case 'weekly':
        return Math.max(0, this.config.weeklyCap - this.weeklySpend);
      case 'monthly':
        return Math.max(0, this.config.monthlyCap - this.monthlySpend);
    }
  }

  reset(period: SpendingPeriod): void {
    switch (period) {
      case 'daily':
        this.dailySpend = 0;
        break;
      case 'weekly':
        this.weeklySpend = 0;
        break;
      case 'monthly':
        this.monthlySpend = 0;
        break;
    }
  }

  getConfig(): SpendingLimitConfig {
    return { ...this.config };
  }
}
