// ============================================================================
// Subscription Manager - Tiered Plans with Dunning and Proration
// ============================================================================

import type {
  SubscriptionTier,
  SubscriptionTierLevel,
  Subscription,
  SubscriptionStatus,
} from '../types.js';

interface SubscriptionPlan {
  tier: SubscriptionTier;
  features: Set<string>;
}

interface DunningConfig {
  retrySchedule: number[]; // Days after failure to retry: [1, 3, 7, 14]
  gracePeriodDays: number;
  maxRetries: number;
}

interface TrialConfig {
  defaultTrialDays: number;
  extendedTrialDays: number;
  conversionIncentive?: string;
}

interface GroupPlan {
  id: string;
  ownerId: string;
  tierId: string;
  maxSeats: number;
  currentSeats: number;
  members: GroupMember[];
  pricePerSeat: number;
}

interface GroupMember {
  userId: string;
  role: 'owner' | 'admin' | 'member';
  joinedAt: number;
  invitedBy?: string;
}

interface ChurnPrediction {
  userId: string;
  churnProbability: number;
  riskFactors: string[];
  recommendedAction: string;
  predictedChurnDate?: number;
}

interface UsageMetrics {
  userId: string;
  lastActiveAt: number;
  sessionsLast7Days: number;
  sessionsLast30Days: number;
  contentViewed: number;
  engagementScore: number;
  featureUsage: Record<string, number>;
}

interface ProratedCredit {
  originalAmount: number;
  remainingDays: number;
  totalDays: number;
  creditAmount: number;
  newPrice: number;
  amountDue: number;
}

export class SubscriptionManager {
  private plans: Map<string, SubscriptionPlan> = new Map();
  private subscriptions: Map<string, Subscription> = new Map();
  private groupPlans: Map<string, GroupPlan> = new Map();
  private usageMetrics: Map<string, UsageMetrics> = new Map();
  private dunningConfig: DunningConfig;
  private trialConfig: TrialConfig;
  private trialConversions: Map<string, boolean> = new Map();

  constructor(dunningConfig?: DunningConfig, trialConfig?: TrialConfig) {
    this.dunningConfig = dunningConfig ?? {
      retrySchedule: [1, 3, 7, 14],
      gracePeriodDays: 3,
      maxRetries: 4,
    };
    this.trialConfig = trialConfig ?? {
      defaultTrialDays: 7,
      extendedTrialDays: 14,
    };
  }

  /**
   * Register a subscription plan with its features.
   */
  registerPlan(tier: SubscriptionTier, features: string[]): void {
    this.plans.set(tier.id, {
      tier,
      features: new Set(features),
    });
  }

  /**
   * Get features available for a given tier level.
   */
  getFeaturesForTier(tierId: string): Set<string> {
    const plan = this.plans.get(tierId);
    return plan?.features ?? new Set();
  }

  /**
   * Check if a user has access to a specific feature based on their subscription.
   */
  hasFeatureAccess(userId: string, feature: string): boolean {
    const subscription = this.getActiveSubscription(userId);
    if (!subscription) {
      // Check free tier features
      const freePlan = this.getFreePlan();
      if (freePlan) {
        return freePlan.features.has(feature);
      }
      return false;
    }

    const plan = this.plans.get(subscription.tierId);
    if (!plan) return false;

    // Allow access during trial period
    if (subscription.status === 'trial') {
      return plan.features.has(feature);
    }

    // Allow access during grace period
    if (subscription.status === 'past_due') {
      const gracePeriodMs = this.dunningConfig.gracePeriodDays * 86400000;
      const periodEnd = subscription.currentPeriodEnd;
      if (Date.now() < periodEnd + gracePeriodMs) {
        return plan.features.has(feature);
      }
      return false;
    }

    if (subscription.status !== 'active') return false;
    return plan.features.has(feature);
  }

  /**
   * Subscribe a user to a plan.
   */
  subscribe(userId: string, tierId: string, startTrial: boolean = false): Subscription {
    const plan = this.plans.get(tierId);
    if (!plan) {
      throw new Error(`Plan ${tierId} not found`);
    }

    const now = Date.now();
    const periodDays = plan.tier.billingPeriod === 'monthly' ? 30 : 365;
    const periodMs = periodDays * 86400000;

    let status: SubscriptionStatus = 'active';
    let trialEndsAt: number | undefined;

    if (startTrial && plan.tier.trialDays > 0) {
      status = 'trial';
      trialEndsAt = now + plan.tier.trialDays * 86400000;
    }

    const subscription: Subscription = {
      id: `sub_${userId}_${now}`,
      userId,
      creatorId: plan.tier.creatorId,
      tierId,
      status,
      startedAt: now,
      currentPeriodStart: now,
      currentPeriodEnd: now + periodMs,
      trialEndsAt,
      retryCount: 0,
      metadata: {},
    };

    this.subscriptions.set(userId, subscription);

    if (startTrial) {
      this.trialConversions.set(userId, false);
    }

    return subscription;
  }

  /**
   * Get the active subscription for a user.
   */
  getActiveSubscription(userId: string): Subscription | undefined {
    const sub = this.subscriptions.get(userId);
    if (!sub) return undefined;
    if (sub.status === 'cancelled' || sub.status === 'expired') return undefined;
    return sub;
  }

  /**
   * Handle a failed payment with dunning logic.
   * Returns the next retry date or null if max retries exceeded.
   */
  handleFailedPayment(userId: string, currentTime: number): number | null {
    const subscription = this.subscriptions.get(userId);
    if (!subscription) return null;

    subscription.status = 'past_due';
    subscription.retryCount += 1;

    if (subscription.retryCount > this.dunningConfig.maxRetries) {
      subscription.status = 'cancelled';
      subscription.cancelledAt = currentTime;
      this.subscriptions.set(userId, subscription);
      return null;
    }

    // Get retry delay from schedule (1d, 3d, 7d, 14d)
    const retryIndex = Math.min(
      subscription.retryCount - 1,
      this.dunningConfig.retrySchedule.length - 1,
    );
    const retryDays = this.dunningConfig.retrySchedule[retryIndex] ?? 1;
    const nextRetryAt = currentTime + retryDays * 86400000;

    subscription.nextRetryAt = nextRetryAt;
    this.subscriptions.set(userId, subscription);

    return nextRetryAt;
  }

  /**
   * Handle a successful payment retry.
   */
  handleSuccessfulPayment(userId: string, currentTime: number): void {
    const subscription = this.subscriptions.get(userId);
    if (!subscription) return;

    subscription.status = 'active';
    subscription.retryCount = 0;
    subscription.nextRetryAt = undefined;

    const plan = this.plans.get(subscription.tierId);
    if (plan) {
      const periodDays = plan.tier.billingPeriod === 'monthly' ? 30 : 365;
      subscription.currentPeriodStart = currentTime;
      subscription.currentPeriodEnd = currentTime + periodDays * 86400000;
    }

    this.subscriptions.set(userId, subscription);
  }

  /**
   * Calculate prorated credit for an upgrade or downgrade.
   * credit = remaining_days / total_days * price_diff
   */
  calculateProratedAmount(
    userId: string,
    newTierId: string,
    currentTime: number,
  ): ProratedCredit | null {
    const subscription = this.subscriptions.get(userId);
    if (!subscription) return null;

    const currentPlan = this.plans.get(subscription.tierId);
    const newPlan = this.plans.get(newTierId);
    if (!currentPlan || !newPlan) return null;

    const totalPeriodMs = subscription.currentPeriodEnd - subscription.currentPeriodStart;
    const remainingMs = Math.max(0, subscription.currentPeriodEnd - currentTime);
    const totalDays = Math.ceil(totalPeriodMs / 86400000);
    const remainingDays = Math.ceil(remainingMs / 86400000);

    const currentPrice = currentPlan.tier.price;
    const newPrice = newPlan.tier.price;

    // Credit for unused portion of current plan
    const creditAmount = Math.round((remainingDays / totalDays) * currentPrice * 100) / 100;

    // Amount due for the new plan (prorated for remaining days)
    const proratedNewPrice = Math.round((remainingDays / totalDays) * newPrice * 100) / 100;
    const amountDue = Math.max(0, Math.round((proratedNewPrice - creditAmount) * 100) / 100);

    return {
      originalAmount: currentPrice,
      remainingDays,
      totalDays,
      creditAmount,
      newPrice,
      amountDue,
    };
  }

  /**
   * Execute a plan upgrade or downgrade.
   */
  changePlan(userId: string, newTierId: string, currentTime: number): Subscription | null {
    const subscription = this.subscriptions.get(userId);
    if (!subscription) return null;

    const newPlan = this.plans.get(newTierId);
    if (!newPlan) return null;

    subscription.tierId = newTierId;
    subscription.metadata['previousTierId'] = subscription.tierId;
    subscription.metadata['changedAt'] = currentTime;

    this.subscriptions.set(userId, subscription);
    return subscription;
  }

  /**
   * Check if content is gated (subscriber-only) and if user has access.
   */
  canAccessGatedContent(userId: string, requiredTierLevel: SubscriptionTierLevel): boolean {
    const subscription = this.getActiveSubscription(userId);
    if (!subscription) {
      return requiredTierLevel === 'free';
    }

    const plan = this.plans.get(subscription.tierId);
    if (!plan) return false;

    const tierHierarchy: Record<SubscriptionTierLevel, number> = {
      free: 0,
      basic: 1,
      premium: 2,
      vip: 3,
    };

    const userTierValue = tierHierarchy[plan.tier.level] ?? 0;
    const requiredTierValue = tierHierarchy[requiredTierLevel] ?? 0;

    return userTierValue >= requiredTierValue;
  }

  /**
   * Start a trial for a user.
   */
  startTrial(userId: string, tierId: string): Subscription {
    return this.subscribe(userId, tierId, true);
  }

  /**
   * Get the default trial duration in days.
   */
  getDefaultTrialDays(): number {
    return this.trialConfig.defaultTrialDays;
  }

  /**
   * Convert a trial to a paid subscription.
   */
  convertTrial(userId: string, currentTime: number): boolean {
    const subscription = this.subscriptions.get(userId);
    if (!subscription || subscription.status !== 'trial') return false;

    subscription.status = 'active';
    subscription.currentPeriodStart = currentTime;

    const plan = this.plans.get(subscription.tierId);
    if (plan) {
      const periodDays = plan.tier.billingPeriod === 'monthly' ? 30 : 365;
      subscription.currentPeriodEnd = currentTime + periodDays * 86400000;
    }

    this.subscriptions.set(userId, subscription);
    this.trialConversions.set(userId, true);
    return true;
  }

  /**
   * Get trial conversion rate.
   */
  getTrialConversionRate(): number {
    if (this.trialConversions.size === 0) return 0;

    let converted = 0;
    for (const [, didConvert] of this.trialConversions) {
      if (didConvert) converted++;
    }

    return converted / this.trialConversions.size;
  }

  /**
   * Check if a trial has expired.
   */
  isTrialExpired(userId: string, currentTime: number): boolean {
    const subscription = this.subscriptions.get(userId);
    if (!subscription || subscription.status !== 'trial') return false;
    if (!subscription.trialEndsAt) return false;

    return currentTime > subscription.trialEndsAt;
  }

  /**
   * Create a family/group plan.
   */
  createGroupPlan(
    ownerId: string,
    tierId: string,
    maxSeats: number,
    pricePerSeat: number,
  ): GroupPlan {
    const groupPlan: GroupPlan = {
      id: `group_${ownerId}_${Date.now()}`,
      ownerId,
      tierId,
      maxSeats,
      currentSeats: 1,
      members: [{ userId: ownerId, role: 'owner', joinedAt: Date.now() }],
      pricePerSeat,
    };

    this.groupPlans.set(groupPlan.id, groupPlan);
    return groupPlan;
  }

  /**
   * Add a member to a group plan.
   */
  addGroupMember(groupId: string, userId: string, invitedBy?: string): boolean {
    const group = this.groupPlans.get(groupId);
    if (!group) return false;
    if (group.currentSeats >= group.maxSeats) return false;

    const alreadyMember = group.members.some((m) => m.userId === userId);
    if (alreadyMember) return false;

    group.members.push({
      userId,
      role: 'member',
      joinedAt: Date.now(),
      invitedBy,
    });
    group.currentSeats += 1;
    this.groupPlans.set(groupId, group);

    // Give the member access to the group's tier
    this.subscribe(userId, group.tierId);

    return true;
  }

  /**
   * Remove a member from a group plan.
   */
  removeGroupMember(groupId: string, userId: string): boolean {
    const group = this.groupPlans.get(groupId);
    if (!group) return false;

    const memberIndex = group.members.findIndex((m) => m.userId === userId);
    if (memberIndex === -1) return false;
    if (group.members[memberIndex]?.role === 'owner') return false;

    group.members.splice(memberIndex, 1);
    group.currentSeats -= 1;
    this.groupPlans.set(groupId, group);

    // Cancel the member's subscription
    this.cancelSubscription(userId, Date.now());

    return true;
  }

  /**
   * Cancel a subscription.
   */
  cancelSubscription(userId: string, currentTime: number): void {
    const subscription = this.subscriptions.get(userId);
    if (!subscription) return;

    subscription.status = 'cancelled';
    subscription.cancelledAt = currentTime;
    this.subscriptions.set(userId, subscription);
  }

  /**
   * Record usage metrics for churn prediction.
   */
  recordUsageMetrics(metrics: UsageMetrics): void {
    this.usageMetrics.set(metrics.userId, metrics);
  }

  /**
   * Predict churn probability based on usage patterns.
   * Uses a simple logistic-regression-like scoring model.
   */
  predictChurn(userId: string, currentTime: number): ChurnPrediction {
    const metrics = this.usageMetrics.get(userId);
    const subscription = this.subscriptions.get(userId);

    const riskFactors: string[] = [];
    let score = 0;

    if (!metrics) {
      return {
        userId,
        churnProbability: 0.5,
        riskFactors: ['no_usage_data'],
        recommendedAction: 'collect_more_data',
      };
    }

    // Factor 1: Days since last activity
    const daysSinceActive = (currentTime - metrics.lastActiveAt) / 86400000;
    if (daysSinceActive > 14) {
      score += 0.3;
      riskFactors.push('inactive_14_days');
    } else if (daysSinceActive > 7) {
      score += 0.15;
      riskFactors.push('inactive_7_days');
    }

    // Factor 2: Session frequency decline
    if (metrics.sessionsLast30Days > 0) {
      const weeklyRate = metrics.sessionsLast7Days;
      const expectedWeeklyRate = metrics.sessionsLast30Days / 4.3;
      if (weeklyRate < expectedWeeklyRate * 0.5) {
        score += 0.25;
        riskFactors.push('declining_sessions');
      }
    } else {
      score += 0.2;
      riskFactors.push('no_sessions_30_days');
    }

    // Factor 3: Low engagement
    if (metrics.engagementScore < 0.2) {
      score += 0.2;
      riskFactors.push('low_engagement');
    }

    // Factor 4: Feature usage breadth
    const featuresUsed = Object.keys(metrics.featureUsage).length;
    if (featuresUsed < 2) {
      score += 0.1;
      riskFactors.push('low_feature_adoption');
    }

    // Factor 5: Payment issues
    if (subscription && subscription.retryCount > 0) {
      score += 0.15;
      riskFactors.push('payment_issues');
    }

    // Clamp to [0, 1]
    const churnProbability = Math.min(1, Math.max(0, score));

    // Determine recommended action
    let recommendedAction: string;
    if (churnProbability > 0.7) {
      recommendedAction = 'urgent_retention_offer';
    } else if (churnProbability > 0.5) {
      recommendedAction = 'engagement_campaign';
    } else if (churnProbability > 0.3) {
      recommendedAction = 'feature_education';
    } else {
      recommendedAction = 'maintain_engagement';
    }

    // Estimate churn date
    let predictedChurnDate: number | undefined;
    if (churnProbability > 0.5 && subscription) {
      predictedChurnDate = subscription.currentPeriodEnd;
    }

    return {
      userId,
      churnProbability: Math.round(churnProbability * 100) / 100,
      riskFactors,
      recommendedAction,
      predictedChurnDate,
    };
  }

  /**
   * Get the free plan if one exists.
   */
  private getFreePlan(): SubscriptionPlan | undefined {
    for (const [, plan] of this.plans) {
      if (plan.tier.level === 'free') return plan;
    }
    return undefined;
  }

  /**
   * Get all subscriptions for a creator.
   */
  getCreatorSubscribers(creatorId: string): Subscription[] {
    const subscribers: Subscription[] = [];
    for (const [, sub] of this.subscriptions) {
      if (sub.creatorId === creatorId && sub.status === 'active') {
        subscribers.push(sub);
      }
    }
    return subscribers;
  }

  /**
   * Get subscription count by tier for a creator.
   */
  getSubscriberCountByTier(creatorId: string): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const [, sub] of this.subscriptions) {
      if (sub.creatorId === creatorId && (sub.status === 'active' || sub.status === 'trial')) {
        counts[sub.tierId] = (counts[sub.tierId] ?? 0) + 1;
      }
    }
    return counts;
  }
}
