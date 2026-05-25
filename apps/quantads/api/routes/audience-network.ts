// ============================================================================
// QuantAds API - Audience Network Routes
// Publisher management, ad serving, revenue reporting endpoints
// ============================================================================

import { audienceNetworkController } from '../controllers/audience-network-controller';
import type { RouteDefinition } from './ml-bidding';

export const audienceNetworkRoutes: RouteDefinition[] = [
  {
    method: 'POST',
    path: '/audience-network/publishers',
    handler: (req, res) => audienceNetworkController.registerPublisher(req, res),
    requiresAuth: true,
  },
  {
    method: 'POST',
    path: '/audience-network/serve',
    handler: (req, res) => audienceNetworkController.serveAd(req, res),
    requiresAuth: false,
  },
  {
    method: 'POST',
    path: '/audience-network/ads/:adId/impression',
    handler: (req, res) => audienceNetworkController.trackImpression(req, res),
    requiresAuth: false,
  },
  {
    method: 'GET',
    path: '/audience-network/publishers/:publisherId/fill-rate',
    handler: (req, res) => audienceNetworkController.getFillRate(req, res),
    requiresAuth: true,
  },
  {
    method: 'GET',
    path: '/audience-network/publishers/:publisherId/revenue',
    handler: (req, res) => audienceNetworkController.getRevenueReport(req, res),
    requiresAuth: true,
  },
  {
    method: 'POST',
    path: '/audience-network/publishers/:publisherId/qualify',
    handler: (req, res) => audienceNetworkController.qualifyPublisher(req, res),
    requiresAuth: true,
  },
  {
    method: 'PUT',
    path: '/audience-network/publishers/:publisherId/floor-price',
    handler: (req, res) => audienceNetworkController.setFloorPrice(req, res),
    requiresAuth: true,
  },
  {
    method: 'GET',
    path: '/audience-network/publishers/:publisherId/inventory',
    handler: (req, res) => audienceNetworkController.getInventory(req, res),
    requiresAuth: true,
  },
];
