// ============================================================================
// QuantTube API - Interactions Controller
// Like, comment, subscribe, share, save, watch later, history, report
// ============================================================================

import type { Request, Response } from '../middleware';

interface Comment {
  id: string;
  contentId: string;
  userId: string;
  username: string;
  text: string;
  likes: number;
  replies: Comment[];
  parentId?: string;
  createdAt: string;
  updatedAt: string;
}

const likes: Map<string, Set<string>> = new Map();
const dislikes: Map<string, Set<string>> = new Map();
const comments: Map<string, Comment[]> = new Map();
const watchLater: Map<string, string[]> = new Map();
const saved: Map<string, string[]> = new Map();
const history: Map<string, { contentId: string; watchedAt: string; progress: number }[]> = new Map();

class InteractionsController {
  async like(req: Request, res: Response): Promise<void> {
    const body = req.body as any;
    const userId = req.userId || '';
    const contentId = body.contentId;
    const contentLikes = likes.get(contentId) || new Set();
    contentLikes.add(userId);
    likes.set(contentId, contentLikes);
    // Remove from dislikes if present
    const contentDislikes = dislikes.get(contentId) || new Set();
    contentDislikes.delete(userId);
    dislikes.set(contentId, contentDislikes);
    res.status(200).json({ success: true, data: { liked: true, likeCount: contentLikes.size } });
  }

  async unlike(req: Request, res: Response): Promise<void> {
    const userId = req.userId || '';
    const contentId = req.params.contentId;
    const contentLikes = likes.get(contentId) || new Set();
    contentLikes.delete(userId);
    likes.set(contentId, contentLikes);
    res.status(200).json({ success: true, data: { liked: false, likeCount: contentLikes.size } });
  }

  async dislike(req: Request, res: Response): Promise<void> {
    const body = req.body as any;
    const userId = req.userId || '';
    const contentId = body.contentId;
    const contentDislikes = dislikes.get(contentId) || new Set();
    contentDislikes.add(userId);
    dislikes.set(contentId, contentDislikes);
    const contentLikes = likes.get(contentId) || new Set();
    contentLikes.delete(userId);
    likes.set(contentId, contentLikes);
    res.status(200).json({ success: true, data: { disliked: true, dislikeCount: contentDislikes.size } });
  }

  async addComment(req: Request, res: Response): Promise<void> {
    const body = req.body as any;
    const commentId = `cmt_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;
    const comment: Comment = { id: commentId, contentId: body.contentId, userId: req.userId || '', username: req.user?.username || '', text: body.text, likes: 0, replies: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    const contentComments = comments.get(body.contentId) || [];
    contentComments.push(comment);
    comments.set(body.contentId, contentComments);
    res.status(201).json({ success: true, data: { comment } });
  }

  async getComments(req: Request, res: Response): Promise<void> {
    const contentId = req.params.contentId;
    const contentComments = comments.get(contentId) || [];
    const sort = (req.query as any).sort || 'newest';
    const sorted = [...contentComments];
    if (sort === 'newest') sorted.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
    else if (sort === 'top') sorted.sort((a, b) => b.likes - a.likes);
    res.status(200).json({ success: true, data: { comments: sorted, total: sorted.length } });
  }

  async updateComment(req: Request, res: Response): Promise<void> {
    const body = req.body as any;
    for (const [, contentComments] of comments) {
      const comment = contentComments.find(c => c.id === req.params.id);
      if (comment && comment.userId === req.userId) {
        comment.text = body.text;
        comment.updatedAt = new Date().toISOString();
        res.status(200).json({ success: true, data: { comment } });
        return;
      }
    }
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Comment not found', statusCode: 404 } });
  }

  async deleteComment(req: Request, res: Response): Promise<void> {
    for (const [contentId, contentComments] of comments) {
      const idx = contentComments.findIndex(c => c.id === req.params.id && c.userId === req.userId);
      if (idx > -1) { contentComments.splice(idx, 1); comments.set(contentId, contentComments); res.status(200).json({ success: true, data: { message: 'Comment deleted' } }); return; }
    }
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Comment not found', statusCode: 404 } });
  }

  async replyToComment(req: Request, res: Response): Promise<void> {
    const body = req.body as any;
    const replyId = `cmt_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;
    for (const [, contentComments] of comments) {
      const parent = contentComments.find(c => c.id === req.params.id);
      if (parent) {
        const reply: Comment = { id: replyId, contentId: parent.contentId, userId: req.userId || '', username: req.user?.username || '', text: body.text, likes: 0, replies: [], parentId: parent.id, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
        parent.replies.push(reply);
        res.status(201).json({ success: true, data: { reply } });
        return;
      }
    }
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Parent comment not found', statusCode: 404 } });
  }

  async share(req: Request, res: Response): Promise<void> {
    const body = req.body as any;
    res.status(200).json({ success: true, data: { shareId: `share_${Date.now().toString(36)}`, contentId: body.contentId, platform: body.platform || 'internal', shareUrl: `https://tube.quant.app/watch/${body.contentId}` } });
  }

  async save(req: Request, res: Response): Promise<void> {
    const body = req.body as any;
    const userId = req.userId || '';
    const userSaved = saved.get(userId) || [];
    if (!userSaved.includes(body.contentId)) userSaved.push(body.contentId);
    saved.set(userId, userSaved);
    res.status(200).json({ success: true, data: { saved: true } });
  }

  async unsave(req: Request, res: Response): Promise<void> {
    const userId = req.userId || '';
    const userSaved = saved.get(userId) || [];
    const idx = userSaved.indexOf(req.params.contentId);
    if (idx > -1) userSaved.splice(idx, 1);
    saved.set(userId, userSaved);
    res.status(200).json({ success: true, data: { saved: false } });
  }

  async addToWatchLater(req: Request, res: Response): Promise<void> {
    const body = req.body as any;
    const userId = req.userId || '';
    const list = watchLater.get(userId) || [];
    if (!list.includes(body.contentId)) list.push(body.contentId);
    watchLater.set(userId, list);
    res.status(200).json({ success: true, data: { added: true, count: list.length } });
  }

  async removeFromWatchLater(req: Request, res: Response): Promise<void> {
    const userId = req.userId || '';
    const list = watchLater.get(userId) || [];
    const idx = list.indexOf(req.params.contentId);
    if (idx > -1) list.splice(idx, 1);
    watchLater.set(userId, list);
    res.status(200).json({ success: true, data: { removed: true, count: list.length } });
  }

  async getWatchLater(req: Request, res: Response): Promise<void> {
    const userId = req.userId || '';
    const list = watchLater.get(userId) || [];
    res.status(200).json({ success: true, data: { items: list } });
  }

  async getHistory(req: Request, res: Response): Promise<void> {
    const userId = req.userId || '';
    const userHistory = history.get(userId) || [];
    res.status(200).json({ success: true, data: { history: userHistory } });
  }

  async addToHistory(req: Request, res: Response): Promise<void> {
    const body = req.body as any;
    const userId = req.userId || '';
    const userHistory = history.get(userId) || [];
    userHistory.unshift({ contentId: body.contentId, watchedAt: new Date().toISOString(), progress: body.progress || 0 });
    if (userHistory.length > 500) userHistory.pop();
    history.set(userId, userHistory);
    res.status(200).json({ success: true, data: { added: true } });
  }

  async clearHistory(req: Request, res: Response): Promise<void> {
    const userId = req.userId || '';
    history.delete(userId);
    res.status(200).json({ success: true, data: { cleared: true } });
  }

  async report(req: Request, res: Response): Promise<void> {
    const body = req.body as any;
    res.status(200).json({ success: true, data: { reportId: `rpt_${Date.now().toString(36)}`, contentId: body.contentId, reason: body.reason, status: 'submitted' } });
  }
}

export const interactionsController = new InteractionsController();
