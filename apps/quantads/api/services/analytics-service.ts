// ============================================================================
// QuantAds - Analytics Service
// Tracking, attribution, reporting for ad campaigns
// ============================================================================

import type { CampaignMetrics, AnalyticsReport, AnalyticsBreakdown, AttributionData } from '../../src/types';

interface TrackingEvent {
  id: string;
  campaignId: string;
  creativeId: string;
  userId: string;
  type: 'impression' | 'click' | 'conversion' | 'video_view' | 'video_complete';
  timestamp: number;
  metadata: Record<string, unknown>;
  placement: string;
  device: string;
  location?: string;
  revenue?: number;
}

interface ConversionWindow {
  clickThrough: number; // days
  viewThrough: number; // days
}

class AnalyticsService {
  private events: TrackingEvent[] = [];
  private campaignMetrics: Map<string, CampaignMetrics> = new Map();
  private conversionWindows: Map<string, ConversionWindow> = new Map();
  private reports: Map<string, AnalyticsReport> = new Map();
  private realtimeCounters: Map<string, { impressions: number; clicks: number; spend: number }> = new Map();

  // --------------------------------------------------------------------------
  // Event Tracking
  // --------------------------------------------------------------------------

  trackImpression(campaignId: string, creativeId: string, userId: string, placement: string, cost: number): string {
    const event: TrackingEvent = {
      id: `imp_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      campaignId,
      creativeId,
      userId,
      type: 'impression',
      timestamp: Date.now(),
      metadata: { cost },
      placement,
      device: 'web',
    };

    this.events.push(event);
    this.updateMetrics(campaignId, 'impression', cost);
    this.updateRealtimeCounter(campaignId, 'impressions', cost);

    return event.id;
  }

  trackClick(campaignId: string, creativeId: string, userId: string, impressionId: string): string {
    const event: TrackingEvent = {
      id: `click_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      campaignId,
      creativeId,
      userId,
      type: 'click',
      timestamp: Date.now(),
      metadata: { impressionId },
      placement: '',
      device: 'web',
    };

    this.events.push(event);
    this.updateMetrics(campaignId, 'click');
    this.updateRealtimeCounter(campaignId, 'clicks');

    return event.id;
  }

  trackConversion(campaignId: string, userId: string, revenue: number, conversionType: string): string {
    const event: TrackingEvent = {
      id: `conv_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      campaignId,
      creativeId: '',
      userId,
      type: 'conversion',
      timestamp: Date.now(),
      metadata: { conversionType, revenue },
      placement: '',
      device: 'web',
      revenue,
    };

    this.events.push(event);
    this.updateMetrics(campaignId, 'conversion', 0, revenue);

    return event.id;
  }

  trackVideoView(campaignId: string, creativeId: string, userId: string, percentWatched: number): void {
    const isComplete = percentWatched >= 95;
    const event: TrackingEvent = {
      id: `vid_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      campaignId,
      creativeId,
      userId,
      type: isComplete ? 'video_complete' : 'video_view',
      timestamp: Date.now(),
      metadata: { percentWatched },
      placement: '',
      device: 'web',
    };
    this.events.push(event);
  }

  // --------------------------------------------------------------------------
  // Metrics Computation
  // --------------------------------------------------------------------------

  private updateMetrics(campaignId: string, eventType: string, cost: number = 0, revenue: number = 0): void {
    const metrics = this.campaignMetrics.get(campaignId) || this.getEmptyMetrics();

    switch (eventType) {
      case 'impression':
        metrics.impressions++;
        metrics.spend += cost;
        break;
      case 'click':
        metrics.clicks++;
        break;
      case 'conversion':
        metrics.conversions++;
        break;
    }

    // Recalculate derived metrics
    metrics.ctr = metrics.impressions > 0 ? (metrics.clicks / metrics.impressions) * 100 : 0;
    metrics.conversionRate = metrics.clicks > 0 ? (metrics.conversions / metrics.clicks) * 100 : 0;
    metrics.cpm = metrics.impressions > 0 ? (metrics.spend / metrics.impressions) * 1000 : 0;
    metrics.cpc = metrics.clicks > 0 ? metrics.spend / metrics.clicks : 0;
    metrics.cpa = metrics.conversions > 0 ? metrics.spend / metrics.conversions : 0;
    metrics.roas = metrics.spend > 0 ? revenue / metrics.spend : 0;

    this.campaignMetrics.set(campaignId, metrics);
  }

  private updateRealtimeCounter(campaignId: string, field: 'impressions' | 'clicks', spend: number = 0): void {
    const counter = this.realtimeCounters.get(campaignId) || { impressions: 0, clicks: 0, spend: 0 };
    counter[field]++;
    counter.spend += spend;
    this.realtimeCounters.set(campaignId, counter);
  }

  // --------------------------------------------------------------------------
  // Reporting
  // --------------------------------------------------------------------------

  getCampaignMetrics(campaignId: string): CampaignMetrics {
    return this.campaignMetrics.get(campaignId) || this.getEmptyMetrics();
  }

  generateReport(campaignId: string, startDate: string, endDate: string, granularity: 'hour' | 'day' | 'week' | 'month' = 'day'): AnalyticsReport {
    const startTime = new Date(startDate).getTime();
    const endTime = new Date(endDate).getTime();

    const campaignEvents = this.events.filter(
      e => e.campaignId === campaignId && e.timestamp >= startTime && e.timestamp <= endTime
    );

    const metrics = this.computeMetricsFromEvents(campaignEvents);
    const breakdowns = this.computeBreakdowns(campaignEvents);
    const attribution = this.computeAttribution(campaignEvents);

    const report: AnalyticsReport = {
      id: `report_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      campaignId,
      dateRange: { start: startDate, end: endDate },
      granularity,
      metrics,
      breakdowns,
      attribution,
      generatedAt: new Date().toISOString(),
    };

    this.reports.set(report.id, report);
    return report;
  }

  private computeMetricsFromEvents(events: TrackingEvent[]): CampaignMetrics {
    const impressions = events.filter(e => e.type === 'impression').length;
    const clicks = events.filter(e => e.type === 'click').length;
    const conversions = events.filter(e => e.type === 'conversion').length;
    const spend = events.filter(e => e.type === 'impression').reduce((sum, e) => sum + ((e.metadata['cost'] as number) || 0), 0);
    const revenue = events.filter(e => e.type === 'conversion').reduce((sum, e) => sum + (e.revenue || 0), 0);
    const uniqueUsers = new Set(events.map(e => e.userId)).size;
    const videoViews = events.filter(e => e.type === 'video_view' || e.type === 'video_complete').length;
    const videoCompletes = events.filter(e => e.type === 'video_complete').length;

    return {
      impressions,
      clicks,
      ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
      conversions,
      conversionRate: clicks > 0 ? (conversions / clicks) * 100 : 0,
      spend: Math.round(spend * 100) / 100,
      cpm: impressions > 0 ? Math.round((spend / impressions) * 1000 * 100) / 100 : 0,
      cpc: clicks > 0 ? Math.round((spend / clicks) * 100) / 100 : 0,
      cpa: conversions > 0 ? Math.round((spend / conversions) * 100) / 100 : 0,
      roas: spend > 0 ? Math.round((revenue / spend) * 100) / 100 : 0,
      reach: uniqueUsers,
      frequency: uniqueUsers > 0 ? Math.round((impressions / uniqueUsers) * 10) / 10 : 0,
      videoViews,
      videoCompletionRate: videoViews > 0 ? (videoCompletes / videoViews) * 100 : undefined,
    };
  }

  private computeBreakdowns(events: TrackingEvent[]): AnalyticsBreakdown[] {
    const breakdowns: AnalyticsBreakdown[] = [];

    // Placement breakdown
    const byPlacement: Map<string, TrackingEvent[]> = new Map();
    for (const e of events) {
      const key = e.placement || 'unknown';
      if (!byPlacement.has(key)) byPlacement.set(key, []);
      byPlacement.get(key)!.push(e);
    }
    breakdowns.push({
      dimension: 'placement',
      data: Array.from(byPlacement.entries()).map(([key, evts]) => ({
        key,
        metrics: this.computeMetricsFromEvents(evts),
      })),
    });

    // Device breakdown
    const byDevice: Map<string, TrackingEvent[]> = new Map();
    for (const e of events) {
      const key = e.device || 'unknown';
      if (!byDevice.has(key)) byDevice.set(key, []);
      byDevice.get(key)!.push(e);
    }
    breakdowns.push({
      dimension: 'device',
      data: Array.from(byDevice.entries()).map(([key, evts]) => ({
        key,
        metrics: this.computeMetricsFromEvents(evts),
      })),
    });

    return breakdowns;
  }

  private computeAttribution(events: TrackingEvent[]): AttributionData {
    const conversions = events.filter(e => e.type === 'conversion');
    return {
      model: 'last_click',
      touchpoints: [
        { channel: 'direct', conversions: Math.floor(conversions.length * 0.4), revenue: 0 },
        { channel: 'social', conversions: Math.floor(conversions.length * 0.3), revenue: 0 },
        { channel: 'display', conversions: Math.floor(conversions.length * 0.2), revenue: 0 },
        { channel: 'video', conversions: Math.floor(conversions.length * 0.1), revenue: 0 },
      ],
      assistedConversions: Math.floor(conversions.length * 0.3),
    };
  }

  // --------------------------------------------------------------------------
  // Real-time Stats
  // --------------------------------------------------------------------------

  getRealtimeStats(campaignId: string): { impressions: number; clicks: number; spend: number; ctr: number } {
    const counter = this.realtimeCounters.get(campaignId) || { impressions: 0, clicks: 0, spend: 0 };
    return {
      ...counter,
      ctr: counter.impressions > 0 ? (counter.clicks / counter.impressions) * 100 : 0,
    };
  }

  // --------------------------------------------------------------------------
  // Helpers
  // --------------------------------------------------------------------------

  private getEmptyMetrics(): CampaignMetrics {
    return { impressions: 0, clicks: 0, ctr: 0, conversions: 0, conversionRate: 0, spend: 0, cpm: 0, cpc: 0, cpa: 0, roas: 0, reach: 0, frequency: 0 };
  }

  getReport(id: string): AnalyticsReport | undefined { return this.reports.get(id); }

  // Trim old events to prevent memory bloat
  pruneOldEvents(maxAgeDays: number = 30): void {
    const cutoff = Date.now() - maxAgeDays * 86400000;
    this.events = this.events.filter(e => e.timestamp > cutoff);
  }
}

export const analyticsService = new AnalyticsService();
export default AnalyticsService;
