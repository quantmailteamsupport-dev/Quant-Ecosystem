// ============================================================================
// QuantSync - Feed Controller
// Personalized feed, trending, for-you algorithm, chronological, anonymous feed
// ============================================================================

import type { Request, Response } from '../middleware';
import type { FeedMode, FeedRequest } from '../../src/types';
import { feedService } from '../services/feed-service';

class FeedController {
  async getFeed(req: Request, res: Response): Promise<void> {
    const userId = req.userId!;
    const query = req.query as Record<string, string>;

    const mode = (query['mode'] as FeedMode) || 'for-you';
    const validModes: FeedMode[] = ['for-you', 'following', 'chronological', 'anonymous', 'trending'];

    if (!validModes.includes(mode)) {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_MODE', message: `Invalid feed mode. Must be one of: ${validModes.join(', ')}`, statusCode: 400 },
      });
      return;
    }

    const request: FeedRequest = {
      mode,
      cursor: query['cursor'] || undefined,
      limit: Math.min(parseInt(query['limit'] || '20', 10), 50),
      communityId: query['communityId'] || undefined,
      hashtag: query['hashtag'] || undefined,
    };

    const feed = await feedService.getFeed(userId, request);

    res.status(200).json({
      success: true,
      data: feed.posts,
      meta: {
        mode: feed.metadata.mode,
        nextCursor: feed.nextCursor,
        hasMore: feed.hasMore,
        totalEstimate: feed.metadata.totalEstimate,
        refreshedAt: feed.metadata.refreshedAt,
      },
    });
  }

  async getForYouFeed(req: Request, res: Response): Promise<void> {
    const userId = req.userId!;
    const query = req.query as Record<string, string>;

    const request: FeedRequest = {
      mode: 'for-you',
      cursor: query['cursor'],
      limit: Math.min(parseInt(query['limit'] || '20', 10), 50),
    };

    const feed = await feedService.getFeed(userId, request);
    res.status(200).json({ success: true, data: feed.posts, meta: { nextCursor: feed.nextCursor, hasMore: feed.hasMore } });
  }

  async getFollowingFeed(req: Request, res: Response): Promise<void> {
    const userId = req.userId!;
    const query = req.query as Record<string, string>;

    const request: FeedRequest = {
      mode: 'following',
      cursor: query['cursor'],
      limit: Math.min(parseInt(query['limit'] || '20', 10), 50),
    };

    const feed = await feedService.getFeed(userId, request);
    res.status(200).json({ success: true, data: feed.posts, meta: { nextCursor: feed.nextCursor, hasMore: feed.hasMore } });
  }

  async getTrendingFeed(req: Request, res: Response): Promise<void> {
    const userId = req.userId!;
    const query = req.query as Record<string, string>;

    const request: FeedRequest = {
      mode: 'trending',
      cursor: query['cursor'],
      limit: Math.min(parseInt(query['limit'] || '20', 10), 50),
    };

    const feed = await feedService.getFeed(userId, request);
    res.status(200).json({ success: true, data: feed.posts, meta: { nextCursor: feed.nextCursor, hasMore: feed.hasMore } });
  }

  async getAnonymousFeed(req: Request, res: Response): Promise<void> {
    const userId = req.userId!;
    const query = req.query as Record<string, string>;

    const request: FeedRequest = {
      mode: 'anonymous',
      cursor: query['cursor'],
      limit: Math.min(parseInt(query['limit'] || '20', 10), 50),
    };

    const feed = await feedService.getFeed(userId, request);
    res.status(200).json({ success: true, data: feed.posts, meta: { nextCursor: feed.nextCursor, hasMore: feed.hasMore } });
  }

  async trackEngagement(req: Request, res: Response): Promise<void> {
    const userId = req.userId!;
    const body = req.body as { postId: string; type: 'view' | 'like' | 'comment' | 'share' | 'bookmark' | 'dwell'; duration?: number };

    if (!body.postId || !body.type) {
      res.status(400).json({ success: false, error: { code: 'MISSING_FIELDS', message: 'postId and type are required', statusCode: 400 } });
      return;
    }

    feedService.trackEngagement(userId, body.postId, body.type, body.duration);
    res.status(200).json({ success: true, data: { tracked: true } });
  }
}

export const feedController = new FeedController();
export default FeedController;
