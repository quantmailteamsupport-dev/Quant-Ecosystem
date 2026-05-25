// ============================================================================
// Virtual Currency - In-App Currency System with Double-Entry Bookkeeping
// ============================================================================

import type {
  VirtualCurrency as VirtualCurrencyConfig,
  VirtualCurrencyBalance,
  VirtualCurrencyType,
  LedgerEntry,
} from '../types.js';

interface CurrencyConfig {
  type: VirtualCurrencyType;
  name: string;
  exchangeRate: number;
  baseCurrency: string;
  markup: number;
  minPurchase: number;
  maxPurchase: number;
}

interface EngagementReward {
  action: string;
  amount: number;
  currencyType: VirtualCurrencyType;
  cooldownMs: number;
  dailyLimit: number;
}

interface CurrencySink {
  id: string;
  name: string;
  cost: number;
  currencyType: VirtualCurrencyType;
  category: 'boost' | 'premium_feature' | 'cosmetic' | 'gift' | 'unlock';
  description: string;
}

interface SupplyMetrics {
  totalSupply: number;
  circulatingSupply: number;
  totalBurned: number;
  inflationRate: number;
  velocityPerDay: number;
}

interface RewardCooldown {
  userId: string;
  action: string;
  lastRewardAt: number;
  countToday: number;
  dayStart: number;
}

export class VirtualCurrency {
  private currencies: Map<VirtualCurrencyType, CurrencyConfig> = new Map();
  private balances: Map<string, VirtualCurrencyBalance> = new Map();
  private ledger: LedgerEntry[] = [];
  private engagementRewards: EngagementReward[] = [];
  private currencySinks: CurrencySink[] = [];
  private supplyTracking: Map<VirtualCurrencyType, SupplyMetrics> = new Map();
  private cooldowns: Map<string, RewardCooldown> = new Map();
  private nextEntryId: number = 1;

  constructor(currencies: CurrencyConfig[]) {
    for (const currency of currencies) {
      this.currencies.set(currency.type, currency);
      this.supplyTracking.set(currency.type, {
        totalSupply: 0,
        circulatingSupply: 0,
        totalBurned: 0,
        inflationRate: 0,
        velocityPerDay: 0,
      });
    }
  }

  /**
   * Get the balance key for a user and currency type.
   */
  private getBalanceKey(userId: string, currencyType: VirtualCurrencyType): string {
    return `${userId}:${currencyType}`;
  }

  /**
   * Get or create a balance for a user.
   */
  getBalance(userId: string, currencyType: VirtualCurrencyType): VirtualCurrencyBalance {
    const key = this.getBalanceKey(userId, currencyType);
    const existing = this.balances.get(key);
    if (existing) return existing;

    const newBalance: VirtualCurrencyBalance = {
      userId,
      currencyType,
      balance: 0,
      lifetimeEarned: 0,
      lifetimeSpent: 0,
      lastUpdated: Date.now(),
    };
    this.balances.set(key, newBalance);
    return newBalance;
  }

  /**
   * Calculate the real-currency cost to purchase virtual currency.
   * Includes markup over base exchange rate.
   */
  calculatePurchaseCost(currencyType: VirtualCurrencyType, amount: number): number {
    const config = this.currencies.get(currencyType);
    if (!config) throw new Error(`Currency ${currencyType} not configured`);

    const baseRate = config.exchangeRate;
    const effectiveRate = baseRate * (1 + config.markup);
    return Math.round(amount * effectiveRate * 100) / 100;
  }

  /**
   * Calculate how much virtual currency you get for a real-currency amount.
   */
  calculateVirtualAmount(currencyType: VirtualCurrencyType, realAmount: number): number {
    const config = this.currencies.get(currencyType);
    if (!config) throw new Error(`Currency ${currencyType} not configured`);

    const effectiveRate = config.exchangeRate * (1 + config.markup);
    return Math.floor(realAmount / effectiveRate);
  }

  /**
   * Purchase virtual currency with real money.
   */
  purchaseCurrency(
    userId: string,
    currencyType: VirtualCurrencyType,
    amount: number,
    referenceId: string,
  ): LedgerEntry {
    const config = this.currencies.get(currencyType);
    if (!config) throw new Error(`Currency ${currencyType} not configured`);

    if (amount < config.minPurchase) {
      throw new Error(`Minimum purchase is ${config.minPurchase}`);
    }
    if (amount > config.maxPurchase) {
      throw new Error(`Maximum purchase is ${config.maxPurchase}`);
    }

    // Credit the user
    const entry = this.creditAccount(
      userId,
      currencyType,
      amount,
      'purchase',
      referenceId,
      'Currency purchase',
    );

    // Update supply
    const supply = this.supplyTracking.get(currencyType);
    if (supply) {
      supply.totalSupply += amount;
      supply.circulatingSupply += amount;
    }

    return entry;
  }

  /**
   * Send a tip from one user to another using double-entry bookkeeping.
   */
  sendTip(
    senderId: string,
    receiverId: string,
    currencyType: VirtualCurrencyType,
    amount: number,
    message?: string,
  ): { debitEntry: LedgerEntry; creditEntry: LedgerEntry } {
    const senderBalance = this.getBalance(senderId, currencyType);
    if (senderBalance.balance < amount) {
      throw new Error('Insufficient balance');
    }

    const referenceId = `tip_${senderId}_${receiverId}_${Date.now()}`;
    const description = message ? `Tip: ${message}` : 'Tip sent';

    // Debit sender
    const debitEntry = this.debitAccount(
      senderId,
      currencyType,
      amount,
      'tip',
      referenceId,
      description,
    );

    // Credit receiver
    const creditEntry = this.creditAccount(
      receiverId,
      currencyType,
      amount,
      'tip',
      referenceId,
      `Tip received from ${senderId}`,
    );

    return { debitEntry, creditEntry };
  }

  /**
   * Send a gift between users.
   */
  sendGift(
    senderId: string,
    receiverId: string,
    currencyType: VirtualCurrencyType,
    amount: number,
  ): { debitEntry: LedgerEntry; creditEntry: LedgerEntry } {
    const senderBalance = this.getBalance(senderId, currencyType);
    if (senderBalance.balance < amount) {
      throw new Error('Insufficient balance');
    }

    const referenceId = `gift_${senderId}_${receiverId}_${Date.now()}`;

    const debitEntry = this.debitAccount(
      senderId,
      currencyType,
      amount,
      'gift',
      referenceId,
      `Gift sent to ${receiverId}`,
    );

    const creditEntry = this.creditAccount(
      receiverId,
      currencyType,
      amount,
      'gift',
      referenceId,
      `Gift received from ${senderId}`,
    );

    return { debitEntry, creditEntry };
  }

  /**
   * Credit an account (increase balance).
   */
  private creditAccount(
    userId: string,
    currencyType: VirtualCurrencyType,
    amount: number,
    category: LedgerEntry['category'],
    referenceId: string,
    description: string,
  ): LedgerEntry {
    const balance = this.getBalance(userId, currencyType);
    balance.balance += amount;
    balance.lifetimeEarned += amount;
    balance.lastUpdated = Date.now();

    const key = this.getBalanceKey(userId, currencyType);
    this.balances.set(key, balance);

    const entry: LedgerEntry = {
      id: `ledger_${this.nextEntryId++}`,
      timestamp: Date.now(),
      userId,
      currencyType,
      amount,
      type: 'credit',
      category,
      referenceId,
      balance: balance.balance,
      description,
    };

    this.ledger.push(entry);
    return entry;
  }

  /**
   * Debit an account (decrease balance).
   */
  private debitAccount(
    userId: string,
    currencyType: VirtualCurrencyType,
    amount: number,
    category: LedgerEntry['category'],
    referenceId: string,
    description: string,
  ): LedgerEntry {
    const balance = this.getBalance(userId, currencyType);
    balance.balance -= amount;
    balance.lifetimeSpent += amount;
    balance.lastUpdated = Date.now();

    const key = this.getBalanceKey(userId, currencyType);
    this.balances.set(key, balance);

    const entry: LedgerEntry = {
      id: `ledger_${this.nextEntryId++}`,
      timestamp: Date.now(),
      userId,
      currencyType,
      amount,
      type: 'debit',
      category,
      referenceId,
      balance: balance.balance,
      description,
    };

    this.ledger.push(entry);
    return entry;
  }

  /**
   * Register an engagement reward configuration.
   */
  registerEngagementReward(reward: EngagementReward): void {
    this.engagementRewards.push(reward);
  }

  /**
   * Award currency for an engagement action.
   * Respects cooldowns and daily limits.
   */
  awardEngagementReward(userId: string, action: string): LedgerEntry | null {
    const reward = this.engagementRewards.find((r) => r.action === action);
    if (!reward) return null;

    // Check cooldown
    const cooldownKey = `${userId}:${action}`;
    const cooldown = this.cooldowns.get(cooldownKey);
    const now = Date.now();

    if (cooldown) {
      // Check time cooldown
      if (now - cooldown.lastRewardAt < reward.cooldownMs) {
        return null;
      }

      // Check daily limit
      const dayStart = Math.floor(now / 86400000) * 86400000;
      if (cooldown.dayStart === dayStart && cooldown.countToday >= reward.dailyLimit) {
        return null;
      }

      // Reset daily counter if new day
      if (cooldown.dayStart !== dayStart) {
        cooldown.countToday = 0;
        cooldown.dayStart = dayStart;
      }

      cooldown.lastRewardAt = now;
      cooldown.countToday += 1;
      this.cooldowns.set(cooldownKey, cooldown);
    } else {
      const dayStart = Math.floor(now / 86400000) * 86400000;
      this.cooldowns.set(cooldownKey, {
        userId,
        action,
        lastRewardAt: now,
        countToday: 1,
        dayStart,
      });
    }

    const referenceId = `reward_${action}_${userId}_${now}`;
    const entry = this.creditAccount(
      userId,
      reward.currencyType,
      reward.amount,
      'reward',
      referenceId,
      `Reward for ${action}`,
    );

    // Update supply (newly minted currency)
    const supply = this.supplyTracking.get(reward.currencyType);
    if (supply) {
      supply.totalSupply += reward.amount;
      supply.circulatingSupply += reward.amount;
    }

    return entry;
  }

  /**
   * Register a currency sink (way to spend/burn currency).
   */
  registerCurrencySink(sink: CurrencySink): void {
    this.currencySinks.push(sink);
  }

  /**
   * Use a currency sink (spend currency on a feature/item).
   * Burns the currency from circulation (anti-inflation).
   */
  useCurrencySink(userId: string, sinkId: string): LedgerEntry | null {
    const sink = this.currencySinks.find((s) => s.id === sinkId);
    if (!sink) return null;

    const balance = this.getBalance(userId, sink.currencyType);
    if (balance.balance < sink.cost) return null;

    // Apply dynamic pricing based on supply
    const adjustedCost = this.getDynamicPrice(sink);

    if (balance.balance < adjustedCost) return null;

    const referenceId = `sink_${sinkId}_${userId}_${Date.now()}`;
    const entry = this.debitAccount(
      userId,
      sink.currencyType,
      adjustedCost,
      'sink',
      referenceId,
      `Used: ${sink.name}`,
    );

    // Burn currency (remove from circulation)
    const supply = this.supplyTracking.get(sink.currencyType);
    if (supply) {
      supply.circulatingSupply -= adjustedCost;
      supply.totalBurned += adjustedCost;
    }

    return entry;
  }

  /**
   * Dynamic pricing based on supply metrics.
   * When supply is high (inflation risk), prices decrease to encourage spending.
   * When supply is low, prices increase to preserve value.
   */
  getDynamicPrice(sink: CurrencySink): number {
    const supply = this.supplyTracking.get(sink.currencyType);
    if (!supply || supply.totalSupply === 0) return sink.cost;

    // Ratio of circulating supply to total supply
    const circulationRatio = supply.circulatingSupply / supply.totalSupply;

    // If circulation is high (>80%), discount to encourage spending
    // If circulation is low (<40%), increase prices to preserve value
    let priceMultiplier: number;
    if (circulationRatio > 0.8) {
      priceMultiplier = 0.8; // 20% discount
    } else if (circulationRatio > 0.6) {
      priceMultiplier = 1.0; // Normal price
    } else if (circulationRatio > 0.4) {
      priceMultiplier = 1.1; // 10% increase
    } else {
      priceMultiplier = 1.25; // 25% increase
    }

    return Math.round(sink.cost * priceMultiplier);
  }

  /**
   * Get supply metrics for a currency type.
   */
  getSupplyMetrics(currencyType: VirtualCurrencyType): SupplyMetrics | undefined {
    return this.supplyTracking.get(currencyType);
  }

  /**
   * Calculate inflation rate over a period.
   */
  calculateInflationRate(currencyType: VirtualCurrencyType, periodMs: number): number {
    const now = Date.now();
    const periodStart = now - periodMs;

    // Count currency minted in period
    const mintedInPeriod = this.ledger
      .filter(
        (e) =>
          e.currencyType === currencyType &&
          e.type === 'credit' &&
          (e.category === 'reward' || e.category === 'purchase') &&
          e.timestamp >= periodStart,
      )
      .reduce((sum, e) => sum + e.amount, 0);

    // Count currency burned in period
    const burnedInPeriod = this.ledger
      .filter(
        (e) =>
          e.currencyType === currencyType &&
          e.type === 'debit' &&
          e.category === 'sink' &&
          e.timestamp >= periodStart,
      )
      .reduce((sum, e) => sum + e.amount, 0);

    const supply = this.supplyTracking.get(currencyType);
    if (!supply || supply.totalSupply === 0) return 0;

    const netInflation = mintedInPeriod - burnedInPeriod;
    return netInflation / supply.totalSupply;
  }

  /**
   * Get transaction ledger for a user.
   */
  getTransactionHistory(
    userId: string,
    currencyType?: VirtualCurrencyType,
    limit?: number,
  ): LedgerEntry[] {
    let entries = this.ledger.filter((e) => e.userId === userId);

    if (currencyType) {
      entries = entries.filter((e) => e.currencyType === currencyType);
    }

    entries.sort((a, b) => b.timestamp - a.timestamp);

    if (limit) {
      entries = entries.slice(0, limit);
    }

    return entries;
  }

  /**
   * Get full audit trail for a reference ID.
   */
  getAuditTrail(referenceId: string): LedgerEntry[] {
    return this.ledger.filter((e) => e.referenceId === referenceId);
  }

  /**
   * Refund a transaction using the reference ID.
   */
  refundTransaction(referenceId: string): LedgerEntry[] {
    const originalEntries = this.getAuditTrail(referenceId);
    if (originalEntries.length === 0) {
      throw new Error(`No transaction found with reference ${referenceId}`);
    }

    const refundEntries: LedgerEntry[] = [];
    const refundRef = `refund_${referenceId}_${Date.now()}`;

    for (const original of originalEntries) {
      if (original.type === 'debit') {
        // Reverse debit = credit
        const entry = this.creditAccount(
          original.userId,
          original.currencyType,
          original.amount,
          'refund',
          refundRef,
          `Refund: ${original.description}`,
        );
        refundEntries.push(entry);
      } else {
        // Reverse credit = debit
        const entry = this.debitAccount(
          original.userId,
          original.currencyType,
          original.amount,
          'refund',
          refundRef,
          `Refund: ${original.description}`,
        );
        refundEntries.push(entry);
      }
    }

    return refundEntries;
  }

  /**
   * Get all registered currency configurations.
   */
  getCurrencyConfigs(): VirtualCurrencyConfig[] {
    const configs: VirtualCurrencyConfig[] = [];
    for (const [type, config] of this.currencies) {
      const supply = this.supplyTracking.get(type);
      configs.push({
        type,
        name: config.name,
        exchangeRate: config.exchangeRate,
        baseCurrency: config.baseCurrency,
        markup: config.markup,
        minPurchase: config.minPurchase,
        maxPurchase: config.maxPurchase,
        totalSupply: supply?.totalSupply ?? 0,
        circulatingSupply: supply?.circulatingSupply ?? 0,
      });
    }
    return configs;
  }

  /**
   * Get all currency sinks.
   */
  getCurrencySinks(): CurrencySink[] {
    return [...this.currencySinks];
  }
}
