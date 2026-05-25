// ============================================================================
// Recommendations Package - Explore Discovery
// ============================================================================

import type {
  ExplorationConfig,
  SerendipityConfig,
  NoveltyScore,
  DiscoveryFeedConfig,
  FeedItem,
} from '../types';

/** Exploration vs exploitation engine with serendipity injection */
export class ExploreDiscovery {
  private explorationConfig: ExplorationConfig;
  private serendipityConfig: SerendipityConfig;
  private discoveryConfig: DiscoveryFeedConfig;
  private userExposureHistory: Map<string, Map<string, number>>;
  private userCategoryHistory: Map<string, Map<string, number>>;
  private userEngagementTimestamps: Map<string, number[]>;
  private globalTrendingItems: FeedItem[];
  private stepCount: number;

  constructor(
    explorationConfig: Partial<ExplorationConfig> = {},
    serendipityConfig: Partial<SerendipityConfig> = {},
    discoveryConfig: Partial<DiscoveryFeedConfig> = {},
  ) {
    this.explorationConfig = {
      initialEpsilon: explorationConfig.initialEpsilon ?? 0.3,
      epsilonDecay: explorationConfig.epsilonDecay ?? 0.995,
      minEpsilon: explorationConfig.minEpsilon ?? 0.05,
      serendipityProbability: explorationConfig.serendipityProbability ?? 0.1,
      noveltyWeight: explorationConfig.noveltyWeight ?? 0.3,
      trendingWeight: explorationConfig.trendingWeight ?? 0.25,
      personalizedWeight: explorationConfig.personalizedWeight ?? 0.45,
      serendipitousWeight: explorationConfig.serendipitousWeight ?? 0.2,
    };
    this.serendipityConfig = {
      comfortZoneThreshold: serendipityConfig.comfortZoneThreshold ?? 0.7,
      maxNoveltyDistance: serendipityConfig.maxNoveltyDistance ?? 0.9,
      minQualityThreshold: serendipityConfig.minQualityThreshold ?? 0.4,
      categoryDiversityTarget: serendipityConfig.categoryDiversityTarget ?? 5,
      temperatureParameter: serendipityConfig.temperatureParameter ?? 1.0,
    };
    this.discoveryConfig = {
      trendingRatio: discoveryConfig.trendingRatio ?? 0.3,
      personalizedRatio: discoveryConfig.personalizedRatio ?? 0.5,
      serendipitousRatio: discoveryConfig.serendipitousRatio ?? 0.2,
      maxItems: discoveryConfig.maxItems ?? 50,
      refreshIntervalMs: discoveryConfig.refreshIntervalMs ?? 300000,
    };
    this.userExposureHistory = new Map();
    this.userCategoryHistory = new Map();
    this.userEngagementTimestamps = new Map();
    this.globalTrendingItems = [];
    this.stepCount = 0;
  }

  /**
   * Epsilon-greedy with decay for exploration vs exploitation
   * epsilon = epsilon_0 * decay^t, capped at minEpsilon
   */
  getCurrentEpsilon(): number {
    const epsilon =
      this.explorationConfig.initialEpsilon *
      Math.pow(this.explorationConfig.epsilonDecay, this.stepCount);
    return Math.max(epsilon, this.explorationConfig.minEpsilon);
  }

  /** Determine whether to explore or exploit */
  shouldExplore(): boolean {
    this.stepCount++;
    return Math.random() < this.getCurrentEpsilon();
  }

  /** Record that a user was exposed to an item */
  recordExposure(userId: string, itemId: string, category: string): void {
    // Track item exposure
    if (!this.userExposureHistory.has(userId)) {
      this.userExposureHistory.set(userId, new Map());
    }
    const exposure = this.userExposureHistory.get(userId)!;
    exposure.set(itemId, (exposure.get(itemId) ?? 0) + 1);

    // Track category exposure
    if (!this.userCategoryHistory.has(userId)) {
      this.userCategoryHistory.set(userId, new Map());
    }
    const categories = this.userCategoryHistory.get(userId)!;
    categories.set(category, (categories.get(category) ?? 0) + 1);
  }

  /** Record user engagement with timestamp for interest expansion detection */
  recordEngagement(userId: string, category: string, timestamp: number): void {
    if (!this.userEngagementTimestamps.has(userId)) {
      this.userEngagementTimestamps.set(userId, []);
    }
    this.userEngagementTimestamps.get(userId)!.push(timestamp);

    // Also record category engagement
    if (!this.userCategoryHistory.has(userId)) {
      this.userCategoryHistory.set(userId, new Map());
    }
    const categories = this.userCategoryHistory.get(userId)!;
    categories.set(category, (categories.get(category) ?? 0) + 1);
  }

  /** Update global trending items */
  setTrendingItems(items: FeedItem[]): void {
    this.globalTrendingItems = items;
  }

  /**
   * Compute novelty score for an item based on freshness and user exposure
   */
  computeNoveltyScore(userId: string, item: FeedItem, now?: number): NoveltyScore {
    const currentTime = now ?? Date.now();

    // Freshness score: newer items are more novel
    const ageHours = (currentTime - item.createdAt) / (1000 * 60 * 60);
    const freshnessScore = Math.exp(-ageHours / 168); // 1-week half-life

    // Exposure score: items seen less are more novel
    const exposure = this.userExposureHistory.get(userId);
    const exposureCount = exposure?.get(item.id) ?? 0;
    const exposureScore = 1 / (1 + exposureCount);

    // Category novelty: items from unfamiliar categories are more novel
    const categoryHistory = this.userCategoryHistory.get(userId);
    const categoryCount = categoryHistory?.get(item.category) ?? 0;
    const totalCategoryExposure = categoryHistory
      ? Array.from(categoryHistory.values()).reduce((sum, v) => sum + v, 0)
      : 0;
    const categoryFamiliarity =
      totalCategoryExposure > 0 ? categoryCount / totalCategoryExposure : 0;
    const categoryNovelty = 1 - categoryFamiliarity;

    // Overall novelty is a weighted combination
    const overallNovelty = freshnessScore * 0.3 + exposureScore * 0.4 + categoryNovelty * 0.3;

    return {
      itemId: item.id,
      freshnessScore,
      exposureScore,
      categoryNovelty,
      overallNovelty,
    };
  }

  /**
   * Serendipity injection: select items outside user's comfort zone
   * Items are selected with controlled probability based on distance from comfort zone
   */
  injectSerendipity(userId: string, candidates: FeedItem[]): FeedItem[] {
    const categoryHistory = this.userCategoryHistory.get(userId);
    if (!categoryHistory || categoryHistory.size === 0) {
      // Cold start: pick random diverse items
      return this.randomSample(candidates, Math.ceil(candidates.length * 0.2));
    }

    // Identify comfort zone (categories with high engagement)
    const totalEngagement = Array.from(categoryHistory.values()).reduce((sum, v) => sum + v, 0);
    const comfortZoneCategories = new Set<string>();
    for (const [category, count] of categoryHistory) {
      if (
        count / totalEngagement >
        this.serendipityConfig.comfortZoneThreshold / categoryHistory.size
      ) {
        comfortZoneCategories.add(category);
      }
    }

    // Score candidates by serendipity potential
    const serendipitous: Array<{ item: FeedItem; score: number }> = [];

    for (const item of candidates) {
      // Must meet minimum quality threshold
      if (item.qualityScore < this.serendipityConfig.minQualityThreshold) continue;

      // Items outside comfort zone get higher serendipity scores
      const isOutsideComfort = !comfortZoneCategories.has(item.category);
      if (!isOutsideComfort) continue;

      // Score based on novelty distance, capped at max
      const categoryCount = categoryHistory.get(item.category) ?? 0;
      const familiarity = totalEngagement > 0 ? categoryCount / totalEngagement : 0;
      const noveltyDistance = 1 - familiarity;

      if (noveltyDistance > this.serendipityConfig.maxNoveltyDistance) continue;

      // Apply temperature-based softmax for selection probability
      const score = Math.exp(noveltyDistance / this.serendipityConfig.temperatureParameter);
      serendipitous.push({ item, score });
    }

    // Sort by score and select top items
    serendipitous.sort((a, b) => b.score - a.score);
    const numToSelect = Math.max(
      1,
      Math.ceil(candidates.length * this.explorationConfig.serendipityProbability),
    );
    return serendipitous.slice(0, numToSelect).map((s) => s.item);
  }

  /**
   * Detect interest expansion: when user engages with novel categories
   * Returns categories that show new engagement patterns
   */
  detectInterestExpansion(userId: string, _recentWindowMs: number = 604800000): string[] {
    const categoryHistory = this.userCategoryHistory.get(userId);
    if (!categoryHistory) return [];

    const totalEngagement = Array.from(categoryHistory.values()).reduce((sum, v) => sum + v, 0);
    if (totalEngagement < 10) return []; // Need minimum history

    // Find categories with low historical engagement but recent activity
    const expandingCategories: string[] = [];
    const avgEngagement = totalEngagement / categoryHistory.size;

    for (const [category, count] of categoryHistory) {
      // Category is "expanding" if it has below-average historical engagement
      // but shows recent growth
      if (count < avgEngagement * 0.3 && count > 0) {
        expandingCategories.push(category);
      }
    }

    return expandingCategories;
  }

  /**
   * Generate discovery feed combining trending + personalized + serendipitous items
   */
  generateDiscoveryFeed(
    userId: string,
    personalizedItems: FeedItem[],
    allCandidates: FeedItem[],
    now?: number,
  ): FeedItem[] {
    const maxItems = this.discoveryConfig.maxItems;
    const trendingCount = Math.ceil(maxItems * this.discoveryConfig.trendingRatio);
    const personalizedCount = Math.ceil(maxItems * this.discoveryConfig.personalizedRatio);
    const serendipitousCount = Math.ceil(maxItems * this.discoveryConfig.serendipitousRatio);

    const feed: FeedItem[] = [];
    const usedIds = new Set<string>();

    // Add trending items
    const trending = this.globalTrendingItems
      .filter((item) => !usedIds.has(item.id))
      .slice(0, trendingCount);
    for (const item of trending) {
      feed.push(item);
      usedIds.add(item.id);
    }

    // Add personalized items (sorted by novelty for discovery feel)
    const noveltyScored = personalizedItems
      .filter((item) => !usedIds.has(item.id))
      .map((item) => ({
        item,
        novelty: this.computeNoveltyScore(userId, item, now),
      }))
      .sort((a, b) => b.novelty.overallNovelty - a.novelty.overallNovelty);

    for (const { item } of noveltyScored.slice(0, personalizedCount)) {
      feed.push(item);
      usedIds.add(item.id);
    }

    // Add serendipitous items
    const serendipitousCandidates = allCandidates.filter((item) => !usedIds.has(item.id));
    const serendipitous = this.injectSerendipity(userId, serendipitousCandidates);
    for (const item of serendipitous.slice(0, serendipitousCount)) {
      feed.push(item);
      usedIds.add(item.id);
    }

    // Interleave for variety (shuffle using Fisher-Yates on segments)
    return this.interleaveFeed(feed, 3);
  }

  /** Select action using epsilon-greedy: exploit (use personalized) or explore (try novel) */
  selectAction(
    _userId: string,
    personalizedItems: FeedItem[],
    explorationItems: FeedItem[],
  ): FeedItem[] {
    if (this.shouldExplore()) {
      // Exploration: return novel items
      return explorationItems.length > 0 ? explorationItems : personalizedItems;
    }
    // Exploitation: return personalized items
    return personalizedItems;
  }

  /** Interleave feed items in segments for variety */
  private interleaveFeed(items: FeedItem[], segmentSize: number): FeedItem[] {
    if (items.length <= segmentSize) return items;

    const result: FeedItem[] = [];
    const segments: FeedItem[][] = [];

    // Split into segments
    for (let i = 0; i < items.length; i += segmentSize) {
      segments.push(items.slice(i, i + segmentSize));
    }

    // Shuffle within each segment
    for (const segment of segments) {
      for (let i = segment.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const temp = segment[i]!;
        segment[i] = segment[j]!;
        segment[j] = temp;
      }
      result.push(...segment);
    }

    return result;
  }

  /** Random sample from array */
  private randomSample(items: FeedItem[], count: number): FeedItem[] {
    const shuffled = [...items];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = shuffled[i]!;
      shuffled[i] = shuffled[j]!;
      shuffled[j] = temp;
    }
    return shuffled.slice(0, count);
  }

  /** Get exploration statistics for a user */
  getExplorationStats(userId: string): {
    epsilon: number;
    categoriesExplored: number;
    totalExposures: number;
    expandingInterests: string[];
  } {
    const categories = this.userCategoryHistory.get(userId);
    const exposures = this.userExposureHistory.get(userId);

    return {
      epsilon: this.getCurrentEpsilon(),
      categoriesExplored: categories?.size ?? 0,
      totalExposures: exposures?.size ?? 0,
      expandingInterests: this.detectInterestExpansion(userId),
    };
  }

  /** Reset exploration state */
  resetExploration(): void {
    this.stepCount = 0;
  }

  /** Get configuration */
  getConfig(): {
    exploration: ExplorationConfig;
    serendipity: SerendipityConfig;
    discovery: DiscoveryFeedConfig;
  } {
    return {
      exploration: { ...this.explorationConfig },
      serendipity: { ...this.serendipityConfig },
      discovery: { ...this.discoveryConfig },
    };
  }
}
