import type { PayoutRequest, PayoutMethod, PayoutStatus } from '../types.js';

export class PayoutService {
  private payouts: PayoutRequest[] = [];
  private balances = new Map<string, number>();

  requestPayout(creatorId: string, amount: number, method: PayoutMethod): PayoutRequest {
    const available = this.calculateAvailableBalance(creatorId);
    if (amount > available) {
      throw new Error(`Insufficient balance: requested ${amount}, available ${available}`);
    }

    const payout: PayoutRequest = {
      id: `payout-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      creatorId,
      amount,
      method,
      status: 'pending',
      requestedAt: new Date(),
    };

    this.payouts.push(payout);
    this.deductBalance(creatorId, amount);
    return payout;
  }

  processPayout(payoutId: string): PayoutRequest {
    const payout = this.payouts.find((p) => p.id === payoutId);
    if (!payout) {
      throw new Error(`Payout not found: ${payoutId}`);
    }
    payout.status = 'processing' as PayoutStatus;
    return payout;
  }

  completePayout(payoutId: string): PayoutRequest {
    const payout = this.payouts.find((p) => p.id === payoutId);
    if (!payout) {
      throw new Error(`Payout not found: ${payoutId}`);
    }
    payout.status = 'completed' as PayoutStatus;
    return payout;
  }

  getPayoutStatus(payoutId: string): PayoutStatus {
    const payout = this.payouts.find((p) => p.id === payoutId);
    if (!payout) {
      throw new Error(`Payout not found: ${payoutId}`);
    }
    return payout.status;
  }

  getPayoutHistory(creatorId: string): PayoutRequest[] {
    return this.payouts.filter((p) => p.creatorId === creatorId);
  }

  calculateAvailableBalance(creatorId: string): number {
    return this.balances.get(creatorId) ?? 0;
  }

  addBalance(creatorId: string, amount: number): void {
    const current = this.balances.get(creatorId) ?? 0;
    this.balances.set(creatorId, current + amount);
  }

  private deductBalance(creatorId: string, amount: number): void {
    const current = this.balances.get(creatorId) ?? 0;
    this.balances.set(creatorId, current - amount);
  }
}
