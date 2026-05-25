// ============================================================================
// Recommendations Package - Feed Ranker
// ============================================================================

import type { FeedRankConfig, FeedItem, RankSignals } from '../types';

/** Multi-signal feed ranking engine with diversity and fatigue awareness */
export class FeedRanker {
  private config: FeedRankConfig;
  private userAffinities: Map<string, Map<string, number>>;
  private contentFatigue: Map<string, Map<string, number>>;
  private positionBiasWeights: Map<number, number>;
  private engagementHistory: Map<string, { likes: number; timestamp: number }[]>;

  constructor(config: Partial<FeedRankConfig> = {}) {
    this.config = {
      engagementWeight: config.engagementWeight ?? 0.3,
      recencyWeight: config.recencyWeight ?? 0.25,
      affinityWeight: config.affinityWeight ?? 0.2,
      qualityWeight: config.qualityWeight ?? 0.15,
      diversityWeight: config.diversityWeight ?? 0.1,
      halfLifeHours: config.halfLifeHours ?? 24,
      mmrLambda: config.mmrLambda ?? 0.7,
      fatigueDecayRate: config.fatigueDecayRate ?? 0.95,
      maxFatiguePerType: config.maxFatiguePerType ?? 5,
      positionBiasEnabled: config.positionBiasEnabled ?? true,
    };
    this.userAffinities = new Map();
    this.contentFatigue = new Map();
    this.positionBiasWeights = new Map();
    this.engagementHistory = new Map();
    this.initializePositionBias();
  }

  /** Initialize position bias weights using inverse propensity weighting */
  private initializePositionBias(): void {
    // Position bias: items at higher positions get examined more
    // Inverse propensity weight compensates for this bias
    for (let pos = 0; pos < 100; pos++) {
      // Examination probability decays with position (log-based)
      const examinationProb = 1 / Math.log2(pos + 2);
      // Inverse propensity weight is 1/P(examine|position)
      this.positionBiasWeights.set(pos, 1 / examinationProb);
    }
  }

  /** Set user affinity scores for authors/categories */
  setUserAffinity(userId: string, affinityMap: Map<string, number>): void {
    this.userAffinities.set(userId, affinityMap);
  }

  /** Record content exposure for fatigue tracking */
  recordExposure(userId: string, contentType: string): void {
    if (!this.contentFatigue.has(userId)) {
      this.contentFatigue.set(userId, new Map());
    }
    const userFatigue = this.contentFatigue.get(userId)!;
    const current = userFatigue.get(contentType) ?? 0;
    userFatigue.set(contentType, current + 1);
  }

  /** Record engagement event for velocity scoring */
  recordEngagement(itemId: string, likes: number, timestamp: number): void {
    if (!this.engagementHistory.has(itemId)) {
      this.engagementHistory.set(itemId, []);
    }
    this.engagementHistory.get(itemId)!.push({ likes, timestamp });
  }

  /** Compute time decay using exponential function with configurable half-life */
  computeRecencyDecay(createdAt: number, now?: number): number {
    const currentTime = now ?? Date.now();
    const ageHours = (currentTime - createdAt) / (1000 * 60 * 60);
    // Exponential decay: score = e^(-lambda * t)
    // Where lambda = ln(2) / half_life (so score = 0.5 at half_life)
    const lambda = Math.LN2 / this.config.halfLifeHours;
    return Math.exp(-lambda * ageHours);
  }

  /** Compute engagement velocity (likes per time unit since post) */
  computeEngagementVelocity(itemId: string, now?: number): number {
    const currentTime = now ?? Date.now();
    const history = this.engagementHistory.get(itemId);
    if (!history || history.length === 0) return 0;

    // Sum recent engagements weighted by recency
    let weightedEngagements = 0;
    let totalWeight = 0;
    const windowMs = 3600000; // 1 hour window

    for (const entry of history) {
      const age = currentTime - entry.timestamp;
      if (age <= windowMs) {
        const weight = 1 - age / windowMs;
        weightedEngagements += entry.likes * weight;
        totalWeight += weight;
      }
    }

    if (totalWeight === 0) return 0;

    // Normalize velocity to 0-1 range using sigmoid
    const rawVelocity = weightedEngagements / totalWeight;
    return 1 / (1 + Math.exp(-rawVelocity + 3));
  }

  /** Compute content fatigue adjustment for a user and content type */
  computeFatigueAdjustment(userId: string, contentType: string): number {
    const userFatigue = this.contentFatigue.get(userId);
    if (!userFatigue) return 1.0;

    const exposureCount = userFatigue.get(contentType) ?? 0;
    if (exposureCount === 0) return 1.0;

    // Fatigue increases with exposure, decaying the score
    // fatigue_factor = decay_rate ^ min(exposure, max_fatigue)
    const effectiveExposure = Math.min(exposureCount, this.config.maxFatiguePerType);
    return Math.pow(this.config.fatigueDecayRate, effectiveExposure);
  }

  /** Get position bias correction weight */
  getPositionBiasWeight(position: number): number {
    if (!this.config.positionBiasEnabled) return 1.0;
    return this.positionBiasWeights.get(position) ?? 1.0;
  }

  /** Compute user affinity for an item based on author/category/tags */
  computeAffinity(userId: string, item: FeedItem): number {
    const affinityMap = this.userAffinities.get(userId);
    if (!affinityMap) return 0.5; // neutral

    let totalAffinity = 0;
    let factors = 0;

    // Author affinity
    const authorAffinity = affinityMap.get(`author:${item.authorId}`);
    if (authorAffinity !== undefined) {
      totalAffinity += authorAffinity;
      factors++;
    }

    // Category affinity
    const categoryAffinity = affinityMap.get(`category:${item.category}`);
    if (categoryAffinity !== undefined) {
      totalAffinity += categoryAffinity;
      factors++;
    }

    // Tag affinities
    for (const tag of item.tags) {
      const tagAffinity = affinityMap.get(`tag:${tag}`);
      if (tagAffinity !== undefined) {
        totalAffinity += tagAffinity;
        factors++;
      }
    }

    return factors > 0 ? totalAffinity / factors : 0.5;
  }

  /** Compute cosine similarity between two feature vectors */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length || a.length === 0) return 0;

    let dotProduct = 0;
    let magnitudeA = 0;
    let magnitudeB = 0;

    for (let i = 0; i < a.length; i++) {
      const valA = a[i]!;
      const valB = b[i]!;
      dotProduct += valA * valB;
      magnitudeA += valA * valA;
      magnitudeB += valB * valB;
    }

    magnitudeA = Math.sqrt(magnitudeA);
    magnitudeB = Math.sqrt(magnitudeB);

    if (magnitudeA === 0 || magnitudeB === 0) return 0;
    return dotProduct / (magnitudeA * magnitudeB);
  }

  /** Compute diversity score relative to already selected items */
  private computeDiversityScore(item: FeedItem, selected: FeedItem[]): number {
    if (selected.length === 0) return 1.0;

    // Diversity is the minimum distance to any selected item
    let maxSimilarity = 0;
    for (const selectedItem of selected) {
      const sim = this.cosineSimilarity(item.features, selectedItem.features);
      maxSimilarity = Math.max(maxSimilarity, sim);
    }

    // Invert: high diversity = low similarity
    return 1 - maxSimilarity;
  }

  /** Compute all ranking signals for a feed item */
  computeSignals(userId: string, item: FeedItem, position: number, now?: number): RankSignals {
    const recencyDecay = this.computeRecencyDecay(item.createdAt, now);
    const affinity = this.computeAffinity(userId, item);
    const fatigueAdjustment = this.computeFatigueAdjustment(userId, item.contentType);
    const velocityScore = this.computeEngagementVelocity(item.id, now);
    const positionBias = this.getPositionBiasWeight(position);

    // Weighted combination of signals
    const rawScore =
      item.engagementScore * this.config.engagementWeight +
      recencyDecay * this.config.recencyWeight +
      affinity * this.config.affinityWeight +
      item.qualityScore * this.config.qualityWeight +
      velocityScore * this.config.diversityWeight;

    // Apply fatigue and position bias correction
    const finalScore = rawScore * fatigueAdjustment * positionBias;

    return {
      engagementScore: item.engagementScore,
      recencyDecay,
      affinity,
      quality: item.qualityScore,
      diversity: 0, // computed during re-ranking
      velocityScore,
      fatigueAdjustment,
      positionBias,
      finalScore,
    };
  }

  /** Rank feed items using multi-signal scoring */
  rankItems(
    userId: string,
    items: FeedItem[],
    now?: number,
  ): Array<{ item: FeedItem; signals: RankSignals }> {
    const scored = items.map((item, index) => ({
      item,
      signals: this.computeSignals(userId, item, index, now),
    }));

    scored.sort((a, b) => b.signals.finalScore - a.signals.finalScore);
    return scored;
  }

  /** Re-rank for diversity using Maximal Marginal Relevance (MMR)
   * MMR formula: score(d) = lambda * relevance(d) - (1 - lambda) * max_similarity(d, selected)
   */
  rerankWithMMR(
    userId: string,
    items: FeedItem[],
    topN: number,
    now?: number,
  ): Array<{ item: FeedItem; signals: RankSignals }> {
    const lambda = this.config.mmrLambda;

    // First, compute relevance scores for all items
    const scoredItems = this.rankItems(userId, items, now);
    const firstItem = scoredItems[0];
    const maxRelevance = firstItem ? firstItem.signals.finalScore : 1;

    const selected: Array<{ item: FeedItem; signals: RankSignals }> = [];
    const remaining = [...scoredItems];

    while (selected.length < topN && remaining.length > 0) {
      let bestIndex = 0;
      let bestMMRScore = -Infinity;

      for (let i = 0; i < remaining.length; i++) {
        const candidate = remaining[i]!;
        // Normalize relevance to 0-1
        const relevance = maxRelevance > 0 ? candidate.signals.finalScore / maxRelevance : 0;

        // Compute max similarity to already selected items
        const diversity = this.computeDiversityScore(
          candidate.item,
          selected.map((s) => s.item),
        );

        // MMR score = lambda * relevance - (1 - lambda) * max_similarity
        // Since diversity = 1 - max_similarity:
        // MMR score = lambda * relevance + (1 - lambda) * diversity - (1 - lambda)
        const mmrScore = lambda * relevance + (1 - lambda) * diversity;

        if (mmrScore > bestMMRScore) {
          bestMMRScore = mmrScore;
          bestIndex = i;
        }
      }

      const chosen = remaining[bestIndex]!;
      // Update diversity score in signals
      chosen.signals.diversity = this.computeDiversityScore(
        chosen.item,
        selected.map((s) => s.item),
      );
      chosen.signals.finalScore = bestMMRScore;

      selected.push(chosen);
      remaining.splice(bestIndex, 1);
    }

    return selected;
  }

  /** Detect content fatigue for a user across all content types */
  detectFatigue(userId: string): Map<string, number> {
    const fatigueScores = new Map<string, number>();
    const userFatigue = this.contentFatigue.get(userId);
    if (!userFatigue) return fatigueScores;

    for (const [contentType, count] of userFatigue) {
      const fatigueLevel = 1 - Math.pow(this.config.fatigueDecayRate, count);
      fatigueScores.set(contentType, fatigueLevel);
    }

    return fatigueScores;
  }

  /** Reset fatigue for a user (e.g., after a break) */
  resetFatigue(userId: string): void {
    this.contentFatigue.delete(userId);
  }

  /** Decay all fatigue scores (call periodically) */
  decayAllFatigue(decayFactor: number = 0.5): void {
    for (const [userId, fatigueMap] of this.contentFatigue) {
      for (const [contentType, count] of fatigueMap) {
        const decayed = Math.floor(count * decayFactor);
        if (decayed <= 0) {
          fatigueMap.delete(contentType);
        } else {
          fatigueMap.set(contentType, decayed);
        }
      }
      if (fatigueMap.size === 0) {
        this.contentFatigue.delete(userId);
      }
    }
  }

  /** Get ranking configuration */
  getConfig(): FeedRankConfig {
    return { ...this.config };
  }

  /** Update ranking weights dynamically */
  updateWeights(weights: Partial<FeedRankConfig>): void {
    this.config = { ...this.config, ...weights };
  }
}
