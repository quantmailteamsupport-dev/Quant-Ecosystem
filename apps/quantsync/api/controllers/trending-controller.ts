// ============================================================================
// QuantSync - Trending Controller
// Trending topics, hashtags, explore, search
// ============================================================================

import type { Request, Response } from '../middleware';
import type { TrendingTopic } from '../../src/types';
import { feedService } from '../services/feed-service';
import { searchService } from '../services/search-service';
import { aiService } from '../services/ai-service';

class TrendingController {
  private trendingTopics: Map<string, TrendingTopic> = new Map();

  async getTrending(req: Request, res: Response): Promise<void> {
    const query = req.query as Record<string, string>;
    const category = query['category'] || undefined;
    const limit = Math.min(parseInt(query['limit'] || '20', 10), 50);

    const topics = this.computeTrendingTopics(limit, category);

    res.status(200).json({
      success: true,
      data: topics,
      meta: { total: topics.length, updatedAt: new Date().toISOString() },
    });
  }

  async getExplore(req: Request, res: Response): Promise<void> {
    const query = req.query as Record<string, string>;
    const category = query['category'] || undefined;

    const trendingTopics = this.computeTrendingTopics(10);
    const trendingSearches = searchService.getTrendingSearches(5);
    const trendingHashtags = feedService.getTrendingTopics(10);

    res.status(200).json({
      success: true,
      data: {
        topics: trendingTopics,
        searches: trendingSearches,
        hashtags: trendingHashtags.map(h => ({ hashtag: `#${h}`, postCount: Math.floor(Math.random() * 1000) })),
        categories: ['technology', 'gaming', 'sports', 'entertainment', 'science', 'politics', 'finance'],
      },
    });
  }

  async search(req: Request, res: Response): Promise<void> {
    const userId = req.userId!;
    const query = req.query as Record<string, string>;
    const searchQuery = query['q'] || '';
    const type = query['type'] as any || 'all';
    const sortBy = query['sort'] as any || 'relevance';
    const timeRange = query['time'] || 'all';

    if (!searchQuery) {
      res.status(400).json({ success: false, error: { code: 'QUERY_REQUIRED', message: 'Search query is required', statusCode: 400 } });
      return;
    }

    searchService.recordSearch(userId, searchQuery);
    const results = searchService.search(searchQuery, { type, sortBy, timeRange });

    res.status(200).json({
      success: true,
      data: results,
      meta: { query: searchQuery, type, total: results.length },
    });
  }

  async getSuggestions(req: Request, res: Response): Promise<void> {
    const query = req.query as Record<string, string>;
    const prefix = query['q'] || '';

    if (!prefix) {
      res.status(200).json({ success: true, data: [] });
      return;
    }

    const suggestions = searchService.getSuggestions(prefix, 8);
    res.status(200).json({ success: true, data: suggestions });
  }

  async getSearchHistory(req: Request, res: Response): Promise<void> {
    const userId = req.userId!;
    const history = searchService.getSearchHistory(userId);
    res.status(200).json({ success: true, data: history });
  }

  async clearSearchHistory(req: Request, res: Response): Promise<void> {
    const userId = req.userId!;
    searchService.clearSearchHistory(userId);
    res.status(200).json({ success: true, data: { message: 'Search history cleared' } });
  }

  async getHashtagPosts(req: Request, res: Response): Promise<void> {
    const userId = req.userId!;
    const hashtag = req.params['hashtag'];

    const feed = await feedService.getFeed(userId, {
      mode: 'trending',
      hashtag,
      limit: 20,
    });

    res.status(200).json({
      success: true,
      data: { hashtag: `#${hashtag}`, posts: feed.posts, postCount: feed.metadata.totalEstimate },
    });
  }

  // --- Private Helpers ---

  private computeTrendingTopics(limit: number, category?: string): TrendingTopic[] {
    const rawTopics = feedService.getTrendingTopics(limit * 2);
    const topics: TrendingTopic[] = rawTopics.map((hashtag, i) => {
      const existing = this.trendingTopics.get(hashtag);
      if (existing) return existing;

      const topic: TrendingTopic = {
        id: `trend_${hashtag}`,
        name: hashtag.charAt(0).toUpperCase() + hashtag.slice(1),
        hashtag: `#${hashtag}`,
        category: this.categorizeHashtag(hashtag),
        postCount: Math.floor(Math.random() * 5000) + 100,
        trendingScore: 100 - i * 5,
        velocity: Math.random() * 3 + 0.5,
        peakTime: new Date(Date.now() + Math.random() * 3600000).toISOString(),
        relatedTopics: rawTopics.filter(t => t !== hashtag).slice(0, 3),
      };
      this.trendingTopics.set(hashtag, topic);
      return topic;
    });

    let filtered = topics;
    if (category) {
      filtered = topics.filter(t => t.category === category);
    }

    return filtered.slice(0, limit);
  }

  private categorizeHashtag(hashtag: string): string {
    const categories: Record<string, string[]> = {
      technology: ['ai', 'tech', 'code', 'software', 'web', 'app', 'data', 'crypto', 'blockchain'],
      gaming: ['gaming', 'game', 'esports', 'playstation', 'xbox', 'nintendo', 'steam'],
      sports: ['sports', 'football', 'basketball', 'soccer', 'tennis', 'nba', 'nfl'],
      entertainment: ['movies', 'tv', 'music', 'celebrity', 'netflix', 'streaming'],
      science: ['science', 'space', 'research', 'physics', 'biology', 'climate'],
      politics: ['politics', 'election', 'government', 'policy', 'democracy'],
      finance: ['finance', 'stocks', 'market', 'investing', 'economy', 'bitcoin'],
    };

    const lower = hashtag.toLowerCase();
    for (const [cat, keywords] of Object.entries(categories)) {
      if (keywords.some(k => lower.includes(k))) return cat;
    }
    return 'general';
  }
}

export const trendingController = new TrendingController();
export default TrendingController;
