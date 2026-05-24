// ============================================================================
// QuantAds - Auction Service
// Real-time ad auction engine with second-price auction
// ============================================================================

import type { BidRequest, BidResponse, AuctionResult, Campaign, Placement, UserAdProfile } from '../../src/types';

interface AuctionConfig {
  maxLatencyMs: number;
  minBidders: number;
  floorPriceMultiplier: number;
  qualityScoreWeight: number;
}

interface ActiveBidder {
  campaignId: string;
  creativeId: string;
  maxBid: number;
  bidModel: string;
  qualityScore: number;
  relevanceScore: number;
}

class AuctionService {
  private config: AuctionConfig = {
    maxLatencyMs: 100, // 100ms max for RTB
    minBidders: 2,
    floorPriceMultiplier: 1.0,
    qualityScoreWeight: 0.3,
  };

  private activeCampaigns: Map<string, Campaign> = new Map();
  private auctionHistory: AuctionResult[] = [];
  private totalAuctions: number = 0;
  private totalRevenue: number = 0;

  // --------------------------------------------------------------------------
  // Real-Time Bidding Auction
  // --------------------------------------------------------------------------

  async runAuction(request: BidRequest): Promise<AuctionResult | null> {
    const startTime = Date.now();
    this.totalAuctions++;

    // 1. Find eligible campaigns
    const eligibleBidders = this.findEligibleBidders(request);

    if (eligibleBidders.length < this.config.minBidders) {
      // Fallback: still run if at least 1 bidder
      if (eligibleBidders.length === 0) return null;
    }

    // 2. Calculate effective bids (bid * quality score)
    const scoredBids = eligibleBidders.map(bidder => ({
      ...bidder,
      effectiveBid: this.calculateEffectiveBid(bidder, request),
    }));

    // 3. Sort by effective bid (descending)
    scoredBids.sort((a, b) => b.effectiveBid - a.effectiveBid);

    // 4. Apply floor price
    const floorPrice = request.floorPrice * this.config.floorPriceMultiplier;
    const validBids = scoredBids.filter(b => b.effectiveBid >= floorPrice);

    if (validBids.length === 0) return null;

    // 5. Second-price auction: winner pays second highest price + $0.01
    const winner = validBids[0];
    const secondPrice = validBids.length > 1
      ? validBids[1].effectiveBid
      : floorPrice;

    const clearingPrice = Math.max(secondPrice + 0.01, floorPrice);
    const latencyMs = Date.now() - startTime;

    const result: AuctionResult = {
      winnerId: winner.campaignId,
      winningBid: winner.effectiveBid,
      secondPrice,
      clearingPrice,
      participants: eligibleBidders.length,
      latencyMs,
    };

    this.auctionHistory.push(result);
    this.totalRevenue += clearingPrice / 1000; // CPM to per-impression

    // Keep only last 10000 auctions in memory
    if (this.auctionHistory.length > 10000) {
      this.auctionHistory = this.auctionHistory.slice(-10000);
    }

    return result;
  }

  // --------------------------------------------------------------------------
  // Bidder Selection
  // --------------------------------------------------------------------------

  private findEligibleBidders(request: BidRequest): ActiveBidder[] {
    const bidders: ActiveBidder[] = [];

    for (const [, campaign] of this.activeCampaigns) {
      if (campaign.status !== 'active') continue;
      if (campaign.budget.remaining <= 0) continue;

      // Check targeting match
      const relevanceScore = this.calculateRelevanceScore(campaign, request.userProfile);
      if (relevanceScore < 0.1) continue; // Too low relevance

      // Check placement compatibility
      const placementMatch = campaign.placements.some(
        p => p.app === request.placement.app && p.position === request.placement.position
      );
      if (!placementMatch && campaign.placements.length > 0) continue;

      // Check schedule
      if (!this.isWithinSchedule(campaign)) continue;

      // Get bid amount
      const maxBid = campaign.budget.bidAmount || this.calculateAutoBid(campaign);
      const qualityScore = campaign.creatives.length > 0
        ? campaign.creatives[0].performance.qualityScore
        : 0.5;

      bidders.push({
        campaignId: campaign.id,
        creativeId: campaign.creatives[0]?.id || '',
        maxBid,
        bidModel: campaign.budget.bidStrategy,
        qualityScore,
        relevanceScore,
      });
    }

    return bidders;
  }

  // --------------------------------------------------------------------------
  // Bid Calculation
  // --------------------------------------------------------------------------

  private calculateEffectiveBid(bidder: ActiveBidder, request: BidRequest): number {
    // Effective bid = raw bid * quality score * relevance score
    const qualityMultiplier = 0.7 + bidder.qualityScore * 0.6; // Range: 0.7 - 1.3
    const relevanceMultiplier = 0.5 + bidder.relevanceScore * 1.0; // Range: 0.5 - 1.5

    return bidder.maxBid * qualityMultiplier * relevanceMultiplier;
  }

  private calculateAutoBid(campaign: Campaign): number {
    // Auto-bid based on campaign objective and historical performance
    const metrics = campaign.metrics;
    const budget = campaign.budget;

    switch (budget.bidStrategy) {
      case 'lowest_cost':
        // Bid the minimum to win
        return metrics.cpm > 0 ? metrics.cpm * 0.8 : 2.0;
      case 'target_cost':
        // Bid to achieve target CPA
        return budget.bidAmount || metrics.cpa || 5.0;
      case 'bid_cap':
        return budget.bidAmount || 10.0;
      case 'cost_cap':
        return budget.bidAmount || metrics.cpc * 2 || 3.0;
      default:
        return 2.0;
    }
  }

  private calculateRelevanceScore(campaign: Campaign, userProfile: UserAdProfile): number {
    let score = 0;
    const targeting = campaign.targeting;

    // Age targeting
    if (userProfile.demographics.age) {
      if (userProfile.demographics.age >= targeting.demographics.ageMin &&
          userProfile.demographics.age <= targeting.demographics.ageMax) {
        score += 0.2;
      }
    } else {
      score += 0.1; // Unknown age, partial match
    }

    // Gender targeting
    if (targeting.demographics.genders.includes('all') ||
        (userProfile.demographics.gender && targeting.demographics.genders.includes(userProfile.demographics.gender as any))) {
      score += 0.15;
    }

    // Interest targeting
    const interestOverlap = userProfile.interests.filter(i => targeting.interests.includes(i)).length;
    score += Math.min(interestOverlap * 0.1, 0.3);

    // Behavior targeting
    const behaviorOverlap = userProfile.recentActivity.filter(a => targeting.behaviors.includes(a)).length;
    score += Math.min(behaviorOverlap * 0.1, 0.2);

    // Device targeting
    if (targeting.devices.platforms.includes(userProfile.deviceInfo.platform as any)) {
      score += 0.1;
    }

    // Engagement rate bonus
    score += userProfile.engagementRate * 0.05;

    return Math.min(score, 1.0);
  }

  private isWithinSchedule(campaign: Campaign): boolean {
    const now = new Date();
    const start = new Date(campaign.schedule.startDate);
    if (now < start) return false;
    if (campaign.schedule.endDate) {
      const end = new Date(campaign.schedule.endDate);
      if (now > end) return false;
    }
    if (campaign.schedule.dayParting) {
      const hour = now.getHours();
      const day = now.getDay();
      const dp = campaign.schedule.dayParting;
      if (!dp.days.includes(day)) return false;
      const inHours = dp.hours.some(h => hour >= h.start && hour < h.end);
      if (!inHours) return false;
    }
    return true;
  }

  // --------------------------------------------------------------------------
  // Campaign Management
  // --------------------------------------------------------------------------

  registerCampaign(campaign: Campaign): void {
    this.activeCampaigns.set(campaign.id, campaign);
  }

  unregisterCampaign(campaignId: string): void {
    this.activeCampaigns.delete(campaignId);
  }

  updateCampaign(campaign: Campaign): void {
    this.activeCampaigns.set(campaign.id, campaign);
  }

  // --------------------------------------------------------------------------
  // Stats
  // --------------------------------------------------------------------------

  getStats(): { totalAuctions: number; totalRevenue: number; avgLatency: number; fillRate: number } {
    const recentAuctions = this.auctionHistory.slice(-1000);
    const avgLatency = recentAuctions.length > 0
      ? recentAuctions.reduce((sum, a) => sum + a.latencyMs, 0) / recentAuctions.length
      : 0;

    return {
      totalAuctions: this.totalAuctions,
      totalRevenue: Math.round(this.totalRevenue * 100) / 100,
      avgLatency: Math.round(avgLatency * 100) / 100,
      fillRate: this.auctionHistory.length / Math.max(this.totalAuctions, 1),
    };
  }
}

export const auctionService = new AuctionService();
export default AuctionService;
