// ============================================================================
// QuantNeon - Professional Dashboard Service
// Creator insights, reach, impressions, follower demographics, content performance
// ============================================================================

interface InsightsData {
  accountId: string;
  timeRange: string;
  reach: number;
  impressions: number;
  profileVisits: number;
  websiteClicks: number;
  followerCount: number;
  followersGained: number;
  followersLost: number;
  engagementRate: number;
  contentInteractions: number;
  storyReach: number;
  reelPlays: number;
}

interface ReachData {
  total: number;
  accounts: { reached: number; percentage: number; type: 'followers' | 'non_followers' };
  topCities: { city: string; percentage: number }[];
  topCountries: { country: string; percentage: number }[];
  ageGender: { ageRange: string; male: number; female: number; other: number }[];
  peakTimes: { day: string; hour: number; reach: number }[];
}

interface ContentPerformance {
  posts: ContentItem[];
  stories: ContentItem[];
  reels: ContentItem[];
  topPerforming: ContentItem;
  avgEngagementRate: number;
  bestPostingTime: string;
  contentMix: { type: string; percentage: number; performance: number }[];
}

interface ContentItem {
  id: string;
  type: 'post' | 'story' | 'reel' | 'carousel';
  reach: number;
  impressions: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  engagementRate: number;
  publishedAt: string;
}

interface FollowerDemographics {
  total: number;
  growth: { date: string; gained: number; lost: number; net: number }[];
  ageDistribution: { range: string; percentage: number }[];
  genderDistribution: { gender: string; percentage: number }[];
  topLocations: { location: string; percentage: number }[];
  activeHours: { hour: number; activity: number }[];
  activeDays: { day: string; activity: number }[];
}

interface ContactAction {
  type: 'email' | 'call' | 'directions' | 'website';
  count: number;
  trend: number;
  byDay: { date: string; count: number }[];
}

class ProfessionalDashboardService {
  private insightsCache: Map<string, InsightsData> = new Map();
  private reachCache: Map<string, ReachData> = new Map();
  private contentCache: Map<string, ContentPerformance> = new Map();
  private demographicsCache: Map<string, FollowerDemographics> = new Map();
  private businessCategories: Map<string, string> = new Map();

  async getInsights(accountId: string, timeRange: string = '7d'): Promise<InsightsData> {
    const key = `${accountId}_${timeRange}`;
    const cached = this.insightsCache.get(key);
    if (cached) return cached;

    const multiplier = timeRange === '30d' ? 4 : timeRange === '90d' ? 12 : 1;
    const baseReach = 1000 + Math.floor(Math.random() * 50000);

    const data: InsightsData = {
      accountId,
      timeRange,
      reach: baseReach * multiplier,
      impressions: Math.floor(baseReach * multiplier * (1.5 + Math.random())),
      profileVisits: Math.floor(baseReach * 0.1 * multiplier),
      websiteClicks: Math.floor(baseReach * 0.02 * multiplier),
      followerCount: 1000 + Math.floor(Math.random() * 100000),
      followersGained: Math.floor(50 + Math.random() * 500) * multiplier,
      followersLost: Math.floor(10 + Math.random() * 100) * multiplier,
      engagementRate: Math.round((2 + Math.random() * 8) * 100) / 100,
      contentInteractions: Math.floor(baseReach * 0.05 * multiplier),
      storyReach: Math.floor(baseReach * 0.3 * multiplier),
      reelPlays: Math.floor(baseReach * 2 * multiplier),
    };

    this.insightsCache.set(key, data);
    return data;
  }

  async getReach(accountId: string, timeRange: string = '7d'): Promise<ReachData> {
    const key = `reach_${accountId}_${timeRange}`;
    const cached = this.reachCache.get(key);
    if (cached) return cached;

    const total = 5000 + Math.floor(Math.random() * 100000);
    const followerPct = 30 + Math.random() * 30;

    const data: ReachData = {
      total,
      accounts: { reached: total, percentage: followerPct, type: 'followers' },
      topCities: [
        { city: 'New York', percentage: 12 + Math.random() * 5 },
        { city: 'Los Angeles', percentage: 8 + Math.random() * 4 },
        { city: 'London', percentage: 6 + Math.random() * 3 },
        { city: 'Mumbai', percentage: 5 + Math.random() * 3 },
        { city: 'Tokyo', percentage: 4 + Math.random() * 2 },
      ],
      topCountries: [
        { country: 'United States', percentage: 35 + Math.random() * 10 },
        { country: 'India', percentage: 15 + Math.random() * 5 },
        { country: 'United Kingdom', percentage: 8 + Math.random() * 3 },
        { country: 'Brazil', percentage: 6 + Math.random() * 3 },
        { country: 'Germany', percentage: 4 + Math.random() * 2 },
      ],
      ageGender: [
        { ageRange: '18-24', male: 15, female: 18, other: 2 },
        { ageRange: '25-34', male: 20, female: 22, other: 3 },
        { ageRange: '35-44', male: 8, female: 7, other: 1 },
        { ageRange: '45-54', male: 3, female: 2, other: 0 },
      ],
      peakTimes: Array.from({ length: 7 }, (_, day) => ({
        day: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][day],
        hour: 9 + Math.floor(Math.random() * 12),
        reach: Math.floor(total / 7 * (0.7 + Math.random() * 0.6)),
      })),
    };

    this.reachCache.set(key, data);
    return data;
  }

  async getImpressions(accountId: string, timeRange: string = '7d'): Promise<{ total: number; unique: number; frequency: number; byDay: { date: string; count: number }[] }> {
    const insights = await this.getInsights(accountId, timeRange);
    const days = timeRange === '30d' ? 30 : timeRange === '90d' ? 90 : 7;
    const byDay = Array.from({ length: days }, (_, i) => ({
      date: new Date(Date.now() - (days - 1 - i) * 86400000).toISOString().split('T')[0],
      count: Math.floor(insights.impressions / days * (0.6 + Math.random() * 0.8)),
    }));

    return { total: insights.impressions, unique: insights.reach, frequency: Math.round((insights.impressions / insights.reach) * 100) / 100, byDay };
  }

  async getFollowerDemographics(accountId: string): Promise<FollowerDemographics> {
    const cached = this.demographicsCache.get(accountId);
    if (cached) return cached;

    const total = 1000 + Math.floor(Math.random() * 100000);
    const growth = Array.from({ length: 30 }, (_, i) => {
      const gained = Math.floor(20 + Math.random() * 100);
      const lost = Math.floor(5 + Math.random() * 30);
      return { date: new Date(Date.now() - (29 - i) * 86400000).toISOString().split('T')[0], gained, lost, net: gained - lost };
    });

    const data: FollowerDemographics = {
      total,
      growth,
      ageDistribution: [
        { range: '13-17', percentage: 5 }, { range: '18-24', percentage: 32 },
        { range: '25-34', percentage: 35 }, { range: '35-44', percentage: 16 },
        { range: '45-54', percentage: 8 }, { range: '55+', percentage: 4 },
      ],
      genderDistribution: [
        { gender: 'female', percentage: 55 }, { gender: 'male', percentage: 42 }, { gender: 'other', percentage: 3 },
      ],
      topLocations: [
        { location: 'New York, US', percentage: 12 }, { location: 'Los Angeles, US', percentage: 8 },
        { location: 'London, UK', percentage: 6 }, { location: 'Mumbai, IN', percentage: 5 },
      ],
      activeHours: Array.from({ length: 24 }, (_, h) => ({ hour: h, activity: h >= 8 && h <= 22 ? 30 + Math.random() * 70 : 5 + Math.random() * 20 })),
      activeDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => ({ day, activity: 50 + Math.random() * 50 })),
    };

    this.demographicsCache.set(accountId, data);
    return data;
  }

  async getContentPerformance(accountId: string, timeRange: string = '30d'): Promise<ContentPerformance> {
    const generateItems = (count: number, type: ContentItem['type']): ContentItem[] => {
      return Array.from({ length: count }, (_, i) => {
        const reach = 100 + Math.floor(Math.random() * 10000);
        const impressions = Math.floor(reach * (1.2 + Math.random()));
        const likes = Math.floor(reach * (0.05 + Math.random() * 0.15));
        const comments = Math.floor(likes * (0.05 + Math.random() * 0.2));
        return {
          id: `content_${type}_${i}`,
          type,
          reach, impressions, likes, comments,
          shares: Math.floor(likes * 0.1),
          saves: Math.floor(likes * 0.15),
          engagementRate: Math.round(((likes + comments) / reach) * 10000) / 100,
          publishedAt: new Date(Date.now() - Math.random() * 30 * 86400000).toISOString(),
        };
      });
    };

    const posts = generateItems(10, 'post');
    const stories = generateItems(15, 'story');
    const reels = generateItems(5, 'reel');
    const allContent = [...posts, ...stories, ...reels];
    const topPerforming = allContent.sort((a, b) => b.engagementRate - a.engagementRate)[0];
    const avgEngagement = allContent.reduce((s, c) => s + c.engagementRate, 0) / allContent.length;

    return {
      posts, stories, reels, topPerforming,
      avgEngagementRate: Math.round(avgEngagement * 100) / 100,
      bestPostingTime: '10:00 AM - 12:00 PM',
      contentMix: [
        { type: 'posts', percentage: 33, performance: posts.reduce((s, p) => s + p.engagementRate, 0) / posts.length },
        { type: 'stories', percentage: 50, performance: stories.reduce((s, p) => s + p.engagementRate, 0) / stories.length },
        { type: 'reels', percentage: 17, performance: reels.reduce((s, p) => s + p.engagementRate, 0) / reels.length },
      ],
    };
  }

  async getProfileVisits(accountId: string): Promise<{ total: number; byDay: { date: string; count: number }[]; sources: { source: string; count: number }[] }> {
    const insights = await this.getInsights(accountId, '7d');
    return {
      total: insights.profileVisits,
      byDay: Array.from({ length: 7 }, (_, i) => ({ date: new Date(Date.now() - (6 - i) * 86400000).toISOString().split('T')[0], count: Math.floor(insights.profileVisits / 7 * (0.6 + Math.random() * 0.8)) })),
      sources: [{ source: 'search', count: Math.floor(insights.profileVisits * 0.4) }, { source: 'profile_link', count: Math.floor(insights.profileVisits * 0.3) }, { source: 'hashtag', count: Math.floor(insights.profileVisits * 0.2) }, { source: 'other', count: Math.floor(insights.profileVisits * 0.1) }],
    };
  }

  async getWebsiteClicks(accountId: string): Promise<{ total: number; byDay: { date: string; count: number }[] }> {
    const insights = await this.getInsights(accountId, '7d');
    return {
      total: insights.websiteClicks,
      byDay: Array.from({ length: 7 }, (_, i) => ({ date: new Date(Date.now() - (6 - i) * 86400000).toISOString().split('T')[0], count: Math.floor(insights.websiteClicks / 7 * (0.5 + Math.random())) })),
    };
  }

  async getTopPosts(accountId: string, limit: number = 10): Promise<ContentItem[]> {
    const perf = await this.getContentPerformance(accountId);
    return [...perf.posts, ...perf.reels].sort((a, b) => b.engagementRate - a.engagementRate).slice(0, limit);
  }

  async setBusinessCategory(accountId: string, category: string): Promise<{ accountId: string; category: string }> {
    this.businessCategories.set(accountId, category);
    return { accountId, category };
  }

  async getContactActions(accountId: string): Promise<ContactAction[]> {
    return ['email', 'call', 'directions', 'website'].map(type => ({
      type: type as ContactAction['type'],
      count: Math.floor(10 + Math.random() * 200),
      trend: Math.round((Math.random() - 0.3) * 50 * 100) / 100,
      byDay: Array.from({ length: 7 }, (_, i) => ({ date: new Date(Date.now() - (6 - i) * 86400000).toISOString().split('T')[0], count: Math.floor(Math.random() * 30) })),
    }));
  }
}

export const professionalDashboardService = new ProfessionalDashboardService();
export { ProfessionalDashboardService };
