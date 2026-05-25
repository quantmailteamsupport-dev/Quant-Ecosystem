// ============================================================================
// QuantAds - Dynamic Creative Service
// Creative variation generation, performance selection, rotation rules
// ============================================================================

interface Creative {
  id: string;
  campaignId: string;
  type: 'image' | 'video' | 'html' | 'native';
  headline: string;
  description: string;
  ctaText: string;
  mediaUrl: string;
  size: { width: number; height: number };
  status: 'active' | 'paused' | 'archived';
  performance: CreativePerformance;
  createdAt: Date;
}

interface CreativePerformance {
  impressions: number;
  clicks: number;
  conversions: number;
  ctr: number;
  cvr: number;
  spend: number;
  revenue: number;
  qualityScore: number;
}

interface CreativeVariation {
  id: string;
  parentCreativeId: string;
  campaignId: string;
  headline: string;
  description: string;
  ctaText: string;
  mediaUrl: string;
  variation: string;
  performance: CreativePerformance;
  isWinner: boolean;
  createdAt: Date;
}

interface RotationRule {
  id: string;
  campaignId: string;
  type: 'even' | 'performance' | 'sequential' | 'weighted';
  weights?: Record<string, number>;
  minImpressions: number;
  evaluationWindow: number;
  autoOptimize: boolean;
}

interface CreativeInsight {
  type: 'headline' | 'cta' | 'media' | 'color' | 'copy_length';
  finding: string;
  impact: 'high' | 'medium' | 'low';
  recommendation: string;
  confidence: number;
}

export class DynamicCreative {
  private creatives: Map<string, Creative> = new Map();
  private variations: Map<string, CreativeVariation> = new Map();
  private campaignVariationIndex: Map<string, string[]> = new Map();
  private rotationRules: Map<string, RotationRule> = new Map();
  private campaignCreativeIndex: Map<string, string[]> = new Map();

  async generateVariations(creativeId: string, rules: {
    headlines?: string[];
    descriptions?: string[];
    ctaTexts?: string[];
    mediaUrls?: string[];
    maxVariations?: number;
  }): Promise<CreativeVariation[]> {
    const creative = this.creatives.get(creativeId);
    if (!creative) throw new Error('Creative not found');

    const headlines = rules.headlines || [creative.headline];
    const descriptions = rules.descriptions || [creative.description];
    const ctaTexts = rules.ctaTexts || [creative.ctaText];
    const mediaUrls = rules.mediaUrls || [creative.mediaUrl];
    const maxVariations = rules.maxVariations || 10;

    const generated: CreativeVariation[] = [];
    let count = 0;

    for (const headline of headlines) {
      for (const description of descriptions) {
        for (const cta of ctaTexts) {
          for (const media of mediaUrls) {
            if (count >= maxVariations) break;
            if (headline === creative.headline && description === creative.description && cta === creative.ctaText && media === creative.mediaUrl) continue;

            const varId = `var_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
            const variation: CreativeVariation = {
              id: varId,
              parentCreativeId: creativeId,
              campaignId: creative.campaignId,
              headline,
              description,
              ctaText: cta,
              mediaUrl: media,
              variation: this.describeVariation(creative, headline, description, cta, media),
              performance: { impressions: 0, clicks: 0, conversions: 0, ctr: 0, cvr: 0, spend: 0, revenue: 0, qualityScore: 0 },
              isWinner: false,
              createdAt: new Date(),
            };

            this.variations.set(varId, variation);
            generated.push(variation);

            const campVars = this.campaignVariationIndex.get(creative.campaignId) || [];
            campVars.push(varId);
            this.campaignVariationIndex.set(creative.campaignId, campVars);

            count++;
          }
          if (count >= maxVariations) break;
        }
        if (count >= maxVariations) break;
      }
      if (count >= maxVariations) break;
    }

    return generated;
  }

  async selectBestPerforming(campaignId: string, metric: 'ctr' | 'cvr' | 'roas' = 'ctr'): Promise<CreativeVariation | null> {
    const varIds = this.campaignVariationIndex.get(campaignId) || [];
    const variations = varIds
      .map(id => this.variations.get(id))
      .filter((v): v is CreativeVariation => v !== undefined && v.performance.impressions >= 100);

    if (variations.length === 0) return null;

    let best: CreativeVariation;
    switch (metric) {
      case 'ctr': best = variations.sort((a, b) => b.performance.ctr - a.performance.ctr)[0]; break;
      case 'cvr': best = variations.sort((a, b) => b.performance.cvr - a.performance.cvr)[0]; break;
      case 'roas':
        best = variations.sort((a, b) => {
          const roasA = a.performance.spend > 0 ? a.performance.revenue / a.performance.spend : 0;
          const roasB = b.performance.spend > 0 ? b.performance.revenue / b.performance.spend : 0;
          return roasB - roasA;
        })[0];
        break;
    }

    // Mark as winner
    for (const v of variations) v.isWinner = false;
    best.isWinner = true;

    return best;
  }

  async rotateCreatives(campaignId: string): Promise<{ selectedVariationId: string; reason: string }> {
    const rule = this.rotationRules.get(campaignId);
    const varIds = this.campaignVariationIndex.get(campaignId) || [];
    const variations = varIds.map(id => this.variations.get(id)).filter((v): v is CreativeVariation => v !== undefined);

    if (variations.length === 0) throw new Error('No variations available');

    let selected: CreativeVariation;
    let reason: string;

    if (!rule || rule.type === 'even') {
      // Even rotation - pick least shown
      selected = variations.sort((a, b) => a.performance.impressions - b.performance.impressions)[0];
      reason = 'Even rotation - least impressions';
    } else if (rule.type === 'performance') {
      // Performance-based - weighted by CTR
      const totalCTR = variations.reduce((sum, v) => sum + v.performance.ctr, 0);
      if (totalCTR === 0) {
        selected = variations[Math.floor(Math.random() * variations.length)];
        reason = 'Random selection - no performance data';
      } else {
        const rand = Math.random() * totalCTR;
        let cumulative = 0;
        selected = variations[0];
        for (const v of variations) {
          cumulative += v.performance.ctr;
          if (rand <= cumulative) { selected = v; break; }
        }
        reason = 'Performance-weighted selection';
      }
    } else if (rule.type === 'weighted' && rule.weights) {
      const weights = rule.weights;
      const totalWeight = Object.values(weights).reduce((sum, w) => sum + w, 0);
      const rand = Math.random() * totalWeight;
      let cumulative = 0;
      selected = variations[0];
      for (const v of variations) {
        cumulative += (weights[v.id] || 1);
        if (rand <= cumulative) { selected = v; break; }
      }
      reason = 'Custom weighted rotation';
    } else {
      selected = variations[0];
      reason = 'Sequential rotation';
    }

    return { selectedVariationId: selected.id, reason };
  }

  async getCreativeInsights(campaignId: string): Promise<CreativeInsight[]> {
    const varIds = this.campaignVariationIndex.get(campaignId) || [];
    const variations = varIds
      .map(id => this.variations.get(id))
      .filter((v): v is CreativeVariation => v !== undefined && v.performance.impressions > 0);

    const insights: CreativeInsight[] = [];

    // Analyze headlines
    const headlinePerf = new Map<string, { ctr: number; count: number }>();
    for (const v of variations) {
      const entry = headlinePerf.get(v.headline) || { ctr: 0, count: 0 };
      entry.ctr += v.performance.ctr;
      entry.count++;
      headlinePerf.set(v.headline, entry);
    }

    if (headlinePerf.size > 1) {
      const sorted = Array.from(headlinePerf.entries())
        .map(([h, data]) => ({ headline: h, avgCTR: data.ctr / data.count }))
        .sort((a, b) => b.avgCTR - a.avgCTR);

      if (sorted[0].avgCTR > sorted[sorted.length - 1].avgCTR * 1.5) {
        insights.push({
          type: 'headline',
          finding: `"${sorted[0].headline}" outperforms other headlines`,
          impact: 'high',
          recommendation: 'Use this headline style more frequently',
          confidence: 0.85,
        });
      }
    }

    // CTA analysis
    const ctaPerf = new Map<string, number>();
    for (const v of variations) {
      const current = ctaPerf.get(v.ctaText) || 0;
      ctaPerf.set(v.ctaText, current + v.performance.ctr);
    }

    if (ctaPerf.size > 1) {
      insights.push({
        type: 'cta',
        finding: 'Multiple CTA variants tested',
        impact: 'medium',
        recommendation: 'Action-oriented CTAs show better engagement',
        confidence: 0.7,
      });
    }

    // Copy length analysis
    const shortCopy = variations.filter(v => v.description.length < 50);
    const longCopy = variations.filter(v => v.description.length >= 50);
    if (shortCopy.length > 0 && longCopy.length > 0) {
      const avgShort = shortCopy.reduce((s, v) => s + v.performance.ctr, 0) / shortCopy.length;
      const avgLong = longCopy.reduce((s, v) => s + v.performance.ctr, 0) / longCopy.length;
      const better = avgShort > avgLong ? 'shorter' : 'longer';
      insights.push({
        type: 'copy_length',
        finding: `${better} descriptions perform better in this campaign`,
        impact: 'medium',
        recommendation: `Focus on ${better} copy for new creatives`,
        confidence: 0.65,
      });
    }

    return insights;
  }

  async testVariation(variationId: string, impressions: number): Promise<CreativeVariation> {
    const variation = this.variations.get(variationId);
    if (!variation) throw new Error('Variation not found');

    // Simulate performance data
    const ctr = 0.01 + Math.random() * 0.05;
    const clicks = Math.floor(impressions * ctr);
    const cvr = 0.02 + Math.random() * 0.08;
    const conversions = Math.floor(clicks * cvr);

    variation.performance.impressions += impressions;
    variation.performance.clicks += clicks;
    variation.performance.conversions += conversions;
    variation.performance.ctr = variation.performance.impressions > 0 ? variation.performance.clicks / variation.performance.impressions : 0;
    variation.performance.cvr = variation.performance.clicks > 0 ? variation.performance.conversions / variation.performance.clicks : 0;

    return variation;
  }

  async setRotationRules(campaignId: string, config: Omit<RotationRule, 'id' | 'campaignId'>): Promise<RotationRule> {
    const ruleId = `rot_${campaignId}`;
    const rule: RotationRule = {
      id: ruleId,
      campaignId,
      ...config,
    };

    this.rotationRules.set(campaignId, rule);
    return rule;
  }

  async getWinner(campaignId: string): Promise<CreativeVariation | null> {
    const varIds = this.campaignVariationIndex.get(campaignId) || [];
    for (const id of varIds) {
      const v = this.variations.get(id);
      if (v && v.isWinner) return v;
    }
    return this.selectBestPerforming(campaignId);
  }

  async registerCreative(campaignId: string, config: Omit<Creative, 'id' | 'campaignId' | 'performance' | 'createdAt' | 'status'>): Promise<Creative> {
    const creativeId = `cr_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const creative: Creative = {
      id: creativeId,
      campaignId,
      ...config,
      status: 'active',
      performance: { impressions: 0, clicks: 0, conversions: 0, ctr: 0, cvr: 0, spend: 0, revenue: 0, qualityScore: 5 },
      createdAt: new Date(),
    };

    this.creatives.set(creativeId, creative);
    const campCreatives = this.campaignCreativeIndex.get(campaignId) || [];
    campCreatives.push(creativeId);
    this.campaignCreativeIndex.set(campaignId, campCreatives);

    return creative;
  }

  private describeVariation(original: Creative, headline: string, description: string, cta: string, media: string): string {
    const changes: string[] = [];
    if (headline !== original.headline) changes.push('headline');
    if (description !== original.description) changes.push('description');
    if (cta !== original.ctaText) changes.push('CTA');
    if (media !== original.mediaUrl) changes.push('media');
    return `Changed: ${changes.join(', ')}`;
  }
}

export const dynamicCreative = new DynamicCreative();
