// ============================================================================
// QuantTube - Super Thanks Service
// Tips, leaderboards, animations, earnings tracking, supporter management
// ============================================================================

interface SuperThanks {
  id: string;
  videoId: string;
  senderId: string;
  senderName: string;
  recipientId: string;
  amount: number;
  currency: string;
  message: string;
  animationType: AnimationType;
  color: string;
  isHighlighted: boolean;
  createdAt: string;
  status: 'pending' | 'completed' | 'refunded';
}

type AnimationType = 'confetti' | 'hearts' | 'stars' | 'fireworks' | 'rainbow' | 'custom';

interface LeaderboardEntry {
  userId: string;
  username: string;
  totalAmount: number;
  tipCount: number;
  rank: number;
  badge: string;
  lastTipAt: string;
}

interface EarningsReport {
  recipientId: string;
  totalEarnings: number;
  thisMonth: number;
  lastMonth: number;
  growth: number;
  topVideos: { videoId: string; title: string; earnings: number }[];
  byDay: { date: string; amount: number }[];
  avgTipAmount: number;
  totalTippers: number;
  currency: string;
}

interface AnimationConfig {
  type: AnimationType;
  duration: number;
  intensity: 'low' | 'medium' | 'high';
  color: string;
  sound: boolean;
  customAssetUrl?: string;
}

interface TipSettings {
  minimumAmount: number;
  maximumAmount: number;
  currency: string;
  enabledAnimations: AnimationType[];
  thankYouMessage: string;
  autoThankEnabled: boolean;
}

class SuperThanksService {
  private tips: Map<string, SuperThanks> = new Map();
  private videoTips: Map<string, string[]> = new Map();
  private userSentTips: Map<string, string[]> = new Map();
  private recipientTips: Map<string, string[]> = new Map();
  private settings: Map<string, TipSettings> = new Map();
  private counter: number = 0;

  private genId(prefix: string): string {
    return `${prefix}_${Date.now().toString(36)}_${(++this.counter).toString(36)}`;
  }

  private getColorForAmount(amount: number): string {
    if (amount >= 100) return '#FF0000';
    if (amount >= 50) return '#FF4500';
    if (amount >= 20) return '#FF8C00';
    if (amount >= 10) return '#FFD700';
    if (amount >= 5) return '#32CD32';
    return '#1E90FF';
  }

  async tip(videoId: string, senderId: string, senderName: string, recipientId: string, amount: number, message: string): Promise<SuperThanks> {
    const channelSettings = this.settings.get(recipientId);
    const minimum = channelSettings?.minimumAmount || 1;
    const maximum = channelSettings?.maximumAmount || 500;

    if (amount < minimum) throw new Error(`Minimum tip amount is ${minimum}`);
    if (amount > maximum) throw new Error(`Maximum tip amount is ${maximum}`);
    if (message.length > 200) throw new Error('Message must be 200 characters or less');
    if (senderId === recipientId) throw new Error('Cannot tip yourself');

    const animationType = this.selectAnimation(amount);
    const color = this.getColorForAmount(amount);
    const isHighlighted = amount >= 20;

    const tip: SuperThanks = {
      id: this.genId('tip'),
      videoId,
      senderId,
      senderName,
      recipientId,
      amount: Math.round(amount * 100) / 100,
      currency: channelSettings?.currency || 'USD',
      message: message.trim(),
      animationType,
      color,
      isHighlighted,
      createdAt: new Date().toISOString(),
      status: 'completed',
    };

    this.tips.set(tip.id, tip);

    const vTips = this.videoTips.get(videoId) || [];
    vTips.push(tip.id);
    this.videoTips.set(videoId, vTips);

    const sTips = this.userSentTips.get(senderId) || [];
    sTips.push(tip.id);
    this.userSentTips.set(senderId, sTips);

    const rTips = this.recipientTips.get(recipientId) || [];
    rTips.push(tip.id);
    this.recipientTips.set(recipientId, rTips);

    return tip;
  }

  private selectAnimation(amount: number): AnimationType {
    if (amount >= 100) return 'fireworks';
    if (amount >= 50) return 'rainbow';
    if (amount >= 20) return 'stars';
    if (amount >= 10) return 'hearts';
    return 'confetti';
  }

  async getLeaderboard(videoId?: string, recipientId?: string, limit: number = 10): Promise<LeaderboardEntry[]> {
    let relevantTips: SuperThanks[] = [];

    if (videoId) {
      const tipIds = this.videoTips.get(videoId) || [];
      relevantTips = tipIds.map(id => this.tips.get(id)).filter((t): t is SuperThanks => !!t && t.status === 'completed');
    } else if (recipientId) {
      const tipIds = this.recipientTips.get(recipientId) || [];
      relevantTips = tipIds.map(id => this.tips.get(id)).filter((t): t is SuperThanks => !!t && t.status === 'completed');
    } else {
      relevantTips = Array.from(this.tips.values()).filter(t => t.status === 'completed');
    }

    const userTotals = new Map<string, { amount: number; count: number; name: string; lastTip: string }>();
    for (const tip of relevantTips) {
      const existing = userTotals.get(tip.senderId) || { amount: 0, count: 0, name: tip.senderName, lastTip: '' };
      existing.amount += tip.amount;
      existing.count++;
      existing.name = tip.senderName;
      if (!existing.lastTip || tip.createdAt > existing.lastTip) existing.lastTip = tip.createdAt;
      userTotals.set(tip.senderId, existing);
    }

    const entries: LeaderboardEntry[] = Array.from(userTotals.entries())
      .map(([userId, data]) => ({
        userId,
        username: data.name,
        totalAmount: Math.round(data.amount * 100) / 100,
        tipCount: data.count,
        rank: 0,
        badge: data.amount >= 500 ? 'diamond' : data.amount >= 100 ? 'gold' : data.amount >= 50 ? 'silver' : 'bronze',
        lastTipAt: data.lastTip,
      }))
      .sort((a, b) => b.totalAmount - a.totalAmount)
      .slice(0, limit);

    entries.forEach((e, i) => { e.rank = i + 1; });
    return entries;
  }

  async createAnimation(type: AnimationType, config?: Partial<AnimationConfig>): Promise<AnimationConfig> {
    return {
      type,
      duration: config?.duration || (type === 'fireworks' ? 5000 : 3000),
      intensity: config?.intensity || 'medium',
      color: config?.color || '#FFD700',
      sound: config?.sound ?? true,
      customAssetUrl: config?.customAssetUrl,
    };
  }

  async setMinimum(recipientId: string, minimumAmount: number, maximumAmount?: number): Promise<TipSettings> {
    if (minimumAmount < 0.5) throw new Error('Minimum cannot be less than 0.50');
    if (minimumAmount > 100) throw new Error('Minimum cannot exceed 100');

    const existing = this.settings.get(recipientId) || {
      minimumAmount: 1, maximumAmount: 500, currency: 'USD',
      enabledAnimations: ['confetti', 'hearts', 'stars', 'fireworks', 'rainbow'] as AnimationType[],
      thankYouMessage: 'Thank you for your support!', autoThankEnabled: true,
    };

    existing.minimumAmount = minimumAmount;
    if (maximumAmount) existing.maximumAmount = maximumAmount;
    this.settings.set(recipientId, existing);
    return existing;
  }

  async getEarnings(recipientId: string): Promise<EarningsReport> {
    const tipIds = this.recipientTips.get(recipientId) || [];
    const allTips = tipIds.map(id => this.tips.get(id)).filter((t): t is SuperThanks => !!t && t.status === 'completed');

    const now = Date.now();
    const thisMonthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();
    const lastMonthStart = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1).getTime();

    const thisMonth = allTips.filter(t => new Date(t.createdAt).getTime() >= thisMonthStart).reduce((s, t) => s + t.amount, 0);
    const lastMonth = allTips.filter(t => { const time = new Date(t.createdAt).getTime(); return time >= lastMonthStart && time < thisMonthStart; }).reduce((s, t) => s + t.amount, 0);
    const totalEarnings = allTips.reduce((s, t) => s + t.amount, 0);
    const growth = lastMonth > 0 ? ((thisMonth - lastMonth) / lastMonth) * 100 : 0;

    const videoEarnings = new Map<string, number>();
    for (const t of allTips) { videoEarnings.set(t.videoId, (videoEarnings.get(t.videoId) || 0) + t.amount); }
    const topVideos = Array.from(videoEarnings.entries())
      .map(([videoId, earnings]) => ({ videoId, title: `Video ${videoId.substring(0, 8)}`, earnings: Math.round(earnings * 100) / 100 }))
      .sort((a, b) => b.earnings - a.earnings).slice(0, 10);

    const uniqueTippers = new Set(allTips.map(t => t.senderId)).size;
    const avgTip = allTips.length > 0 ? totalEarnings / allTips.length : 0;

    const byDay: { date: string; amount: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const dayStart = new Date(now - i * 86400000);
      const dateStr = dayStart.toISOString().split('T')[0];
      const dayAmount = allTips.filter(t => t.createdAt.startsWith(dateStr)).reduce((s, t) => s + t.amount, 0);
      byDay.push({ date: dateStr, amount: Math.round(dayAmount * 100) / 100 });
    }

    return {
      recipientId, totalEarnings: Math.round(totalEarnings * 100) / 100,
      thisMonth: Math.round(thisMonth * 100) / 100, lastMonth: Math.round(lastMonth * 100) / 100,
      growth: Math.round(growth * 100) / 100, topVideos, byDay,
      avgTipAmount: Math.round(avgTip * 100) / 100, totalTippers: uniqueTippers, currency: 'USD',
    };
  }

  async getTopSupporters(recipientId: string, limit: number = 10): Promise<LeaderboardEntry[]> {
    return this.getLeaderboard(undefined, recipientId, limit);
  }

  async generateThankYou(tipId: string): Promise<{ message: string; animation: AnimationConfig }> {
    const tip = this.tips.get(tipId);
    if (!tip) throw new Error('Tip not found');
    const settings = this.settings.get(tip.recipientId);
    const message = settings?.thankYouMessage || `Thank you ${tip.senderName} for your generous support of $${tip.amount}!`;
    const animation = await this.createAnimation(tip.animationType);
    return { message, animation };
  }

  async getHistory(userId: string, type: 'sent' | 'received', limit: number = 50): Promise<SuperThanks[]> {
    const tipIds = type === 'sent' ? (this.userSentTips.get(userId) || []) : (this.recipientTips.get(userId) || []);
    return tipIds.map(id => this.tips.get(id)).filter((t): t is SuperThanks => !!t)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, limit);
  }
}

export const superThanksService = new SuperThanksService();
export { SuperThanksService };
