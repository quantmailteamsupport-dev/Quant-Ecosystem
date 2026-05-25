// ============================================================================
// QuantAds - Audience Network Service
// Publisher registration, ad serving, impression tracking, revenue reporting
// ============================================================================

interface Publisher {
  id: string;
  name: string;
  domain: string;
  status: 'pending' | 'approved' | 'rejected' | 'suspended';
  category: string;
  monthlyPageviews: number;
  placements: Placement[];
  floorPrice: number;
  revenueShare: number;
  totalEarnings: number;
  registeredAt: Date;
  approvedAt: Date | null;
}

interface Placement {
  id: string;
  publisherId: string;
  name: string;
  type: 'banner' | 'native' | 'video' | 'interstitial';
  size: { width: number; height: number };
  position: 'header' | 'sidebar' | 'in_content' | 'footer' | 'overlay';
  isActive: boolean;
  fillRate: number;
  avgCPM: number;
  impressions: number;
}

interface AdRequest {
  placementId: string;
  publisherId: string;
  userAgent: string;
  ip: string;
  referrer: string;
  pageUrl: string;
  keywords: string[];
}

interface ServedAd {
  id: string;
  placementId: string;
  campaignId: string;
  creativeId: string;
  bidPrice: number;
  impressionTracked: boolean;
  clickTracked: boolean;
  servedAt: Date;
}

interface ImpressionEvent {
  id: string;
  adId: string;
  placementId: string;
  publisherId: string;
  viewable: boolean;
  duration: number;
  revenue: number;
  timestamp: Date;
}

interface RevenueReport {
  publisherId: string;
  period: string;
  impressions: number;
  clicks: number;
  ctr: number;
  revenue: number;
  ecpm: number;
  fillRate: number;
  viewability: number;
  topPlacements: Array<{ id: string; revenue: number; impressions: number }>;
}

interface InventoryForecast {
  placementId: string;
  nextWeek: { impressions: number; revenue: number };
  nextMonth: { impressions: number; revenue: number };
  trend: 'up' | 'down' | 'stable';
}

export class AudienceNetwork {
  private publishers: Map<string, Publisher> = new Map();
  private placements: Map<string, Placement> = new Map();
  private servedAds: Map<string, ServedAd> = new Map();
  private impressions: Map<string, ImpressionEvent[]> = new Map();
  private publisherRevenue: Map<string, number> = new Map();

  async registerPublisher(config: {
    name: string;
    domain: string;
    category: string;
    monthlyPageviews: number;
    placements: Array<{ name: string; type: Placement['type']; size: { width: number; height: number }; position: Placement['position'] }>;
  }): Promise<Publisher> {
    if (!config.name || !config.domain) throw new Error('Name and domain are required');
    if (config.monthlyPageviews < 10000) throw new Error('Minimum 10,000 monthly pageviews required');

    // Check if domain already registered
    for (const pub of this.publishers.values()) {
      if (pub.domain === config.domain) throw new Error('Domain already registered');
    }

    const publisherId = `pub_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const placementRecords: Placement[] = config.placements.map((p, idx) => ({
      id: `pl_${publisherId}_${idx}`,
      publisherId,
      name: p.name,
      type: p.type,
      size: p.size,
      position: p.position,
      isActive: true,
      fillRate: 0,
      avgCPM: 0,
      impressions: 0,
    }));

    const publisher: Publisher = {
      id: publisherId,
      name: config.name,
      domain: config.domain,
      status: 'pending',
      category: config.category,
      monthlyPageviews: config.monthlyPageviews,
      placements: placementRecords,
      floorPrice: 0.50,
      revenueShare: 0.70, // 70% to publisher
      totalEarnings: 0,
      registeredAt: new Date(),
      approvedAt: null,
    };

    this.publishers.set(publisherId, publisher);
    for (const pl of placementRecords) {
      this.placements.set(pl.id, pl);
    }

    return publisher;
  }

  async serveAd(request: AdRequest): Promise<ServedAd | null> {
    const placement = this.placements.get(request.placementId);
    if (!placement || !placement.isActive) return null;

    const publisher = this.publishers.get(request.publisherId);
    if (!publisher || publisher.status !== 'approved') return null;

    // Simulate auction
    const bidPrice = publisher.floorPrice + Math.random() * 5;
    const adId = `ad_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    const served: ServedAd = {
      id: adId,
      placementId: request.placementId,
      campaignId: `camp_${Math.random().toString(36).substring(2, 8)}`,
      creativeId: `creative_${Math.random().toString(36).substring(2, 8)}`,
      bidPrice: Math.round(bidPrice * 100) / 100,
      impressionTracked: false,
      clickTracked: false,
      servedAt: new Date(),
    };

    this.servedAds.set(adId, served);
    placement.impressions++;

    return served;
  }

  async trackImpression(adId: string, metadata?: { viewable?: boolean; duration?: number }): Promise<ImpressionEvent> {
    const ad = this.servedAds.get(adId);
    if (!ad) throw new Error('Ad not found');
    if (ad.impressionTracked) throw new Error('Impression already tracked');

    ad.impressionTracked = true;
    const placement = this.placements.get(ad.placementId);
    const publisher = placement ? this.publishers.get(placement.publisherId) : null;

    const revenue = ad.bidPrice / 1000; // CPM to per-impression
    const publisherRevenue = revenue * (publisher?.revenueShare || 0.70);

    const event: ImpressionEvent = {
      id: `imp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      adId,
      placementId: ad.placementId,
      publisherId: placement?.publisherId || '',
      viewable: metadata?.viewable ?? true,
      duration: metadata?.duration || 0,
      revenue: Math.round(publisherRevenue * 10000) / 10000,
      timestamp: new Date(),
    };

    const pubId = placement?.publisherId || '';
    const impressionsList = this.impressions.get(pubId) || [];
    impressionsList.push(event);
    this.impressions.set(pubId, impressionsList);

    // Update publisher earnings
    if (publisher) {
      publisher.totalEarnings += publisherRevenue;
      const currentRevenue = this.publisherRevenue.get(pubId) || 0;
      this.publisherRevenue.set(pubId, currentRevenue + publisherRevenue);
    }

    return event;
  }

  async calculateFillRate(publisherId: string): Promise<{ overall: number; byPlacement: Array<{ placementId: string; fillRate: number }> }> {
    const publisher = this.publishers.get(publisherId);
    if (!publisher) throw new Error('Publisher not found');

    const impressionsList = this.impressions.get(publisherId) || [];
    const totalRequests = Math.max(publisher.monthlyPageviews * 0.001, impressionsList.length * 1.3);
    const overall = totalRequests > 0 ? (impressionsList.length / totalRequests) * 100 : 0;

    const byPlacement = publisher.placements.map(pl => {
      const plImpressions = impressionsList.filter(i => i.placementId === pl.id).length;
      const plRequests = Math.max(plImpressions * 1.2, 100);
      return { placementId: pl.id, fillRate: Math.round((plImpressions / plRequests) * 100) };
    });

    return { overall: Math.round(overall), byPlacement };
  }

  async getRevenueReport(publisherId: string, period?: string): Promise<RevenueReport> {
    const publisher = this.publishers.get(publisherId);
    if (!publisher) throw new Error('Publisher not found');

    const impressionsList = this.impressions.get(publisherId) || [];
    const totalRevenue = impressionsList.reduce((sum, i) => sum + i.revenue, 0);
    const viewableImpressions = impressionsList.filter(i => i.viewable).length;
    const clicks = Math.floor(impressionsList.length * 0.015); // 1.5% CTR
    const ctr = impressionsList.length > 0 ? (clicks / impressionsList.length) * 100 : 0;
    const ecpm = impressionsList.length > 0 ? (totalRevenue / impressionsList.length) * 1000 : 0;
    const viewability = impressionsList.length > 0 ? (viewableImpressions / impressionsList.length) * 100 : 0;

    const fillData = await this.calculateFillRate(publisherId);

    const placementRevenue = new Map<string, { revenue: number; impressions: number }>();
    for (const imp of impressionsList) {
      const current = placementRevenue.get(imp.placementId) || { revenue: 0, impressions: 0 };
      current.revenue += imp.revenue;
      current.impressions++;
      placementRevenue.set(imp.placementId, current);
    }

    const topPlacements = Array.from(placementRevenue.entries())
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    return {
      publisherId,
      period: period || new Date().toISOString().substring(0, 7),
      impressions: impressionsList.length,
      clicks,
      ctr: Math.round(ctr * 100) / 100,
      revenue: Math.round(totalRevenue * 100) / 100,
      ecpm: Math.round(ecpm * 100) / 100,
      fillRate: fillData.overall,
      viewability: Math.round(viewability),
      topPlacements,
    };
  }

  async qualifyPublisher(publisherId: string, approve: boolean): Promise<Publisher> {
    const publisher = this.publishers.get(publisherId);
    if (!publisher) throw new Error('Publisher not found');

    publisher.status = approve ? 'approved' : 'rejected';
    if (approve) publisher.approvedAt = new Date();

    return publisher;
  }

  async setFloorPrice(publisherId: string, floorPrice: number): Promise<Publisher> {
    const publisher = this.publishers.get(publisherId);
    if (!publisher) throw new Error('Publisher not found');
    if (floorPrice < 0.01) throw new Error('Floor price too low');
    if (floorPrice > 100) throw new Error('Floor price too high');

    publisher.floorPrice = Math.round(floorPrice * 100) / 100;
    return publisher;
  }

  async getInventory(publisherId: string): Promise<{ placements: Placement[]; forecast: InventoryForecast[] }> {
    const publisher = this.publishers.get(publisherId);
    if (!publisher) throw new Error('Publisher not found');

    const forecast: InventoryForecast[] = publisher.placements.map(pl => ({
      placementId: pl.id,
      nextWeek: {
        impressions: Math.floor(publisher.monthlyPageviews / 4 * (0.8 + Math.random() * 0.4)),
        revenue: Math.round(pl.avgCPM * (publisher.monthlyPageviews / 4000) * 100) / 100,
      },
      nextMonth: {
        impressions: Math.floor(publisher.monthlyPageviews * (0.9 + Math.random() * 0.2)),
        revenue: Math.round(pl.avgCPM * (publisher.monthlyPageviews / 1000) * 100) / 100,
      },
      trend: Math.random() > 0.5 ? 'up' : Math.random() > 0.3 ? 'stable' : 'down',
    }));

    return { placements: publisher.placements, forecast };
  }
}

export const audienceNetwork = new AudienceNetwork();
