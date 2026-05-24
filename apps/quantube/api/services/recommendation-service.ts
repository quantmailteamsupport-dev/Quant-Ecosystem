// ============================================================================
// QuantTube - Recommendation Service
// AI-powered recommendations with real scoring logic using collaborative filtering
// ============================================================================

interface UserProfile {
  userId: string;
  watchHistory: string[];
  likes: string[];
  subscriptions: string[];
  genres: Record<string, number>;
  avgWatchDuration: number;
  preferredContentType: string;
  lastActive: string;
}

interface ContentItem {
  id: string;
  type: 'video' | 'music' | 'show';
  title: string;
  genre: string;
  tags: string[];
  views: number;
  likes: number;
  duration: number;
  publishedAt: string;
  channelId: string;
  engagementRate: number;
}

interface Recommendation {
  contentId: string;
  score: number;
  reason: string;
  contentType: string;
}

interface FeedSection {
  type: string;
  title: string;
  items: Recommendation[];
}

class RecommendationService {
  private userProfiles: Map<string, UserProfile> = new Map();
  private contentIndex: Map<string, ContentItem> = new Map();
  private interactionMatrix: Map<string, Map<string, number>> = new Map();

  getRecommendations(userId: string, contentType: string, limit: number): Recommendation[] {
    const profile = this.getOrCreateProfile(userId);
    const candidates = this.getCandidates(profile, contentType);
    const scored = this.scoreItems(candidates, profile);
    const diversified = this.diversify(scored, limit);
    return diversified;
  }

  getPersonalizedFeed(userId: string): FeedSection[] {
    const profile = this.getOrCreateProfile(userId);

    const sections: FeedSection[] = [
      { type: 'continue_watching', title: 'Continue Watching', items: this.getContinueWatching(profile) },
      { type: 'recommended', title: 'Recommended For You', items: this.getRecommendations(userId, 'all', 12) },
      { type: 'trending', title: 'Trending Now', items: this.getTrendingItems(10) },
      { type: 'new_subscriptions', title: 'New From Subscriptions', items: this.getFromSubscriptions(profile, 10) },
      { type: 'popular_genre', title: `Popular in ${this.getTopGenre(profile)}`, items: this.getByGenre(this.getTopGenre(profile), 10) },
    ];

    return sections;
  }

  recordInteraction(userId: string, contentId: string, interactionType: string, value: number): void {
    const userInteractions = this.interactionMatrix.get(userId) || new Map();
    const currentScore = userInteractions.get(contentId) || 0;
    // Weighted scoring: watch=1, like=3, subscribe=5, share=4
    const weights: Record<string, number> = { watch: 1, like: 3, subscribe: 5, share: 4, comment: 2 };
    userInteractions.set(contentId, currentScore + (weights[interactionType] || 1) * value);
    this.interactionMatrix.set(userId, userInteractions);

    // Update user profile
    const profile = this.getOrCreateProfile(userId);
    if (interactionType === 'watch') profile.watchHistory.push(contentId);
    if (interactionType === 'like') profile.likes.push(contentId);
  }

  private getOrCreateProfile(userId: string): UserProfile {
    let profile = this.userProfiles.get(userId);
    if (!profile) {
      profile = { userId, watchHistory: [], likes: [], subscriptions: [], genres: {}, avgWatchDuration: 0, preferredContentType: 'video', lastActive: new Date().toISOString() };
      this.userProfiles.set(userId, profile);
    }
    return profile;
  }

  private getCandidates(profile: UserProfile, contentType: string): ContentItem[] {
    let candidates = Array.from(this.contentIndex.values());
    if (contentType !== 'all') candidates = candidates.filter(c => c.type === contentType);
    // Filter out already watched
    candidates = candidates.filter(c => !profile.watchHistory.includes(c.id));
    return candidates;
  }

  private scoreItems(candidates: ContentItem[], profile: UserProfile): Recommendation[] {
    return candidates.map(item => {
      let score = 0;

      // Content-based scoring: genre match
      const genreWeight = profile.genres[item.genre] || 0;
      score += genreWeight * 0.3;

      // Popularity signal
      const popularityScore = Math.log10(item.views + 1) / 10;
      score += popularityScore * 0.2;

      // Engagement rate
      score += item.engagementRate * 0.2;

      // Recency boost
      const age = (Date.now() - Date.parse(item.publishedAt)) / (1000 * 60 * 60 * 24);
      const recencyBoost = Math.max(0, 1 - age / 30);
      score += recencyBoost * 0.15;

      // Collaborative filtering: users with similar taste
      const collaborativeScore = this.collaborativeScore(profile.userId, item.id);
      score += collaborativeScore * 0.15;

      // Normalize to 0-1
      score = Math.min(1, Math.max(0, score));

      const reason = this.getRecommendationReason(item, profile, score);

      return { contentId: item.id, score, reason, contentType: item.type };
    }).sort((a, b) => b.score - a.score);
  }

  private collaborativeScore(userId: string, contentId: string): number {
    // Find similar users (users who liked similar content)
    const userInteractions = this.interactionMatrix.get(userId);
    if (!userInteractions) return 0;

    let totalScore = 0;
    let similarUsers = 0;

    for (const [otherUserId, otherInteractions] of this.interactionMatrix) {
      if (otherUserId === userId) continue;
      // Cosine similarity approximation
      let dotProduct = 0;
      let normA = 0;
      let normB = 0;
      for (const [itemId, scoreA] of userInteractions) {
        const scoreB = otherInteractions.get(itemId) || 0;
        dotProduct += scoreA * scoreB;
        normA += scoreA * scoreA;
        normB += scoreB * scoreB;
      }
      const similarity = normA > 0 && normB > 0 ? dotProduct / (Math.sqrt(normA) * Math.sqrt(normB)) : 0;
      if (similarity > 0.3) {
        const otherRating = otherInteractions.get(contentId) || 0;
        totalScore += similarity * otherRating;
        similarUsers++;
      }
    }

    return similarUsers > 0 ? totalScore / similarUsers / 5 : 0;
  }

  private diversify(scored: Recommendation[], limit: number): Recommendation[] {
    // Ensure diversity: no more than 3 items from same type consecutively
    const result: Recommendation[] = [];
    const typeCount: Record<string, number> = {};
    const maxPerType = Math.ceil(limit / 3);

    for (const item of scored) {
      const count = typeCount[item.contentType] || 0;
      if (count >= maxPerType) continue;
      result.push(item);
      typeCount[item.contentType] = count + 1;
      if (result.length >= limit) break;
    }

    return result;
  }

  private getRecommendationReason(item: ContentItem, profile: UserProfile, score: number): string {
    if (profile.genres[item.genre] && profile.genres[item.genre] > 2) return `Because you enjoy ${item.genre}`;
    if (item.engagementRate > 0.8) return 'Highly rated by viewers';
    if (score > 0.7) return 'Recommended for you';
    return 'Popular right now';
  }

  private getContinueWatching(profile: UserProfile): Recommendation[] {
    return profile.watchHistory.slice(-5).map((id, i) => ({
      contentId: id,
      score: 1 - i * 0.1,
      reason: 'Continue watching',
      contentType: 'video',
    }));
  }

  private getTrendingItems(limit: number): Recommendation[] {
    return Array.from(this.contentIndex.values())
      .sort((a, b) => b.views - a.views)
      .slice(0, limit)
      .map(item => ({ contentId: item.id, score: item.views / 1000000, reason: 'Trending', contentType: item.type }));
  }

  private getFromSubscriptions(profile: UserProfile, limit: number): Recommendation[] {
    return profile.subscriptions.slice(0, limit).map((channelId, i) => ({
      contentId: `sub_content_${channelId}`,
      score: 0.8 - i * 0.05,
      reason: 'From your subscriptions',
      contentType: 'video',
    }));
  }

  private getByGenre(genre: string, limit: number): Recommendation[] {
    return Array.from(this.contentIndex.values())
      .filter(c => c.genre === genre)
      .slice(0, limit)
      .map(item => ({ contentId: item.id, score: item.engagementRate, reason: `Popular in ${genre}`, contentType: item.type }));
  }

  private getTopGenre(profile: UserProfile): string {
    const entries = Object.entries(profile.genres);
    if (entries.length === 0) return 'General';
    entries.sort((a, b) => b[1] - a[1]);
    return entries[0][0];
  }
}

export const recommendationService = new RecommendationService();
