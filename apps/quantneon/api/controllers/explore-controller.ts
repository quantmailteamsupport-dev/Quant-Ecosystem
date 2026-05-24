// ============================================================================
// QuantNeon API - Explore Controller
// Explore feed, categories, trending, hashtags, locations, curated collections
// ============================================================================

import type { Request, Response } from '../middleware';
import { feedService } from '../services/feed-service';

class ExploreController {
  async getExploreFeed(req: Request, res: Response): Promise<void> {
    const query = req.query as any;
    const page = parseInt((query.page as string) || '1');
    const feed = feedService.generateExploreFeed(req.userId || '', page);
    res.status(200).json({ success: true, data: { feed, page } });
  }

  async getCategories(req: Request, res: Response): Promise<void> {
    const categories = [
      { id: 'fashion', name: 'Fashion', icon: 'shirt', postCount: 1500000 },
      { id: 'food', name: 'Food & Drink', icon: 'utensils', postCount: 2100000 },
      { id: 'travel', name: 'Travel', icon: 'plane', postCount: 1800000 },
      { id: 'fitness', name: 'Fitness', icon: 'dumbbell', postCount: 900000 },
      { id: 'art', name: 'Art & Design', icon: 'palette', postCount: 750000 },
      { id: 'music', name: 'Music', icon: 'music', postCount: 1200000 },
      { id: 'tech', name: 'Technology', icon: 'laptop', postCount: 650000 },
      { id: 'gaming', name: 'Gaming', icon: 'gamepad', postCount: 1100000 },
      { id: 'beauty', name: 'Beauty', icon: 'sparkles', postCount: 1400000 },
      { id: 'nature', name: 'Nature', icon: 'leaf', postCount: 800000 },
    ];
    res.status(200).json({ success: true, data: { categories } });
  }

  async getTrending(req: Request, res: Response): Promise<void> {
    const trending = feedService.getTrendingContent();
    res.status(200).json({ success: true, data: { trending } });
  }

  async getHashtag(req: Request, res: Response): Promise<void> {
    const tag = req.params.tag;
    const hashtagData = feedService.getHashtagData(tag);
    res.status(200).json({ success: true, data: { hashtag: tag, ...hashtagData } });
  }

  async getTrendingHashtags(req: Request, res: Response): Promise<void> {
    const hashtags = [
      { tag: 'photography', postCount: 890000, trending: true },
      { tag: 'ootd', postCount: 560000, trending: true },
      { tag: 'sunset', postCount: 450000, trending: false },
      { tag: 'foodie', postCount: 720000, trending: true },
      { tag: 'fitness', postCount: 380000, trending: false },
      { tag: 'travel', postCount: 950000, trending: true },
      { tag: 'art', postCount: 410000, trending: true },
    ];
    res.status(200).json({ success: true, data: { hashtags } });
  }

  async getLocationPosts(req: Request, res: Response): Promise<void> {
    res.status(200).json({ success: true, data: { locationId: req.params.locationId, posts: [], topPosts: [], recentPosts: [] } });
  }

  async getCuratedCollections(req: Request, res: Response): Promise<void> {
    const collections = [
      { id: 'col_editors', title: 'Editor\'s Picks', description: 'Hand-picked content', coverUrl: '/collections/editors.jpg', postCount: 50 },
      { id: 'col_new_creators', title: 'Rising Stars', description: 'New creators to follow', coverUrl: '/collections/rising.jpg', postCount: 30 },
      { id: 'col_seasonal', title: 'Seasonal Best', description: 'Best of the season', coverUrl: '/collections/seasonal.jpg', postCount: 40 },
    ];
    res.status(200).json({ success: true, data: { collections } });
  }

  async search(req: Request, res: Response): Promise<void> {
    const query = req.query as any;
    const q = (query.q as string || '').toLowerCase();
    const type = query.type || 'all';
    const results = feedService.search(q, type);
    res.status(200).json({ success: true, data: { query: q, type, results } });
  }
}

export const exploreController = new ExploreController();
