// ============================================================================
// QuantTube API - Interactions Routes
// Like, comment, subscribe, share, save, watch later, history, report
// ============================================================================

import { interactionsController } from '../controllers/interactions-controller';
import type { Request, Response, NextFunction } from '../middleware';
import type { RouteDefinition } from './videos';

export const interactionRoutes: RouteDefinition[] = [
  { method: 'POST', path: '/interactions/like', handler: (req, res) => interactionsController.like(req, res), requiresAuth: true },
  { method: 'DELETE', path: '/interactions/like/:contentId', handler: (req, res) => interactionsController.unlike(req, res), requiresAuth: true },
  { method: 'POST', path: '/interactions/dislike', handler: (req, res) => interactionsController.dislike(req, res), requiresAuth: true },
  { method: 'POST', path: '/interactions/comment', handler: (req, res) => interactionsController.addComment(req, res), requiresAuth: true },
  { method: 'GET', path: '/interactions/comments/:contentId', handler: (req, res) => interactionsController.getComments(req, res), requiresAuth: false },
  { method: 'PUT', path: '/interactions/comments/:id', handler: (req, res) => interactionsController.updateComment(req, res), requiresAuth: true },
  { method: 'DELETE', path: '/interactions/comments/:id', handler: (req, res) => interactionsController.deleteComment(req, res), requiresAuth: true },
  { method: 'POST', path: '/interactions/comments/:id/reply', handler: (req, res) => interactionsController.replyToComment(req, res), requiresAuth: true },
  { method: 'POST', path: '/interactions/share', handler: (req, res) => interactionsController.share(req, res), requiresAuth: true },
  { method: 'POST', path: '/interactions/save', handler: (req, res) => interactionsController.save(req, res), requiresAuth: true },
  { method: 'DELETE', path: '/interactions/save/:contentId', handler: (req, res) => interactionsController.unsave(req, res), requiresAuth: true },
  { method: 'POST', path: '/interactions/watch-later', handler: (req, res) => interactionsController.addToWatchLater(req, res), requiresAuth: true },
  { method: 'DELETE', path: '/interactions/watch-later/:contentId', handler: (req, res) => interactionsController.removeFromWatchLater(req, res), requiresAuth: true },
  { method: 'GET', path: '/interactions/watch-later', handler: (req, res) => interactionsController.getWatchLater(req, res), requiresAuth: true },
  { method: 'GET', path: '/interactions/history', handler: (req, res) => interactionsController.getHistory(req, res), requiresAuth: true },
  { method: 'POST', path: '/interactions/history', handler: (req, res) => interactionsController.addToHistory(req, res), requiresAuth: true },
  { method: 'DELETE', path: '/interactions/history', handler: (req, res) => interactionsController.clearHistory(req, res), requiresAuth: true },
  { method: 'POST', path: '/interactions/report', handler: (req, res) => interactionsController.report(req, res), requiresAuth: true },
];
