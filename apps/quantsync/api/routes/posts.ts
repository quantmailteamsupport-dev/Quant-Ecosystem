// ============================================================================
// QuantSync API - Posts Routes
// Create/edit/delete posts (text, media, polls, threads), repost, quote post
// ============================================================================

import { postsController } from '../controllers/posts-controller';
import type { RouteDefinition } from './auth';
import { RateLimiter } from '../middleware';

const postLimiter = new RateLimiter({ windowMs: 60 * 1000, maxRequests: 30, message: 'Posting too quickly' });

export const postRoutes: RouteDefinition[] = [
  {
    method: 'POST',
    path: '/posts',
    handler: (req, res) => postsController.createPost(req, res),
    middleware: [postLimiter.middleware()],
    requiresAuth: true,
  },
  {
    method: 'GET',
    path: '/posts/:id',
    handler: (req, res) => postsController.getPost(req, res),
    requiresAuth: false,
  },
  {
    method: 'PUT',
    path: '/posts/:id',
    handler: (req, res) => postsController.editPost(req, res),
    requiresAuth: true,
  },
  {
    method: 'DELETE',
    path: '/posts/:id',
    handler: (req, res) => postsController.deletePost(req, res),
    requiresAuth: true,
  },
  {
    method: 'POST',
    path: '/posts/repost',
    handler: (req, res) => postsController.repost(req, res),
    requiresAuth: true,
  },
  {
    method: 'POST',
    path: '/posts/quote',
    handler: (req, res) => postsController.quotePost(req, res),
    requiresAuth: true,
  },
  {
    method: 'GET',
    path: '/posts/user/:userId',
    handler: (req, res) => postsController.getUserPosts(req, res),
    requiresAuth: false,
  },
  {
    method: 'POST',
    path: '/posts/:id/poll/vote',
    handler: (req, res) => postsController.votePoll(req, res),
    requiresAuth: true,
  },
];
