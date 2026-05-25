// ============================================================================
// QuantMax - Premium Features Service
// Subscriptions, unlimited likes, passport, boost, super like, rewind
// ============================================================================

interface PremiumSubscription { id: string; userId: string; plan: 'plus' | 'gold' | 'platinum'; status: 'active' | 'cancelled' | 'expired'; startedAt: string; expiresAt: string; features: string[]; price: number; currency: string; autoRenew: boolean; }
interface BoostResult { id: string; userId: string; startedAt: string; endsAt: string; profileViews: number; matchIncrease: number; status: 'active' | 'expired'; }
interface SuperLikeResult { id: string; fromUserId: string; toUserId: string; message?: string; seen: boolean; sentAt: string; }
interface PassportLocation { userId: string; originalLocation: { lat: number; lng: number; city: string }; passportLocation: { lat: number; lng: number; city: string }; activatedAt: string; expiresAt: string; }
interface PremiumAnalytics { userId: string; likesReceived: number; profileViews: number; whoLikedYou: { userId: string; timestamp: string }[]; matchRate: number; responseRate: number; }
interface RewindAction { id: string; userId: string; targetUserId: string; originalAction: 'left' | 'right'; rewindAt: string; }

class PremiumFeaturesService {
  private subscriptions: Map<string, PremiumSubscription> = new Map();
  private boosts: Map<string, BoostResult[]> = new Map();
  private superLikes: Map<string, SuperLikeResult[]> = new Map();
  private passports: Map<string, PassportLocation> = new Map();
  private likeHistory: Map<string, string[]> = new Map();
  private rewinds: Map<string, RewindAction[]> = new Map();
  private counter: number = 0;

  private genId(prefix: string): string { return `${prefix}_${Date.now().toString(36)}_${(++this.counter).toString(36)}`; }

  private getPlanFeatures(plan: PremiumSubscription['plan']): string[] {
    const base = ['unlimited_likes', 'rewind', 'passport', 'hide_ads'];
    if (plan === 'gold') return [...base, 'see_who_liked', 'weekly_boost', 'super_likes_5'];
    if (plan === 'platinum') return [...base, 'see_who_liked', 'daily_boost', 'super_likes_unlimited', 'priority_likes', 'message_before_match'];
    return base;
  }

  private getPlanPrice(plan: PremiumSubscription['plan']): number {
    return plan === 'platinum' ? 39.99 : plan === 'gold' ? 24.99 : 14.99;
  }

  async subscribe(userId: string, plan: PremiumSubscription['plan']): Promise<PremiumSubscription> {
    const existing = this.subscriptions.get(userId);
    if (existing && existing.status === 'active') throw new Error('Already subscribed');

    const subscription: PremiumSubscription = {
      id: this.genId('sub'), userId, plan, status: 'active',
      startedAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 30 * 86400000).toISOString(),
      features: this.getPlanFeatures(plan), price: this.getPlanPrice(plan), currency: 'USD', autoRenew: true,
    };
    this.subscriptions.set(userId, subscription);
    return subscription;
  }

  async cancel(userId: string): Promise<PremiumSubscription> {
    const sub = this.subscriptions.get(userId);
    if (!sub) throw new Error('No subscription found');
    if (sub.status !== 'active') throw new Error('Subscription not active');
    sub.status = 'cancelled';
    sub.autoRenew = false;
    return sub;
  }

  async getStatus(userId: string): Promise<PremiumSubscription | { status: 'none' }> {
    return this.subscriptions.get(userId) || { status: 'none' as const };
  }

  async unlimitedLikes(userId: string): Promise<{ enabled: boolean; likesRemaining: number | 'unlimited' }> {
    const sub = this.subscriptions.get(userId);
    if (!sub || sub.status !== 'active') return { enabled: false, likesRemaining: 10 };
    return { enabled: true, likesRemaining: 'unlimited' };
  }

  async seeWhoLiked(userId: string): Promise<{ userId: string; timestamp: string; profile: { name: string; age: number } }[]> {
    const sub = this.subscriptions.get(userId);
    if (!sub || sub.status !== 'active' || (!sub.features.includes('see_who_liked'))) throw new Error('Feature requires Gold or Platinum plan');
    const likes = this.likeHistory.get(userId) || [];
    return likes.map(uid => ({
      userId: uid, timestamp: new Date(Date.now() - Math.random() * 7 * 86400000).toISOString(),
      profile: { name: `User_${uid.substring(0, 5)}`, age: 20 + Math.floor(Math.random() * 15) },
    }));
  }

  async passport(userId: string, location: { lat: number; lng: number; city: string }): Promise<PassportLocation> {
    const sub = this.subscriptions.get(userId);
    if (!sub || sub.status !== 'active') throw new Error('Premium subscription required');
    if (!sub.features.includes('passport')) throw new Error('Passport not available on your plan');

    const passportLoc: PassportLocation = {
      userId, originalLocation: { lat: 40.7128, lng: -74.0060, city: 'New York' },
      passportLocation: location, activatedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 24 * 3600000).toISOString(),
    };
    this.passports.set(userId, passportLoc);
    return passportLoc;
  }

  async boost(userId: string): Promise<BoostResult> {
    const sub = this.subscriptions.get(userId);
    if (!sub || sub.status !== 'active') throw new Error('Premium subscription required');

    const userBoosts = this.boosts.get(userId) || [];
    const recentBoost = userBoosts.find(b => b.status === 'active');
    if (recentBoost) throw new Error('Boost already active');

    const boost: BoostResult = {
      id: this.genId('boost'), userId, startedAt: new Date().toISOString(),
      endsAt: new Date(Date.now() + 30 * 60000).toISOString(),
      profileViews: 0, matchIncrease: 0, status: 'active',
    };

    // Simulate boost effect
    boost.profileViews = Math.floor(50 + Math.random() * 200);
    boost.matchIncrease = Math.floor(boost.profileViews * 0.1);

    userBoosts.push(boost);
    this.boosts.set(userId, userBoosts);
    return boost;
  }

  async superLike(userId: string, targetUserId: string, message?: string): Promise<SuperLikeResult> {
    const sub = this.subscriptions.get(userId);
    if (!sub || sub.status !== 'active') throw new Error('Premium subscription required');
    if (userId === targetUserId) throw new Error('Cannot super like yourself');

    const userSuper = this.superLikes.get(userId) || [];
    const dailyLimit = sub.features.includes('super_likes_unlimited') ? 999 : sub.features.includes('super_likes_5') ? 5 : 1;
    const today = new Date().toISOString().split('T')[0];
    const todayCount = userSuper.filter(s => s.sentAt.startsWith(today)).length;
    if (todayCount >= dailyLimit) throw new Error(`Daily super like limit reached (${dailyLimit})`);

    const result: SuperLikeResult = {
      id: this.genId('sl'), fromUserId: userId, toUserId: targetUserId,
      message: message?.substring(0, 140), seen: false, sentAt: new Date().toISOString(),
    };
    userSuper.push(result);
    this.superLikes.set(userId, userSuper);
    return result;
  }

  async getPremiumAnalytics(userId: string): Promise<PremiumAnalytics> {
    const sub = this.subscriptions.get(userId);
    if (!sub || sub.status !== 'active') throw new Error('Premium subscription required');
    const likes = this.likeHistory.get(userId) || [];
    return {
      userId, likesReceived: likes.length + Math.floor(Math.random() * 50),
      profileViews: Math.floor(100 + Math.random() * 1000),
      whoLikedYou: likes.slice(0, 10).map(uid => ({ userId: uid, timestamp: new Date().toISOString() })),
      matchRate: Math.round((5 + Math.random() * 20) * 100) / 100,
      responseRate: Math.round((30 + Math.random() * 50) * 100) / 100,
    };
  }

  async rewind(userId: string, targetUserId: string): Promise<RewindAction> {
    const sub = this.subscriptions.get(userId);
    if (!sub || sub.status !== 'active') throw new Error('Premium subscription required');
    if (!sub.features.includes('rewind')) throw new Error('Rewind not available on your plan');

    const action: RewindAction = { id: this.genId('rew'), userId, targetUserId, originalAction: 'left', rewindAt: new Date().toISOString() };
    const userRewinds = this.rewinds.get(userId) || [];
    userRewinds.push(action);
    this.rewinds.set(userId, userRewinds);
    return action;
  }
}

export const premiumFeaturesService = new PremiumFeaturesService();
export { PremiumFeaturesService };
