// ============================================================================
// QuantTube - Video Analytics Service
// Retention graphs, traffic sources, demographics, revenue metrics, watch time
// ============================================================================

interface RetentionPoint {
  timestamp: number;
  percentage: number;
  absoluteViewers: number;
  replayCount: number;
}

interface TrafficSource {
  source: 'referral' | 'search' | 'suggested' | 'browse' | 'external' | 'direct' | 'notifications' | 'playlists';
  views: number;
  percentage: number;
  watchTimeMinutes: number;
  avgViewDuration: number;
  impressions: number;
  ctr: number;
}

interface DemographicData {
  ageGroups: { range: string; percentage: number; views: number }[];
  genderSplit: { gender: string; percentage: number }[];
  countries: { code: string; name: string; views: number; percentage: number }[];
  languages: { code: string; name: string; percentage: number }[];
  devices: { type: string; percentage: number }[];
}

interface RevenueMetrics {
  cpm: number;
  rpm: number;
  estimatedEarnings: number;
  adImpressions: number;
  monetizedPlaybacks: number;
  adRevenue: number;
  membershipRevenue: number;
  superChatRevenue: number;
  merchRevenue: number;
  totalRevenue: number;
  currency: string;
}

interface WatchTimeData {
  totalMinutes: number;
  averageMinutes: number;
  perVideo: { videoId: string; title: string; minutes: number; views: number }[];
  dailyBreakdown: { date: string; minutes: number }[];
  trend: number;
}

interface RealTimeViewData {
  timestamp: number;
  concurrentViewers: number;
  newViewsLastMinute: number;
  topVideos: { videoId: string; title: string; viewers: number }[];
  geographicSpread: { country: string; viewers: number }[];
}

interface AnalyticsQuery {
  channelId: string;
  videoId?: string;
  startDate?: string;
  endDate?: string;
  granularity?: 'hour' | 'day' | 'week' | 'month';
}

class VideoAnalytics {
  private retentionData: Map<string, RetentionPoint[]> = new Map();
  private trafficData: Map<string, TrafficSource[]> = new Map();
  private demographicData: Map<string, DemographicData> = new Map();
  private revenueData: Map<string, RevenueMetrics> = new Map();
  private watchTimeData: Map<string, WatchTimeData> = new Map();
  private realTimeData: Map<string, RealTimeViewData[]> = new Map();

  async getRetentionGraph(videoId: string): Promise<{ videoId: string; duration: number; points: RetentionPoint[]; avgRetention: number; dropOffPoints: number[] }> {
    const cached = this.retentionData.get(videoId);
    if (cached) {
      const avgRetention = cached.reduce((sum, p) => sum + p.percentage, 0) / cached.length;
      const dropOffPoints = this.detectDropoffs(cached);
      return { videoId, duration: cached.length * 10, points: cached, avgRetention, dropOffPoints };
    }

    const duration = 300 + Math.floor(Math.random() * 600);
    const intervalSeconds = 10;
    const numPoints = Math.floor(duration / intervalSeconds);
    const points: RetentionPoint[] = [];
    let currentRetention = 100;
    const initialViewers = 1000 + Math.floor(Math.random() * 50000);

    for (let i = 0; i < numPoints; i++) {
      const dropRate = i < 3 ? Math.random() * 5 : Math.random() * 2;
      const spike = Math.random() < 0.05 ? Math.random() * 3 : 0;
      currentRetention = Math.max(5, currentRetention - dropRate + spike);

      points.push({
        timestamp: i * intervalSeconds,
        percentage: Math.round(currentRetention * 100) / 100,
        absoluteViewers: Math.floor(initialViewers * (currentRetention / 100)),
        replayCount: Math.floor(Math.random() * 50),
      });
    }

    this.retentionData.set(videoId, points);
    const avgRetention = points.reduce((sum, p) => sum + p.percentage, 0) / points.length;
    const dropOffPoints = this.detectDropoffs(points);

    return { videoId, duration, points, avgRetention: Math.round(avgRetention * 100) / 100, dropOffPoints };
  }

  private detectDropoffs(points: RetentionPoint[]): number[] {
    const dropoffs: number[] = [];
    for (let i = 1; i < points.length; i++) {
      const drop = points[i - 1].percentage - points[i].percentage;
      if (drop > 4) {
        dropoffs.push(points[i].timestamp);
      }
    }
    return dropoffs;
  }

  async getTrafficSources(query: AnalyticsQuery): Promise<{ channelId: string; period: string; sources: TrafficSource[]; totalViews: number }> {
    const key = `${query.channelId}_${query.videoId || 'all'}`;
    const cached = this.trafficData.get(key);
    if (cached) {
      const totalViews = cached.reduce((sum, s) => sum + s.views, 0);
      return { channelId: query.channelId, period: `${query.startDate || 'last_28_days'}`, sources: cached, totalViews };
    }

    const sourceTypes: TrafficSource['source'][] = ['search', 'suggested', 'browse', 'external', 'referral', 'direct', 'notifications', 'playlists'];
    const weights = [25, 30, 15, 10, 8, 5, 4, 3];
    const totalViews = 10000 + Math.floor(Math.random() * 500000);

    const sources: TrafficSource[] = sourceTypes.map((source, idx) => {
      const variance = (Math.random() - 0.5) * 10;
      const percentage = Math.max(1, weights[idx] + variance);
      const views = Math.floor(totalViews * (percentage / 100));
      return {
        source,
        views,
        percentage: Math.round(percentage * 100) / 100,
        watchTimeMinutes: Math.floor(views * (2 + Math.random() * 8)),
        avgViewDuration: Math.round((60 + Math.random() * 300) * 100) / 100,
        impressions: Math.floor(views * (3 + Math.random() * 10)),
        ctr: Math.round((2 + Math.random() * 12) * 100) / 100,
      };
    });

    const totalPct = sources.reduce((s, src) => s + src.percentage, 0);
    sources.forEach(s => { s.percentage = Math.round((s.percentage / totalPct) * 10000) / 100; });

    this.trafficData.set(key, sources);
    return { channelId: query.channelId, period: query.startDate || 'last_28_days', sources, totalViews };
  }

  async getDemographics(query: AnalyticsQuery): Promise<DemographicData> {
    const key = query.channelId;
    const cached = this.demographicData.get(key);
    if (cached) return cached;

    const ageGroups = [
      { range: '13-17', percentage: 8, views: 0 },
      { range: '18-24', percentage: 28, views: 0 },
      { range: '25-34', percentage: 32, views: 0 },
      { range: '35-44', percentage: 18, views: 0 },
      { range: '45-54', percentage: 9, views: 0 },
      { range: '55-64', percentage: 3, views: 0 },
      { range: '65+', percentage: 2, views: 0 },
    ].map(g => ({ ...g, percentage: g.percentage + (Math.random() - 0.5) * 5, views: Math.floor(g.percentage * 1000) }));

    const genderSplit = [
      { gender: 'male', percentage: 55 + (Math.random() - 0.5) * 20 },
      { gender: 'female', percentage: 0 },
      { gender: 'other', percentage: 2 + Math.random() * 3 },
    ];
    genderSplit[1].percentage = 100 - genderSplit[0].percentage - genderSplit[2].percentage;

    const countries = [
      { code: 'US', name: 'United States', views: 50000, percentage: 30 },
      { code: 'IN', name: 'India', views: 35000, percentage: 20 },
      { code: 'BR', name: 'Brazil', views: 20000, percentage: 12 },
      { code: 'GB', name: 'United Kingdom', views: 15000, percentage: 9 },
      { code: 'DE', name: 'Germany', views: 10000, percentage: 6 },
      { code: 'JP', name: 'Japan', views: 8000, percentage: 5 },
      { code: 'FR', name: 'France', views: 7000, percentage: 4 },
    ];

    const data: DemographicData = {
      ageGroups,
      genderSplit,
      countries,
      languages: [
        { code: 'en', name: 'English', percentage: 45 },
        { code: 'hi', name: 'Hindi', percentage: 15 },
        { code: 'pt', name: 'Portuguese', percentage: 12 },
        { code: 'es', name: 'Spanish', percentage: 10 },
      ],
      devices: [
        { type: 'mobile', percentage: 55 },
        { type: 'desktop', percentage: 30 },
        { type: 'tablet', percentage: 8 },
        { type: 'tv', percentage: 7 },
      ],
    };

    this.demographicData.set(key, data);
    return data;
  }

  async getRevenueMetrics(query: AnalyticsQuery): Promise<RevenueMetrics> {
    const key = `${query.channelId}_${query.startDate || 'month'}`;
    const cached = this.revenueData.get(key);
    if (cached) return cached;

    const adImpressions = 50000 + Math.floor(Math.random() * 500000);
    const cpm = 2 + Math.random() * 15;
    const adRevenue = (adImpressions / 1000) * cpm;
    const monetizedPlaybacks = Math.floor(adImpressions * 0.7);
    const membershipRevenue = Math.floor(Math.random() * 5000);
    const superChatRevenue = Math.floor(Math.random() * 2000);
    const merchRevenue = Math.floor(Math.random() * 1000);
    const totalRevenue = adRevenue + membershipRevenue + superChatRevenue + merchRevenue;
    const rpm = (totalRevenue / (adImpressions / 1000));

    const metrics: RevenueMetrics = {
      cpm: Math.round(cpm * 100) / 100,
      rpm: Math.round(rpm * 100) / 100,
      estimatedEarnings: Math.round(totalRevenue * 100) / 100,
      adImpressions,
      monetizedPlaybacks,
      adRevenue: Math.round(adRevenue * 100) / 100,
      membershipRevenue,
      superChatRevenue,
      merchRevenue,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      currency: 'USD',
    };

    this.revenueData.set(key, metrics);
    return metrics;
  }

  async getWatchTime(query: AnalyticsQuery): Promise<WatchTimeData> {
    const key = `${query.channelId}_wt`;
    const cached = this.watchTimeData.get(key);
    if (cached) return cached;

    const numVideos = 10 + Math.floor(Math.random() * 40);
    const perVideo = Array.from({ length: numVideos }, (_, i) => ({
      videoId: `vid_${Date.now().toString(36)}_${i}`,
      title: `Video ${i + 1} - Content Title`,
      minutes: Math.floor(100 + Math.random() * 10000),
      views: Math.floor(500 + Math.random() * 50000),
    }));

    const totalMinutes = perVideo.reduce((sum, v) => sum + v.minutes, 0);
    const totalViews = perVideo.reduce((sum, v) => sum + v.views, 0);
    const dailyBreakdown = Array.from({ length: 28 }, (_, i) => {
      const date = new Date(Date.now() - (27 - i) * 86400000);
      return { date: date.toISOString().split('T')[0], minutes: Math.floor(totalMinutes / 28 * (0.7 + Math.random() * 0.6)) };
    });

    const data: WatchTimeData = {
      totalMinutes,
      averageMinutes: Math.round((totalMinutes / totalViews) * 100) / 100,
      perVideo: perVideo.sort((a, b) => b.minutes - a.minutes).slice(0, 20),
      dailyBreakdown,
      trend: Math.round((Math.random() - 0.3) * 20 * 100) / 100,
    };

    this.watchTimeData.set(key, data);
    return data;
  }

  async getRealTimeViews(channelId: string): Promise<RealTimeViewData> {
    const now = Date.now();
    const concurrentViewers = Math.floor(50 + Math.random() * 5000);

    const data: RealTimeViewData = {
      timestamp: now,
      concurrentViewers,
      newViewsLastMinute: Math.floor(Math.random() * 200),
      topVideos: Array.from({ length: 5 }, (_, i) => ({
        videoId: `vid_rt_${i}`,
        title: `Trending Video ${i + 1}`,
        viewers: Math.floor(concurrentViewers * (0.3 - i * 0.05) * (0.8 + Math.random() * 0.4)),
      })),
      geographicSpread: [
        { country: 'US', viewers: Math.floor(concurrentViewers * 0.3) },
        { country: 'IN', viewers: Math.floor(concurrentViewers * 0.2) },
        { country: 'BR', viewers: Math.floor(concurrentViewers * 0.1) },
        { country: 'GB', viewers: Math.floor(concurrentViewers * 0.08) },
        { country: 'DE', viewers: Math.floor(concurrentViewers * 0.05) },
      ],
    };

    const existing = this.realTimeData.get(channelId) || [];
    existing.push(data);
    if (existing.length > 60) existing.shift();
    this.realTimeData.set(channelId, existing);

    return data;
  }

  async getEngagementMetrics(videoId: string): Promise<{ likes: number; dislikes: number; comments: number; shares: number; saves: number; engagementRate: number }> {
    const views = 1000 + Math.floor(Math.random() * 100000);
    const likes = Math.floor(views * (0.03 + Math.random() * 0.07));
    const dislikes = Math.floor(likes * (0.02 + Math.random() * 0.1));
    const comments = Math.floor(views * (0.005 + Math.random() * 0.02));
    const shares = Math.floor(views * (0.01 + Math.random() * 0.03));
    const saves = Math.floor(views * (0.008 + Math.random() * 0.02));
    const engagementRate = ((likes + comments + shares + saves) / views) * 100;

    return { likes, dislikes, comments, shares, saves, engagementRate: Math.round(engagementRate * 100) / 100 };
  }
}

export const videoAnalytics = new VideoAnalytics();
export { VideoAnalytics };
