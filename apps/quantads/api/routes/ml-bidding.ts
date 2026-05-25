// ============================================================================
// QuantAds API - ML Bidding Routes
// ML bid optimization, model management, A/B testing endpoints
// ============================================================================

import { mlBiddingController } from '../controllers/ml-bidding-controller';

export interface RouteDefinition {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  handler: (req: any, res: any) => Promise<void> | void;
  middleware?: any[];
  requiresAuth: boolean;
}

export const mlBiddingRoutes: RouteDefinition[] = [
  {
    method: 'POST',
    path: '/ml-bidding/optimize',
    handler: (req, res) => mlBiddingController.optimizeBid(req, res),
    requiresAuth: true,
  },
  {
    method: 'POST',
    path: '/ml-bidding/train',
    handler: (req, res) => mlBiddingController.trainModel(req, res),
    requiresAuth: true,
  },
  {
    method: 'POST',
    path: '/ml-bidding/campaigns/:campaignId/predict',
    handler: (req, res) => mlBiddingController.getPrediction(req, res),
    requiresAuth: true,
  },
  {
    method: 'GET',
    path: '/ml-bidding/campaigns/:campaignId/features',
    handler: (req, res) => mlBiddingController.getFeatureImportance(req, res),
    requiresAuth: true,
  },
  {
    method: 'GET',
    path: '/ml-bidding/campaigns/:campaignId/evaluate',
    handler: (req, res) => mlBiddingController.evaluateModel(req, res),
    requiresAuth: true,
  },
  {
    method: 'POST',
    path: '/ml-bidding/ab-test',
    handler: (req, res) => mlBiddingController.createABTest(req, res),
    requiresAuth: true,
  },
  {
    method: 'POST',
    path: '/ml-bidding/bid-floor',
    handler: (req, res) => mlBiddingController.adjustBidFloor(req, res),
    requiresAuth: true,
  },
];
