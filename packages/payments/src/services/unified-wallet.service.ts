// ============================================================================
// Payments - Unified Wallet Service
// Single wallet visible in AppShell user menu across all apps
// ============================================================================

import { z } from 'zod';
import type { AddMoneySource, SpendCategory, WalletTransaction, CurrencyCode } from '../types';
import { WalletService } from './wallet-service';

export const AddMoneySchema = z.object({
  userId: z.string().min(1),
  amount: z.number().positive(),
  source: z.enum(['stripe', 'razorpay', 'upi']),
  paymentRef: z.string().min(1),
});

export const SpendSchema = z.object({
  userId: z.string().min(1),
  amount: z.number().positive(),
  category: z.enum(['tip', 'boost_ad', 'ai_usage', 'course_unlock', 'premium_content']),
  targetId: z.string().min(1),
});

export const GetWalletSummarySchema = z.object({
  userId: z.string().min(1),
});

interface CashoutRecord {
  id: string;
  userId: string;
  amount: number;
  method: 'stripe_connect' | 'razorpay_payout';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: number;
}

interface WalletSummary {
  balance: number;
  currency: CurrencyCode;
  frozen: boolean;
  recentTransactions: WalletTransaction[];
  pendingCashouts: CashoutRecord[];
  totalAdded: number;
  totalSpent: number;
}

/**
 * UnifiedWalletService - Single wallet across all Quant apps
 *
 * Wraps WalletService and adds:
 * - Add money from multiple sources (Stripe, Razorpay, UPI)
 * - Spend across categories (tips, boosts, AI, courses, premium)
 * - Cashout via Stripe Connect or Razorpay Payouts
 * - Wallet summary for AppShell display
 */
export class UnifiedWalletService {
  private walletService: WalletService;
  private cashouts: Map<string, CashoutRecord[]>;

  constructor(walletService?: WalletService) {
    this.walletService = walletService || new WalletService();
    this.cashouts = new Map();
  }

  /** Ensure a wallet exists for the user */
  async ensureWallet(userId: string, currency?: CurrencyCode): Promise<void> {
    try {
      await this.walletService.getBalance(userId);
    } catch {
      await this.walletService.createWallet(userId, currency);
    }
  }

  /** Add money to wallet from an external source */
  async addMoney(
    userId: string,
    amount: number,
    source: AddMoneySource,
    paymentRef: string,
  ): Promise<WalletTransaction> {
    AddMoneySchema.parse({ userId, amount, source, paymentRef });
    await this.ensureWallet(userId);

    const description = `Add money via ${source}`;
    return this.walletService.credit(userId, amount, description, paymentRef);
  }

  /** Spend from wallet for a specific category */
  async spend(
    userId: string,
    amount: number,
    category: SpendCategory,
    targetId: string,
  ): Promise<WalletTransaction> {
    SpendSchema.parse({ userId, amount, category, targetId });

    const description = `Spend: ${category} (${targetId})`;
    return this.walletService.debit(userId, amount, description, targetId);
  }

  /** Get wallet summary for AppShell display */
  async getWalletSummary(userId: string): Promise<WalletSummary> {
    GetWalletSummarySchema.parse({ userId });

    const balance = await this.walletService.getBalance(userId);
    const { transactions } = await this.walletService.getTransactionHistory(userId, { limit: 10 });
    const pendingCashouts = (this.cashouts.get(userId) || []).filter(
      (c) => c.status === 'pending' || c.status === 'processing',
    );

    let totalAdded = 0;
    let totalSpent = 0;
    const { transactions: allTxns } = await this.walletService.getTransactionHistory(userId, {
      limit: 1000,
    });
    for (const txn of allTxns) {
      if (txn.type === 'credit') totalAdded += txn.amount;
      if (txn.type === 'debit') totalSpent += txn.amount;
    }

    return {
      balance: balance.balance,
      currency: balance.currency,
      frozen: balance.frozen,
      recentTransactions: transactions,
      pendingCashouts,
      totalAdded,
      totalSpent,
    };
  }

  /** Request a cashout via Stripe Connect */
  async cashoutStripeConnect(userId: string, amount: number): Promise<CashoutRecord> {
    await this.walletService.debit(userId, amount, 'Cashout via Stripe Connect');

    const record: CashoutRecord = {
      id: `cashout_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      amount,
      method: 'stripe_connect',
      status: 'processing',
      createdAt: Date.now(),
    };

    const userCashouts = this.cashouts.get(userId) || [];
    userCashouts.push(record);
    this.cashouts.set(userId, userCashouts);
    return record;
  }

  /** Request a cashout via Razorpay Payout */
  async cashoutRazorpay(userId: string, amount: number): Promise<CashoutRecord> {
    await this.walletService.debit(userId, amount, 'Cashout via Razorpay Payout');

    const record: CashoutRecord = {
      id: `cashout_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      amount,
      method: 'razorpay_payout',
      status: 'processing',
      createdAt: Date.now(),
    };

    const userCashouts = this.cashouts.get(userId) || [];
    userCashouts.push(record);
    this.cashouts.set(userId, userCashouts);
    return record;
  }

  /** Get underlying wallet service (for direct operations) */
  getWalletService(): WalletService {
    return this.walletService;
  }
}
