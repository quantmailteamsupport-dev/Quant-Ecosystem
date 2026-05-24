// ============================================================================
// QuantNeon API - Posts Routes
// Photo/video posts, carousels, captions, tags, locations, collaborations
// ============================================================================

import { postsController } from '../controllers/posts-controller';
import type { Request, Response, NextFunction } from '../middleware';

export interface RouteDefinition {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  handler: (req: Request, res: Response) => Promise<void>;
  middleware?: Array<(req: Request, res: Response, next: NextFunction) => void>;
  requiresAuth?: boolean;
}

export const postRoutes: RouteDefinition[] = [
  { method: 'POST', path: '/posts', handler: (req, res) => postsController.createPost(req, res), requiresAuth: true },
  { method: 'GET', path: '/posts/feed', handler: (req, res) => postsController.getFeed(req, res), requiresAuth: true },
  { method: 'GET', path: '/posts/:id', handler: (req, res) => postsController.getPost(req, res), requiresAuth: false },
  { method: 'PUT', path: '/posts/:id', handler: (req, res) => postsController.updatePost(req, res), requiresAuth: true },
  { method: 'DELETE', path: '/posts/:id', handler: (req, res) => postsController.deletePost(req, res), requiresAuth: true },
  { method: 'POST', path: '/posts/:id/like', handler: (req, res) => postsController.likePost(req, res), requiresAuth: true },
  { method: 'DELETE', path: '/posts/:id/like', handler: (req, res) => postsController.unlikePost(req, res), requiresAuth: true },
  { method: 'POST', path: '/posts/:id/comment', handler: (req, res) => postsController.addComment(req, res), requiresAuth: true },
  { method: 'GET', path: '/posts/:id/comments', handler: (req, res) => postsController.getComments(req, res), requiresAuth: false },
  { method: 'POST', path: '/posts/:id/save', handler: (req, res) => postsController.savePost(req, res), requiresAuth: true },
  { method: 'POST', path: '/posts/:id/share', handler: (req, res) => postsController.sharePost(req, res), requiresAuth: true },
  { method: 'POST', path: '/posts/:id/pin', handler: (req, res) => postsController.pinPost(req, res), requiresAuth: true },
  { method: 'POST', path: '/posts/:id/collaborate', handler: (req, res) => postsController.addCollaborator(req, res), requiresAuth: true },
  { method: 'GET', path: '/posts/tagged/:userId', handler: (req, res) => postsController.getTaggedPosts(req, res), requiresAuth: false },
];
