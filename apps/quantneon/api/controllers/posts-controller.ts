// ============================================================================
// QuantNeon API - Posts Controller
// Photo/video posts, carousels, captions, tags, locations, collaborations
// ============================================================================

import type { Request, Response } from '../middleware';

interface Post {
  id: string;
  userId: string;
  username: string;
  type: 'photo' | 'video' | 'carousel';
  media: MediaItem[];
  caption: string;
  hashtags: string[];
  mentions: string[];
  location?: { name: string; lat: number; lng: number };
  likes: number;
  likedBy: Set<string>;
  commentCount: number;
  shares: number;
  collaborators: string[];
  isPinned: boolean;
  filters: string[];
  createdAt: string;
}

interface MediaItem {
  id: string;
  type: 'image' | 'video';
  url: string;
  width: number;
  height: number;
  altText?: string;
  filter?: string;
}

interface Comment {
  id: string;
  postId: string;
  userId: string;
  username: string;
  text: string;
  likes: number;
  replies: Comment[];
  createdAt: string;
}

const posts: Map<string, Post> = new Map();
const comments: Map<string, Comment[]> = new Map();
const savedPosts: Map<string, string[]> = new Map();

class PostsController {
  async createPost(req: Request, res: Response): Promise<void> {
    const body = req.body as any;
    const postId = `post_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;
    const hashtagRegex = /#(\w+)/g;
    const mentionRegex = /@(\w+)/g;
    const caption = body.caption || '';
    const hashtags = [...caption.matchAll(hashtagRegex)].map((m: any) => m[1]);
    const mentions = [...caption.matchAll(mentionRegex)].map((m: any) => m[1]);

    const post: Post = { id: postId, userId: req.userId || '', username: req.user?.username || '', type: body.type || 'photo', media: (body.media || []).map((m: any, i: number) => ({ id: `media_${i}`, type: m.type || 'image', url: m.url || '', width: m.width || 1080, height: m.height || 1080, altText: m.altText, filter: m.filter })), caption, hashtags, mentions, location: body.location, likes: 0, likedBy: new Set(), commentCount: 0, shares: 0, collaborators: body.collaborators || [], isPinned: false, filters: body.filters || [], createdAt: new Date().toISOString() };

    posts.set(postId, post);
    res.status(201).json({ success: true, data: { post: { ...post, likedBy: undefined, likeCount: 0 } } });
  }

  async getFeed(req: Request, res: Response): Promise<void> {
    const query = req.query as any;
    const page = parseInt((query.page as string) || '1');
    const limit = parseInt((query.limit as string) || '20');
    const allPosts = Array.from(posts.values()).sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
    const start = (page - 1) * limit;
    const feed = allPosts.slice(start, start + limit).map(p => ({ ...p, likedBy: undefined, isLiked: p.likedBy.has(req.userId || '') }));
    res.status(200).json({ success: true, data: { posts: feed, pagination: { page, limit, total: allPosts.length } } });
  }

  async getPost(req: Request, res: Response): Promise<void> {
    const post = posts.get(req.params.id);
    if (!post) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Post not found', statusCode: 404 } }); return; }
    res.status(200).json({ success: true, data: { post: { ...post, likedBy: undefined, isLiked: post.likedBy.has(req.userId || '') } } });
  }

  async updatePost(req: Request, res: Response): Promise<void> {
    const post = posts.get(req.params.id);
    if (!post) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Post not found', statusCode: 404 } }); return; }
    if (post.userId !== req.userId) { res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Not post owner', statusCode: 403 } }); return; }
    const body = req.body as any;
    if (body.caption !== undefined) post.caption = body.caption;
    if (body.location !== undefined) post.location = body.location;
    res.status(200).json({ success: true, data: { post: { ...post, likedBy: undefined } } });
  }

  async deletePost(req: Request, res: Response): Promise<void> {
    const post = posts.get(req.params.id);
    if (!post) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Post not found', statusCode: 404 } }); return; }
    if (post.userId !== req.userId) { res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Not post owner', statusCode: 403 } }); return; }
    posts.delete(req.params.id);
    res.status(200).json({ success: true, data: { message: 'Post deleted' } });
  }

  async likePost(req: Request, res: Response): Promise<void> {
    const post = posts.get(req.params.id);
    if (!post) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Post not found', statusCode: 404 } }); return; }
    const userId = req.userId || '';
    if (!post.likedBy.has(userId)) { post.likedBy.add(userId); post.likes++; }
    res.status(200).json({ success: true, data: { liked: true, likeCount: post.likes } });
  }

  async unlikePost(req: Request, res: Response): Promise<void> {
    const post = posts.get(req.params.id);
    if (!post) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Post not found', statusCode: 404 } }); return; }
    const userId = req.userId || '';
    if (post.likedBy.has(userId)) { post.likedBy.delete(userId); post.likes = Math.max(0, post.likes - 1); }
    res.status(200).json({ success: true, data: { liked: false, likeCount: post.likes } });
  }

  async addComment(req: Request, res: Response): Promise<void> {
    const post = posts.get(req.params.id);
    if (!post) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Post not found', statusCode: 404 } }); return; }
    const body = req.body as any;
    const comment: Comment = { id: `cmt_${Date.now().toString(36)}`, postId: post.id, userId: req.userId || '', username: req.user?.username || '', text: body.text, likes: 0, replies: [], createdAt: new Date().toISOString() };
    const postComments = comments.get(post.id) || [];
    postComments.push(comment);
    comments.set(post.id, postComments);
    post.commentCount++;
    res.status(201).json({ success: true, data: { comment } });
  }

  async getComments(req: Request, res: Response): Promise<void> {
    const postComments = comments.get(req.params.id) || [];
    res.status(200).json({ success: true, data: { comments: postComments } });
  }

  async savePost(req: Request, res: Response): Promise<void> {
    const userId = req.userId || '';
    const userSaved = savedPosts.get(userId) || [];
    if (!userSaved.includes(req.params.id)) userSaved.push(req.params.id);
    savedPosts.set(userId, userSaved);
    res.status(200).json({ success: true, data: { saved: true } });
  }

  async sharePost(req: Request, res: Response): Promise<void> {
    const post = posts.get(req.params.id);
    if (post) post.shares++;
    res.status(200).json({ success: true, data: { shared: true, shareUrl: `https://neon.quant.app/p/${req.params.id}` } });
  }

  async pinPost(req: Request, res: Response): Promise<void> {
    const post = posts.get(req.params.id);
    if (!post) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Post not found', statusCode: 404 } }); return; }
    if (post.userId !== req.userId) { res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Not authorized', statusCode: 403 } }); return; }
    post.isPinned = !post.isPinned;
    res.status(200).json({ success: true, data: { pinned: post.isPinned } });
  }

  async addCollaborator(req: Request, res: Response): Promise<void> {
    const post = posts.get(req.params.id);
    if (!post) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Post not found', statusCode: 404 } }); return; }
    const body = req.body as any;
    if (!post.collaborators.includes(body.userId)) post.collaborators.push(body.userId);
    res.status(200).json({ success: true, data: { collaborators: post.collaborators } });
  }

  async getTaggedPosts(req: Request, res: Response): Promise<void> {
    const userId = req.params.userId;
    const tagged = Array.from(posts.values()).filter(p => p.mentions.includes(userId));
    res.status(200).json({ success: true, data: { posts: tagged.map(p => ({ ...p, likedBy: undefined })) } });
  }
}

export const postsController = new PostsController();
