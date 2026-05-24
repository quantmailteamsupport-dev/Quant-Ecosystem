// ============================================================================
// QuantSync API - Feed Routes
// Personalized feed, trending, for-you algorithm, chronological, anonymous feed
// ============================================================================

import { feedController } from '../controllers/feed-controller';
import type { RouteDefinition } from './auth';

export const feedRoutes: RouteDefinition[] = [
  {
    method: 'GET',
    path: '/feed',
    handler: (req, res) => feedController.getFeed(req, res),
    requiresAuth: true,
  },
  {
    method: 'GET',
    path: '/feed/for-you',
    handler: (req, res) => feedController.getForYouFeed(req, res),
    requiresAuth: true,
  },
  {
    method: 'GET',
    path: '/feed/following',
    handler: (req, res) => feedController.getFollowingFeed(req, res),
    requiresAuth: true,
  },
  {
    method: 'GET',
    path: '/feed/trending',
    handler: (req, res) => feedController.getTrendingFeed(req, res),
    requiresAuth: true,
  },
  {
    method: 'GET',
    path: '/feed/anonymous',
    handler: (req, res) => feedController.getAnonymousFeed(req, res),
    requiresAuth: true,
  },
  {
    method: 'POST',
    path: '/feed/engagement',
    handler: (req, res) => feedController.trackEngagement(req, res),
    requiresAuth: true,
  },
];
