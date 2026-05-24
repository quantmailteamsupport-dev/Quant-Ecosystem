// ============================================================================
// QuantNeon API - Reels Routes
// Short-form video, effects, audio, duets, stitches, remix, trending audio
// ============================================================================

import { reelsController } from '../controllers/reels-controller';
import type { Request, Response, NextFunction } from '../middleware';
import type { RouteDefinition } from './posts';

export const reelRoutes: RouteDefinition[] = [
  { method: 'POST', path: '/reels', handler: (req, res) => reelsController.createReel(req, res), requiresAuth: true },
  { method: 'GET', path: '/reels/feed', handler: (req, res) => reelsController.getReelsFeed(req, res), requiresAuth: false },
  { method: 'GET', path: '/reels/trending', handler: (req, res) => reelsController.getTrending(req, res), requiresAuth: false },
  { method: 'GET', path: '/reels/:id', handler: (req, res) => reelsController.getReel(req, res), requiresAuth: false },
  { method: 'DELETE', path: '/reels/:id', handler: (req, res) => reelsController.deleteReel(req, res), requiresAuth: true },
  { method: 'POST', path: '/reels/:id/like', handler: (req, res) => reelsController.likeReel(req, res), requiresAuth: true },
  { method: 'POST', path: '/reels/:id/comment', handler: (req, res) => reelsController.commentOnReel(req, res), requiresAuth: true },
  { method: 'POST', path: '/reels/:id/duet', handler: (req, res) => reelsController.createDuet(req, res), requiresAuth: true },
  { method: 'POST', path: '/reels/:id/stitch', handler: (req, res) => reelsController.createStitch(req, res), requiresAuth: true },
  { method: 'POST', path: '/reels/:id/remix', handler: (req, res) => reelsController.remixReel(req, res), requiresAuth: true },
  { method: 'GET', path: '/reels/audio/:audioId', handler: (req, res) => reelsController.getReelsByAudio(req, res), requiresAuth: false },
  { method: 'GET', path: '/reels/audio/trending', handler: (req, res) => reelsController.getTrendingAudio(req, res), requiresAuth: false },
  { method: 'GET', path: '/reels/effects', handler: (req, res) => reelsController.getEffects(req, res), requiresAuth: false },
];
