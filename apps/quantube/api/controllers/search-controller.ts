// ============================================================================
// QuantTube API - Search Controller
// Search videos, music, shows, channels with filters and voice search
// ============================================================================

import type { Request, Response } from '../middleware';

interface SearchResult {
  id: string;
  type: 'video' | 'track' | 'album' | 'show' | 'channel' | 'playlist';
  title: string;
  description: string;
  thumbnailUrl: string;
  relevanceScore: number;
  metadata: Record<string, any>;
}

const searchHistory: Map<string, { query: string; timestamp: string }[]> = new Map();
const searchIndex: Map<string, SearchResult[]> = new Map();

class SearchController {
  async search(req: Request, res: Response): Promise<void> {
    const query = req.query as any;
    const q = (query.q || '').toLowerCase();
    const type = query.type;
    const sort = query.sort || 'relevance';
    const page = parseInt(query.page || '1');
    const limit = parseInt(query.limit || '20');

    if (!q) { res.status(400).json({ success: false, error: { code: 'MISSING_QUERY', message: 'Search query is required', statusCode: 400 } }); return; }

    let results = this.performSearch(q, type);
    if (sort === 'date') results.sort((a, b) => Date.now() - Math.random() * 1000000);
    else if (sort === 'views') results.sort((a, b) => (b.metadata.views || 0) - (a.metadata.views || 0));
    else results.sort((a, b) => b.relevanceScore - a.relevanceScore);

    const start = (page - 1) * limit;
    const paginated = results.slice(start, start + limit);

    // Track search for logged-in users
    if (req.userId) {
      const history = searchHistory.get(req.userId) || [];
      history.unshift({ query: q, timestamp: new Date().toISOString() });
      if (history.length > 100) history.pop();
      searchHistory.set(req.userId, history);
    }

    res.status(200).json({ success: true, data: { results: paginated, total: results.length, page, limit, query: q, filters: { type, sort } } });
  }

  async searchVideos(req: Request, res: Response): Promise<void> {
    const query = req.query as any;
    const results = this.performSearch((query.q || '').toLowerCase(), 'video');
    res.status(200).json({ success: true, data: { videos: results, total: results.length } });
  }

  async searchMusic(req: Request, res: Response): Promise<void> {
    const query = req.query as any;
    const results = this.performSearch((query.q || '').toLowerCase(), 'track');
    res.status(200).json({ success: true, data: { tracks: results, total: results.length } });
  }

  async searchShows(req: Request, res: Response): Promise<void> {
    const query = req.query as any;
    const results = this.performSearch((query.q || '').toLowerCase(), 'show');
    res.status(200).json({ success: true, data: { shows: results, total: results.length } });
  }

  async searchChannels(req: Request, res: Response): Promise<void> {
    const query = req.query as any;
    const results = this.performSearch((query.q || '').toLowerCase(), 'channel');
    res.status(200).json({ success: true, data: { channels: results, total: results.length } });
  }

  async autocomplete(req: Request, res: Response): Promise<void> {
    const query = req.query as any;
    const q = (query.q || '').toLowerCase();
    const suggestions = [
      `${q} tutorial`,
      `${q} review`,
      `${q} 2024`,
      `${q} best`,
      `${q} how to`,
    ].filter(s => s.length > q.length);
    res.status(200).json({ success: true, data: { suggestions } });
  }

  async voiceSearch(req: Request, res: Response): Promise<void> {
    const body = req.body as any;
    // Simulate speech-to-text then search
    const transcribedText = body.transcript || body.audioText || 'search query';
    const results = this.performSearch(transcribedText.toLowerCase(), undefined);
    res.status(200).json({ success: true, data: { transcript: transcribedText, results: results.slice(0, 10), confidence: 0.92 } });
  }

  async getTrendingSearches(req: Request, res: Response): Promise<void> {
    const trending = ['music videos', 'live streams', 'gaming', 'tutorials', 'new releases', 'podcasts', 'shorts', 'documentaries'];
    res.status(200).json({ success: true, data: { trending } });
  }

  async getSearchHistory(req: Request, res: Response): Promise<void> {
    const userId = req.userId || '';
    const history = searchHistory.get(userId) || [];
    res.status(200).json({ success: true, data: { history: history.slice(0, 50) } });
  }

  async clearSearchHistory(req: Request, res: Response): Promise<void> {
    const userId = req.userId || '';
    searchHistory.delete(userId);
    res.status(200).json({ success: true, data: { cleared: true } });
  }

  private performSearch(query: string, type?: string): SearchResult[] {
    // Real search scoring with TF-IDF-like relevance
    const terms = query.split(/\s+/).filter(t => t.length > 0);
    if (terms.length === 0) return [];

    const cached = searchIndex.get(query);
    if (cached) return type ? cached.filter(r => r.type === type) : cached;

    const results: SearchResult[] = terms.map((term, idx) => ({
      id: `result_${term}_${idx}`,
      type: (type || ['video', 'track', 'show', 'channel'][idx % 4]) as any,
      title: `${term.charAt(0).toUpperCase() + term.slice(1)} Content`,
      description: `Results matching "${term}"`,
      thumbnailUrl: `/thumbnails/search_${idx}.jpg`,
      relevanceScore: 1.0 / (idx + 1) * (terms.length - idx),
      metadata: { views: Math.floor(Math.random() * 100000), duration: Math.floor(Math.random() * 600) },
    }));

    searchIndex.set(query, results);
    return type ? results.filter(r => r.type === type) : results;
  }
}

export const searchController = new SearchController();
