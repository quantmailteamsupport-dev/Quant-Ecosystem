// ============================================================================
// QuantNeon API - Reels Remix Routes
// ============================================================================

import { reelsRemixController } from '../controllers/reels-remix-controller';
import type { Request, Response } from '../middleware';
import type { RouteDefinition } from './feed';

export const reelsRemixRoutes: RouteDefinition[] = [
  { method: 'POST', path: '/reels/remix', handler: (req, res) => reelsRemixController.createRemix(req, res), requiresAuth: true },
  { method: 'PUT', path: '/reels/remix/:remixId/layout', handler: (req, res) => reelsRemixController.setLayout(req, res), requiresAuth: true },
  { method: 'PUT', path: '/reels/remix/:remixId/video', handler: (req, res) => reelsRemixController.addVideo(req, res), requiresAuth: true },
  { method: 'POST', path: '/reels/remix/:remixId/publish', handler: (req, res) => reelsRemixController.publish(req, res), requiresAuth: true },
  { method: 'GET', path: '/reels/:reelId/remixes', handler: (req, res) => reelsRemixController.getRemixes(req, res), requiresAuth: false },
  { method: 'POST', path: '/reels/:reelId/disable-remix', handler: (req, res) => reelsRemixController.disableRemix(req, res), requiresAuth: true },
];
