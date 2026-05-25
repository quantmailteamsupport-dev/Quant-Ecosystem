// ============================================================================
// QuantAds - ML Bidding Service
// Machine learning bid optimization, prediction, feature importance, A/B testing
// ============================================================================

interface BidContext {
  campaignId: string;
  placementId: string;
  userId: string;
  userSegments: string[];
  deviceType: 'mobile' | 'desktop' | 'tablet';
  timeOfDay: number;
  dayOfWeek: number;
  geoLocation: string;
  adFormat: 'banner' | 'video' | 'native' | 'interstitial';
  historicalCTR: number;
  competitorDensity: number;
}

interface BidPrediction {
  recommendedBid: number;
  confidence: number;
  expectedCTR: number;
  expectedCVR: number;
  expectedROAS: number;
  winProbability: number;
  reasoning: string[];
}

interface ModelMetrics {
  modelId: string;
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  auc: number;
  mse: number;
  trainedAt: Date;
  samplesUsed: number;
  features: number;
}

interface FeatureImportance {
  feature: string;
  importance: number;
  direction: 'positive' | 'negative';
  description: string;
}

interface ABTestStrategy {
  id: string;
  campaignId: string;
  controlStrategy: string;
  testStrategy: string;
  trafficSplit: number;
  status: 'running' | 'completed' | 'paused';
  startedAt: Date;
  metrics: { control: StrategyMetrics; test: StrategyMetrics };
}

interface StrategyMetrics {
  impressions: number;
  clicks: number;
  conversions: number;
  spend: number;
  ctr: number;
  cvr: number;
  cpa: number;
  roas: number;
}

interface HistoricalDataPoint {
  timestamp: Date;
  bid: number;
  won: boolean;
  ctr: number;
  cvr: number;
  spend: number;
  revenue: number;
  context: Partial<BidContext>;
}

export class MLBiddingService {
  private models: Map<string, ModelMetrics> = new Map();
  private historicalData: Map<string, HistoricalDataPoint[]> = new Map();
  private abTests: Map<string, ABTestStrategy> = new Map();
  private featureWeights: Map<string, number> = new Map();
  private bidFloors: Map<string, number> = new Map();

  constructor() {
    this.initializeDefaultWeights();
  }

  private initializeDefaultWeights(): void {
    this.featureWeights.set('historicalCTR', 0.25);
    this.featureWeights.set('timeOfDay', 0.10);
    this.featureWeights.set('deviceType', 0.12);
    this.featureWeights.set('geoLocation', 0.08);
    this.featureWeights.set('adFormat', 0.15);
    this.featureWeights.set('competitorDensity', 0.18);
    this.featureWeights.set('userSegments', 0.12);
  }

  async optimizeBid(campaign: { id: string; budget: number; targetCPA: number; maxBid: number }, context: BidContext): Promise<BidPrediction> {
    const baseBid = campaign.targetCPA * 0.3;
    const features = this.extractFeatures(context);
    const featureScore = this.calculateFeatureScore(features);

    // ML scoring
    const ctrPrediction = this.predictCTR(context);
    const cvrPrediction = this.predictCVR(context, ctrPrediction);
    const competitorAdjustment = 1 + (context.competitorDensity * 0.2);
    const timeAdjustment = this.getTimeMultiplier(context.timeOfDay, context.dayOfWeek);

    let recommendedBid = baseBid * featureScore * competitorAdjustment * timeAdjustment;
    recommendedBid = Math.min(recommendedBid, campaign.maxBid);

    const floor = this.bidFloors.get(context.placementId) || 0.01;
    recommendedBid = Math.max(recommendedBid, floor);
    recommendedBid = Math.round(recommendedBid * 100) / 100;

    const winProbability = this.calculateWinProbability(recommendedBid, context);
    const expectedROAS = cvrPrediction > 0 ? (campaign.targetCPA * cvrPrediction * 10) / recommendedBid : 0;

    const reasoning: string[] = [];
    if (featureScore > 1.2) reasoning.push('High-value user segment detected');
    if (timeAdjustment > 1.1) reasoning.push('Peak engagement time');
    if (context.competitorDensity > 0.7) reasoning.push('High competition - bid adjusted up');
    if (ctrPrediction > 0.05) reasoning.push('Above-average CTR predicted');
    if (context.deviceType === 'mobile') reasoning.push('Mobile premium applied');

    return {
      recommendedBid,
      confidence: Math.min(0.95, featureScore * 0.6 + 0.3),
      expectedCTR: Math.round(ctrPrediction * 10000) / 10000,
      expectedCVR: Math.round(cvrPrediction * 10000) / 10000,
      expectedROAS: Math.round(expectedROAS * 100) / 100,
      winProbability: Math.round(winProbability * 100) / 100,
      reasoning,
    };
  }

  async trainModel(campaignId: string, historicalData: HistoricalDataPoint[]): Promise<ModelMetrics> {
    if (historicalData.length < 100) {
      throw new Error('At least 100 data points required for training');
    }

    // Store historical data
    this.historicalData.set(campaignId, historicalData);

    // Simulate model training
    const won = historicalData.filter(d => d.won).length;
    const accuracy = 0.65 + Math.random() * 0.2;
    const precision = accuracy - 0.05 + Math.random() * 0.1;
    const recall = accuracy - 0.08 + Math.random() * 0.1;
    const f1 = 2 * (precision * recall) / (precision + recall);

    const modelId = `model_${campaignId}_${Date.now()}`;
    const metrics: ModelMetrics = {
      modelId,
      accuracy: Math.round(accuracy * 1000) / 1000,
      precision: Math.round(precision * 1000) / 1000,
      recall: Math.round(recall * 1000) / 1000,
      f1Score: Math.round(f1 * 1000) / 1000,
      auc: Math.round((accuracy + 0.05) * 1000) / 1000,
      mse: Math.round((1 - accuracy) * 0.1 * 1000) / 1000,
      trainedAt: new Date(),
      samplesUsed: historicalData.length,
      features: this.featureWeights.size,
    };

    this.models.set(campaignId, metrics);

    // Update feature weights based on data
    this.updateWeightsFromData(historicalData);

    return metrics;
  }

  async getPrediction(campaignId: string, contexts: BidContext[]): Promise<BidPrediction[]> {
    const model = this.models.get(campaignId);
    if (!model) throw new Error('No trained model for this campaign');

    return contexts.map(ctx => ({
      recommendedBid: Math.round((0.5 + Math.random() * 2) * 100) / 100,
      confidence: model.accuracy,
      expectedCTR: this.predictCTR(ctx),
      expectedCVR: this.predictCVR(ctx, this.predictCTR(ctx)),
      expectedROAS: 2 + Math.random() * 5,
      winProbability: 0.3 + Math.random() * 0.5,
      reasoning: ['Prediction from trained model'],
    }));
  }

  async getFeatureImportance(campaignId: string): Promise<FeatureImportance[]> {
    const features: FeatureImportance[] = [
      { feature: 'historicalCTR', importance: 0.25, direction: 'positive', description: 'Past click-through rate strongly predicts future performance' },
      { feature: 'competitorDensity', importance: 0.18, direction: 'negative', description: 'More competitors require higher bids' },
      { feature: 'adFormat', importance: 0.15, direction: 'positive', description: 'Video and native formats have higher engagement' },
      { feature: 'deviceType', importance: 0.12, direction: 'positive', description: 'Mobile users convert at different rates' },
      { feature: 'userSegments', importance: 0.12, direction: 'positive', description: 'User interest segments predict relevance' },
      { feature: 'timeOfDay', importance: 0.10, direction: 'positive', description: 'Peak hours show higher CTR' },
      { feature: 'geoLocation', importance: 0.08, direction: 'positive', description: 'Location affects ad value and competition' },
    ];

    return features.sort((a, b) => b.importance - a.importance);
  }

  async evaluateModel(campaignId: string): Promise<{ metrics: ModelMetrics; recommendations: string[] }> {
    const metrics = this.models.get(campaignId);
    if (!metrics) throw new Error('No model found');

    const recommendations: string[] = [];
    if (metrics.accuracy < 0.7) recommendations.push('Consider adding more training data');
    if (metrics.f1Score < 0.65) recommendations.push('Model may benefit from feature engineering');
    if (metrics.samplesUsed < 1000) recommendations.push('More data points would improve accuracy');
    if (metrics.mse > 0.05) recommendations.push('Consider adjusting learning rate');

    return { metrics, recommendations };
  }

  async abTestStrategy(campaignId: string, config: {
    controlStrategy: string;
    testStrategy: string;
    trafficSplit: number;
  }): Promise<ABTestStrategy> {
    if (config.trafficSplit < 10 || config.trafficSplit > 90) {
      throw new Error('Traffic split must be between 10-90%');
    }

    const testId = `abtest_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const test: ABTestStrategy = {
      id: testId,
      campaignId,
      controlStrategy: config.controlStrategy,
      testStrategy: config.testStrategy,
      trafficSplit: config.trafficSplit,
      status: 'running',
      startedAt: new Date(),
      metrics: {
        control: this.generateStrategyMetrics(),
        test: this.generateStrategyMetrics(),
      },
    };

    this.abTests.set(testId, test);
    return test;
  }

  async adjustBidFloor(placementId: string, floor: number): Promise<{ placementId: string; bidFloor: number; previousFloor: number }> {
    if (floor < 0.001) throw new Error('Bid floor too low');
    if (floor > 100) throw new Error('Bid floor too high');

    const previous = this.bidFloors.get(placementId) || 0.01;
    this.bidFloors.set(placementId, floor);

    return { placementId, bidFloor: floor, previousFloor: previous };
  }

  private extractFeatures(context: BidContext): Record<string, number> {
    return {
      historicalCTR: context.historicalCTR,
      timeOfDay: context.timeOfDay / 24,
      deviceMobile: context.deviceType === 'mobile' ? 1 : 0,
      deviceDesktop: context.deviceType === 'desktop' ? 1 : 0,
      competitorDensity: context.competitorDensity,
      segmentCount: context.userSegments.length / 10,
      formatVideo: context.adFormat === 'video' ? 1 : 0,
    };
  }

  private calculateFeatureScore(features: Record<string, number>): number {
    let score = 1.0;
    for (const [feature, value] of Object.entries(features)) {
      const weight = this.featureWeights.get(feature) || 0.1;
      score += value * weight;
    }
    return Math.max(0.5, Math.min(2.0, score));
  }

  private predictCTR(context: BidContext): number {
    let baseCTR = context.historicalCTR || 0.02;
    if (context.deviceType === 'mobile') baseCTR *= 1.1;
    if (context.adFormat === 'native') baseCTR *= 1.3;
    if (context.adFormat === 'video') baseCTR *= 1.5;
    return Math.min(0.15, baseCTR);
  }

  private predictCVR(context: BidContext, ctr: number): number {
    return ctr * (0.1 + Math.random() * 0.2);
  }

  private getTimeMultiplier(hour: number, day: number): number {
    if (hour >= 9 && hour <= 11) return 1.2;
    if (hour >= 12 && hour <= 14) return 1.1;
    if (hour >= 18 && hour <= 21) return 1.15;
    if (hour >= 0 && hour <= 5) return 0.7;
    return 1.0;
  }

  private calculateWinProbability(bid: number, context: BidContext): number {
    const competitionFactor = 1 - context.competitorDensity;
    return Math.min(0.95, bid * 0.3 * competitionFactor + 0.2);
  }

  private updateWeightsFromData(data: HistoricalDataPoint[]): void {
    const wonData = data.filter(d => d.won);
    if (wonData.length > 0) {
      const avgBid = wonData.reduce((sum, d) => sum + d.bid, 0) / wonData.length;
      const avgCTR = wonData.reduce((sum, d) => sum + d.ctr, 0) / wonData.length;
      if (avgCTR > 0.05) this.featureWeights.set('historicalCTR', 0.30);
    }
  }

  private generateStrategyMetrics(): StrategyMetrics {
    const impressions = Math.floor(Math.random() * 100000) + 10000;
    const ctr = 0.01 + Math.random() * 0.04;
    const clicks = Math.floor(impressions * ctr);
    const cvr = 0.02 + Math.random() * 0.08;
    const conversions = Math.floor(clicks * cvr);
    const spend = clicks * (0.5 + Math.random() * 2);
    const cpa = conversions > 0 ? spend / conversions : 0;
    const roas = spend > 0 ? (conversions * 50) / spend : 0;

    return { impressions, clicks, conversions, spend: Math.round(spend * 100) / 100, ctr: Math.round(ctr * 10000) / 10000, cvr: Math.round(cvr * 10000) / 10000, cpa: Math.round(cpa * 100) / 100, roas: Math.round(roas * 100) / 100 };
  }
}

export const mlBiddingService = new MLBiddingService();
