// ============================================================================
// QuantSync - Feed Service
// Feed algorithm with ranking, personalization, and multiple feed modes
// ============================================================================

import type { Post, FeedMode, FeedRequest, FeedResponse, User } from '../../src/types';

// ----------------------------------------------------------------------------
// Scoring Weights for Feed Algorithm
// ----------------------------------------------------------------------------

interface ScoringWeights {
  recency: number;
  engagement: number;
  relevance: number;
  authorReputation: number;
  diversity: number;
  freshness: number;
}

const FEED_WEIGHTS: Record<FeedMode, ScoringWeights> = {
  'for-you': {
    recency: 0.25,
    engagement: 0.3,
    relevance: 0.25,
    authorReputation: 0.1,
    diversity: 0.05,
    freshness: 0.05,
  },
  following: {
    recency: 0.4,
    engagement: 0.15,
    relevance: 0.2,
    authorReputation: 0.1,
    diversity: 0.05,
    freshness: 0.1,
  },
  chronological: {
    recency: 0.9,
    engagement: 0.02,
    relevance: 0.02,
    authorReputation: 0.02,
    diversity: 0.02,
    freshness: 0.02,
  },
  anonymous: {
    recency: 0.3,
    engagement: 0.35,
    relevance: 0.15,
    authorReputation: 0.0,
    diversity: 0.1,
    freshness: 0.1,
  },
  trending: {
    recency: 0.15,
    engagement: 0.4,
    relevance: 0.1,
    authorReputation: 0.05,
    diversity: 0.1,
    freshness: 0.2,
  },
};

// ----------------------------------------------------------------------------
// User Interest Model
// ----------------------------------------------------------------------------

interface UserInterestProfile {
  userId: string;
  topicWeights: Map<string, number>;
  authorAffinity: Map<string, number>;
  communityAffinity: Map<string, number>;
  engagementHistory: EngagementEvent[];
  lastUpdated: number;
}

interface EngagementEvent {
  postId: string;
  type: 'view' | 'like' | 'comment' | 'share' | 'bookmark' | 'dwell';
  timestamp: number;
  duration?: number;
  topics: string[];
}

// ----------------------------------------------------------------------------
// Feed Service
// ----------------------------------------------------------------------------

class FeedService {
  private posts: Map<string, Post> = new Map();
  private userProfiles: Map<string, UserInterestProfile> = new Map();
  private followGraph: Map<string, Set<string>> = new Map();
  private communityMembers: Map<string, Set<string>> = new Map();
  private trendingCache: { topics: string[]; updatedAt: number } = { topics: [], updatedAt: 0 };

  // --------------------------------------------------------------------------
  // Feed Generation
  // --------------------------------------------------------------------------

  async getFeed(userId: string, request: FeedRequest): Promise<FeedResponse> {
    const { mode, cursor, limit = 20, communityId, hashtag } = request;

    let candidatePosts = this.getCandidatePosts(userId, mode, communityId, hashtag);
    const rankedPosts = this.rankPosts(candidatePosts, userId, mode);

    // Apply cursor-based pagination
    let startIndex = 0;
    if (cursor) {
      const cursorIndex = rankedPosts.findIndex(p => p.id === cursor);
      startIndex = cursorIndex >= 0 ? cursorIndex + 1 : 0;
    }

    const paginatedPosts = rankedPosts.slice(startIndex, startIndex + limit);
    const hasMore = startIndex + limit < rankedPosts.length;

    // Track impressions
    this.trackImpressions(userId, paginatedPosts.map(p => p.id));

    return {
      posts: paginatedPosts,
      nextCursor: paginatedPosts.length > 0 ? paginatedPosts[paginatedPosts.length - 1].id : undefined,
      hasMore,
      metadata: {
        mode,
        totalEstimate: rankedPosts.length,
        refreshedAt: new Date().toISOString(),
      },
    };
  }

  // --------------------------------------------------------------------------
  // Candidate Selection
  // --------------------------------------------------------------------------

  private getCandidatePosts(userId: string, mode: FeedMode, communityId?: string, hashtag?: string): Post[] {
    let candidates = Array.from(this.posts.values());

    // Filter by community if specified
    if (communityId) {
      candidates = candidates.filter(p => p.communityId === communityId);
    }

    // Filter by hashtag if specified
    if (hashtag) {
      candidates = candidates.filter(p => p.hashtags.includes(hashtag.toLowerCase()));
    }

    switch (mode) {
      case 'following': {
        const following = this.followGraph.get(userId) || new Set();
        candidates = candidates.filter(p => following.has(p.authorId) || p.authorId === userId);
        break;
      }
      case 'anonymous': {
        candidates = candidates.filter(p => p.isAnonymous);
        break;
      }
      case 'trending': {
        // Only include posts from last 24 hours with high engagement
        const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
        candidates = candidates.filter(p => {
          const postTime = new Date(p.createdAt).getTime();
          return postTime > dayAgo && (p.upvotes + p.commentCount + p.repostCount) > 5;
        });
        break;
      }
      case 'for-you': {
        // Exclude posts user has already seen recently (dedup)
        const profile = this.userProfiles.get(userId);
        if (profile) {
          const recentlyViewed = new Set(
            profile.engagementHistory
              .filter(e => e.type === 'view' && e.timestamp > Date.now() - 3600000)
              .map(e => e.postId)
          );
          candidates = candidates.filter(p => !recentlyViewed.has(p.id));
        }
        break;
      }
      default:
        break;
    }

    // Filter out locked and removed posts
    candidates = candidates.filter(p => !p.isLocked);

    return candidates;
  }

  // --------------------------------------------------------------------------
  // Ranking Algorithm
  // --------------------------------------------------------------------------

  private rankPosts(posts: Post[], userId: string, mode: FeedMode): Post[] {
    const weights = FEED_WEIGHTS[mode];
    const profile = this.userProfiles.get(userId);
    const now = Date.now();

    const scored = posts.map(post => {
      const score = this.calculatePostScore(post, userId, weights, profile, now);
      return { post, score };
    });

    // Sort by score descending
    scored.sort((a, b) => b.score - a.score);

    // Apply diversity boost - avoid consecutive posts from same author
    return this.applyDiversityFilter(scored.map(s => s.post));
  }

  private calculatePostScore(
    post: Post,
    userId: string,
    weights: ScoringWeights,
    profile: UserInterestProfile | undefined,
    now: number
  ): number {
    let score = 0;

    // Recency score: exponential decay over time
    const ageMs = now - new Date(post.createdAt).getTime();
    const ageHours = ageMs / (1000 * 60 * 60);
    const recencyScore = Math.exp(-ageHours / 24) * 100; // Half-life ~16 hours
    score += recencyScore * weights.recency;

    // Engagement score: weighted combination of interactions
    const engagementScore = this.calculateEngagementScore(post);
    score += engagementScore * weights.engagement;

    // Relevance score: based on user interests
    const relevanceScore = this.calculateRelevanceScore(post, profile);
    score += relevanceScore * weights.relevance;

    // Author reputation
    const reputationScore = this.calculateAuthorReputation(post.authorId);
    score += reputationScore * weights.authorReputation;

    // Freshness: bonus for very new posts (< 1 hour)
    const freshnessScore = ageHours < 1 ? (1 - ageHours) * 50 : 0;
    score += freshnessScore * weights.freshness;

    // Diversity: slight penalty for topics user has seen too much
    if (profile) {
      const topicSaturation = this.calculateTopicSaturation(post, profile);
      score -= topicSaturation * weights.diversity * 20;
    }

    // Boost for content from mutual connections
    const following = this.followGraph.get(userId);
    if (following && following.has(post.authorId)) {
      score *= 1.2;
    }

    return Math.max(score, 0);
  }

  private calculateEngagementScore(post: Post): number {
    // Wilson score interval for upvote ratio
    const n = post.upvotes + post.downvotes;
    if (n === 0) return 0;

    const p = post.upvotes / n;
    const z = 1.96; // 95% confidence
    const denominator = 1 + z * z / n;
    const center = p + z * z / (2 * n);
    const spread = z * Math.sqrt((p * (1 - p) + z * z / (4 * n)) / n);
    const wilsonScore = (center - spread) / denominator;

    // Combine with raw engagement metrics
    const interactionScore = Math.log2(1 + post.upvotes) * 3
      + Math.log2(1 + post.commentCount) * 5
      + Math.log2(1 + post.repostCount) * 4
      + Math.log2(1 + post.shareCount) * 2
      + Math.log2(1 + post.bookmarkCount) * 3;

    // Engagement rate
    const engagementRate = post.viewCount > 0
      ? (post.upvotes + post.commentCount + post.repostCount) / post.viewCount
      : 0;

    return (wilsonScore * 30) + (interactionScore * 2) + (engagementRate * 100);
  }

  private calculateRelevanceScore(post: Post, profile?: UserInterestProfile): number {
    if (!profile) return 50; // Neutral score for new users

    let relevance = 0;

    // Topic matching
    for (const hashtag of post.hashtags) {
      const weight = profile.topicWeights.get(hashtag) || 0;
      relevance += weight * 20;
    }

    // Author affinity
    const authorWeight = profile.authorAffinity.get(post.authorId) || 0;
    relevance += authorWeight * 30;

    // Community affinity
    if (post.communityId) {
      const communityWeight = profile.communityAffinity.get(post.communityId) || 0;
      relevance += communityWeight * 25;
    }

    return Math.min(relevance, 100);
  }

  private calculateAuthorReputation(authorId: string): number {
    // Simplified reputation based on historical engagement
    const authorPosts = Array.from(this.posts.values()).filter(p => p.authorId === authorId);
    if (authorPosts.length === 0) return 25;

    const avgScore = authorPosts.reduce((sum, p) => sum + p.score, 0) / authorPosts.length;
    const consistency = Math.min(authorPosts.length / 10, 1); // More posts = more data

    return Math.min(avgScore * consistency * 0.5, 100);
  }

  private calculateTopicSaturation(post: Post, profile: UserInterestProfile): number {
    // Check how much of this topic user has seen recently
    const recentEvents = profile.engagementHistory.filter(
      e => e.timestamp > Date.now() - 3600000
    );

    let saturation = 0;
    for (const hashtag of post.hashtags) {
      const topicCount = recentEvents.filter(e => e.topics.includes(hashtag)).length;
      saturation += topicCount / 10; // Saturates after seeing 10 posts on same topic
    }

    return Math.min(saturation, 1);
  }

  // --------------------------------------------------------------------------
  // Diversity Filter
  // --------------------------------------------------------------------------

  private applyDiversityFilter(posts: Post[]): Post[] {
    if (posts.length <= 3) return posts;

    const result: Post[] = [];
    const authorCooldown: Map<string, number> = new Map();
    const communityCooldown: Map<string, number> = new Map();

    for (const post of posts) {
      const authorLast = authorCooldown.get(post.authorId) || -3;
      const communityLast = post.communityId ? (communityCooldown.get(post.communityId) || -3) : -3;

      // Ensure at least 2 posts between same author
      if (result.length - authorLast < 2 && result.length > 0) {
        // Delay this post
        continue;
      }

      // Ensure at least 3 posts between same community
      if (post.communityId && result.length - communityLast < 3 && result.length > 0) {
        continue;
      }

      result.push(post);
      authorCooldown.set(post.authorId, result.length - 1);
      if (post.communityId) communityCooldown.set(post.communityId, result.length - 1);
    }

    return result;
  }

  // --------------------------------------------------------------------------
  // User Interest Tracking
  // --------------------------------------------------------------------------

  trackEngagement(userId: string, postId: string, type: EngagementEvent['type'], duration?: number): void {
    const post = this.posts.get(postId);
    if (!post) return;

    let profile = this.userProfiles.get(userId);
    if (!profile) {
      profile = {
        userId,
        topicWeights: new Map(),
        authorAffinity: new Map(),
        communityAffinity: new Map(),
        engagementHistory: [],
        lastUpdated: Date.now(),
      };
      this.userProfiles.set(userId, profile);
    }

    // Record event
    profile.engagementHistory.push({
      postId,
      type,
      timestamp: Date.now(),
      duration,
      topics: post.hashtags,
    });

    // Trim old history (keep last 1000 events)
    if (profile.engagementHistory.length > 1000) {
      profile.engagementHistory = profile.engagementHistory.slice(-1000);
    }

    // Update interest weights
    const engagementWeight = this.getEngagementWeight(type);

    for (const hashtag of post.hashtags) {
      const current = profile.topicWeights.get(hashtag) || 0;
      profile.topicWeights.set(hashtag, Math.min(current + engagementWeight, 10));
    }

    const authorAffinity = profile.authorAffinity.get(post.authorId) || 0;
    profile.authorAffinity.set(post.authorId, Math.min(authorAffinity + engagementWeight * 0.5, 10));

    if (post.communityId) {
      const communityAffinity = profile.communityAffinity.get(post.communityId) || 0;
      profile.communityAffinity.set(post.communityId, Math.min(communityAffinity + engagementWeight * 0.3, 10));
    }

    profile.lastUpdated = Date.now();
  }

  private getEngagementWeight(type: EngagementEvent['type']): number {
    switch (type) {
      case 'bookmark': return 1.5;
      case 'comment': return 2.0;
      case 'share': return 1.8;
      case 'like': return 1.0;
      case 'dwell': return 0.5;
      case 'view': return 0.1;
      default: return 0.1;
    }
  }

  private trackImpressions(userId: string, postIds: string[]): void {
    for (const postId of postIds) {
      this.trackEngagement(userId, postId, 'view');
      const post = this.posts.get(postId);
      if (post) {
        post.viewCount++;
      }
    }
  }

  // --------------------------------------------------------------------------
  // Post Management
  // --------------------------------------------------------------------------

  addPost(post: Post): void {
    this.posts.set(post.id, post);
  }

  removePost(postId: string): void {
    this.posts.delete(postId);
  }

  getPost(postId: string): Post | undefined {
    return this.posts.get(postId);
  }

  updatePost(postId: string, updates: Partial<Post>): Post | undefined {
    const post = this.posts.get(postId);
    if (!post) return undefined;
    const updated = { ...post, ...updates, updatedAt: new Date().toISOString() };
    this.posts.set(postId, updated);
    return updated;
  }

  // --------------------------------------------------------------------------
  // Social Graph
  // --------------------------------------------------------------------------

  follow(userId: string, targetId: string): void {
    if (!this.followGraph.has(userId)) this.followGraph.set(userId, new Set());
    this.followGraph.get(userId)!.add(targetId);
  }

  unfollow(userId: string, targetId: string): void {
    this.followGraph.get(userId)?.delete(targetId);
  }

  getFollowing(userId: string): string[] {
    return Array.from(this.followGraph.get(userId) || []);
  }

  joinCommunity(userId: string, communityId: string): void {
    if (!this.communityMembers.has(communityId)) this.communityMembers.set(communityId, new Set());
    this.communityMembers.get(communityId)!.add(userId);
  }

  leaveCommunity(userId: string, communityId: string): void {
    this.communityMembers.get(communityId)?.delete(userId);
  }

  // --------------------------------------------------------------------------
  // Trending Topics
  // --------------------------------------------------------------------------

  getTrendingTopics(limit: number = 10): string[] {
    const now = Date.now();
    if (now - this.trendingCache.updatedAt < 300000) { // 5 min cache
      return this.trendingCache.topics.slice(0, limit);
    }

    const hourAgo = now - 3600000;
    const recentPosts = Array.from(this.posts.values()).filter(
      p => new Date(p.createdAt).getTime() > hourAgo
    );

    const hashtagCounts: Map<string, { count: number; engagement: number }> = new Map();
    for (const post of recentPosts) {
      for (const tag of post.hashtags) {
        const existing = hashtagCounts.get(tag) || { count: 0, engagement: 0 };
        existing.count++;
        existing.engagement += post.upvotes + post.commentCount;
        hashtagCounts.set(tag, existing);
      }
    }

    const trending = Array.from(hashtagCounts.entries())
      .map(([tag, data]) => ({ tag, score: data.count * 2 + data.engagement }))
      .sort((a, b) => b.score - a.score)
      .map(t => t.tag);

    this.trendingCache = { topics: trending, updatedAt: now };
    return trending.slice(0, limit);
  }
}

export const feedService = new FeedService();
export default FeedService;
