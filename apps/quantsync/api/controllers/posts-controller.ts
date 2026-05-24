// ============================================================================
// QuantSync - Posts Controller
// Create/edit/delete posts, reposts, quote posts, media, polls, threads
// ============================================================================

import type { Request, Response } from '../middleware';
import type { Post, PostType, Poll, MediaAttachment } from '../../src/types';
import { feedService } from '../services/feed-service';
import { moderationService } from '../services/moderation-service';
import { searchService } from '../services/search-service';
import { authController } from './auth-controller';

class PostsController {
  private posts: Map<string, Post> = new Map();
  private userPosts: Map<string, string[]> = new Map();

  async createPost(req: Request, res: Response): Promise<void> {
    const userId = req.userId!;
    const body = req.body as {
      content: string;
      type?: PostType;
      mediaAttachments?: MediaAttachment[];
      poll?: { question: string; options: string[]; endsAt: string; isMultipleChoice?: boolean };
      communityId?: string;
      hashtags?: string[];
      mentions?: string[];
      isNSFW?: boolean;
      isSpoiler?: boolean;
      flairId?: string;
      threadPosts?: { content: string; mediaAttachments?: MediaAttachment[] }[];
    };

    if (!body.content && !body.mediaAttachments?.length && !body.poll) {
      res.status(400).json({ success: false, error: { code: 'CONTENT_REQUIRED', message: 'Post must have content, media, or a poll', statusCode: 400 } });
      return;
    }

    // Moderation check
    if (body.content && moderationService.shouldAutoRemove(body.content, userId)) {
      res.status(403).json({ success: false, error: { code: 'CONTENT_BLOCKED', message: 'This content violates our community guidelines', statusCode: 403 } });
      return;
    }

    // Check if user is banned
    if (moderationService.isUserBanned(userId)) {
      res.status(403).json({ success: false, error: { code: 'USER_BANNED', message: 'Your account is currently suspended', statusCode: 403 } });
      return;
    }

    moderationService.recordPost(userId);

    const isAnonymous = authController.isAnonymous(userId);
    const anonymousAlias = isAnonymous ? authController.getAnonymousAlias(userId) : undefined;

    // Extract hashtags from content if not provided
    const hashtags = body.hashtags || this.extractHashtags(body.content || '');
    const mentions = body.mentions || this.extractMentions(body.content || '');

    // Build poll if provided
    let poll: Poll | undefined;
    if (body.poll) {
      poll = {
        id: `poll_${Date.now()}`,
        question: body.poll.question,
        options: body.poll.options.map((text, i) => ({
          id: `opt_${i}`,
          text,
          votes: 0,
          percentage: 0,
        })),
        totalVotes: 0,
        endsAt: body.poll.endsAt,
        isMultipleChoice: body.poll.isMultipleChoice || false,
      };
    }

    const postType: PostType = body.type || (poll ? 'poll' : body.mediaAttachments?.length ? 'media' : 'text');

    const post: Post = {
      id: `post_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      authorId: userId,
      type: isAnonymous ? 'anonymous' : postType,
      content: body.content || '',
      mediaAttachments: body.mediaAttachments || [],
      poll,
      communityId: body.communityId,
      hashtags,
      mentions,
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
      isNSFW: body.isNSFW || false,
      isSpoiler: body.isSpoiler || false,
      isAnonymous,
      anonymousAlias,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Handle thread posts
    if (body.threadPosts && body.threadPosts.length > 0) {
      post.type = 'thread';
      post.threadPosts = body.threadPosts.map((tp, i) => ({
        ...post,
        id: `post_${Date.now()}_thread_${i}`,
        content: tp.content,
        mediaAttachments: tp.mediaAttachments || [],
        type: 'text' as PostType,
        hashtags: this.extractHashtags(tp.content),
        mentions: this.extractMentions(tp.content),
      }));
    }

    this.posts.set(post.id, post);
    feedService.addPost(post);
    searchService.indexPost(post);

    // Track user posts
    const userPostList = this.userPosts.get(userId) || [];
    userPostList.unshift(post.id);
    this.userPosts.set(userId, userPostList);

    res.status(201).json({ success: true, data: post });
  }

  async editPost(req: Request, res: Response): Promise<void> {
    const userId = req.userId!;
    const postId = req.params['id'];
    const body = req.body as { content?: string; hashtags?: string[]; isNSFW?: boolean; isSpoiler?: boolean };

    const post = this.posts.get(postId);
    if (!post) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Post not found', statusCode: 404 } });
      return;
    }

    if (post.authorId !== userId) {
      res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'You can only edit your own posts', statusCode: 403 } });
      return;
    }

    if (body.content !== undefined) post.content = body.content;
    if (body.hashtags) post.hashtags = body.hashtags;
    if (body.isNSFW !== undefined) post.isNSFW = body.isNSFW;
    if (body.isSpoiler !== undefined) post.isSpoiler = body.isSpoiler;
    post.isEdited = true;
    post.updatedAt = new Date().toISOString();

    feedService.updatePost(postId, post);
    searchService.removePostFromIndex(postId);
    searchService.indexPost(post);

    res.status(200).json({ success: true, data: post });
  }

  async deletePost(req: Request, res: Response): Promise<void> {
    const userId = req.userId!;
    const postId = req.params['id'];

    const post = this.posts.get(postId);
    if (!post) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Post not found', statusCode: 404 } });
      return;
    }

    if (post.authorId !== userId) {
      res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'You can only delete your own posts', statusCode: 403 } });
      return;
    }

    this.posts.delete(postId);
    feedService.removePost(postId);
    searchService.removePostFromIndex(postId);

    const userPostList = this.userPosts.get(userId) || [];
    this.userPosts.set(userId, userPostList.filter(id => id !== postId));

    res.status(200).json({ success: true, data: { message: 'Post deleted successfully' } });
  }

  async getPost(req: Request, res: Response): Promise<void> {
    const postId = req.params['id'];
    const post = this.posts.get(postId);

    if (!post) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Post not found', statusCode: 404 } });
      return;
    }

    post.viewCount++;
    res.status(200).json({ success: true, data: post });
  }

  async repost(req: Request, res: Response): Promise<void> {
    const userId = req.userId!;
    const body = req.body as { postId: string };

    const originalPost = this.posts.get(body.postId);
    if (!originalPost) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Original post not found', statusCode: 404 } });
      return;
    }

    const repost: Post = {
      id: `post_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      authorId: userId,
      type: 'repost',
      content: '',
      mediaAttachments: [],
      repostOf: originalPost,
      hashtags: originalPost.hashtags,
      mentions: [],
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
      isNSFW: originalPost.isNSFW,
      isSpoiler: false,
      isAnonymous: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    originalPost.repostCount++;
    this.posts.set(repost.id, repost);
    feedService.addPost(repost);

    res.status(201).json({ success: true, data: repost });
  }

  async quotePost(req: Request, res: Response): Promise<void> {
    const userId = req.userId!;
    const body = req.body as { postId: string; content: string; mediaAttachments?: MediaAttachment[] };

    const originalPost = this.posts.get(body.postId);
    if (!originalPost) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Original post not found', statusCode: 404 } });
      return;
    }

    const quote: Post = {
      id: `post_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      authorId: userId,
      type: 'quote',
      content: body.content,
      mediaAttachments: body.mediaAttachments || [],
      quotedPost: originalPost,
      hashtags: this.extractHashtags(body.content),
      mentions: this.extractMentions(body.content),
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
      isAnonymous: authController.isAnonymous(userId),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.posts.set(quote.id, quote);
    feedService.addPost(quote);

    res.status(201).json({ success: true, data: quote });
  }

  async getUserPosts(req: Request, res: Response): Promise<void> {
    const userId = req.params['userId'];
    const postIds = this.userPosts.get(userId) || [];
    const posts = postIds.map(id => this.posts.get(id)).filter(Boolean);

    res.status(200).json({ success: true, data: posts, meta: { total: posts.length } });
  }

  async votePoll(req: Request, res: Response): Promise<void> {
    const postId = req.params['id'];
    const body = req.body as { optionIds: string[] };

    const post = this.posts.get(postId);
    if (!post || !post.poll) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Poll not found', statusCode: 404 } });
      return;
    }

    if (new Date(post.poll.endsAt) < new Date()) {
      res.status(400).json({ success: false, error: { code: 'POLL_ENDED', message: 'This poll has ended', statusCode: 400 } });
      return;
    }

    for (const optionId of body.optionIds) {
      const option = post.poll.options.find(o => o.id === optionId);
      if (option) {
        option.votes++;
        post.poll.totalVotes++;
      }
    }

    // Recalculate percentages
    for (const option of post.poll.options) {
      option.percentage = post.poll.totalVotes > 0 ? (option.votes / post.poll.totalVotes) * 100 : 0;
    }

    res.status(200).json({ success: true, data: post.poll });
  }

  private extractHashtags(content: string): string[] {
    const matches = content.match(/#(\w+)/g) || [];
    return matches.map(m => m.substring(1).toLowerCase());
  }

  private extractMentions(content: string): string[] {
    const matches = content.match(/@(\w+)/g) || [];
    return matches.map(m => m.substring(1));
  }
}

export const postsController = new PostsController();
export default PostsController;
