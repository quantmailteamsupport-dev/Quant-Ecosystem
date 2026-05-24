// ============================================================================
// QuantSync - Anonymous Controller
// Anonymous posting, confessions, secrets feed
// ============================================================================

import type { Request, Response } from '../middleware';
import type { Post } from '../../src/types';
import { feedService } from '../services/feed-service';
import { moderationService } from '../services/moderation-service';

interface AnonymousPost extends Post {
  confessionCategory?: string;
  anonymousReactions: { emoji: string; count: number }[];
}

class AnonymousController {
  private anonymousPosts: Map<string, AnonymousPost> = new Map();
  private confessionCategories = ['relationship', 'work', 'school', 'family', 'friendship', 'secret', 'confession', 'funny', 'rant', 'advice'];
  private aliasGenerator = {
    adjectives: ['Hidden', 'Silent', 'Mysterious', 'Shadow', 'Phantom', 'Secret', 'Veiled', 'Cryptic', 'Anonymous', 'Unknown'],
    nouns: ['Fox', 'Owl', 'Wolf', 'Raven', 'Ghost', 'Sage', 'Wanderer', 'Dreamer', 'Rebel', 'Spirit'],
  };

  async createAnonymousPost(req: Request, res: Response): Promise<void> {
    const userId = req.userId!;
    const body = req.body as {
      content: string;
      confessionCategory?: string;
      communityId?: string;
      hashtags?: string[];
    };

    if (!body.content) {
      res.status(400).json({ success: false, error: { code: 'CONTENT_REQUIRED', message: 'Post content is required', statusCode: 400 } });
      return;
    }

    // Moderation check (still enforce rules even for anonymous posts)
    if (moderationService.shouldAutoRemove(body.content, userId)) {
      res.status(403).json({ success: false, error: { code: 'CONTENT_BLOCKED', message: 'This content violates community guidelines', statusCode: 403 } });
      return;
    }

    const alias = this.generateAlias();
    const hashtags = body.hashtags || this.extractHashtags(body.content);
    if (body.confessionCategory) hashtags.push(body.confessionCategory);

    const post: AnonymousPost = {
      id: `anon_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      authorId: userId, // Stored internally but never exposed
      type: 'anonymous',
      content: body.content,
      mediaAttachments: [],
      hashtags,
      mentions: [],
      communityId: body.communityId,
      upvotes: 0,
      downvotes: 0,
      score: 0,
      commentCount: 0,
      repostCount: 0,
      shareCount: 0,
      bookmarkCount: 0,
      viewCount: 0,
      isEdited: false,
      isPinned: false,
      isLocked: false,
      isNSFW: false,
      isSpoiler: false,
      isAnonymous: true,
      anonymousAlias: alias,
      confessionCategory: body.confessionCategory,
      anonymousReactions: [
        { emoji: 'relate', count: 0 },
        { emoji: 'support', count: 0 },
        { emoji: 'shocked', count: 0 },
        { emoji: 'funny', count: 0 },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.anonymousPosts.set(post.id, post);
    feedService.addPost(post);

    // Return post without authorId for privacy
    const { authorId: _, ...safePost } = post;
    res.status(201).json({ success: true, data: { ...safePost, authorId: 'anonymous' } });
  }

  async getAnonymousFeed(req: Request, res: Response): Promise<void> {
    const query = req.query as Record<string, string>;
    const category = query['category'] || undefined;
    const sortBy = query['sort'] || 'hot';
    const limit = Math.min(parseInt(query['limit'] || '20', 10), 50);
    const cursor = query['cursor'];

    let posts = Array.from(this.anonymousPosts.values());

    if (category) {
      posts = posts.filter(p => p.confessionCategory === category);
    }

    switch (sortBy) {
      case 'hot':
        posts.sort((a, b) => {
          const aHot = (a.upvotes - a.downvotes) / Math.pow((Date.now() - new Date(a.createdAt).getTime()) / 3600000 + 2, 1.5);
          const bHot = (b.upvotes - b.downvotes) / Math.pow((Date.now() - new Date(b.createdAt).getTime()) / 3600000 + 2, 1.5);
          return bHot - aHot;
        });
        break;
      case 'new':
        posts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      case 'top':
        posts.sort((a, b) => b.score - a.score);
        break;
    }

    let startIndex = 0;
    if (cursor) {
      const idx = posts.findIndex(p => p.id === cursor);
      startIndex = idx >= 0 ? idx + 1 : 0;
    }

    const paginated = posts.slice(startIndex, startIndex + limit);

    // Strip authorIds for all anonymous posts
    const safePosts = paginated.map(p => {
      const { authorId: _, ...safe } = p;
      return { ...safe, authorId: 'anonymous' };
    });

    res.status(200).json({
      success: true,
      data: safePosts,
      meta: {
        total: posts.length,
        hasMore: startIndex + limit < posts.length,
        nextCursor: paginated.length > 0 ? paginated[paginated.length - 1].id : undefined,
        categories: this.confessionCategories,
      },
    });
  }

  async reactToAnonymousPost(req: Request, res: Response): Promise<void> {
    const postId = req.params['id'];
    const body = req.body as { reaction: string };

    const post = this.anonymousPosts.get(postId);
    if (!post) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Post not found', statusCode: 404 } });
      return;
    }

    const reaction = post.anonymousReactions.find(r => r.emoji === body.reaction);
    if (reaction) {
      reaction.count++;
    } else {
      post.anonymousReactions.push({ emoji: body.reaction, count: 1 });
    }

    res.status(200).json({ success: true, data: { reactions: post.anonymousReactions } });
  }

  async getConfessionCategories(req: Request, res: Response): Promise<void> {
    res.status(200).json({
      success: true,
      data: this.confessionCategories.map(cat => ({
        id: cat,
        name: cat.charAt(0).toUpperCase() + cat.slice(1),
        postCount: Array.from(this.anonymousPosts.values()).filter(p => p.confessionCategory === cat).length,
      })),
    });
  }

  async deleteOwnAnonymousPost(req: Request, res: Response): Promise<void> {
    const userId = req.userId!;
    const postId = req.params['id'];

    const post = this.anonymousPosts.get(postId);
    if (!post) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Post not found', statusCode: 404 } });
      return;
    }

    if (post.authorId !== userId) {
      res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'You can only delete your own posts', statusCode: 403 } });
      return;
    }

    this.anonymousPosts.delete(postId);
    feedService.removePost(postId);
    res.status(200).json({ success: true, data: { deleted: true } });
  }

  private generateAlias(): string {
    const adj = this.aliasGenerator.adjectives[Math.floor(Math.random() * this.aliasGenerator.adjectives.length)];
    const noun = this.aliasGenerator.nouns[Math.floor(Math.random() * this.aliasGenerator.nouns.length)];
    return `${adj}${noun}${Math.floor(Math.random() * 99)}`;
  }

  private extractHashtags(content: string): string[] {
    const matches = content.match(/#(\w+)/g) || [];
    return matches.map(m => m.substring(1).toLowerCase());
  }
}

export const anonymousController = new AnonymousController();
export default AnonymousController;
