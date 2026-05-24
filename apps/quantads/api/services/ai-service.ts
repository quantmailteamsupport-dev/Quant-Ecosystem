// ============================================================================
// QuantAds - AI Service
// Ad optimization, creative generation, audience prediction, forecasting
// ============================================================================

import type { Campaign, CampaignMetrics, Creative, TargetingConfig } from '../../src/types';

interface PerformancePrediction {
  estimatedImpressions: number;
  estimatedClicks: number;
  estimatedConversions: number;
  estimatedCost: number;
  estimatedROAS: number;
  confidence: number;
}

interface BudgetRecommendation {
  recommendedDailyBudget: number;
  expectedResults: { impressions: number; clicks: number; conversions: number };
  reasoning: string;
}

interface CreativeSuggestion {
  headline: string;
  description: string;
  callToAction: string;
  confidence: number;
  reasoning: string;
}

class AIService {
  // --------------------------------------------------------------------------
  // Performance Forecasting
  // --------------------------------------------------------------------------

  predictPerformance(campaign: Campaign, daysAhead: number = 7): PerformancePrediction {
    const currentMetrics = campaign.metrics;
    const dailyBudget = campaign.budget.type === 'daily' ? campaign.budget.amount : campaign.budget.amount / 30;
    const historicalCPM = currentMetrics.cpm || 5.0;
    const historicalCTR = currentMetrics.ctr || 1.5;
    const historicalCVR = currentMetrics.conversionRate || 2.0;

    // Project based on historical performance with decay
    const decayFactor = 0.95; // 5% performance decay over time
    const estimatedImpressions = Math.round((dailyBudget / historicalCPM) * 1000 * daysAhead * decayFactor);
    const estimatedClicks = Math.round(estimatedImpressions * (historicalCTR / 100));
    const estimatedConversions = Math.round(estimatedClicks * (historicalCVR / 100));
    const estimatedCost = dailyBudget * daysAhead;
    const estimatedRevenue = estimatedConversions * (currentMetrics.roas > 0 ? currentMetrics.cpa * currentMetrics.roas : 50);
    const estimatedROAS = estimatedCost > 0 ? estimatedRevenue / estimatedCost : 0;

    // Confidence based on data quality
    const confidence = Math.min(
      0.5 + (currentMetrics.impressions > 1000 ? 0.2 : 0) + (currentMetrics.clicks > 100 ? 0.15 : 0) + (currentMetrics.conversions > 10 ? 0.15 : 0),
      0.95
    );

    return { estimatedImpressions, estimatedClicks, estimatedConversions, estimatedCost, estimatedROAS, confidence };
  }

  // --------------------------------------------------------------------------
  // Budget Optimization
  // --------------------------------------------------------------------------

  recommendBudget(campaign: Campaign, objective: string): BudgetRecommendation {
    const metrics = campaign.metrics;
    const currentBudget = campaign.budget.amount;

    let recommendedBudget = currentBudget;
    let reasoning = '';

    if (metrics.roas > 2.0) {
      // Good ROAS, recommend increasing
      recommendedBudget = currentBudget * 1.5;
      reasoning = `ROAS of ${metrics.roas.toFixed(2)} indicates strong performance. Recommend increasing budget by 50% to capture more conversions.`;
    } else if (metrics.roas > 1.0 && metrics.roas <= 2.0) {
      // Acceptable ROAS, maintain
      recommendedBudget = currentBudget * 1.1;
      reasoning = `ROAS is positive but moderate. Recommend a small 10% increase while monitoring efficiency.`;
    } else if (metrics.roas > 0 && metrics.roas <= 1.0) {
      // Poor ROAS, recommend decreasing
      recommendedBudget = currentBudget * 0.7;
      reasoning = `ROAS below 1.0 indicates losses. Recommend decreasing budget by 30% and optimizing targeting.`;
    } else {
      // No data or very poor
      recommendedBudget = Math.min(currentBudget, 50); // Start conservative
      reasoning = `Insufficient data for optimization. Recommend starting with a conservative budget to gather data.`;
    }

    const cpm = metrics.cpm || 5;
    const ctr = metrics.ctr || 1.5;
    const cvr = metrics.conversionRate || 2;

    return {
      recommendedDailyBudget: Math.round(recommendedBudget * 100) / 100,
      expectedResults: {
        impressions: Math.round((recommendedBudget / cpm) * 1000),
        clicks: Math.round((recommendedBudget / cpm) * 1000 * (ctr / 100)),
        conversions: Math.round((recommendedBudget / cpm) * 1000 * (ctr / 100) * (cvr / 100)),
      },
      reasoning,
    };
  }

  // --------------------------------------------------------------------------
  // Creative Suggestions
  // --------------------------------------------------------------------------

  generateCreativeSuggestions(campaign: Campaign, count: number = 3): CreativeSuggestion[] {
    const objective = campaign.objective;
    const targeting = campaign.targeting;
    const suggestions: CreativeSuggestion[] = [];

    const templates: Record<string, { headlines: string[]; descriptions: string[]; ctas: string[] }> = {
      awareness: {
        headlines: ['Discover Something New', 'Meet Your New Favorite', 'The Future is Here'],
        descriptions: ['Join millions who already know', 'See what everyone is talking about', 'Experience the difference today'],
        ctas: ['Learn More', 'See More', 'Discover Now'],
      },
      conversions: {
        headlines: ['Limited Time Offer', 'Get Started Free', 'Transform Your Experience'],
        descriptions: ['Special offer ends soon - act now', 'No credit card required to start', 'Join 100K+ satisfied users'],
        ctas: ['Sign Up Free', 'Get Started', 'Claim Offer'],
      },
      traffic: {
        headlines: ['Check This Out', 'You Will Want to See This', 'Trending Now'],
        descriptions: ['Click to learn more about this opportunity', 'See why this is going viral', 'Do not miss this'],
        ctas: ['Visit Site', 'Read More', 'Explore'],
      },
      engagement: {
        headlines: ['Join the Conversation', 'What Do You Think?', 'Share Your Voice'],
        descriptions: ['Thousands are already participating', 'Your opinion matters - join now', 'Be part of something bigger'],
        ctas: ['Join Now', 'Participate', 'Get Involved'],
      },
    };

    const template = templates[objective] || templates['awareness'];

    for (let i = 0; i < count; i++) {
      suggestions.push({
        headline: template.headlines[i % template.headlines.length],
        description: template.descriptions[i % template.descriptions.length],
        callToAction: template.ctas[i % template.ctas.length],
        confidence: 0.7 + Math.random() * 0.2,
        reasoning: `Optimized for ${objective} objective targeting ${targeting.interests.slice(0, 3).join(', ') || 'broad'} audience`,
      });
    }

    return suggestions;
  }

  // --------------------------------------------------------------------------
  // Audience Insights
  // --------------------------------------------------------------------------

  predictAudienceExpansion(currentTargeting: TargetingConfig): { suggestions: string[]; estimatedReach: number } {
    const suggestions: string[] = [];

    if (currentTargeting.demographics.ageMax - currentTargeting.demographics.ageMin < 15) {
      suggestions.push('Consider expanding age range by 5 years on each side for 40% more reach');
    }

    if (currentTargeting.interests.length < 3) {
      suggestions.push('Add 2-3 related interests to expand audience while maintaining relevance');
    }

    if (currentTargeting.locations.length === 1) {
      suggestions.push('Expand to nearby regions for similar audiences at potentially lower costs');
    }

    if (!currentTargeting.devices.platforms.includes('web')) {
      suggestions.push('Include web platform to reach users across all touchpoints');
    }

    const baseReach = 1000000;
    const expansionMultiplier = 1 + suggestions.length * 0.3;

    return {
      suggestions,
      estimatedReach: Math.round(baseReach * expansionMultiplier),
    };
  }

  // --------------------------------------------------------------------------
  // Bid Optimization
  // --------------------------------------------------------------------------

  suggestBidAdjustment(campaign: Campaign): { adjustment: number; reasoning: string } {
    const metrics = campaign.metrics;

    if (metrics.impressions < 100) {
      return { adjustment: 1.2, reasoning: 'Low impressions indicate bid may be too low. Suggest 20% increase to win more auctions.' };
    }

    if (metrics.ctr > 3) {
      return { adjustment: 1.1, reasoning: 'High CTR indicates strong creative relevance. Slight bid increase to capitalize.' };
    }

    if (metrics.ctr < 0.5 && metrics.impressions > 1000) {
      return { adjustment: 0.85, reasoning: 'Low CTR with good reach suggests audience mismatch. Reduce bid and refine targeting.' };
    }

    if (metrics.cpa > campaign.budget.bidAmount! * 2) {
      return { adjustment: 0.7, reasoning: 'CPA is double the target. Reduce bid significantly and optimize conversion funnel.' };
    }

    return { adjustment: 1.0, reasoning: 'Current bid level is performing within acceptable parameters.' };
  }
}

export const aiService = new AIService();
export default AIService;
