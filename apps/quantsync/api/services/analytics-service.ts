// ============================================================================
// QuantSync - Analytics Service
// Post impressions, engagement tracking, demographics, follower growth
// ============================================================================

interface PostImpression {
  postId: string;
  userId: string;
  source: 'feed' | 'search' | 'profile' | 'direct';
  device: 'mobile' | 'desktop' | 'tablet';
  duration: number;
  timestamp: string;
}

interface EngagementEvent {
  postId: string;
  userId: string;
  type: 'like' | 'repost' | 'reply' | 'bookmark' | 'share' | 'click' | 'expand';
  timestamp: string;
}

interface DailyMetrics {
  date: string;
  impressions: number;
  engagements: number;
  followers: number;
  unfollowers: number;
  profileVisits: number;
  mentions: number;
}

interface DemographicSegment {
  ageGroups: { range: string; percentage: number }[];
  locations: { country: string; city?: string; percentage: number }[];
  genders: { type: string; percentage: number }[];
  languages: { code: string; name: string; percentage: number }[];
  interests: { category: string; percentage: number }[];
}

interface PostAnalytics {
  postId: string;
  impressions: number;
  reach: number;
  engagements: number;
  engagementRate: number;
  likes: number;
  reposts: number;
  replies: number;
  bookmarks: number;
  shares: number;
  clicks: number;
  profileClicks: number;
  avgViewDuration: number;
  sources: { source: string; count: number }[];
  devices: { device: string; count: number }[];
  hourlyBreakdown: { hour: number; impressions: number }[];
}

interface AnalyticsStore {
  impressions: PostImpression[];
  engagements: EngagementEvent[];
  dailyMetrics: Map<string, DailyMetrics[]>;
  demographics: Map<string, DemographicSegment>;
}

const store: AnalyticsStore = {
  impressions: [],
  engagements: [],
  dailyMetrics: new Map(),
  demographics: new Map(),
};

function generateMetrics(userId: string, days: number): DailyMetrics[] {
  const metrics: DailyMetrics[] = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const baseImpressions = Math.floor(Math.random() * 5000) + 1000;
    const baseEngagements = Math.floor(baseImpressions * (Math.random() * 0.08 + 0.02));
    metrics.push({
      date: date.toISOString().split('T')[0],
      impressions: baseImpressions + Math.floor(Math.random() * 500),
      engagements: baseEngagements,
      followers: Math.floor(Math.random() * 20) - 5,
      unfollowers: Math.floor(Math.random() * 5),
      profileVisits: Math.floor(Math.random() * 200) + 50,
      mentions: Math.floor(Math.random() * 30),
    });
  }
  return metrics;
}

export class AnalyticsService {
  async trackImpression(impression: Omit<PostImpression, 'timestamp'>): Promise<void> {
    store.impressions.push({ ...impression, timestamp: new Date().toISOString() });
  }

  async trackEngagement(event: Omit<EngagementEvent, 'timestamp'>): Promise<void> {
    store.engagements.push({ ...event, timestamp: new Date().toISOString() });
  }

  async getOverview(userId: string, dateRange: string): Promise<{
    impressions: number; impressionsChange: number;
    engagementRate: number; engagementChange: number;
    followers: number; followersChange: number;
    profileVisits: number; profileVisitsChange: number;
  }> {
    const days = this.parseDateRange(dateRange);
    const metrics = this.getOrGenerateMetrics(userId, days * 2);
    const current = metrics.slice(-days);
    const previous = metrics.slice(0, days);

    const currentImpressions = current.reduce((sum, m) => sum + m.impressions, 0);
    const previousImpressions = previous.reduce((sum, m) => sum + m.impressions, 0);
    const currentEngagements = current.reduce((sum, m) => sum + m.engagements, 0);
    const currentFollowers = current.reduce((sum, m) => sum + m.followers, 0);
    const previousFollowers = previous.reduce((sum, m) => sum + m.followers, 0);
    const currentProfileVisits = current.reduce((sum, m) => sum + m.profileVisits, 0);
    const previousProfileVisits = previous.reduce((sum, m) => sum + m.profileVisits, 0);

    const engagementRate = currentImpressions > 0 ? (currentEngagements / currentImpressions) * 100 : 0;
    const previousEngagementRate = previousImpressions > 0 ? (previous.reduce((s, m) => s + m.engagements, 0) / previousImpressions) * 100 : 0;

    return {
      impressions: currentImpressions,
      impressionsChange: previousImpressions > 0 ? Math.round(((currentImpressions - previousImpressions) / previousImpressions) * 100) : 0,
      engagementRate: Math.round(engagementRate * 10) / 10,
      engagementChange: Math.round(((engagementRate - previousEngagementRate) / (previousEngagementRate || 1)) * 100),
      followers: currentFollowers,
      followersChange: currentFollowers - previousFollowers,
      profileVisits: currentProfileVisits,
      profileVisitsChange: previousProfileVisits > 0 ? Math.round(((currentProfileVisits - previousProfileVisits) / previousProfileVisits) * 100) : 0,
    };
  }

  async getDailyMetrics(userId: string, dateRange: string): Promise<{ metrics: DailyMetrics[] }> {
    const days = this.parseDateRange(dateRange);
    const metrics = this.getOrGenerateMetrics(userId, days);
    return { metrics: metrics.slice(-days) };
  }

  async getTopPosts(userId: string, dateRange: string, limit: number = 10): Promise<{ posts: PostAnalytics[] }> {
    const days = this.parseDateRange(dateRange);
    const posts: PostAnalytics[] = [];
    for (let i = 0; i < Math.min(limit, 10); i++) {
      const impressions = Math.floor(Math.random() * 50000) + 5000;
      const engagements = Math.floor(impressions * (Math.random() * 0.1 + 0.02));
      posts.push({
        postId: `post_${Date.now()}_${i}`,
        impressions,
        reach: Math.floor(impressions * 0.8),
        engagements,
        engagementRate: Math.round((engagements / impressions) * 1000) / 10,
        likes: Math.floor(engagements * 0.6),
        reposts: Math.floor(engagements * 0.2),
        replies: Math.floor(engagements * 0.15),
        bookmarks: Math.floor(engagements * 0.05),
        shares: Math.floor(engagements * 0.03),
        clicks: Math.floor(impressions * 0.05),
        profileClicks: Math.floor(impressions * 0.02),
        avgViewDuration: Math.floor(Math.random() * 30) + 5,
        sources: [
          { source: 'feed', count: Math.floor(impressions * 0.6) },
          { source: 'search', count: Math.floor(impressions * 0.2) },
          { source: 'profile', count: Math.floor(impressions * 0.15) },
          { source: 'direct', count: Math.floor(impressions * 0.05) },
        ],
        devices: [
          { device: 'mobile', count: Math.floor(impressions * 0.65) },
          { device: 'desktop', count: Math.floor(impressions * 0.3) },
          { device: 'tablet', count: Math.floor(impressions * 0.05) },
        ],
        hourlyBreakdown: Array.from({ length: 24 }, (_, h) => ({ hour: h, impressions: Math.floor(Math.random() * (impressions / 24) * 2) })),
      });
    }
    return { posts: posts.sort((a, b) => b.impressions - a.impressions) };
  }

  async getDemographics(userId: string): Promise<DemographicSegment> {
    if (!store.demographics.has(userId)) {
      store.demographics.set(userId, {
        ageGroups: [
          { range: '13-17', percentage: 8 }, { range: '18-24', percentage: 32 },
          { range: '25-34', percentage: 28 }, { range: '35-44', percentage: 18 },
          { range: '45-54', percentage: 9 }, { range: '55+', percentage: 5 },
        ],
        locations: [
          { country: 'United States', percentage: 35 }, { country: 'India', percentage: 18 },
          { country: 'United Kingdom', percentage: 12 }, { country: 'Canada', percentage: 8 },
          { country: 'Germany', percentage: 6 }, { country: 'Other', percentage: 21 },
        ],
        genders: [
          { type: 'male', percentage: 58 }, { type: 'female', percentage: 38 }, { type: 'other', percentage: 4 },
        ],
        languages: [
          { code: 'en', name: 'English', percentage: 62 }, { code: 'es', name: 'Spanish', percentage: 14 },
          { code: 'hi', name: 'Hindi', percentage: 10 }, { code: 'fr', name: 'French', percentage: 8 },
          { code: 'de', name: 'German', percentage: 6 },
        ],
        interests: [
          { category: 'Technology', percentage: 45 }, { category: 'Entertainment', percentage: 32 },
          { category: 'Sports', percentage: 28 }, { category: 'Science', percentage: 22 },
          { category: 'Business', percentage: 18 },
        ],
      });
    }
    return store.demographics.get(userId)!;
  }

  async getPostingHeatmap(userId: string, dateRange: string): Promise<{ heatmap: { day: string; hours: { hour: number; engagement: number }[] }[] }> {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const heatmap = days.map(day => ({
      day,
      hours: Array.from({ length: 24 }, (_, hour) => ({
        hour,
        engagement: Math.floor(Math.random() * 150) + (hour >= 9 && hour <= 21 ? 50 : 0) + (day !== 'Saturday' && day !== 'Sunday' ? 20 : 0),
      })),
    }));
    return { heatmap };
  }

  async getPostAnalytics(postId: string): Promise<PostAnalytics | null> {
    const impressions = store.impressions.filter(i => i.postId === postId);
    const engagements = store.engagements.filter(e => e.postId === postId);
    if (impressions.length === 0) return null;

    return {
      postId,
      impressions: impressions.length,
      reach: new Set(impressions.map(i => i.userId)).size,
      engagements: engagements.length,
      engagementRate: impressions.length > 0 ? Math.round((engagements.length / impressions.length) * 1000) / 10 : 0,
      likes: engagements.filter(e => e.type === 'like').length,
      reposts: engagements.filter(e => e.type === 'repost').length,
      replies: engagements.filter(e => e.type === 'reply').length,
      bookmarks: engagements.filter(e => e.type === 'bookmark').length,
      shares: engagements.filter(e => e.type === 'share').length,
      clicks: engagements.filter(e => e.type === 'click').length,
      profileClicks: 0,
      avgViewDuration: impressions.reduce((s, i) => s + i.duration, 0) / impressions.length,
      sources: [], devices: [], hourlyBreakdown: [],
    };
  }

  private parseDateRange(range: string): number {
    const match = range.match(/(\d+)([dhw])/);
    if (!match) return 30;
    const [, num, unit] = match;
    const n = parseInt(num);
    if (unit === 'h') return Math.max(1, Math.ceil(n / 24));
    if (unit === 'w') return n * 7;
    return n;
  }

  private getOrGenerateMetrics(userId: string, days: number): DailyMetrics[] {
    const key = `${userId}_${days}`;
    if (!store.dailyMetrics.has(key)) {
      store.dailyMetrics.set(key, generateMetrics(userId, days));
    }
    return store.dailyMetrics.get(key)!;
  }
}

export const analyticsService = new AnalyticsService();
