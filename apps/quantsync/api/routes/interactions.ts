// ============================================================================
// QuantSync API - Interactions Routes
// Upvote/downvote, comments, nested replies, likes, bookmarks, shares
// ============================================================================

import { interactionsController } from '../controllers/interactions-controller';
import type { RouteDefinition } from './auth';

export const interactionRoutes: RouteDefinition[] = [
  {
    method: 'POST',
    path: '/interactions/:id/upvote',
    handler: (req, res) => interactionsController.upvote(req, res),
    requiresAuth: true,
  },
  {
    method: 'POST',
    path: '/interactions/:id/downvote',
    handler: (req, res) => interactionsController.downvote(req, res),
    requiresAuth: true,
  },
  {
    method: 'POST',
    path: '/interactions/:id/bookmark',
    handler: (req, res) => interactionsController.bookmark(req, res),
    requiresAuth: true,
  },
  {
    method: 'POST',
    path: '/interactions/:id/share',
    handler: (req, res) => interactionsController.share(req, res),
    requiresAuth: true,
  },
  {
    method: 'GET',
    path: '/interactions/bookmarks',
    handler: (req, res) => interactionsController.getBookmarks(req, res),
    requiresAuth: true,
  },
  {
    method: 'POST',
    path: '/posts/:postId/comments',
    handler: (req, res) => interactionsController.createComment(req, res),
    requiresAuth: true,
  },
  {
    method: 'GET',
    path: '/posts/:postId/comments',
    handler: (req, res) => interactionsController.getComments(req, res),
    requiresAuth: false,
  },
  {
    method: 'PUT',
    path: '/comments/:commentId',
    handler: (req, res) => interactionsController.editComment(req, res),
    requiresAuth: true,
  },
  {
    method: 'DELETE',
    path: '/comments/:commentId',
    handler: (req, res) => interactionsController.deleteComment(req, res),
    requiresAuth: true,
  },
];
