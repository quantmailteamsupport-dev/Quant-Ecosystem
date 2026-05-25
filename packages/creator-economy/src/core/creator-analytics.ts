// ============================================================================
// Creator Analytics - Earnings Dashboard, Demographics, and Growth Projections
// ============================================================================

import type {
  CreatorAnalytics as CreatorAnalyticsData,
  AnalyticsPeriod,
  ContentPerformance,
  AudienceDemographics,
  RevenueModelType,
} from '../types.js';

interface AnalyticsEvent {
  creatorId: string;
  contentId: string;
  eventType: 'view' | 'like' | 'comment' | 'share' | 'purchase' | 'subscribe';
  userId: string;
  timestamp: number;
  revenue?: number;
  revenueSource?: RevenueModelType;
  metadata: Record<string, string | number>;
}

interface UserDemographic {
  userId: string;
  ageGroup: string;
  location: string;
  device: string;
  referralSource: string;
}

interface ContentItem {
  id: string;
  creatorId: string;
  title: string;
  publishedAt: number;
  category?: string;
}

interface HourlyEngagement {
  hour: number;
  engagementCount: number;
  averageEngagement: number;
}

interface GrowthProjection {
  currentValue: number;
  growthRate: number;
  projectedValue30Days: number;
  projectedValue90Days: number;
  confidence: number;
  trend: 'accelerating' | 'steady' | 'decelerating';
}

export class CreatorAnalytics {
  private events: AnalyticsEvent[] = [];
  private demographics: Map<string, UserDemographic> = new Map();
  private contentItems: Map<string, ContentItem> = new Map();
  private creatorSubscribers: Map<string, Set<string>> = new Map();

  /**
   * Record an analytics event.
   */
  recordEvent(event: AnalyticsEvent): void {
    this.events.push(event);
  }

  /**
   * Record user demographic data.
   */
  recordDemographic(demographic: UserDemographic): void {
    this.demographics.set(demographic.userId, demographic);
  }

  /**
   * Register content for analytics tracking.
   */
  registerContent(content: ContentItem): void {
    this.contentItems.set(content.id, content);
  }

  /**
   * Record a subscriber for a creator.
   */
  recordSubscriber(creatorId: string, userId: string): void {
    const subs = this.creatorSubscribers.get(creatorId) ?? new Set();
    subs.add(userId);
    this.creatorSubscribers.set(creatorId, subs);
  }

  /**
   * Remove a subscriber for a creator.
   */
  removeSubscriber(creatorId: string, userId: string): void {
    const subs = this.creatorSubscribers.get(creatorId);
    if (subs) subs.delete(userId);
  }

  /**
   * Get the earnings dashboard for a creator.
   */
  getEarningsDashboard(
    creatorId: string,
    period: AnalyticsPeriod,
    currentTime: number,
  ): CreatorAnalyticsData {
    const periodMs = this.getPeriodDuration(period);
    const periodStart = period === 'all_time' ? 0 : currentTime - periodMs;
    const previousPeriodStart = period === 'all_time' ? 0 : periodStart - periodMs;

    // Current period earnings
    const currentEvents = this.events.filter(
      (e) => e.creatorId === creatorId && e.timestamp >= periodStart && e.timestamp < currentTime,
    );

    const previousEvents = this.events.filter(
      (e) =>
        e.creatorId === creatorId &&
        e.timestamp >= previousPeriodStart &&
        e.timestamp < periodStart,
    );

    const totalEarnings = currentEvents.reduce((sum, e) => sum + (e.revenue ?? 0), 0);
    const previousEarnings = previousEvents.reduce((sum, e) => sum + (e.revenue ?? 0), 0);
    const earningsDelta =
      previousEarnings > 0
        ? (totalEarnings - previousEarnings) / previousEarnings
        : totalEarnings > 0
          ? 1
          : 0;

    // Subscriber counts
    const subscriberCount = this.creatorSubscribers.get(creatorId)?.size ?? 0;
    const subEventsNow = currentEvents.filter((e) => e.eventType === 'subscribe').length;
    const subEventsPrev = previousEvents.filter((e) => e.eventType === 'subscribe').length;
    const subscriberDelta = subEventsPrev > 0 ? (subEventsNow - subEventsPrev) / subEventsPrev : 0;

    // Content views
    const contentViews = currentEvents.filter((e) => e.eventType === 'view').length;
    const previousViews = previousEvents.filter((e) => e.eventType === 'view').length;
    const viewsDelta = previousViews > 0 ? (contentViews - previousViews) / previousViews : 0;

    // Engagement rate
    const engagementEvents = currentEvents.filter(
      (e) => e.eventType === 'like' || e.eventType === 'comment' || e.eventType === 'share',
    ).length;
    const engagementRate = contentViews > 0 ? engagementEvents / contentViews : 0;

    // Top content
    const topContent = this.getContentPerformance(creatorId, periodStart, currentTime);

    // Demographics
    const demographics = this.getAudienceDemographics(creatorId);

    // Revenue by source
    const revenueBySource: Record<string, number> = {};
    for (const event of currentEvents) {
      if (event.revenue && event.revenueSource) {
        revenueBySource[event.revenueSource] =
          (revenueBySource[event.revenueSource] ?? 0) + event.revenue;
      }
    }

    return {
      creatorId,
      period,
      totalEarnings: Math.round(totalEarnings * 100) / 100,
      earningsDelta: Math.round(earningsDelta * 100) / 100,
      subscriberCount,
      subscriberDelta: Math.round(subscriberDelta * 100) / 100,
      contentViews,
      viewsDelta: Math.round(viewsDelta * 100) / 100,
      engagementRate: Math.round(engagementRate * 1000) / 1000,
      topContent: topContent.slice(0, 10),
      demographics,
      revenueBySource: revenueBySource as Record<RevenueModelType, number>,
    };
  }

  /**
   * Get content performance ranked by engagement.
   */
  getContentPerformance(
    creatorId: string,
    startTime: number,
    endTime: number,
  ): ContentPerformance[] {
    const contentEvents = this.events.filter(
      (e) => e.creatorId === creatorId && e.timestamp >= startTime && e.timestamp <= endTime,
    );

    // Group by content
    const contentMap = new Map<string, { views: number; engagement: number; revenue: number }>();

    for (const event of contentEvents) {
      const stats = contentMap.get(event.contentId) ?? { views: 0, engagement: 0, revenue: 0 };

      if (event.eventType === 'view') {
        stats.views += 1;
      } else if (
        event.eventType === 'like' ||
        event.eventType === 'comment' ||
        event.eventType === 'share'
      ) {
        stats.engagement += 1;
      }

      if (event.revenue) {
        stats.revenue += event.revenue;
      }

      contentMap.set(event.contentId, stats);
    }

    // Convert to ContentPerformance array
    const performances: ContentPerformance[] = [];
    for (const [contentId, stats] of contentMap) {
      const content = this.contentItems.get(contentId);
      performances.push({
        contentId,
        title: content?.title ?? contentId,
        views: stats.views,
        engagement: stats.engagement,
        revenue: Math.round(stats.revenue * 100) / 100,
        publishedAt: content?.publishedAt ?? 0,
      });
    }

    // Sort by engagement score (views * 0.3 + engagement * 0.5 + revenue * 0.2)
    performances.sort((a, b) => {
      const scoreA = a.views * 0.3 + a.engagement * 0.5 + a.revenue * 0.2;
      const scoreB = b.views * 0.3 + b.engagement * 0.5 + b.revenue * 0.2;
      return scoreB - scoreA;
    });

    return performances;
  }

  /**
   * Get audience demographics breakdown.
   */
  getAudienceDemographics(creatorId: string): AudienceDemographics {
    // Get unique users who interacted with this creator
    const uniqueUsers = new Set<string>();
    for (const event of this.events) {
      if (event.creatorId === creatorId) {
        uniqueUsers.add(event.userId);
      }
    }

    const ageGroups: Record<string, number> = {};
    const locations: Record<string, number> = {};
    const devices: Record<string, number> = {};
    const referralSources: Record<string, number> = {};

    for (const userId of uniqueUsers) {
      const demo = this.demographics.get(userId);
      if (!demo) continue;

      ageGroups[demo.ageGroup] = (ageGroups[demo.ageGroup] ?? 0) + 1;
      locations[demo.location] = (locations[demo.location] ?? 0) + 1;
      devices[demo.device] = (devices[demo.device] ?? 0) + 1;
      referralSources[demo.referralSource] = (referralSources[demo.referralSource] ?? 0) + 1;
    }

    // Convert to percentages
    const total = uniqueUsers.size || 1;
    const toPercentages = (record: Record<string, number>): Record<string, number> => {
      const result: Record<string, number> = {};
      for (const [key, value] of Object.entries(record)) {
        result[key] = Math.round((value / total) * 10000) / 100;
      }
      return result;
    };

    return {
      ageGroups: toPercentages(ageGroups),
      locations: toPercentages(locations),
      devices: toPercentages(devices),
      referralSources: toPercentages(referralSources),
    };
  }

  /**
   * Get revenue per content item.
   */
  getRevenuePerContent(creatorId: string): Map<string, number> {
    const revenueMap = new Map<string, number>();

    for (const event of this.events) {
      if (event.creatorId !== creatorId || !event.revenue) continue;
      const current = revenueMap.get(event.contentId) ?? 0;
      revenueMap.set(event.contentId, current + event.revenue);
    }

    return revenueMap;
  }

  /**
   * Calculate growth rate using linear regression projection.
   * Uses ordinary least squares (OLS) on daily aggregated data.
   */
  calculateGrowthProjection(
    creatorId: string,
    metric: 'earnings' | 'subscribers' | 'views',
    currentTime: number,
  ): GrowthProjection {
    const dayMs = 86400000;
    const lookbackDays = 30;
    const startTime = currentTime - lookbackDays * dayMs;

    // Aggregate metric by day
    const dailyValues: number[] = [];

    for (let day = 0; day < lookbackDays; day++) {
      const dayStart = startTime + day * dayMs;
      const dayEnd = dayStart + dayMs;
      const dayEvents = this.events.filter(
        (e) => e.creatorId === creatorId && e.timestamp >= dayStart && e.timestamp < dayEnd,
      );

      let value: number;
      switch (metric) {
        case 'earnings':
          value = dayEvents.reduce((sum, e) => sum + (e.revenue ?? 0), 0);
          break;
        case 'subscribers':
          value = dayEvents.filter((e) => e.eventType === 'subscribe').length;
          break;
        case 'views':
          value = dayEvents.filter((e) => e.eventType === 'view').length;
          break;
      }
      dailyValues.push(value);
    }

    // Linear regression: y = mx + b
    const n = dailyValues.length;
    if (n === 0) {
      return {
        currentValue: 0,
        growthRate: 0,
        projectedValue30Days: 0,
        projectedValue90Days: 0,
        confidence: 0,
        trend: 'steady',
      };
    }

    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumX2 = 0;
    let sumY2 = 0;

    for (let i = 0; i < n; i++) {
      const x = i;
      const y = dailyValues[i] ?? 0;
      sumX += x;
      sumY += y;
      sumXY += x * y;
      sumX2 += x * x;
      sumY2 += y * y;
    }

    const denominator = n * sumX2 - sumX * sumX;
    let slope = 0;
    let intercept = 0;

    if (denominator !== 0) {
      slope = (n * sumXY - sumX * sumY) / denominator;
      intercept = (sumY - slope * sumX) / n;
    }

    // Calculate R-squared for confidence
    const meanY = sumY / n;
    let ssRes = 0;
    let ssTot = 0;
    for (let i = 0; i < n; i++) {
      const y = dailyValues[i] ?? 0;
      const predicted = slope * i + intercept;
      ssRes += (y - predicted) ** 2;
      ssTot += (y - meanY) ** 2;
    }
    const rSquared = ssTot !== 0 ? 1 - ssRes / ssTot : 0;

    // Current value (last day)
    const currentValue = dailyValues[n - 1] ?? 0;

    // Growth rate (slope relative to current mean)
    const meanValue = sumY / n;
    const growthRate = meanValue !== 0 ? slope / meanValue : 0;

    // Projections
    const projectedValue30Days = Math.max(0, slope * (n + 30) + intercept);
    const projectedValue90Days = Math.max(0, slope * (n + 90) + intercept);

    // Determine trend direction using second half vs first half slope comparison
    const halfN = Math.floor(n / 2);
    const firstHalfAvg = dailyValues.slice(0, halfN).reduce((a, b) => a + b, 0) / halfN;
    const secondHalfAvg = dailyValues.slice(halfN).reduce((a, b) => a + b, 0) / (n - halfN);
    const recentSlope = secondHalfAvg - firstHalfAvg;

    let trend: 'accelerating' | 'steady' | 'decelerating';
    if (recentSlope > meanValue * 0.1) {
      trend = 'accelerating';
    } else if (recentSlope < -meanValue * 0.1) {
      trend = 'decelerating';
    } else {
      trend = 'steady';
    }

    return {
      currentValue: Math.round(currentValue * 100) / 100,
      growthRate: Math.round(growthRate * 10000) / 10000,
      projectedValue30Days: Math.round(projectedValue30Days * 100) / 100,
      projectedValue90Days: Math.round(projectedValue90Days * 100) / 100,
      confidence: Math.round(Math.max(0, rSquared) * 100) / 100,
      trend,
    };
  }

  /**
   * Analyze best posting times based on engagement histograms.
   * Returns engagement by hour of day.
   */
  analyzeBestPostingTimes(creatorId: string): HourlyEngagement[] {
    const hourlyBuckets: Map<number, { total: number; count: number }> = new Map();

    // Initialize all hours
    for (let h = 0; h < 24; h++) {
      hourlyBuckets.set(h, { total: 0, count: 0 });
    }

    // Aggregate engagement events by hour
    const engagementEvents = this.events.filter(
      (e) =>
        e.creatorId === creatorId &&
        (e.eventType === 'like' || e.eventType === 'comment' || e.eventType === 'share'),
    );

    for (const event of engagementEvents) {
      const date = new Date(event.timestamp);
      const hour = date.getUTCHours();
      const bucket = hourlyBuckets.get(hour);
      if (bucket) {
        bucket.total += 1;
        bucket.count += 1;
      }
    }

    // Also count views for weighting
    const viewEvents = this.events.filter(
      (e) => e.creatorId === creatorId && e.eventType === 'view',
    );

    const viewsByHour: Map<number, number> = new Map();
    for (const event of viewEvents) {
      const date = new Date(event.timestamp);
      const hour = date.getUTCHours();
      viewsByHour.set(hour, (viewsByHour.get(hour) ?? 0) + 1);
    }

    // Build hourly engagement results
    const results: HourlyEngagement[] = [];
    for (let hour = 0; hour < 24; hour++) {
      const bucket = hourlyBuckets.get(hour)!;
      const views = viewsByHour.get(hour) ?? 0;
      const averageEngagement = views > 0 ? bucket.total / views : 0;

      results.push({
        hour,
        engagementCount: bucket.total,
        averageEngagement: Math.round(averageEngagement * 1000) / 1000,
      });
    }

    // Sort by engagement count descending
    results.sort((a, b) => b.engagementCount - a.engagementCount);

    return results;
  }

  /**
   * Get the top N best hours to post.
   */
  getBestPostingHours(creatorId: string, topN: number = 3): number[] {
    const hourly = this.analyzeBestPostingTimes(creatorId);
    return hourly.slice(0, topN).map((h) => h.hour);
  }

  /**
   * Get the period duration in milliseconds.
   */
  private getPeriodDuration(period: AnalyticsPeriod): number {
    const day = 86400000;
    switch (period) {
      case 'daily':
        return day;
      case 'weekly':
        return 7 * day;
      case 'monthly':
        return 30 * day;
      case 'all_time':
        return Number.MAX_SAFE_INTEGER;
    }
  }

  /**
   * Get total event count for a creator.
   */
  getTotalEvents(creatorId: string): number {
    return this.events.filter((e) => e.creatorId === creatorId).length;
  }

  /**
   * Get earnings breakdown by time period (for charts).
   */
  getEarningsTimeline(
    creatorId: string,
    granularity: 'hourly' | 'daily' | 'weekly',
    startTime: number,
    endTime: number,
  ): Array<{ timestamp: number; earnings: number }> {
    const bucketMs =
      granularity === 'hourly' ? 3600000 : granularity === 'daily' ? 86400000 : 604800000;

    const timeline: Array<{ timestamp: number; earnings: number }> = [];
    const revenueEvents = this.events.filter(
      (e) =>
        e.creatorId === creatorId &&
        e.revenue !== undefined &&
        e.revenue > 0 &&
        e.timestamp >= startTime &&
        e.timestamp <= endTime,
    );

    const buckets = new Map<number, number>();
    for (const event of revenueEvents) {
      const bucketKey = Math.floor(event.timestamp / bucketMs) * bucketMs;
      buckets.set(bucketKey, (buckets.get(bucketKey) ?? 0) + (event.revenue ?? 0));
    }

    // Fill in zero buckets
    for (let ts = Math.floor(startTime / bucketMs) * bucketMs; ts <= endTime; ts += bucketMs) {
      timeline.push({
        timestamp: ts,
        earnings: Math.round((buckets.get(ts) ?? 0) * 100) / 100,
      });
    }

    return timeline;
  }
}
