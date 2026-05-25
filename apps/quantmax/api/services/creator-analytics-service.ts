// ============================================================================
// QuantMax - Creator Analytics Service
// Follower growth, engagement, posting times, content mix, revenue
// ============================================================================

interface GrowthData { period: string; dataPoints: { date: string; followers: number; gained: number; lost: number }[]; totalGrowth: number; growthRate: number; }
interface EngagementData { overall: number; byType: { type: string; rate: number }[]; trend: number; bestPerforming: { postId: string; rate: number }[]; }
interface PostingTimeData { bestHours: { hour: number; engagement: number }[]; bestDays: { day: string; engagement: number }[]; recommendations: string[]; }
interface ContentMixData { distribution: { type: string; percentage: number; avgEngagement: number }[]; recommendation: string; optimal: { type: string; percentage: number }[]; }
interface RevenueData { total: number; period: string; sources: { source: string; amount: number; percentage: number }[]; trend: number; projection: number; }
interface AudienceInsight { ageGroups: { range: string; pct: number }[]; genderSplit: { gender: string; pct: number }[]; topCountries: { country: string; pct: number }[]; interests: { interest: string; affinity: number }[]; }

class CreatorAnalyticsService {
  private growthCache: Map<string, GrowthData> = new Map();
  private engagementCache: Map<string, EngagementData> = new Map();

  async followerGrowth(userId: string, timeRange: string = '30d'): Promise<GrowthData> {
    const days = timeRange === '7d' ? 7 : timeRange === '90d' ? 90 : 30;
    const baseFollowers = 5000 + Math.floor(Math.random() * 100000);
    let current = baseFollowers;
    const dataPoints = Array.from({ length: days }, (_, i) => {
      const gained = Math.floor(20 + Math.random() * 200);
      const lost = Math.floor(5 + Math.random() * 50);
      current += gained - lost;
      return { date: new Date(Date.now() - (days - 1 - i) * 86400000).toISOString().split('T')[0], followers: current, gained, lost };
    });
    const totalGrowth = current - baseFollowers;
    return { period: timeRange, dataPoints, totalGrowth, growthRate: Math.round((totalGrowth / baseFollowers) * 10000) / 100 };
  }

  async engagementRate(userId: string, timeRange: string = '30d'): Promise<EngagementData> {
    const overall = 3 + Math.random() * 12;
    const byType = [
      { type: 'video', rate: overall * (1.2 + Math.random() * 0.5) },
      { type: 'image', rate: overall * (0.8 + Math.random() * 0.3) },
      { type: 'carousel', rate: overall * (1.0 + Math.random() * 0.4) },
      { type: 'story', rate: overall * (0.5 + Math.random() * 0.3) },
    ].map(t => ({ ...t, rate: Math.round(t.rate * 100) / 100 }));
    const trend = Math.round((Math.random() - 0.3) * 20 * 100) / 100;
    const bestPerforming = Array.from({ length: 5 }, (_, i) => ({ postId: `post_${i}`, rate: Math.round((overall * 1.5 + Math.random() * 10) * 100) / 100 }));
    return { overall: Math.round(overall * 100) / 100, byType, trend, bestPerforming };
  }

  async bestPostingTimes(userId: string): Promise<PostingTimeData> {
    const bestHours = Array.from({ length: 24 }, (_, h) => ({
      hour: h, engagement: h >= 8 && h <= 21 ? 50 + Math.random() * 50 : 10 + Math.random() * 30,
    })).sort((a, b) => b.engagement - a.engagement);
    const bestDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => ({ day, engagement: 40 + Math.random() * 60 })).sort((a, b) => b.engagement - a.engagement);
    const topHour = bestHours[0].hour;
    const topDay = bestDays[0].day;
    return { bestHours: bestHours.slice(0, 5), bestDays, recommendations: [`Post between ${topHour}:00-${topHour + 2}:00 for max engagement`, `${topDay} is your best day`, 'Consistency matters more than timing'] };
  }

  async contentMix(userId: string): Promise<ContentMixData> {
    const distribution = [
      { type: 'short_video', percentage: 40, avgEngagement: 8.5 + Math.random() * 4 },
      { type: 'photo', percentage: 25, avgEngagement: 5 + Math.random() * 3 },
      { type: 'carousel', percentage: 15, avgEngagement: 7 + Math.random() * 3 },
      { type: 'story', percentage: 15, avgEngagement: 3 + Math.random() * 2 },
      { type: 'live', percentage: 5, avgEngagement: 12 + Math.random() * 5 },
    ].map(d => ({ ...d, avgEngagement: Math.round(d.avgEngagement * 100) / 100 }));
    const optimal = [{ type: 'short_video', percentage: 50 }, { type: 'carousel', percentage: 20 }, { type: 'photo', percentage: 15 }, { type: 'live', percentage: 10 }, { type: 'story', percentage: 5 }];
    return { distribution, recommendation: 'Increase short video content and go live more often for better engagement', optimal };
  }

  async revenueReport(userId: string, period: string = '30d'): Promise<RevenueData> {
    const baseRevenue = 100 + Math.random() * 10000;
    const sources = [
      { source: 'gifts', amount: baseRevenue * 0.4, percentage: 40 },
      { source: 'creator_fund', amount: baseRevenue * 0.25, percentage: 25 },
      { source: 'brand_deals', amount: baseRevenue * 0.2, percentage: 20 },
      { source: 'tips', amount: baseRevenue * 0.1, percentage: 10 },
      { source: 'affiliate', amount: baseRevenue * 0.05, percentage: 5 },
    ].map(s => ({ ...s, amount: Math.round(s.amount * 100) / 100 }));
    const total = sources.reduce((s, src) => s + src.amount, 0);
    return { total: Math.round(total * 100) / 100, period, sources, trend: Math.round((Math.random() - 0.2) * 30 * 100) / 100, projection: Math.round(total * 1.1 * 100) / 100 };
  }

  async getTopContent(userId: string, limit: number = 10): Promise<{ postId: string; type: string; views: number; engagement: number; revenue: number }[]> {
    return Array.from({ length: limit }, (_, i) => ({
      postId: `post_${userId}_${i}`, type: ['video', 'image', 'carousel'][i % 3],
      views: Math.floor(10000 + Math.random() * 500000), engagement: Math.round((5 + Math.random() * 15) * 100) / 100,
      revenue: Math.round(Math.random() * 500 * 100) / 100,
    })).sort((a, b) => b.views - a.views);
  }

  async getAudienceInsights(userId: string): Promise<AudienceInsight> {
    return {
      ageGroups: [{ range: '13-17', pct: 8 }, { range: '18-24', pct: 45 }, { range: '25-34', pct: 30 }, { range: '35-44', pct: 12 }, { range: '45+', pct: 5 }],
      genderSplit: [{ gender: 'female', pct: 55 }, { gender: 'male', pct: 42 }, { gender: 'other', pct: 3 }],
      topCountries: [{ country: 'US', pct: 30 }, { country: 'India', pct: 20 }, { country: 'Brazil', pct: 12 }, { country: 'UK', pct: 8 }, { country: 'Mexico', pct: 6 }],
      interests: [{ interest: 'entertainment', affinity: 0.85 }, { interest: 'fashion', affinity: 0.7 }, { interest: 'music', affinity: 0.65 }, { interest: 'food', affinity: 0.55 }],
    };
  }

  async comparePeriods(userId: string, period1: string, period2: string): Promise<{ period1: any; period2: any; changes: { metric: string; change: number }[] }> {
    const data1 = await this.engagementRate(userId, period1);
    const data2 = await this.engagementRate(userId, period2);
    return {
      period1: { period: period1, engagement: data1.overall },
      period2: { period: period2, engagement: data2.overall },
      changes: [
        { metric: 'engagement', change: Math.round((data1.overall - data2.overall) * 100) / 100 },
        { metric: 'follower_growth', change: Math.floor(Math.random() * 1000) },
        { metric: 'views', change: Math.floor((Math.random() - 0.3) * 50000) },
      ],
    };
  }
}

export const creatorAnalyticsService = new CreatorAnalyticsService();
export { CreatorAnalyticsService };
