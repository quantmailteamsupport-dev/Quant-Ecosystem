// ============================================================================
// QuantAds - Competitive Analysis Service
// Competitor tracking, spend estimation, share of voice, benchmarks
// ============================================================================

interface Competitor {
  id: string;
  name: string;
  domain: string;
  industry: string;
  estimatedSpend: number;
  adCount: number;
  platforms: string[];
  lastSeen: Date;
  trackedSince: Date;
}

interface ShareOfVoice {
  userId: string;
  industry: string;
  userShare: number;
  competitors: Array<{ name: string; share: number; trend: 'up' | 'down' | 'stable' }>;
  totalMarketSpend: number;
  period: string;
}

interface CompetitiveBenchmark {
  metric: string;
  userValue: number;
  industryAvg: number;
  industryMedian: number;
  top25: number;
  percentile: number;
  verdict: 'above_average' | 'average' | 'below_average';
}

interface CreativeIntel {
  competitorId: string;
  competitorName: string;
  ads: CompetitorAd[];
  totalAdsDetected: number;
  topFormats: Array<{ format: string; count: number }>;
  commonThemes: string[];
}

interface CompetitorAd {
  id: string;
  format: 'image' | 'video' | 'text' | 'carousel';
  headline: string;
  platform: string;
  firstSeen: Date;
  lastSeen: Date;
  estimatedImpressions: number;
}

interface CompetitiveAlert {
  id: string;
  type: 'new_competitor' | 'spend_increase' | 'new_creative' | 'market_shift';
  message: string;
  severity: 'low' | 'medium' | 'high';
  competitorId: string | null;
  data: Record<string, any>;
  createdAt: Date;
  read: boolean;
}

interface TrendAnalysis {
  period: string;
  marketTrend: 'growing' | 'declining' | 'stable';
  spendTrend: Array<{ date: string; yourSpend: number; competitorAvg: number }>;
  emergingCompetitors: string[];
  decliningCompetitors: string[];
  recommendations: string[];
}

export class CompetitiveAnalysis {
  private competitors: Map<string, Competitor> = new Map();
  private userCompetitorIndex: Map<string, string[]> = new Map();
  private alerts: Map<string, CompetitiveAlert[]> = new Map();
  private competitorAds: Map<string, CompetitorAd[]> = new Map();
  private industryBenchmarks: Map<string, Record<string, number>> = new Map();

  async trackCompetitors(userId: string, competitorDomains: string[]): Promise<Competitor[]> {
    if (competitorDomains.length === 0) throw new Error('At least one competitor domain required');
    if (competitorDomains.length > 20) throw new Error('Maximum 20 competitors can be tracked');

    const tracked: Competitor[] = [];
    const userComps = this.userCompetitorIndex.get(userId) || [];

    for (const domain of competitorDomains) {
      // Check if already tracked
      let existing: Competitor | null = null;
      for (const id of userComps) {
        const comp = this.competitors.get(id);
        if (comp && comp.domain === domain) { existing = comp; break; }
      }

      if (existing) { tracked.push(existing); continue; }

      const compId = `comp_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      const competitor: Competitor = {
        id: compId,
        name: this.domainToName(domain),
        domain,
        industry: 'technology',
        estimatedSpend: Math.floor(Math.random() * 500000) + 10000,
        adCount: Math.floor(Math.random() * 100) + 5,
        platforms: this.randomPlatforms(),
        lastSeen: new Date(),
        trackedSince: new Date(),
      };

      this.competitors.set(compId, competitor);
      userComps.push(compId);
      tracked.push(competitor);

      // Generate initial ads
      this.generateCompetitorAds(compId);
    }

    this.userCompetitorIndex.set(userId, userComps);
    return tracked;
  }

  async estimateSpend(competitorId: string): Promise<{ monthly: number; quarterly: number; annual: number; trend: string; confidence: number }> {
    const competitor = this.competitors.get(competitorId);
    if (!competitor) throw new Error('Competitor not found');

    const monthly = competitor.estimatedSpend;
    const quarterly = monthly * 3 * (0.9 + Math.random() * 0.2);
    const annual = monthly * 12 * (0.85 + Math.random() * 0.3);
    const trendOptions = ['increasing 15% MoM', 'stable', 'decreasing 5% MoM', 'aggressive expansion'];
    const trend = trendOptions[Math.floor(Math.random() * trendOptions.length)];

    return {
      monthly: Math.round(monthly),
      quarterly: Math.round(quarterly),
      annual: Math.round(annual),
      trend,
      confidence: 0.6 + Math.random() * 0.3,
    };
  }

  async getShareOfVoice(userId: string, industry?: string): Promise<ShareOfVoice> {
    const compIds = this.userCompetitorIndex.get(userId) || [];
    const competitors = compIds
      .map(id => this.competitors.get(id))
      .filter((c): c is Competitor => c !== undefined);

    const totalCompSpend = competitors.reduce((sum, c) => sum + c.estimatedSpend, 0);
    const userSpend = totalCompSpend * (0.1 + Math.random() * 0.3);
    const totalMarket = totalCompSpend + userSpend;

    const userShare = totalMarket > 0 ? (userSpend / totalMarket) * 100 : 0;
    const compShares = competitors.map(c => ({
      name: c.name,
      share: totalMarket > 0 ? (c.estimatedSpend / totalMarket) * 100 : 0,
      trend: (['up', 'down', 'stable'] as const)[Math.floor(Math.random() * 3)],
    }));

    return {
      userId,
      industry: industry || 'technology',
      userShare: Math.round(userShare * 10) / 10,
      competitors: compShares.map(c => ({ ...c, share: Math.round(c.share * 10) / 10 })),
      totalMarketSpend: Math.round(totalMarket),
      period: new Date().toISOString().substring(0, 7),
    };
  }

  async getBenchmarks(userId: string, userMetrics: Record<string, number>): Promise<CompetitiveBenchmark[]> {
    const benchmarks: CompetitiveBenchmark[] = [];
    const industryData: Record<string, { avg: number; median: number; top25: number }> = {
      ctr: { avg: 0.025, median: 0.02, top25: 0.04 },
      cpc: { avg: 1.50, median: 1.20, top25: 0.80 },
      cpa: { avg: 45, median: 38, top25: 25 },
      roas: { avg: 3.5, median: 3.0, top25: 5.0 },
      cvr: { avg: 0.035, median: 0.03, top25: 0.055 },
    };

    for (const [metric, data] of Object.entries(industryData)) {
      const userValue = userMetrics[metric] || 0;
      let percentile: number;
      let verdict: 'above_average' | 'average' | 'below_average';

      if (metric === 'cpc' || metric === 'cpa') {
        percentile = userValue <= data.top25 ? 90 : userValue <= data.median ? 60 : userValue <= data.avg ? 40 : 20;
        verdict = userValue <= data.median ? 'above_average' : userValue <= data.avg * 1.2 ? 'average' : 'below_average';
      } else {
        percentile = userValue >= data.top25 ? 90 : userValue >= data.median ? 60 : userValue >= data.avg * 0.8 ? 40 : 20;
        verdict = userValue >= data.median ? 'above_average' : userValue >= data.avg * 0.8 ? 'average' : 'below_average';
      }

      benchmarks.push({
        metric,
        userValue,
        industryAvg: data.avg,
        industryMedian: data.median,
        top25: data.top25,
        percentile,
        verdict,
      });
    }

    return benchmarks;
  }

  async getAlerts(userId: string, unreadOnly?: boolean): Promise<CompetitiveAlert[]> {
    let alerts = this.alerts.get(userId) || [];
    if (unreadOnly) alerts = alerts.filter(a => !a.read);
    return alerts.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getCreativeIntel(competitorId: string): Promise<CreativeIntel> {
    const competitor = this.competitors.get(competitorId);
    if (!competitor) throw new Error('Competitor not found');

    const ads = this.competitorAds.get(competitorId) || [];
    const formatCounts = new Map<string, number>();
    for (const ad of ads) {
      formatCounts.set(ad.format, (formatCounts.get(ad.format) || 0) + 1);
    }

    return {
      competitorId,
      competitorName: competitor.name,
      ads: ads.slice(0, 20),
      totalAdsDetected: ads.length,
      topFormats: Array.from(formatCounts.entries())
        .map(([format, count]) => ({ format, count }))
        .sort((a, b) => b.count - a.count),
      commonThemes: ['Product features', 'Pricing', 'Free trial', 'Social proof', 'Urgency'],
    };
  }

  async comparePerformance(userId: string, competitorId: string, userMetrics: Record<string, number>): Promise<{
    comparison: Array<{ metric: string; you: number; competitor: number; difference: number; winner: string }>;
    overallScore: number;
  }> {
    const competitor = this.competitors.get(competitorId);
    if (!competitor) throw new Error('Competitor not found');

    const comparison = [
      { metric: 'estimatedCTR', you: userMetrics.ctr || 0.02, competitor: 0.01 + Math.random() * 0.04 },
      { metric: 'estimatedCPC', you: userMetrics.cpc || 1.5, competitor: 0.8 + Math.random() * 2 },
      { metric: 'adCount', you: userMetrics.adCount || 10, competitor: competitor.adCount },
      { metric: 'platforms', you: userMetrics.platforms || 2, competitor: competitor.platforms.length },
    ].map(item => ({
      metric: item.metric,
      you: Math.round(item.you * 1000) / 1000,
      competitor: Math.round(item.competitor * 1000) / 1000,
      difference: Math.round((item.you - item.competitor) * 1000) / 1000,
      winner: item.you > item.competitor ? 'you' : item.you < item.competitor ? 'competitor' : 'tie',
    }));

    const wins = comparison.filter(c => c.winner === 'you').length;
    const overallScore = Math.round((wins / comparison.length) * 100);

    return { comparison, overallScore };
  }

  async getTrendAnalysis(userId: string, days: number = 30): Promise<TrendAnalysis> {
    const compIds = this.userCompetitorIndex.get(userId) || [];
    const spendTrend: Array<{ date: string; yourSpend: number; competitorAvg: number }> = [];

    for (let i = days; i >= 0; i -= 7) {
      const date = new Date(Date.now() - i * 86400000).toISOString().split('T')[0];
      spendTrend.push({
        date,
        yourSpend: Math.floor(1000 + Math.random() * 5000),
        competitorAvg: Math.floor(2000 + Math.random() * 8000),
      });
    }

    return {
      period: `Last ${days} days`,
      marketTrend: 'growing',
      spendTrend,
      emergingCompetitors: ['NewStartup.io', 'DisruptTech.com'],
      decliningCompetitors: ['OldPlayer.net'],
      recommendations: [
        'Increase spend in high-performing segments',
        'Monitor emerging competitor creative strategies',
        'Consider expanding to platforms where competitors are absent',
      ],
    };
  }

  private domainToName(domain: string): string {
    return domain.split('.')[0].charAt(0).toUpperCase() + domain.split('.')[0].slice(1);
  }

  private randomPlatforms(): string[] {
    const all = ['Google Ads', 'Meta Ads', 'LinkedIn', 'Twitter', 'TikTok', 'Display Network'];
    const count = 2 + Math.floor(Math.random() * 3);
    return all.sort(() => Math.random() - 0.5).slice(0, count);
  }

  private generateCompetitorAds(competitorId: string): void {
    const ads: CompetitorAd[] = [];
    const formats: CompetitorAd['format'][] = ['image', 'video', 'text', 'carousel'];
    const count = 5 + Math.floor(Math.random() * 15);

    for (let i = 0; i < count; i++) {
      ads.push({
        id: `cad_${i}_${Date.now()}`,
        format: formats[Math.floor(Math.random() * formats.length)],
        headline: `Competitor Ad Headline ${i + 1}`,
        platform: this.randomPlatforms()[0],
        firstSeen: new Date(Date.now() - Math.floor(Math.random() * 30 * 86400000)),
        lastSeen: new Date(),
        estimatedImpressions: Math.floor(Math.random() * 100000) + 1000,
      });
    }

    this.competitorAds.set(competitorId, ads);
  }
}

export const competitiveAnalysis = new CompetitiveAnalysis();
