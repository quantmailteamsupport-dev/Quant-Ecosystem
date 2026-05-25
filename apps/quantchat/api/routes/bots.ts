// ============================================================================
// QuantChat API - Bot Marketplace Routes
// Bot discovery, installation, developer endpoints
// ============================================================================

import { botsController } from '../controllers/bots-controller';
import type { RouteDefinition } from './auth';

export const botRoutes: RouteDefinition[] = [
  {
    method: 'GET',
    path: '/bots',
    handler: (req, res) => botsController.listBots(req, res),
    requiresAuth: true,
  },
  {
    method: 'GET',
    path: '/bots/search',
    handler: (req, res) => botsController.searchBots(req, res),
    requiresAuth: true,
  },
  {
    method: 'GET',
    path: '/bots/popular',
    handler: (req, res) => botsController.getPopular(req, res),
    requiresAuth: true,
  },
  {
    method: 'POST',
    path: '/bots',
    handler: (req, res) => botsController.createBot(req, res),
    requiresAuth: true,
  },
  {
    method: 'POST',
    path: '/bots/:botId/install',
    handler: (req, res) => botsController.installBot(req, res),
    requiresAuth: true,
  },
  {
    method: 'DELETE',
    path: '/bots/:botId/install',
    handler: (req, res) => botsController.uninstallBot(req, res),
    requiresAuth: true,
  },
  {
    method: 'POST',
    path: '/bots/:botId/publish',
    handler: (req, res) => botsController.publishBot(req, res),
    requiresAuth: true,
  },
  {
    method: 'GET',
    path: '/bots/:botId/analytics',
    handler: (req, res) => botsController.getBotAnalytics(req, res),
    requiresAuth: true,
  },
  {
    method: 'POST',
    path: '/bots/:botId/rate',
    handler: (req, res) => botsController.rateBot(req, res),
    requiresAuth: true,
  },
];
