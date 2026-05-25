// ============================================================================
// QuantSync - Monetization Service
// Creator monetization: subscriptions, tips, paywalls, earnings management
// ============================================================================

interface SubscriptionTier {
  id: string;
  creatorId: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  benefits: string[];
  maxSubscribers: number | null;
  isActive: boolean;
  subscriberCount: number;
  createdAt: Date;
  updatedAt: Date;
}

interface Subscription {
  id: string;
  tierId: string;
  subscriberId: string;
  creatorId: string;
  status: 'active' | 'cancelled' | 'expired' | 'paused';
  startedAt: Date;
  renewsAt: Date;
  cancelledAt: Date | null;
}

interface Tip {
  id: string;
  fromUserId: string;
  toCreatorId: string;
  amount: number;
  currency: string;
  message: string | null;
  postId: string | null;
  createdAt: Date;
}

interface PaywallPost {
  id: string;
  postId: string;
  creatorId: string;
  requiredTierIds: string[];
  previewText: string;
  unlockCount: number;
  revenue: number;
  createdAt: Date;
}

interface EarningsReport {
  creatorId: string;
  period: string;
  subscriptionRevenue: number;
  tipRevenue: number;
  paywallRevenue: number;
  totalRevenue: number;
  fees: number;
  netEarnings: number;
  payoutStatus: 'pending' | 'processing' | 'completed';
}

export class MonetizationService {
  private tiers: Map<string, SubscriptionTier> = new Map();
  private subscriptions: Map<string, Subscription> = new Map();
  private tips: Map<string, Tip> = new Map();
  private paywalls: Map<string, PaywallPost> = new Map();
  private creatorTierIndex: Map<string, string[]> = new Map();
  private creatorEarnings: Map<string, number> = new Map();
  private pendingPayouts: Map<string, number> = new Map();

  async createSubscriptionTier(creatorId: string, config: {
    name: string;
    description: string;
    price: number;
    benefits: string[];
    maxSubscribers?: number;
  }): Promise<SubscriptionTier> {
    if (!config.name || config.name.trim().length === 0) throw new Error('Tier name is required');
    if (config.price < 0.99) throw new Error('Minimum price is $0.99');
    if (config.price > 999.99) throw new Error('Maximum price is $999.99');
    if (config.benefits.length === 0) throw new Error('At least one benefit is required');

    const creatorTiers = this.creatorTierIndex.get(creatorId) || [];
    if (creatorTiers.length >= 5) throw new Error('Maximum 5 tiers allowed');

    const tierId = `tier_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const tier: SubscriptionTier = {
      id: tierId,
      creatorId,
      name: config.name.trim(),
      description: config.description,
      price: Math.round(config.price * 100) / 100,
      currency: 'USD',
      benefits: config.benefits,
      maxSubscribers: config.maxSubscribers || null,
      isActive: true,
      subscriberCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.tiers.set(tierId, tier);
    creatorTiers.push(tierId);
    this.creatorTierIndex.set(creatorId, creatorTiers);

    return tier;
  }

  async subscribe(subscriberId: string, tierId: string): Promise<Subscription> {
    const tier = this.tiers.get(tierId);
    if (!tier) throw new Error('Tier not found');
    if (!tier.isActive) throw new Error('Tier is not active');
    if (tier.creatorId === subscriberId) throw new Error('Cannot subscribe to your own tier');
    if (tier.maxSubscribers && tier.subscriberCount >= tier.maxSubscribers) {
      throw new Error('Tier is full');
    }

    // Check existing subscription
    for (const sub of this.subscriptions.values()) {
      if (sub.subscriberId === subscriberId && sub.tierId === tierId && sub.status === 'active') {
        throw new Error('Already subscribed to this tier');
      }
    }

    const subId = `sub_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const subscription: Subscription = {
      id: subId,
      tierId,
      subscriberId,
      creatorId: tier.creatorId,
      status: 'active',
      startedAt: new Date(),
      renewsAt: new Date(Date.now() + 30 * 86400000),
      cancelledAt: null,
    };

    this.subscriptions.set(subId, subscription);
    tier.subscriberCount++;

    // Credit earnings
    const fee = tier.price * 0.15; // 15% platform fee
    const net = tier.price - fee;
    const current = this.creatorEarnings.get(tier.creatorId) || 0;
    this.creatorEarnings.set(tier.creatorId, current + net);

    return subscription;
  }

  async unsubscribe(subscriberId: string, tierId: string): Promise<Subscription> {
    let subscription: Subscription | undefined;
    for (const sub of this.subscriptions.values()) {
      if (sub.subscriberId === subscriberId && sub.tierId === tierId && sub.status === 'active') {
        subscription = sub;
        break;
      }
    }

    if (!subscription) throw new Error('No active subscription found');

    subscription.status = 'cancelled';
    subscription.cancelledAt = new Date();

    const tier = this.tiers.get(tierId);
    if (tier) tier.subscriberCount = Math.max(0, tier.subscriberCount - 1);

    return subscription;
  }

  async tipCreator(fromUserId: string, toCreatorId: string, amount: number, options?: { message?: string; postId?: string }): Promise<Tip> {
    if (amount < 1) throw new Error('Minimum tip is $1');
    if (amount > 500) throw new Error('Maximum tip is $500');
    if (fromUserId === toCreatorId) throw new Error('Cannot tip yourself');

    const tipId = `tip_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const tip: Tip = {
      id: tipId,
      fromUserId,
      toCreatorId,
      amount,
      currency: 'USD',
      message: options?.message || null,
      postId: options?.postId || null,
      createdAt: new Date(),
    };

    this.tips.set(tipId, tip);

    // Credit earnings (tips have 5% fee)
    const net = amount * 0.95;
    const current = this.creatorEarnings.get(toCreatorId) || 0;
    this.creatorEarnings.set(toCreatorId, current + net);

    return tip;
  }

  async paywallPost(creatorId: string, postId: string, config: { requiredTierIds: string[]; previewText: string }): Promise<PaywallPost> {
    if (!postId) throw new Error('Post ID is required');
    if (config.requiredTierIds.length === 0) throw new Error('At least one tier is required');

    // Validate tiers belong to creator
    for (const tierId of config.requiredTierIds) {
      const tier = this.tiers.get(tierId);
      if (!tier || tier.creatorId !== creatorId) {
        throw new Error(`Invalid tier: ${tierId}`);
      }
    }

    const paywallId = `pw_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const paywall: PaywallPost = {
      id: paywallId,
      postId,
      creatorId,
      requiredTierIds: config.requiredTierIds,
      previewText: config.previewText,
      unlockCount: 0,
      revenue: 0,
      createdAt: new Date(),
    };

    this.paywalls.set(paywallId, paywall);
    return paywall;
  }

  async getEarnings(creatorId: string): Promise<EarningsReport> {
    const totalEarnings = this.creatorEarnings.get(creatorId) || 0;

    let subRevenue = 0;
    for (const sub of this.subscriptions.values()) {
      if (sub.creatorId === creatorId && sub.status === 'active') {
        const tier = this.tiers.get(sub.tierId);
        if (tier) subRevenue += tier.price;
      }
    }

    let tipRevenue = 0;
    for (const tip of this.tips.values()) {
      if (tip.toCreatorId === creatorId) tipRevenue += tip.amount;
    }

    const paywallRevenue = totalEarnings - (subRevenue * 0.85) - (tipRevenue * 0.95);
    const totalRevenue = subRevenue + tipRevenue + Math.max(0, paywallRevenue);
    const fees = totalRevenue - totalEarnings;

    return {
      creatorId,
      period: new Date().toISOString().substring(0, 7),
      subscriptionRevenue: Math.round(subRevenue * 100) / 100,
      tipRevenue: Math.round(tipRevenue * 100) / 100,
      paywallRevenue: Math.round(Math.max(0, paywallRevenue) * 100) / 100,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      fees: Math.round(fees * 100) / 100,
      netEarnings: Math.round(totalEarnings * 100) / 100,
      payoutStatus: 'pending',
    };
  }

  async getSubscribers(creatorId: string): Promise<Subscription[]> {
    const subs: Subscription[] = [];
    for (const sub of this.subscriptions.values()) {
      if (sub.creatorId === creatorId && sub.status === 'active') {
        subs.push(sub);
      }
    }
    return subs.sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());
  }

  async setPrice(tierId: string, creatorId: string, newPrice: number): Promise<SubscriptionTier> {
    const tier = this.tiers.get(tierId);
    if (!tier) throw new Error('Tier not found');
    if (tier.creatorId !== creatorId) throw new Error('Access denied');
    if (newPrice < 0.99 || newPrice > 999.99) throw new Error('Price must be between $0.99 and $999.99');

    tier.price = Math.round(newPrice * 100) / 100;
    tier.updatedAt = new Date();
    return tier;
  }

  async withdrawEarnings(creatorId: string, amount: number): Promise<{ transactionId: string; amount: number; status: string }> {
    const earnings = this.creatorEarnings.get(creatorId) || 0;
    if (amount > earnings) throw new Error('Insufficient earnings');
    if (amount < 10) throw new Error('Minimum withdrawal is $10');

    this.creatorEarnings.set(creatorId, earnings - amount);

    return {
      transactionId: `payout_${Date.now()}`,
      amount: Math.round(amount * 100) / 100,
      status: 'processing',
    };
  }
}

export const monetizationService = new MonetizationService();
