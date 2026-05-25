// ============================================================================
// QuantMax API - Live Gifts Routes
// ============================================================================

import { liveGiftsController } from '../controllers/live-gifts-controller';
import type { Request, Response } from '../middleware';
import type { RouteDefinition } from './feed';

export const liveGiftsRoutes: RouteDefinition[] = [
  { method: 'POST', path: '/gifts/send', handler: (req, res) => liveGiftsController.sendGift(req, res), requiresAuth: true },
  { method: 'GET', path: '/gifts/leaderboard/:streamId', handler: (req, res) => liveGiftsController.getLeaderboard(req, res), requiresAuth: false },
  { method: 'POST', path: '/gifts/cashout', handler: (req, res) => liveGiftsController.cashOut(req, res), requiresAuth: true },
  { method: 'GET', path: '/gifts/catalog', handler: (req, res) => liveGiftsController.getCatalog(req, res), requiresAuth: false },
  { method: 'POST', path: '/gifts/buy-coins', handler: (req, res) => liveGiftsController.buyCoins(req, res), requiresAuth: true },
];
