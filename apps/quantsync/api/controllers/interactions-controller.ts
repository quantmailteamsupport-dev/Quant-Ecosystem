// ============================================================================
// QuantSync - Interactions Controller
// Upvote/downvote, comments, nested replies, likes, bookmarks, shares
// ============================================================================

import type { Request, Response } from '../middleware';
import type { Comment, Post } from '../../src/types';
import { feedService } from '../services/feed-service';

class InteractionsController {
  private comments: Map<string, Comment> = new Map();
  private postComments: Map<string, string[]> = new Map(); // postId -> commentIds
  private userVotes: Map<string, Map<string, 'up' | 'down'>> = new Map(); // userId -> (targetId -> vote)
  private userBookmarks: Map<string, Set<string>> = new Map(); // userId -> postIds

  async upvote(req: Request, res: Response): Promise<void> {
    const userId = req.userId!;
    const targetId = req.params['id'];
    const body = req.body as { targetType: 'post' | 'comment' };

    const votes = this.getUserVoteMap(userId);
    const currentVote = votes.get(targetId);

    let scoreChange = 0;
    if (currentVote === 'up') {
      // Remove upvote
      votes.delete(targetId);
      scoreChange = -1;
    } else if (currentVote === 'down') {
      // Switch from down to up
      votes.set(targetId, 'up');
      scoreChange = 2; // remove downvote + add upvote
    } else {
      // New upvote
      votes.set(targetId, 'up');
      scoreChange = 1;
    }

    this.applyScoreChange(targetId, body.targetType || 'post', scoreChange, 'up', currentVote);
    feedService.trackEngagement(userId, targetId, 'like');

    res.status(200).json({
      success: true,
      data: { vote: votes.get(targetId) || null, scoreChange },
    });
  }

  async downvote(req: Request, res: Response): Promise<void> {
    const userId = req.userId!;
    const targetId = req.params['id'];
    const body = req.body as { targetType: 'post' | 'comment' };

    const votes = this.getUserVoteMap(userId);
    const currentVote = votes.get(targetId);

    let scoreChange = 0;
    if (currentVote === 'down') {
      votes.delete(targetId);
      scoreChange = 1; // remove downvote
    } else if (currentVote === 'up') {
      votes.set(targetId, 'down');
      scoreChange = -2; // remove upvote + add downvote
    } else {
      votes.set(targetId, 'down');
      scoreChange = -1;
    }

    this.applyScoreChange(targetId, body.targetType || 'post', scoreChange, 'down', currentVote);

    res.status(200).json({
      success: true,
      data: { vote: votes.get(targetId) || null, scoreChange },
    });
  }

  async createComment(req: Request, res: Response): Promise<void> {
    const userId = req.userId!;
    const postId = req.params['postId'];
    const body = req.body as { content: string; parentId?: string; mediaAttachments?: any[] };

    if (!body.content) {
      res.status(400).json({ success: false, error: { code: 'CONTENT_REQUIRED', message: 'Comment content is required', statusCode: 400 } });
      return;
    }

    let depth = 0;
    if (body.parentId) {
      const parent = this.comments.get(body.parentId);
      if (parent) depth = parent.depth + 1;
      if (depth > 10) {
        res.status(400).json({ success: false, error: { code: 'MAX_DEPTH', message: 'Maximum reply depth reached', statusCode: 400 } });
        return;
      }
    }

    const comment: Comment = {
      id: `comment_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      postId,
      parentId: body.parentId,
      authorId: userId,
      content: body.content,
      mediaAttachments: body.mediaAttachments || [],
      upvotes: 0,
      downvotes: 0,
      score: 0,
      replyCount: 0,
      depth,
      isEdited: false,
      isAnonymous: false,
      isOP: false,
      isModerator: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.comments.set(comment.id, comment);

    // Track on post
    const postCommentList = this.postComments.get(postId) || [];
    postCommentList.push(comment.id);
    this.postComments.set(postId, postCommentList);

    // Update parent reply count
    if (body.parentId) {
      const parent = this.comments.get(body.parentId);
      if (parent) parent.replyCount++;
    }

    // Update post comment count
    const post = feedService.getPost(postId);
    if (post) {
      feedService.updatePost(postId, { commentCount: post.commentCount + 1 });
    }

    feedService.trackEngagement(userId, postId, 'comment');

    res.status(201).json({ success: true, data: comment });
  }

  async getComments(req: Request, res: Response): Promise<void> {
    const postId = req.params['postId'];
    const query = req.query as Record<string, string>;
    const sortBy = query['sort'] || 'best';
    const parentId = query['parentId'] || undefined;

    const commentIds = this.postComments.get(postId) || [];
    let comments = commentIds
      .map(id => this.comments.get(id))
      .filter((c): c is Comment => c !== undefined);

    // Filter by parent
    if (parentId) {
      comments = comments.filter(c => c.parentId === parentId);
    } else {
      comments = comments.filter(c => !c.parentId); // Top-level only
    }

    // Sort
    switch (sortBy) {
      case 'best':
        comments.sort((a, b) => b.score - a.score);
        break;
      case 'new':
        comments.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      case 'controversial':
        comments.sort((a, b) => {
          const aControversy = Math.min(a.upvotes, a.downvotes) / (Math.max(a.upvotes, a.downvotes) || 1);
          const bControversy = Math.min(b.upvotes, b.downvotes) / (Math.max(b.upvotes, b.downvotes) || 1);
          return bControversy - aControversy;
        });
        break;
    }

    // Build nested thread structure
    const threaded = this.buildCommentTree(comments);

    res.status(200).json({ success: true, data: threaded, meta: { total: comments.length, sortBy } });
  }

  async editComment(req: Request, res: Response): Promise<void> {
    const userId = req.userId!;
    const commentId = req.params['commentId'];
    const body = req.body as { content: string };

    const comment = this.comments.get(commentId);
    if (!comment) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Comment not found', statusCode: 404 } });
      return;
    }

    if (comment.authorId !== userId) {
      res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'You can only edit your own comments', statusCode: 403 } });
      return;
    }

    comment.content = body.content;
    comment.isEdited = true;
    comment.updatedAt = new Date().toISOString();

    res.status(200).json({ success: true, data: comment });
  }

  async deleteComment(req: Request, res: Response): Promise<void> {
    const userId = req.userId!;
    const commentId = req.params['commentId'];

    const comment = this.comments.get(commentId);
    if (!comment) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Comment not found', statusCode: 404 } });
      return;
    }

    if (comment.authorId !== userId) {
      res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'You can only delete your own comments', statusCode: 403 } });
      return;
    }

    this.comments.delete(commentId);
    const postCommentList = this.postComments.get(comment.postId) || [];
    this.postComments.set(comment.postId, postCommentList.filter(id => id !== commentId));

    res.status(200).json({ success: true, data: { message: 'Comment deleted' } });
  }

  async bookmark(req: Request, res: Response): Promise<void> {
    const userId = req.userId!;
    const postId = req.params['id'];

    if (!this.userBookmarks.has(userId)) this.userBookmarks.set(userId, new Set());
    const bookmarks = this.userBookmarks.get(userId)!;

    const isBookmarked = bookmarks.has(postId);
    if (isBookmarked) {
      bookmarks.delete(postId);
    } else {
      bookmarks.add(postId);
      feedService.trackEngagement(userId, postId, 'bookmark');
    }

    const post = feedService.getPost(postId);
    if (post) {
      feedService.updatePost(postId, { bookmarkCount: post.bookmarkCount + (isBookmarked ? -1 : 1) });
    }

    res.status(200).json({ success: true, data: { bookmarked: !isBookmarked } });
  }

  async getBookmarks(req: Request, res: Response): Promise<void> {
    const userId = req.userId!;
    const bookmarks = this.userBookmarks.get(userId) || new Set();
    const posts = Array.from(bookmarks).map(id => feedService.getPost(id)).filter(Boolean);

    res.status(200).json({ success: true, data: posts });
  }

  async share(req: Request, res: Response): Promise<void> {
    const userId = req.userId!;
    const postId = req.params['id'];

    const post = feedService.getPost(postId);
    if (!post) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Post not found', statusCode: 404 } });
      return;
    }

    feedService.updatePost(postId, { shareCount: post.shareCount + 1 });
    feedService.trackEngagement(userId, postId, 'share');

    res.status(200).json({ success: true, data: { shared: true, shareCount: post.shareCount + 1 } });
  }

  // --- Helpers ---

  private getUserVoteMap(userId: string): Map<string, 'up' | 'down'> {
    if (!this.userVotes.has(userId)) this.userVotes.set(userId, new Map());
    return this.userVotes.get(userId)!;
  }

  private applyScoreChange(targetId: string, targetType: 'post' | 'comment', scoreChange: number, newVote: 'up' | 'down', oldVote?: 'up' | 'down' | null): void {
    if (targetType === 'post') {
      const post = feedService.getPost(targetId);
      if (post) {
        const updates: Partial<Post> = { score: post.score + scoreChange };
        if (newVote === 'up' && oldVote !== 'up') updates.upvotes = post.upvotes + 1;
        if (newVote === 'down' && oldVote !== 'down') updates.downvotes = post.downvotes + 1;
        if (oldVote === 'up' && newVote !== 'up') updates.upvotes = (updates.upvotes ?? post.upvotes) - 1;
        if (oldVote === 'down' && newVote !== 'down') updates.downvotes = (updates.downvotes ?? post.downvotes) - 1;
        feedService.updatePost(targetId, updates);
      }
    } else {
      const comment = this.comments.get(targetId);
      if (comment) {
        comment.score += scoreChange;
        if (scoreChange > 0) comment.upvotes += Math.max(scoreChange, 0);
        if (scoreChange < 0) comment.downvotes += Math.abs(Math.min(scoreChange, 0));
      }
    }
  }

  private buildCommentTree(comments: Comment[]): Comment[] {
    // For top-level comments, attach first-level replies
    return comments.map(comment => {
      const replies = Array.from(this.comments.values())
        .filter(c => c.parentId === comment.id)
        .sort((a, b) => b.score - a.score)
        .slice(0, 5); // Top 5 replies
      return { ...comment, replies };
    });
  }
}

export const interactionsController = new InteractionsController();
export default InteractionsController;
