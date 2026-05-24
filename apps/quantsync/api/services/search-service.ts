// ============================================================================
// QuantSync - Search Service
// Full-text search, hashtag indexing, user/community search
// ============================================================================

import type { Post, User, Community, SearchResult, TrendingTopic } from '../../src/types';

interface SearchIndex {
  postIndex: Map<string, Set<string>>; // word -> postIds
  hashtagIndex: Map<string, Set<string>>; // hashtag -> postIds
  userIndex: Map<string, string>; // username/displayName tokens -> userId
  communityIndex: Map<string, string>; // community name tokens -> communityId
}

interface SearchOptions {
  type?: 'post' | 'user' | 'community' | 'hashtag' | 'all';
  limit?: number;
  offset?: number;
  sortBy?: 'relevance' | 'recent' | 'popular';
  timeRange?: 'hour' | 'day' | 'week' | 'month' | 'all';
  communityId?: string;
}

class SearchService {
  private index: SearchIndex = {
    postIndex: new Map(),
    hashtagIndex: new Map(),
    userIndex: new Map(),
    communityIndex: new Map(),
  };
  private posts: Map<string, Post> = new Map();
  private users: Map<string, User> = new Map();
  private communities: Map<string, Community> = new Map();
  private searchHistory: Map<string, string[]> = new Map(); // userId -> recent searches
  private trendingSearches: Map<string, number> = new Map(); // query -> count

  // --------------------------------------------------------------------------
  // Indexing
  // --------------------------------------------------------------------------

  indexPost(post: Post): void {
    this.posts.set(post.id, post);

    // Index content words
    const words = this.tokenize(post.content);
    for (const word of words) {
      if (!this.index.postIndex.has(word)) this.index.postIndex.set(word, new Set());
      this.index.postIndex.get(word)!.add(post.id);
    }

    // Index hashtags
    for (const tag of post.hashtags) {
      const normalizedTag = tag.toLowerCase();
      if (!this.index.hashtagIndex.has(normalizedTag)) this.index.hashtagIndex.set(normalizedTag, new Set());
      this.index.hashtagIndex.get(normalizedTag)!.add(post.id);
    }
  }

  indexUser(user: User): void {
    this.users.set(user.id, user);
    const tokens = this.tokenize(`${user.username} ${user.displayName}`);
    for (const token of tokens) {
      this.index.userIndex.set(token, user.id);
    }
  }

  indexCommunity(community: Community): void {
    this.communities.set(community.id, community);
    const tokens = this.tokenize(`${community.name} ${community.displayName} ${community.description}`);
    for (const token of tokens) {
      this.index.communityIndex.set(token, community.id);
    }
  }

  removePostFromIndex(postId: string): void {
    const post = this.posts.get(postId);
    if (!post) return;

    const words = this.tokenize(post.content);
    for (const word of words) {
      this.index.postIndex.get(word)?.delete(postId);
    }
    for (const tag of post.hashtags) {
      this.index.hashtagIndex.get(tag.toLowerCase())?.delete(postId);
    }
    this.posts.delete(postId);
  }

  // --------------------------------------------------------------------------
  // Search
  // --------------------------------------------------------------------------

  search(query: string, options: SearchOptions = {}): SearchResult[] {
    const { type = 'all', limit = 20, offset = 0, sortBy = 'relevance', timeRange = 'all' } = options;
    const queryTokens = this.tokenize(query);
    let results: SearchResult[] = [];

    // Track search for trending
    const normalizedQuery = query.toLowerCase().trim();
    this.trendingSearches.set(normalizedQuery, (this.trendingSearches.get(normalizedQuery) || 0) + 1);

    if (type === 'all' || type === 'post') {
      results.push(...this.searchPosts(queryTokens, timeRange, options.communityId));
    }

    if (type === 'all' || type === 'user') {
      results.push(...this.searchUsers(queryTokens));
    }

    if (type === 'all' || type === 'community') {
      results.push(...this.searchCommunities(queryTokens));
    }

    if (type === 'all' || type === 'hashtag') {
      results.push(...this.searchHashtags(query));
    }

    // Sort results
    switch (sortBy) {
      case 'relevance':
        results.sort((a, b) => b.score - a.score);
        break;
      case 'recent':
        results.sort((a, b) => {
          const aTime = 'createdAt' in (a.item as any) ? new Date((a.item as any).createdAt).getTime() : 0;
          const bTime = 'createdAt' in (b.item as any) ? new Date((b.item as any).createdAt).getTime() : 0;
          return bTime - aTime;
        });
        break;
      case 'popular':
        results.sort((a, b) => {
          const aScore = 'score' in (a.item as any) ? (a.item as any).score : 0;
          const bScore = 'score' in (b.item as any) ? (b.item as any).score : 0;
          return bScore - aScore;
        });
        break;
    }

    return results.slice(offset, offset + limit);
  }

  private searchPosts(tokens: string[], timeRange: string, communityId?: string): SearchResult[] {
    const matchingPostIds: Map<string, number> = new Map(); // postId -> match count

    for (const token of tokens) {
      // Exact word match
      const exactMatches = this.index.postIndex.get(token) || new Set();
      for (const postId of exactMatches) {
        matchingPostIds.set(postId, (matchingPostIds.get(postId) || 0) + 2);
      }

      // Prefix match
      for (const [word, postIds] of this.index.postIndex) {
        if (word.startsWith(token) && word !== token) {
          for (const postId of postIds) {
            matchingPostIds.set(postId, (matchingPostIds.get(postId) || 0) + 1);
          }
        }
      }

      // Hashtag match
      const hashtagMatches = this.index.hashtagIndex.get(token) || new Set();
      for (const postId of hashtagMatches) {
        matchingPostIds.set(postId, (matchingPostIds.get(postId) || 0) + 3);
      }
    }

    const results: SearchResult[] = [];
    const now = Date.now();
    const timeRangeMs = this.getTimeRangeMs(timeRange);

    for (const [postId, matchCount] of matchingPostIds) {
      const post = this.posts.get(postId);
      if (!post) continue;

      // Time filter
      if (timeRangeMs > 0) {
        const postTime = new Date(post.createdAt).getTime();
        if (now - postTime > timeRangeMs) continue;
      }

      // Community filter
      if (communityId && post.communityId !== communityId) continue;

      // Calculate relevance score
      const tokenCoverage = matchCount / (tokens.length * 2);
      const engagementBoost = Math.log2(1 + post.upvotes + post.commentCount) / 10;
      const recencyBoost = Math.exp(-(now - new Date(post.createdAt).getTime()) / (7 * 24 * 3600000));

      const score = tokenCoverage * 50 + engagementBoost * 30 + recencyBoost * 20;

      results.push({ type: 'post', score, item: post });
    }

    return results;
  }

  private searchUsers(tokens: string[]): SearchResult[] {
    const matchingUserIds: Set<string> = new Set();

    for (const token of tokens) {
      for (const [indexToken, userId] of this.index.userIndex) {
        if (indexToken.includes(token) || token.includes(indexToken)) {
          matchingUserIds.add(userId);
        }
      }
    }

    return Array.from(matchingUserIds).map(userId => {
      const user = this.users.get(userId)!;
      const nameMatch = tokens.some(t => user.username.toLowerCase().includes(t) || user.displayName.toLowerCase().includes(t));
      const score = nameMatch ? 80 : 50;
      return { type: 'user' as const, score: score + Math.log2(1 + user.followerCount), item: user };
    });
  }

  private searchCommunities(tokens: string[]): SearchResult[] {
    const matchingIds: Set<string> = new Set();

    for (const token of tokens) {
      for (const [indexToken, communityId] of this.index.communityIndex) {
        if (indexToken.includes(token) || token.includes(indexToken)) {
          matchingIds.add(communityId);
        }
      }
    }

    return Array.from(matchingIds).map(id => {
      const community = this.communities.get(id)!;
      const nameMatch = tokens.some(t => community.name.toLowerCase().includes(t));
      const score = nameMatch ? 80 : 50;
      return { type: 'community' as const, score: score + Math.log2(1 + community.memberCount), item: community };
    });
  }

  private searchHashtags(query: string): SearchResult[] {
    const normalizedQuery = query.toLowerCase().replace('#', '');
    const results: SearchResult[] = [];

    for (const [hashtag, postIds] of this.index.hashtagIndex) {
      if (hashtag.includes(normalizedQuery)) {
        const topic: TrendingTopic = {
          id: `topic_${hashtag}`,
          name: hashtag,
          hashtag: `#${hashtag}`,
          category: 'general',
          postCount: postIds.size,
          trendingScore: postIds.size,
          velocity: 0,
          peakTime: new Date().toISOString(),
          relatedTopics: [],
        };
        const exactMatch = hashtag === normalizedQuery;
        results.push({ type: 'hashtag', score: exactMatch ? 100 : 60 + postIds.size, item: topic });
      }
    }

    return results;
  }

  // --------------------------------------------------------------------------
  // Search Suggestions
  // --------------------------------------------------------------------------

  getSuggestions(prefix: string, limit: number = 5): string[] {
    const normalizedPrefix = prefix.toLowerCase();
    const suggestions: { text: string; score: number }[] = [];

    // From hashtags
    for (const [hashtag, postIds] of this.index.hashtagIndex) {
      if (hashtag.startsWith(normalizedPrefix)) {
        suggestions.push({ text: `#${hashtag}`, score: postIds.size * 2 });
      }
    }

    // From trending searches
    for (const [query, count] of this.trendingSearches) {
      if (query.startsWith(normalizedPrefix)) {
        suggestions.push({ text: query, score: count });
      }
    }

    suggestions.sort((a, b) => b.score - a.score);
    return suggestions.slice(0, limit).map(s => s.text);
  }

  // --------------------------------------------------------------------------
  // Search History
  // --------------------------------------------------------------------------

  recordSearch(userId: string, query: string): void {
    const history = this.searchHistory.get(userId) || [];
    history.unshift(query);
    if (history.length > 20) history.pop();
    this.searchHistory.set(userId, history);
  }

  getSearchHistory(userId: string): string[] {
    return this.searchHistory.get(userId) || [];
  }

  clearSearchHistory(userId: string): void {
    this.searchHistory.delete(userId);
  }

  // --------------------------------------------------------------------------
  // Helpers
  // --------------------------------------------------------------------------

  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s#@]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 1)
      .map(word => word.replace(/^[#@]/, ''));
  }

  private getTimeRangeMs(range: string): number {
    switch (range) {
      case 'hour': return 3600000;
      case 'day': return 86400000;
      case 'week': return 7 * 86400000;
      case 'month': return 30 * 86400000;
      default: return 0;
    }
  }

  getTrendingSearches(limit: number = 10): string[] {
    return Array.from(this.trendingSearches.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([query]) => query);
  }
}

export const searchService = new SearchService();
export default SearchService;
