// ============================================================================
// Revenue Sharing - Configurable Revenue Distribution Engine
// ============================================================================

import type {
  CreatorLevel,
  SplitRatios,
  PayoutFrequency,
  PayoutStatus,
  Payout,
  PayoutSchedule,
  EarningsPeriod,
  AnalyticsPeriod,
  ExchangeRate,
  TaxJurisdiction,
  TaxConfig,
  RevenueModelType,
} from '../types.js';

interface RevenueTransaction {
  id: string;
  creatorId: string;
  amount: number;
  currency: string;
  source: RevenueModelType;
  timestamp: number;
  referrerId?: string;
}

interface TieredSplitConfig {
  level: CreatorLevel;
  splitRatios: SplitRatios;
}

interface RevenueSharingConfig {
  defaultSplit: SplitRatios;
  tieredSplits: TieredSplitConfig[];
  minimumPayoutThresholds: Record<string, number>;
  exchangeRates: ExchangeRate[];
  taxConfigs: TaxConfig[];
  defaultPayoutFrequency: PayoutFrequency;
}

interface EarningsRecord {
  creatorId: string;
  grossAmount: number;
  platformFee: number;
  referrerFee: number;
  netAmount: number;
  currency: string;
  source: RevenueModelType;
  timestamp: number;
  transactionId: string;
}

export class RevenueSharing {
  private config: RevenueSharingConfig;
  private earningsHistory: EarningsRecord[] = [];
  private creatorLevels: Map<string, CreatorLevel> = new Map();
  private payoutSchedules: Map<string, PayoutSchedule> = new Map();
  private processedPayouts: Payout[] = [];

  constructor(config: RevenueSharingConfig) {
    this.config = config;
  }

  /**
   * Get the split ratios for a creator based on their level.
   * Higher-level creators get a better split.
   */
  getSplitForLevel(level: CreatorLevel): SplitRatios {
    const tieredConfig = this.config.tieredSplits.find((t) => t.level === level);
    if (tieredConfig) {
      return tieredConfig.splitRatios;
    }
    return this.config.defaultSplit;
  }

  /**
   * Register a creator with their current level.
   */
  registerCreator(creatorId: string, level: CreatorLevel): void {
    this.creatorLevels.set(creatorId, level);
  }

  /**
   * Update a creator's level which affects their revenue split.
   */
  updateCreatorLevel(creatorId: string, level: CreatorLevel): void {
    this.creatorLevels.set(creatorId, level);
  }

  /**
   * Calculate revenue split for a transaction.
   * Returns amounts distributed to platform, creator, and optional referrer.
   */
  calculateSplit(
    amount: number,
    creatorId: string,
    hasReferrer: boolean,
  ): { platform: number; creator: number; referrer: number } {
    const level = this.creatorLevels.get(creatorId) ?? 'starter';
    const split = this.getSplitForLevel(level);

    let platformAmount: number;
    let creatorAmount: number;
    let referrerAmount: number;

    if (hasReferrer) {
      platformAmount = Math.round(amount * split.platform * 100) / 100;
      referrerAmount = Math.round(amount * split.referrer * 100) / 100;
      creatorAmount = Math.round((amount - platformAmount - referrerAmount) * 100) / 100;
    } else {
      // If no referrer, referrer share goes to creator
      platformAmount = Math.round(amount * split.platform * 100) / 100;
      referrerAmount = 0;
      creatorAmount = Math.round((amount - platformAmount) * 100) / 100;
    }

    return { platform: platformAmount, creator: creatorAmount, referrer: referrerAmount };
  }

  /**
   * Process a revenue transaction and record earnings.
   */
  processTransaction(transaction: RevenueTransaction): EarningsRecord {
    const hasReferrer = transaction.referrerId !== undefined;
    const split = this.calculateSplit(transaction.amount, transaction.creatorId, hasReferrer);

    const record: EarningsRecord = {
      creatorId: transaction.creatorId,
      grossAmount: transaction.amount,
      platformFee: split.platform,
      referrerFee: split.referrer,
      netAmount: split.creator,
      currency: transaction.currency,
      source: transaction.source,
      timestamp: transaction.timestamp,
      transactionId: transaction.id,
    };

    this.earningsHistory.push(record);
    return record;
  }

  /**
   * Convert an amount between currencies using configured exchange rates.
   */
  convertCurrency(amount: number, fromCurrency: string, toCurrency: string): number {
    if (fromCurrency === toCurrency) return amount;

    const directRate = this.config.exchangeRates.find(
      (r) => r.from === fromCurrency && r.to === toCurrency,
    );
    if (directRate) {
      return Math.round(amount * directRate.rate * 100) / 100;
    }

    // Try inverse
    const inverseRate = this.config.exchangeRates.find(
      (r) => r.from === toCurrency && r.to === fromCurrency,
    );
    if (inverseRate) {
      return Math.round((amount / inverseRate.rate) * 100) / 100;
    }

    // Try indirect via USD
    const toUsd = this.config.exchangeRates.find((r) => r.from === fromCurrency && r.to === 'USD');
    const fromUsd = this.config.exchangeRates.find((r) => r.from === 'USD' && r.to === toCurrency);
    if (toUsd && fromUsd) {
      const usdAmount = amount * toUsd.rate;
      return Math.round(usdAmount * fromUsd.rate * 100) / 100;
    }

    throw new Error(`No exchange rate found for ${fromCurrency} -> ${toCurrency}`);
  }

  /**
   * Calculate real-time earnings for a creator in their preferred currency.
   */
  calculateRealTimeEarnings(creatorId: string, targetCurrency: string, since?: number): number {
    const records = this.earningsHistory.filter(
      (r) => r.creatorId === creatorId && (since === undefined || r.timestamp >= since),
    );

    let totalEarnings = 0;
    for (const record of records) {
      const converted = this.convertCurrency(record.netAmount, record.currency, targetCurrency);
      totalEarnings += converted;
    }

    return Math.round(totalEarnings * 100) / 100;
  }

  /**
   * Check if a creator has reached minimum payout threshold.
   */
  hasReachedPayoutThreshold(creatorId: string, currency: string): boolean {
    const threshold = this.config.minimumPayoutThresholds[currency] ?? 50;
    const pendingEarnings = this.calculatePendingEarnings(creatorId, currency);
    return pendingEarnings >= threshold;
  }

  /**
   * Calculate pending (unpaid) earnings for a creator.
   */
  calculatePendingEarnings(creatorId: string, currency: string): number {
    const lastPayout = this.getLastPayoutDate(creatorId);
    return this.calculateRealTimeEarnings(creatorId, currency, lastPayout);
  }

  /**
   * Get the last payout date for a creator.
   */
  private getLastPayoutDate(creatorId: string): number | undefined {
    const schedule = this.payoutSchedules.get(creatorId);
    return schedule?.lastPayoutDate;
  }

  /**
   * Estimate tax withholding based on jurisdiction.
   */
  estimateTaxWithholding(amount: number, jurisdiction: TaxJurisdiction): number {
    const taxConfig = this.config.taxConfigs.find((t) => t.jurisdiction === jurisdiction);
    if (!taxConfig) {
      // Default withholding rates by region
      const defaultRates: Record<TaxJurisdiction, number> = {
        US: 0.24,
        EU: 0.2,
        UK: 0.2,
        CA: 0.25,
        AU: 0.325,
        other: 0.3,
      };
      const rate = defaultRates[jurisdiction] ?? 0.3;
      return Math.round(amount * rate * 100) / 100;
    }

    if (amount < taxConfig.threshold) {
      return 0;
    }

    return Math.round(amount * taxConfig.rate * 100) / 100;
  }

  /**
   * Set up payout schedule for a creator.
   */
  setupPayoutSchedule(
    creatorId: string,
    frequency: PayoutFrequency,
    currency: string,
    paymentMethod: string,
    jurisdiction: TaxJurisdiction,
  ): PayoutSchedule {
    const taxConfig = this.config.taxConfigs.find((t) => t.jurisdiction === jurisdiction);
    const taxRate = taxConfig?.rate ?? this.getDefaultTaxRate(jurisdiction);

    const schedule: PayoutSchedule = {
      id: `payout_${creatorId}_${Date.now()}`,
      creatorId,
      frequency,
      minimumAmount: this.config.minimumPayoutThresholds[currency] ?? 50,
      currency,
      nextPayoutDate: this.calculateNextPayoutDate(frequency, Date.now()),
      paymentMethod,
      taxWithholdingRate: taxRate,
      status: 'pending' as PayoutStatus,
    };

    this.payoutSchedules.set(creatorId, schedule);
    return schedule;
  }

  /**
   * Calculate the next payout date based on frequency.
   */
  calculateNextPayoutDate(frequency: PayoutFrequency, fromDate: number): number {
    const day = 86400000; // ms in a day
    switch (frequency) {
      case 'daily':
        return fromDate + day;
      case 'weekly':
        return fromDate + 7 * day;
      case 'biweekly':
        return fromDate + 14 * day;
      case 'monthly':
        return fromDate + 30 * day;
      default:
        return fromDate + 30 * day;
    }
  }

  private getDefaultTaxRate(jurisdiction: TaxJurisdiction): number {
    const rates: Record<TaxJurisdiction, number> = {
      US: 0.24,
      EU: 0.2,
      UK: 0.2,
      CA: 0.25,
      AU: 0.325,
      other: 0.3,
    };
    return rates[jurisdiction] ?? 0.3;
  }

  /**
   * Process payouts for all eligible creators.
   */
  processPayouts(currentTime: number): Payout[] {
    const payouts: Payout[] = [];

    for (const [creatorId, schedule] of this.payoutSchedules) {
      if (schedule.nextPayoutDate > currentTime) continue;
      if (schedule.status === 'held') continue;

      const pendingEarnings = this.calculatePendingEarnings(creatorId, schedule.currency);
      if (pendingEarnings < schedule.minimumAmount) continue;

      const grossAmount = pendingEarnings;
      const platformFee = 0; // Already deducted in split
      const taxWithholding = this.estimateTaxWithholding(grossAmount, 'US');
      const netAmount = Math.round((grossAmount - taxWithholding) * 100) / 100;

      const payout: Payout = {
        id: `pay_${creatorId}_${currentTime}`,
        creatorId,
        amount: grossAmount,
        grossAmount,
        platformFee,
        taxWithholding,
        netAmount,
        currency: schedule.currency,
        status: 'processing',
        periodStart: schedule.lastPayoutDate ?? 0,
        periodEnd: currentTime,
        processedAt: currentTime,
      };

      payouts.push(payout);
      this.processedPayouts.push(payout);

      // Update schedule
      schedule.lastPayoutDate = currentTime;
      schedule.nextPayoutDate = this.calculateNextPayoutDate(schedule.frequency, currentTime);
      this.payoutSchedules.set(creatorId, schedule);
    }

    return payouts;
  }

  /**
   * Get historical earnings breakdown by period.
   */
  getEarningsByPeriod(
    creatorId: string,
    period: AnalyticsPeriod,
    currency: string,
  ): EarningsPeriod[] {
    const records = this.earningsHistory.filter((r) => r.creatorId === creatorId);
    if (records.length === 0) return [];

    const periodMs = this.getPeriodDuration(period);
    const periods: EarningsPeriod[] = [];

    // Aggregate by period buckets
    const buckets = new Map<number, EarningsRecord[]>();

    for (const record of records) {
      const bucketStart = Math.floor(record.timestamp / periodMs) * periodMs;
      const existing = buckets.get(bucketStart) ?? [];
      existing.push(record);
      buckets.set(bucketStart, existing);
    }

    for (const [startDate, bucketRecords] of buckets) {
      const sources: Record<string, number> = {};
      let grossEarnings = 0;
      let platformFees = 0;

      for (const record of bucketRecords) {
        const converted = this.convertCurrency(record.netAmount, record.currency, currency);
        const convertedGross = this.convertCurrency(record.grossAmount, record.currency, currency);
        const convertedFee = this.convertCurrency(record.platformFee, record.currency, currency);

        grossEarnings += convertedGross;
        platformFees += convertedFee;

        const sourceKey = record.source;
        sources[sourceKey] = (sources[sourceKey] ?? 0) + converted;
      }

      const taxes = this.estimateTaxWithholding(grossEarnings - platformFees, 'US');
      const netEarnings = grossEarnings - platformFees - taxes;

      periods.push({
        period,
        startDate,
        endDate: startDate + periodMs,
        grossEarnings: Math.round(grossEarnings * 100) / 100,
        platformFees: Math.round(platformFees * 100) / 100,
        taxes: Math.round(taxes * 100) / 100,
        netEarnings: Math.round(netEarnings * 100) / 100,
        transactionCount: bucketRecords.length,
        sources: sources as Record<RevenueModelType, number>,
      });
    }

    // Sort by start date descending
    periods.sort((a, b) => b.startDate - a.startDate);
    return periods;
  }

  /**
   * Get the duration in milliseconds for each period type.
   */
  private getPeriodDuration(period: AnalyticsPeriod): number {
    const day = 86400000;
    switch (period) {
      case 'daily':
        return day;
      case 'weekly':
        return 7 * day;
      case 'monthly':
        return 30 * day;
      case 'all_time':
        return Number.MAX_SAFE_INTEGER;
    }
  }

  /**
   * Get total earnings across all time for a creator.
   */
  getTotalEarnings(creatorId: string, currency: string): number {
    return this.calculateRealTimeEarnings(creatorId, currency);
  }

  /**
   * Get the tiered split configuration.
   */
  getTieredSplitConfig(): TieredSplitConfig[] {
    return [...this.config.tieredSplits];
  }

  /**
   * Update split ratios for a specific tier.
   */
  updateTieredSplit(level: CreatorLevel, newSplit: SplitRatios): void {
    const existing = this.config.tieredSplits.find((t) => t.level === level);
    if (existing) {
      existing.splitRatios = newSplit;
    } else {
      this.config.tieredSplits.push({ level, splitRatios: newSplit });
    }
  }

  /**
   * Get payout history for a creator.
   */
  getPayoutHistory(creatorId: string): Payout[] {
    return this.processedPayouts.filter((p) => p.creatorId === creatorId);
  }

  /**
   * Get payout schedule for a creator.
   */
  getPayoutSchedule(creatorId: string): PayoutSchedule | undefined {
    return this.payoutSchedules.get(creatorId);
  }

  /**
   * Hold payouts for a creator (e.g., during review).
   */
  holdPayouts(creatorId: string): void {
    const schedule = this.payoutSchedules.get(creatorId);
    if (schedule) {
      schedule.status = 'held';
      this.payoutSchedules.set(creatorId, schedule);
    }
  }

  /**
   * Release held payouts for a creator.
   */
  releasePayouts(creatorId: string): void {
    const schedule = this.payoutSchedules.get(creatorId);
    if (schedule) {
      schedule.status = 'pending';
      this.payoutSchedules.set(creatorId, schedule);
    }
  }
}
