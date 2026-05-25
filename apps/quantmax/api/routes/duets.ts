// ============================================================================
// QuantMax API - Duet Routes
// ============================================================================

import { duetController } from '../controllers/duet-controller';
import type { Request, Response } from '../middleware';
import type { RouteDefinition } from './feed';

export const duetRoutes: RouteDefinition[] = [
  { method: 'POST', path: '/duets', handler: (req, res) => duetController.createDuet(req, res), requiresAuth: true },
  { method: 'POST', path: '/duets/stitch', handler: (req, res) => duetController.createStitch(req, res), requiresAuth: true },
  { method: 'POST', path: '/duets/:duetId/publish', handler: (req, res) => duetController.publish(req, res), requiresAuth: true },
  { method: 'GET', path: '/duets/:duetId/reactions', handler: (req, res) => duetController.getReactions(req, res), requiresAuth: false },
  { method: 'POST', path: '/duets/:videoId/disable', handler: (req, res) => duetController.disableDuet(req, res), requiresAuth: true },
];
