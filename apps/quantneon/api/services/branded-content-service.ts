// ============================================================================
// QuantNeon - Branded Content Service
// Partner labels, brand approvals, ad creation, performance tracking
// ============================================================================

interface BrandPartnership {
  id: string;
  postId: string;
  creatorId: string;
  partnerId: string;
  partnerName: string;
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  disclosure: DisclosureInfo;
  performance?: BrandPerformance;
  createdAt: string;
  approvedAt?: string;
  expiresAt: string;
}

interface DisclosureInfo {
  type: 'paid_partnership' | 'gifted' | 'affiliate' | 'sponsored';
  labelText: string;
  position: 'top' | 'bottom' | 'overlay';
  visible: boolean;
  requiredByLaw: boolean;
}

interface BrandPerformance {
  impressions: number;
  reach: number;
  engagement: number;
  clicks: number;
  conversions: number;
  ctr: number;
  costPerEngagement: number;
  roi: number;
  sentimentScore: number;
  demographicReach: { ageRange: string; percentage: number }[];
}

interface BrandAd {
  id: string;
  postId: string;
  partnerId: string;
  budget: number;
  spent: number;
  targetAudience: { ageMin: number; ageMax: number; interests: string[]; locations: string[] };
  status: 'draft' | 'active' | 'paused' | 'completed';
  startDate: string;
  endDate: string;
  performance: BrandPerformance;
}

interface PartnerProfile {
  id: string;
  name: string;
  category: string;
  website: string;
  verified: boolean;
  partnershipCount: number;
  avgPerformance: number;
  rating: number;
}

interface BrandReport {
  partnerId: string;
  period: string;
  totalCampaigns: number;
  totalSpend: number;
  totalImpressions: number;
  totalEngagement: number;
  avgRoi: number;
  topPerforming: { postId: string; engagement: number }[];
  recommendations: string[];
}

class BrandedContentService {
  private partnerships: Map<string, BrandPartnership> = new Map();
  private ads: Map<string, BrandAd> = new Map();
  private partners: Map<string, PartnerProfile> = new Map();
  private postPartners: Map<string, string> = new Map();
  private counter: number = 0;

  private genId(prefix: string): string {
    return `${prefix}_${Date.now().toString(36)}_${(++this.counter).toString(36)}`;
  }

  async addPartnerLabel(postId: string, partnerId: string, creatorId: string, options?: { disclosureType?: DisclosureInfo['type'] }): Promise<BrandPartnership> {
    const existing = this.postPartners.get(postId);
    if (existing) throw new Error('Post already has a partner label');

    const partnership: BrandPartnership = {
      id: this.genId('bp'),
      postId,
      creatorId,
      partnerId,
      partnerName: `Partner ${partnerId.substring(0, 8)}`,
      status: 'pending',
      disclosure: {
        type: options?.disclosureType || 'paid_partnership',
        labelText: 'Paid partnership',
        position: 'top',
        visible: true,
        requiredByLaw: true,
      },
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 90 * 86400000).toISOString(),
    };

    this.partnerships.set(partnership.id, partnership);
    this.postPartners.set(postId, partnership.id);
    return partnership;
  }

  async requestApproval(partnershipId: string): Promise<BrandPartnership> {
    const partnership = this.partnerships.get(partnershipId);
    if (!partnership) throw new Error('Partnership not found');
    if (partnership.status !== 'pending') throw new Error('Partnership is not pending');

    // Auto-approve for simulation
    partnership.status = 'approved';
    partnership.approvedAt = new Date().toISOString();
    return partnership;
  }

  async createAd(postId: string, partnerId: string, config: { budget: number; targetAudience: BrandAd['targetAudience']; durationDays: number }): Promise<BrandAd> {
    if (config.budget < 50) throw new Error('Minimum budget is $50');
    if (config.budget > 100000) throw new Error('Maximum budget is $100,000');

    const ad: BrandAd = {
      id: this.genId('ad'),
      postId,
      partnerId,
      budget: config.budget,
      spent: 0,
      targetAudience: config.targetAudience,
      status: 'draft',
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + config.durationDays * 86400000).toISOString(),
      performance: {
        impressions: 0, reach: 0, engagement: 0, clicks: 0,
        conversions: 0, ctr: 0, costPerEngagement: 0, roi: 0,
        sentimentScore: 0, demographicReach: [],
      },
    };

    this.ads.set(ad.id, ad);
    return ad;
  }

  async getDisclosure(postId: string): Promise<DisclosureInfo | null> {
    const partnershipId = this.postPartners.get(postId);
    if (!partnershipId) return null;
    const partnership = this.partnerships.get(partnershipId);
    return partnership?.disclosure || null;
  }

  async trackPerformance(partnershipId: string): Promise<BrandPerformance> {
    const partnership = this.partnerships.get(partnershipId);
    if (!partnership) throw new Error('Partnership not found');

    const impressions = 5000 + Math.floor(Math.random() * 100000);
    const reach = Math.floor(impressions * (0.6 + Math.random() * 0.3));
    const engagement = Math.floor(reach * (0.03 + Math.random() * 0.07));
    const clicks = Math.floor(engagement * (0.1 + Math.random() * 0.3));
    const conversions = Math.floor(clicks * (0.02 + Math.random() * 0.08));

    const performance: BrandPerformance = {
      impressions, reach, engagement, clicks, conversions,
      ctr: Math.round((clicks / impressions) * 10000) / 100,
      costPerEngagement: Math.round((Math.random() * 2 + 0.5) * 100) / 100,
      roi: Math.round((1 + Math.random() * 5) * 100) / 100,
      sentimentScore: Math.round((0.6 + Math.random() * 0.4) * 100) / 100,
      demographicReach: [
        { ageRange: '18-24', percentage: 35 }, { ageRange: '25-34', percentage: 30 },
        { ageRange: '35-44', percentage: 20 }, { ageRange: '45+', percentage: 15 },
      ],
    };

    partnership.performance = performance;
    return performance;
  }

  async searchPartners(query: string, category?: string): Promise<PartnerProfile[]> {
    const results = Array.from(this.partners.values())
      .filter(p => p.name.toLowerCase().includes(query.toLowerCase()) || (category && p.category === category));
    if (results.length === 0) {
      return Array.from({ length: 5 }, (_, i) => ({
        id: this.genId('partner'),
        name: `${query} Brand ${i + 1}`,
        category: category || 'general',
        website: `https://brand${i + 1}.example.com`,
        verified: Math.random() > 0.3,
        partnershipCount: Math.floor(Math.random() * 100),
        avgPerformance: Math.round((60 + Math.random() * 40) * 100) / 100,
        rating: Math.round((3.5 + Math.random() * 1.5) * 10) / 10,
      }));
    }
    return results;
  }

  async getPartnerHistory(partnerId: string): Promise<BrandPartnership[]> {
    return Array.from(this.partnerships.values()).filter(p => p.partnerId === partnerId);
  }

  async generateReport(partnerId: string, period: string = '30d'): Promise<BrandReport> {
    const campaigns = Array.from(this.partnerships.values()).filter(p => p.partnerId === partnerId && p.status === 'approved');
    const totalSpend = campaigns.length * (500 + Math.random() * 5000);
    const totalImpressions = campaigns.reduce((s, c) => s + (c.performance?.impressions || 5000), 0);
    const totalEngagement = campaigns.reduce((s, c) => s + (c.performance?.engagement || 200), 0);

    return {
      partnerId, period,
      totalCampaigns: campaigns.length,
      totalSpend: Math.round(totalSpend * 100) / 100,
      totalImpressions,
      totalEngagement,
      avgRoi: Math.round((2 + Math.random() * 4) * 100) / 100,
      topPerforming: campaigns.slice(0, 5).map(c => ({ postId: c.postId, engagement: c.performance?.engagement || 0 })),
      recommendations: ['Increase video content for better engagement', 'Target 25-34 age group', 'Post during peak hours 10AM-2PM'],
    };
  }
}

export const brandedContentService = new BrandedContentService();
export { BrandedContentService };
