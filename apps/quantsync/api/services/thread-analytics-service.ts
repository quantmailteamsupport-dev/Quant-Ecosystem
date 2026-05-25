// ============================================================================
// QuantSync - Thread Analytics Service
// Engagement metrics, reach, impressions, demographics, reporting
// ============================================================================

interface ThreadMetrics {
  threadId: string;
  impressions: number;
  reach: number;
  likes: number;
  reposts: number;
  replies: number;
  quotes: number;
  bookmarks: number;
  shares: number;
  profileVisits: number;
  linkClicks: number;
  engagementRate: number;
  viralityScore: number;
  createdAt: Date;
  lastUpdated: Date;
}

interface DemographicData {
  ageGroups: Record<string, number>;
  genderSplit: Record<string, number>;
  topLocations: Array<{ location: string; percentage: number }>;
  topLanguages: Array<{ language: string; percentage: number }>;
  deviceBreakdown: Record<string, number>;
  activeHours: number[];
}

interface ReachMetrics {
  organic: number;
  viral: number;
  paid: number;
  total: number;
  followerReach: number;
  nonFollowerReach: number;
  growthRate: number;
}

interface PerformanceReport {
  userId: string;
  period: { start: Date; end: Date };
  totalPosts: number;
  totalImpressions: number;
  totalEngagement: number;
  avgEngagementRate: number;
  followerGrowth: number;
  topPosts: ThreadMetrics[];
  bestPostingTimes: Array<{ hour: number; day: number; engagement: number }>;
}

export class ThreadAnalytics {
  private metrics: Map<string, ThreadMetrics> = new Map();
  private userMetricsIndex: Map<string, string[]> = new Map();
  private demographics: Map<string, DemographicData> = new Map();
  private followerCounts: Map<string, { current: number; previous: number }> = new Map();

  async getEngagement(threadId: string): Promise<ThreadMetrics> {
    let metrics = this.metrics.get(threadId);
    if (!metrics) {
      metrics = this.generateMetrics(threadId);
      this.metrics.set(threadId, metrics);
    }
    return metrics;
  }

  async getReachMetrics(userId: string, period?: { start: Date; end: Date }): Promise<ReachMetrics> {
    const threadIds = this.userMetricsIndex.get(userId) || [];
    let totalOrganic = 0;
    let totalViral = 0;

    for (const id of threadIds) {
      const m = this.metrics.get(id);
      if (!m) continue;
      if (period && (m.createdAt < period.start || m.createdAt > period.end)) continue;
      totalOrganic += m.reach * 0.7;
      totalViral += m.reach * 0.3;
    }

    const total = totalOrganic + totalViral;
    const followers = this.followerCounts.get(userId);
    const followerCount = followers?.current || 1000;
    const followerReach = Math.min(total * 0.6, followerCount);
    const previousFollowers = followers?.previous || 900;
    const growthRate = previousFollowers > 0 ? ((followerCount - previousFollowers) / previousFollowers) * 100 : 0;

    return {
      organic: Math.round(totalOrganic),
      viral: Math.round(totalViral),
      paid: 0,
      total: Math.round(total),
      followerReach: Math.round(followerReach),
      nonFollowerReach: Math.round(total - followerReach),
      growthRate: Math.round(growthRate * 100) / 100,
    };
  }

  async getImpressions(userId: string, days: number = 30): Promise<{ total: number; daily: Array<{ date: string; impressions: number }> }> {
    const threadIds = this.userMetricsIndex.get(userId) || [];
    const cutoff = new Date(Date.now() - days * 86400000);
    let total = 0;
    const dailyMap = new Map<string, number>();

    for (const id of threadIds) {
      const m = this.metrics.get(id);
      if (!m || m.createdAt < cutoff) continue;
      total += m.impressions;
      const dateKey = m.createdAt.toISOString().split('T')[0];
      dailyMap.set(dateKey, (dailyMap.get(dateKey) || 0) + m.impressions);
    }

    const daily = Array.from(dailyMap.entries())
      .map(([date, impressions]) => ({ date, impressions }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return { total, daily };
  }

  async getDemographics(userId: string): Promise<DemographicData> {
    let demo = this.demographics.get(userId);
    if (!demo) {
      demo = {
        ageGroups: { '13-17': 5, '18-24': 30, '25-34': 35, '35-44': 18, '45-54': 8, '55+': 4 },
        genderSplit: { male: 52, female: 44, other: 4 },
        topLocations: [
          { location: 'United States', percentage: 40 },
          { location: 'United Kingdom', percentage: 15 },
          { location: 'India', percentage: 12 },
          { location: 'Canada', percentage: 8 },
          { location: 'Australia', percentage: 6 },
        ],
        topLanguages: [
          { language: 'English', percentage: 72 },
          { language: 'Spanish', percentage: 10 },
          { language: 'Hindi', percentage: 8 },
          { language: 'French', percentage: 5 },
        ],
        deviceBreakdown: { mobile: 68, desktop: 28, tablet: 4 },
        activeHours: [9, 10, 11, 12, 13, 14, 15, 18, 19, 20, 21],
      };
      this.demographics.set(userId, demo);
    }
    return demo;
  }

  async getTopPosts(userId: string, limit: number = 10, sortBy: 'engagement' | 'impressions' | 'virality' = 'engagement'): Promise<ThreadMetrics[]> {
    const threadIds = this.userMetricsIndex.get(userId) || [];
    const posts = threadIds
      .map(id => this.metrics.get(id))
      .filter((m): m is ThreadMetrics => m !== undefined);

    switch (sortBy) {
      case 'engagement': posts.sort((a, b) => b.engagementRate - a.engagementRate); break;
      case 'impressions': posts.sort((a, b) => b.impressions - a.impressions); break;
      case 'virality': posts.sort((a, b) => b.viralityScore - a.viralityScore); break;
    }

    return posts.slice(0, limit);
  }

  async getBestTime(userId: string): Promise<Array<{ hour: number; day: number; avgEngagement: number }>> {
    const threadIds = this.userMetricsIndex.get(userId) || [];
    const timeSlots = new Map<string, { total: number; count: number }>();

    for (const id of threadIds) {
      const m = this.metrics.get(id);
      if (!m) continue;
      const hour = m.createdAt.getHours();
      const day = m.createdAt.getDay();
      const key = `${day}:${hour}`;
      const slot = timeSlots.get(key) || { total: 0, count: 0 };
      slot.total += m.engagementRate;
      slot.count++;
      timeSlots.set(key, slot);
    }

    const results = Array.from(timeSlots.entries()).map(([key, data]) => {
      const [day, hour] = key.split(':').map(Number);
      return { hour, day, avgEngagement: Math.round((data.total / data.count) * 100) / 100 };
    });

    return results.sort((a, b) => b.avgEngagement - a.avgEngagement).slice(0, 10);
  }

  async exportReport(userId: string, period: { start: Date; end: Date }): Promise<PerformanceReport> {
    const threadIds = this.userMetricsIndex.get(userId) || [];
    const postsInPeriod = threadIds
      .map(id => this.metrics.get(id))
      .filter((m): m is ThreadMetrics => m !== undefined && m.createdAt >= period.start && m.createdAt <= period.end);

    const totalImpressions = postsInPeriod.reduce((sum, m) => sum + m.impressions, 0);
    const totalEngagement = postsInPeriod.reduce((sum, m) => sum + m.likes + m.reposts + m.replies, 0);
    const avgRate = postsInPeriod.length > 0
      ? postsInPeriod.reduce((sum, m) => sum + m.engagementRate, 0) / postsInPeriod.length
      : 0;

    const topPosts = [...postsInPeriod].sort((a, b) => b.engagementRate - a.engagementRate).slice(0, 5);
    const bestTimes = await this.getBestTime(userId);
    const followers = this.followerCounts.get(userId);
    const growth = followers ? followers.current - followers.previous : 0;

    return {
      userId,
      period,
      totalPosts: postsInPeriod.length,
      totalImpressions,
      totalEngagement,
      avgEngagementRate: Math.round(avgRate * 100) / 100,
      followerGrowth: growth,
      topPosts,
      bestPostingTimes: bestTimes.slice(0, 5).map(t => ({ ...t, engagement: t.avgEngagement })),
    };
  }

  async recordThread(userId: string, threadId: string): Promise<void> {
    const metrics = this.generateMetrics(threadId);
    this.metrics.set(threadId, metrics);
    const userThreads = this.userMetricsIndex.get(userId) || [];
    userThreads.push(threadId);
    this.userMetricsIndex.set(userId, userThreads);
  }

  private generateMetrics(threadId: string): ThreadMetrics {
    const impressions = Math.floor(Math.random() * 10000) + 100;
    const reach = Math.floor(impressions * (0.5 + Math.random() * 0.4));
    const likes = Math.floor(impressions * (0.02 + Math.random() * 0.08));
    const reposts = Math.floor(likes * (0.1 + Math.random() * 0.3));
    const replies = Math.floor(likes * (0.05 + Math.random() * 0.2));
    const totalEngagement = likes + reposts + replies;
    const engagementRate = impressions > 0 ? (totalEngagement / impressions) * 100 : 0;
    const viralityScore = reposts > 0 ? (reposts / likes) * 100 : 0;

    return {
      threadId,
      impressions,
      reach,
      likes,
      reposts,
      replies,
      quotes: Math.floor(reposts * 0.3),
      bookmarks: Math.floor(likes * 0.2),
      shares: Math.floor(likes * 0.15),
      profileVisits: Math.floor(impressions * 0.01),
      linkClicks: Math.floor(impressions * 0.005),
      engagementRate: Math.round(engagementRate * 100) / 100,
      viralityScore: Math.round(viralityScore * 100) / 100,
      createdAt: new Date(Date.now() - Math.floor(Math.random() * 30 * 86400000)),
      lastUpdated: new Date(),
    };
  }
}

export const threadAnalytics = new ThreadAnalytics();
