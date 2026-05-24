// ============================================================================
// QuantSync API - Communities Routes
// Create/join communities (like subreddits), moderation, rules, flairs
// ============================================================================

import { communitiesController } from '../controllers/communities-controller';
import type { RouteDefinition } from './auth';

export const communityRoutes: RouteDefinition[] = [
  {
    method: 'POST',
    path: '/communities',
    handler: (req, res) => communitiesController.createCommunity(req, res),
    requiresAuth: true,
  },
  {
    method: 'GET',
    path: '/communities',
    handler: (req, res) => communitiesController.listCommunities(req, res),
    requiresAuth: false,
  },
  {
    method: 'GET',
    path: '/communities/:id',
    handler: (req, res) => communitiesController.getCommunity(req, res),
    requiresAuth: false,
  },
  {
    method: 'PUT',
    path: '/communities/:id',
    handler: (req, res) => communitiesController.updateCommunity(req, res),
    requiresAuth: true,
  },
  {
    method: 'POST',
    path: '/communities/:id/join',
    handler: (req, res) => communitiesController.joinCommunity(req, res),
    requiresAuth: true,
  },
  {
    method: 'POST',
    path: '/communities/:id/leave',
    handler: (req, res) => communitiesController.leaveCommunity(req, res),
    requiresAuth: true,
  },
  {
    method: 'POST',
    path: '/communities/:id/flairs',
    handler: (req, res) => communitiesController.addFlair(req, res),
    requiresAuth: true,
  },
  {
    method: 'POST',
    path: '/communities/:id/rules',
    handler: (req, res) => communitiesController.addRule(req, res),
    requiresAuth: true,
  },
  {
    method: 'GET',
    path: '/communities/user/:userId',
    handler: (req, res) => communitiesController.getUserCommunities(req, res),
    requiresAuth: true,
  },
];
