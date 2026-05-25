// ============================================================================
// QuantChat - Chat Payment Service
// In-chat payments, money requests, bill splitting, transaction history
// ============================================================================

interface PaymentMethod {
  id: string;
  userId: string;
  type: 'card' | 'bank' | 'wallet';
  last4: string;
  brand: string;
  isDefault: boolean;
  addedAt: Date;
}

interface Transaction {
  id: string;
  type: 'send' | 'receive' | 'request' | 'split' | 'withdraw';
  fromUserId: string;
  toUserId: string;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled' | 'expired';
  note: string | null;
  chatId: string | null;
  createdAt: Date;
  completedAt: Date | null;
}

interface SplitBill {
  id: string;
  creatorId: string;
  chatId: string;
  total: number;
  currency: string;
  method: 'equal' | 'percentage' | 'custom';
  description: string;
  participants: SplitParticipant[];
  status: 'pending' | 'completed' | 'cancelled';
  createdAt: Date;
}

interface SplitParticipant {
  userId: string;
  amount: number;
  paid: boolean;
  paidAt: Date | null;
}

interface Wallet {
  userId: string;
  balance: number;
  currency: string;
  pendingBalance: number;
  lastUpdated: Date;
}

interface MoneyRequest {
  id: string;
  fromUserId: string;
  toUserId: string;
  amount: number;
  currency: string;
  note: string | null;
  status: 'pending' | 'paid' | 'declined' | 'expired';
  expiresAt: Date;
  createdAt: Date;
}

export class ChatPaymentService {
  private wallets: Map<string, Wallet> = new Map();
  private transactions: Map<string, Transaction> = new Map();
  private userTransactionIndex: Map<string, string[]> = new Map();
  private paymentMethods: Map<string, PaymentMethod[]> = new Map();
  private splitBills: Map<string, SplitBill> = new Map();
  private moneyRequests: Map<string, MoneyRequest> = new Map();

  async sendMoney(fromUserId: string, toUserId: string, amount: number, options?: { note?: string; chatId?: string; currency?: string }): Promise<Transaction> {
    if (amount <= 0) throw new Error('Amount must be positive');
    if (amount > 10000) throw new Error('Maximum single transfer is 10,000');
    if (fromUserId === toUserId) throw new Error('Cannot send money to yourself');

    const wallet = this.getOrCreateWallet(fromUserId);
    if (wallet.balance < amount) throw new Error('Insufficient balance');

    const currency = options?.currency || 'USD';
    const txId = `tx_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    const transaction: Transaction = {
      id: txId,
      type: 'send',
      fromUserId,
      toUserId,
      amount,
      currency,
      status: 'completed',
      note: options?.note || null,
      chatId: options?.chatId || null,
      createdAt: new Date(),
      completedAt: new Date(),
    };

    // Update balances
    wallet.balance -= amount;
    wallet.lastUpdated = new Date();

    const recipientWallet = this.getOrCreateWallet(toUserId);
    recipientWallet.balance += amount;
    recipientWallet.lastUpdated = new Date();

    this.transactions.set(txId, transaction);
    this.addToUserIndex(fromUserId, txId);
    this.addToUserIndex(toUserId, txId);

    return transaction;
  }

  async requestMoney(fromUserId: string, toUserId: string, amount: number, options?: { note?: string; expiresInHours?: number }): Promise<MoneyRequest> {
    if (amount <= 0) throw new Error('Amount must be positive');
    if (fromUserId === toUserId) throw new Error('Cannot request money from yourself');

    const expiresInHours = options?.expiresInHours || 72;
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    const request: MoneyRequest = {
      id: requestId,
      fromUserId,
      toUserId,
      amount,
      currency: 'USD',
      note: options?.note || null,
      status: 'pending',
      expiresAt: new Date(Date.now() + expiresInHours * 3600000),
      createdAt: new Date(),
    };

    this.moneyRequests.set(requestId, request);
    return request;
  }

  async respondToRequest(requestId: string, userId: string, action: 'pay' | 'decline'): Promise<MoneyRequest> {
    const request = this.moneyRequests.get(requestId);
    if (!request) throw new Error('Request not found');
    if (request.toUserId !== userId) throw new Error('Access denied');
    if (request.status !== 'pending') throw new Error('Request already processed');
    if (request.expiresAt < new Date()) {
      request.status = 'expired';
      throw new Error('Request has expired');
    }

    if (action === 'decline') {
      request.status = 'declined';
      return request;
    }

    // Process payment
    await this.sendMoney(userId, request.fromUserId, request.amount, { note: `Payment for request: ${request.note || 'N/A'}` });
    request.status = 'paid';
    return request;
  }

  async splitBill(creatorId: string, config: {
    chatId: string;
    total: number;
    method: 'equal' | 'percentage' | 'custom';
    description: string;
    participants: Array<{ userId: string; amount?: number; percentage?: number }>;
  }): Promise<SplitBill> {
    if (config.total <= 0) throw new Error('Total must be positive');
    if (config.participants.length < 2) throw new Error('At least 2 participants required');

    const splitId = `split_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const participants: SplitParticipant[] = [];

    switch (config.method) {
      case 'equal': {
        const perPerson = Math.round((config.total / config.participants.length) * 100) / 100;
        for (const p of config.participants) {
          participants.push({
            userId: p.userId,
            amount: perPerson,
            paid: p.userId === creatorId,
            paidAt: p.userId === creatorId ? new Date() : null,
          });
        }
        break;
      }
      case 'percentage': {
        for (const p of config.participants) {
          const pct = p.percentage || (100 / config.participants.length);
          participants.push({
            userId: p.userId,
            amount: Math.round((config.total * pct / 100) * 100) / 100,
            paid: p.userId === creatorId,
            paidAt: p.userId === creatorId ? new Date() : null,
          });
        }
        break;
      }
      case 'custom': {
        let totalAssigned = 0;
        for (const p of config.participants) {
          const amt = p.amount || 0;
          totalAssigned += amt;
          participants.push({
            userId: p.userId,
            amount: amt,
            paid: p.userId === creatorId,
            paidAt: p.userId === creatorId ? new Date() : null,
          });
        }
        if (Math.abs(totalAssigned - config.total) > 0.01) {
          throw new Error('Custom amounts must add up to total');
        }
        break;
      }
    }

    const split: SplitBill = {
      id: splitId,
      creatorId,
      chatId: config.chatId,
      total: config.total,
      currency: 'USD',
      method: config.method,
      description: config.description,
      participants,
      status: 'pending',
      createdAt: new Date(),
    };

    this.splitBills.set(splitId, split);
    return split;
  }

  async paySplit(splitId: string, userId: string): Promise<SplitBill> {
    const split = this.splitBills.get(splitId);
    if (!split) throw new Error('Split bill not found');
    if (split.status !== 'pending') throw new Error('Split bill already settled');

    const participant = split.participants.find(p => p.userId === userId);
    if (!participant) throw new Error('Not a participant in this split');
    if (participant.paid) throw new Error('Already paid');

    const wallet = this.getOrCreateWallet(userId);
    if (wallet.balance < participant.amount) throw new Error('Insufficient balance');

    // Transfer to creator
    await this.sendMoney(userId, split.creatorId, participant.amount, {
      note: `Split: ${split.description}`,
      chatId: split.chatId,
    });

    participant.paid = true;
    participant.paidAt = new Date();

    // Check if all paid
    if (split.participants.every(p => p.paid)) {
      split.status = 'completed';
    }

    return split;
  }

  async getBalance(userId: string): Promise<Wallet> {
    return this.getOrCreateWallet(userId);
  }

  async getTransactions(userId: string, options?: { limit?: number; type?: string; status?: string }): Promise<Transaction[]> {
    const txIds = this.userTransactionIndex.get(userId) || [];
    let transactions = txIds
      .map(id => this.transactions.get(id))
      .filter((t): t is Transaction => t !== undefined);

    if (options?.type) transactions = transactions.filter(t => t.type === options.type);
    if (options?.status) transactions = transactions.filter(t => t.status === options.status);

    transactions.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return transactions.slice(0, options?.limit || 50);
  }

  async addPaymentMethod(userId: string, method: { type: 'card' | 'bank' | 'wallet'; last4: string; brand: string }): Promise<PaymentMethod> {
    const methodId = `pm_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const userMethods = this.paymentMethods.get(userId) || [];

    const paymentMethod: PaymentMethod = {
      id: methodId,
      userId,
      type: method.type,
      last4: method.last4,
      brand: method.brand,
      isDefault: userMethods.length === 0,
      addedAt: new Date(),
    };

    userMethods.push(paymentMethod);
    this.paymentMethods.set(userId, userMethods);
    return paymentMethod;
  }

  async withdraw(userId: string, amount: number, paymentMethodId: string): Promise<Transaction> {
    if (amount <= 0) throw new Error('Amount must be positive');
    const wallet = this.getOrCreateWallet(userId);
    if (wallet.balance < amount) throw new Error('Insufficient balance');

    const methods = this.paymentMethods.get(userId) || [];
    const method = methods.find(m => m.id === paymentMethodId);
    if (!method) throw new Error('Payment method not found');

    wallet.balance -= amount;
    wallet.lastUpdated = new Date();

    const txId = `tx_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const transaction: Transaction = {
      id: txId,
      type: 'withdraw',
      fromUserId: userId,
      toUserId: 'external',
      amount,
      currency: wallet.currency,
      status: 'completed',
      note: `Withdrawal to ${method.brand} ending ${method.last4}`,
      chatId: null,
      createdAt: new Date(),
      completedAt: new Date(),
    };

    this.transactions.set(txId, transaction);
    this.addToUserIndex(userId, txId);
    return transaction;
  }

  private getOrCreateWallet(userId: string): Wallet {
    let wallet = this.wallets.get(userId);
    if (!wallet) {
      wallet = { userId, balance: 1000, currency: 'USD', pendingBalance: 0, lastUpdated: new Date() };
      this.wallets.set(userId, wallet);
    }
    return wallet;
  }

  private addToUserIndex(userId: string, txId: string): void {
    const txIds = this.userTransactionIndex.get(userId) || [];
    txIds.push(txId);
    this.userTransactionIndex.set(userId, txIds);
  }
}

export const chatPaymentService = new ChatPaymentService();
