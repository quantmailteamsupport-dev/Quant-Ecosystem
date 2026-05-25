// ============================================================================
// QuantSync - Advanced Search Service
// Multi-filter search by date, user, media, saved searches, suggestions
// ============================================================================

interface SearchablePost {
  id: string;
  authorId: string;
  content: string;
  mediaType: 'none' | 'image' | 'video' | 'gif' | 'link';
  hashtags: string[];
  mentions: string[];
  likes: number;
  reposts: number;
  replies: number;
  createdAt: Date;
  language: string;
}

interface SearchQuery {
  text?: string;
  authorId?: string;
  dateRange?: { start: Date; end: Date };
  mediaType?: string;
  minLikes?: number;
  minReposts?: number;
  hashtags?: string[];
  language?: string;
  excludeWords?: string[];
  sortBy?: 'relevance' | 'recent' | 'popular';
}

interface SearchResultItem {
  post: SearchablePost;
  relevanceScore: number;
  matchedFields: string[];
  highlights: Record<string, string>;
}

interface SavedSearch {
  id: string;
  userId: string;
  name: string;
  query: SearchQuery;
  notifications: boolean;
  lastRun: Date | null;
  resultCount: number;
  createdAt: Date;
}

interface SearchSuggestion {
  text: string;
  type: 'trending' | 'recent' | 'popular' | 'user' | 'hashtag';
  score: number;
}

export class AdvancedSearch {
  private posts: Map<string, SearchablePost> = new Map();
  private savedSearches: Map<string, SavedSearch> = new Map();
  private userSavedIndex: Map<string, string[]> = new Map();
  private searchHistory: Map<string, string[]> = new Map();
  private trendingTerms: Map<string, number> = new Map();

  async indexPost(post: SearchablePost): Promise<void> {
    this.posts.set(post.id, post);

    // Update trending terms
    for (const tag of post.hashtags) {
      this.trendingTerms.set(tag, (this.trendingTerms.get(tag) || 0) + 1);
    }
  }

  async searchByDate(userId: string, range: { start: Date; end: Date }, additionalFilters?: Partial<SearchQuery>): Promise<SearchResultItem[]> {
    const query: SearchQuery = { ...additionalFilters, dateRange: range };
    return this.executeSearch(userId, query);
  }

  async searchByUser(userId: string, targetUserId: string, additionalFilters?: Partial<SearchQuery>): Promise<SearchResultItem[]> {
    const query: SearchQuery = { ...additionalFilters, authorId: targetUserId };
    return this.executeSearch(userId, query);
  }

  async searchByMedia(userId: string, mediaType: string, additionalFilters?: Partial<SearchQuery>): Promise<SearchResultItem[]> {
    const query: SearchQuery = { ...additionalFilters, mediaType };
    return this.executeSearch(userId, query);
  }

  async combineFilters(userId: string, query: SearchQuery): Promise<{ results: SearchResultItem[]; total: number; took: number; filters: SearchQuery }> {
    const start = Date.now();
    const results = await this.executeSearch(userId, query);
    const took = Date.now() - start;

    return { results: results.slice(0, 50), total: results.length, took, filters: query };
  }

  async getSuggestions(userId: string, partial: string): Promise<SearchSuggestion[]> {
    if (!partial || partial.length < 2) return [];

    const suggestions: SearchSuggestion[] = [];
    const partialLower = partial.toLowerCase();

    // Trending hashtags
    for (const [term, count] of this.trendingTerms) {
      if (term.toLowerCase().startsWith(partialLower)) {
        suggestions.push({ text: `#${term}`, type: 'hashtag', score: count });
      }
    }

    // From search history
    const history = this.searchHistory.get(userId) || [];
    for (const h of history) {
      if (h.toLowerCase().startsWith(partialLower)) {
        suggestions.push({ text: h, type: 'recent', score: 5 });
      }
    }

    // From post content (common terms)
    const termCounts = new Map<string, number>();
    for (const post of this.posts.values()) {
      const words = post.content.toLowerCase().split(/\s+/);
      for (const word of words) {
        if (word.startsWith(partialLower) && word.length > partial.length) {
          termCounts.set(word, (termCounts.get(word) || 0) + 1);
        }
      }
    }

    for (const [term, count] of termCounts) {
      if (count >= 2) {
        suggestions.push({ text: term, type: 'popular', score: count });
      }
    }

    return suggestions
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
  }

  async saveSearch(userId: string, name: string, query: SearchQuery, notifications?: boolean): Promise<SavedSearch> {
    if (!name || name.trim().length === 0) throw new Error('Name is required');

    const userSaved = this.userSavedIndex.get(userId) || [];
    if (userSaved.length >= 25) throw new Error('Maximum 25 saved searches');

    const searchId = `ss_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const saved: SavedSearch = {
      id: searchId,
      userId,
      name: name.trim(),
      query,
      notifications: notifications ?? false,
      lastRun: null,
      resultCount: 0,
      createdAt: new Date(),
    };

    this.savedSearches.set(searchId, saved);
    userSaved.push(searchId);
    this.userSavedIndex.set(userId, userSaved);

    return saved;
  }

  async deleteSavedSearch(searchId: string, userId: string): Promise<void> {
    const saved = this.savedSearches.get(searchId);
    if (!saved) throw new Error('Saved search not found');
    if (saved.userId !== userId) throw new Error('Access denied');

    this.savedSearches.delete(searchId);
    const userSaved = this.userSavedIndex.get(userId) || [];
    this.userSavedIndex.set(userId, userSaved.filter(id => id !== searchId));
  }

  async getSavedSearches(userId: string): Promise<SavedSearch[]> {
    const searchIds = this.userSavedIndex.get(userId) || [];
    return searchIds
      .map(id => this.savedSearches.get(id))
      .filter((s): s is SavedSearch => s !== undefined);
  }

  async runSavedSearch(searchId: string, userId: string): Promise<SearchResultItem[]> {
    const saved = this.savedSearches.get(searchId);
    if (!saved) throw new Error('Saved search not found');
    if (saved.userId !== userId) throw new Error('Access denied');

    const results = await this.executeSearch(userId, saved.query);
    saved.lastRun = new Date();
    saved.resultCount = results.length;

    return results;
  }

  async getHistory(userId: string, limit: number = 20): Promise<string[]> {
    const history = this.searchHistory.get(userId) || [];
    return history.slice(-limit).reverse();
  }

  async clearHistory(userId: string): Promise<void> {
    this.searchHistory.delete(userId);
  }

  async getTrending(limit: number = 20): Promise<Array<{ term: string; count: number }>> {
    return Array.from(this.trendingTerms.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([term, count]) => ({ term, count }));
  }

  private async executeSearch(userId: string, query: SearchQuery): Promise<SearchResultItem[]> {
    const results: SearchResultItem[] = [];

    for (const post of this.posts.values()) {
      const match = this.matchesQuery(post, query);
      if (match.matches) {
        results.push({
          post,
          relevanceScore: match.score,
          matchedFields: match.fields,
          highlights: this.generateHighlights(post, query),
        });
      }
    }

    // Sort results
    switch (query.sortBy) {
      case 'recent': results.sort((a, b) => b.post.createdAt.getTime() - a.post.createdAt.getTime()); break;
      case 'popular': results.sort((a, b) => (b.post.likes + b.post.reposts) - (a.post.likes + a.post.reposts)); break;
      default: results.sort((a, b) => b.relevanceScore - a.relevanceScore);
    }

    // Record search history
    if (query.text) {
      const history = this.searchHistory.get(userId) || [];
      if (!history.includes(query.text)) {
        history.push(query.text);
        if (history.length > 50) history.shift();
        this.searchHistory.set(userId, history);
      }
    }

    return results;
  }

  private matchesQuery(post: SearchablePost, query: SearchQuery): { matches: boolean; score: number; fields: string[] } {
    const fields: string[] = [];
    let score = 0;

    if (query.authorId && post.authorId !== query.authorId) return { matches: false, score: 0, fields: [] };
    if (query.authorId) { fields.push('author'); score += 2; }

    if (query.dateRange) {
      if (post.createdAt < query.dateRange.start || post.createdAt > query.dateRange.end) {
        return { matches: false, score: 0, fields: [] };
      }
      fields.push('date');
      score += 1;
    }

    if (query.mediaType && query.mediaType !== 'none' && post.mediaType !== query.mediaType) {
      return { matches: false, score: 0, fields: [] };
    }
    if (query.mediaType) { fields.push('media'); score += 1; }

    if (query.minLikes && post.likes < query.minLikes) return { matches: false, score: 0, fields: [] };
    if (query.minReposts && post.reposts < query.minReposts) return { matches: false, score: 0, fields: [] };

    if (query.language && post.language !== query.language) return { matches: false, score: 0, fields: [] };

    if (query.hashtags && query.hashtags.length > 0) {
      const hasMatch = query.hashtags.some(h => post.hashtags.includes(h.toLowerCase()));
      if (!hasMatch) return { matches: false, score: 0, fields: [] };
      fields.push('hashtags');
      score += 3;
    }

    if (query.text) {
      const textLower = query.text.toLowerCase();
      const contentLower = post.content.toLowerCase();
      if (!contentLower.includes(textLower)) return { matches: false, score: 0, fields: [] };
      fields.push('content');
      score += 5;
      if (contentLower.startsWith(textLower)) score += 2;
    }

    if (query.excludeWords) {
      const contentLower = post.content.toLowerCase();
      for (const word of query.excludeWords) {
        if (contentLower.includes(word.toLowerCase())) return { matches: false, score: 0, fields: [] };
      }
    }

    const hasAnyFilter = query.text || query.authorId || query.dateRange || query.mediaType || query.hashtags;
    if (!hasAnyFilter) return { matches: false, score: 0, fields: [] };

    return { matches: true, score, fields };
  }

  private generateHighlights(post: SearchablePost, query: SearchQuery): Record<string, string> {
    const highlights: Record<string, string> = {};
    if (query.text) {
      const idx = post.content.toLowerCase().indexOf(query.text.toLowerCase());
      if (idx >= 0) {
        const start = Math.max(0, idx - 20);
        const end = Math.min(post.content.length, idx + query.text.length + 20);
        highlights['content'] = (start > 0 ? '...' : '') + post.content.substring(start, end) + (end < post.content.length ? '...' : '');
      }
    }
    return highlights;
  }
}

export const advancedSearch = new AdvancedSearch();
