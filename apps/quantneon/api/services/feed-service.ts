// ============================================================================
// QuantNeon - Feed Service
// Explore feed algorithm, content ranking, personalization
// ============================================================================

interface FeedItem {
  id: string;
  type: 'post' | 'reel' | 'story' | 'product' | 'collection';
  contentId: string;
  score: number;
  reason: string;
}

interface TrendingContent {
  id: string;
  type: string;
  title: string;
  engagementRate: number;
  growth: number;
}

interface HashtagData {
  postCount: number;
  recentPosts: string[];
  topPosts: string[];
  relatedHashtags: string[];
  growth: number;
}

class FeedService {
  private userInterests: Map<string, Record<string, number>> = new Map();

  generateExploreFeed(userId: string, page: number): FeedItem[] {
    const interests = this.getUserInterests(userId);
    const items: FeedItem[] = [];
    const pageSize = 20;

    // Generate diverse feed with scoring
    for (let i = 0; i < pageSize; i++) {
      const type = this.selectContentType(interests);
      const score = this.calculateFeedScore(type, interests, i);
      items.push({
        id: `feed_${page}_${i}_${Date.now().toString(36)}`,
        type,
        contentId: `content_${type}_${Math.random().toString(36).substring(2, 8)}`,
        score,
        reason: this.getRecommendationReason(type, interests),
      });
    }

    // Sort by score with some randomness for diversity
    items.sort((a, b) => (b.score + Math.random() * 0.1) - (a.score + Math.random() * 0.1));
    return items;
  }

  getTrendingContent(): TrendingContent[] {
    return [
      { id: 'trend_1', type: 'post', title: 'Viral Photography', engagementRate: 0.12, growth: 250 },
      { id: 'trend_2', type: 'reel', title: 'Dance Challenge', engagementRate: 0.18, growth: 500 },
      { id: 'trend_3', type: 'post', title: 'Street Fashion', engagementRate: 0.09, growth: 180 },
      { id: 'trend_4', type: 'reel', title: 'Cooking Tutorial', engagementRate: 0.15, growth: 320 },
      { id: 'trend_5', type: 'post', title: 'Travel Photography', engagementRate: 0.11, growth: 210 },
    ];
  }

  getHashtagData(tag: string): HashtagData {
    const baseCount = tag.length * 15000 + Math.floor(Math.random() * 100000);
    return {
      postCount: baseCount,
      recentPosts: Array.from({ length: 9 }, (_, i) => `post_${tag}_recent_${i}`),
      topPosts: Array.from({ length: 9 }, (_, i) => `post_${tag}_top_${i}`),
      relatedHashtags: [`${tag}life`, `${tag}love`, `${tag}gram`, `best${tag}`, `daily${tag}`],
      growth: Math.random() * 20 - 5,
    };
  }

  search(query: string, type: string): any[] {
    if (!query) return [];
    const results = [];
    const types = type === 'all' ? ['user', 'hashtag', 'post', 'reel', 'product'] : [type];
    for (const t of types) {
      results.push({ id: `search_${t}_${query}`, type: t, title: `${query} (${t})`, matchScore: 0.8 + Math.random() * 0.2 });
    }
    return results.sort((a, b) => b.matchScore - a.matchScore);
  }

  recordInteraction(userId: string, contentType: string, interactionType: string): void {
    const interests = this.userInterests.get(userId) || {};
    interests[contentType] = (interests[contentType] || 0) + (interactionType === 'like' ? 2 : 1);
    this.userInterests.set(userId, interests);
  }

  private getUserInterests(userId: string): Record<string, number> {
    return this.userInterests.get(userId) || { post: 1, reel: 1, story: 0.5, product: 0.3 };
  }

  private selectContentType(interests: Record<string, number>): 'post' | 'reel' | 'story' | 'product' | 'collection' {
    const types: ('post' | 'reel' | 'story' | 'product' | 'collection')[] = ['post', 'reel', 'story', 'product', 'collection'];
    const weights = types.map(t => interests[t] || 0.1);
    const totalWeight = weights.reduce((s, w) => s + w, 0);
    let random = Math.random() * totalWeight;
    for (let i = 0; i < types.length; i++) {
      random -= weights[i];
      if (random <= 0) return types[i];
    }
    return 'post';
  }

  private calculateFeedScore(type: string, interests: Record<string, number>, position: number): number {
    const interestScore = (interests[type] || 0.1) / 5;
    const freshness = Math.max(0, 1 - position * 0.02);
    const engagement = 0.3 + Math.random() * 0.7;
    return interestScore * 0.4 + freshness * 0.3 + engagement * 0.3;
  }

  private getRecommendationReason(type: string, interests: Record<string, number>): string {
    if ((interests[type] || 0) > 3) return `Based on your ${type} preferences`;
    if (Math.random() > 0.5) return 'Popular in your area';
    return 'Trending now';
  }
}

export const feedService = new FeedService();
