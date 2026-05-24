// ============================================================================
// QuantAds API - Bidding Routes
// ============================================================================

import { biddingController } from '../controllers/bidding-controller';
import type { RouteDefinition } from './campaigns';

export const biddingRoutes: RouteDefinition[] = [
  { method: 'POST', path: '/bidding/request', handler: (req, res) => biddingController.requestBid(req, res), requiresAuth: true },
  { method: 'POST', path: '/bidding/ad-request', handler: (req, res) => biddingController.requestAd(req, res), requiresAuth: false },
  { method: 'GET', path: '/bidding/stats', handler: (req, res) => biddingController.getAuctionStats(req, res), requiresAuth: true },
  { method: 'GET', path: '/bidding/models', handler: (req, res) => biddingController.getBidModels(req, res), requiresAuth: false },
  { method: 'GET', path: '/bidding/strategies', handler: (req, res) => biddingController.getBidStrategies(req, res), requiresAuth: false },
];
