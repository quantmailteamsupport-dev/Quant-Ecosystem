// ============================================================================
// QuantSync API - Anonymous Routes
// Anonymous posting, confessions, secrets feed
// ============================================================================

import { anonymousController } from '../controllers/anonymous-controller';
import type { RouteDefinition } from './auth';

export const anonymousRoutes: RouteDefinition[] = [
  {
    method: 'POST',
    path: '/anonymous/posts',
    handler: (req, res) => anonymousController.createAnonymousPost(req, res),
    requiresAuth: true,
  },
  {
    method: 'GET',
    path: '/anonymous/feed',
    handler: (req, res) => anonymousController.getAnonymousFeed(req, res),
    requiresAuth: false,
  },
  {
    method: 'POST',
    path: '/anonymous/posts/:id/react',
    handler: (req, res) => anonymousController.reactToAnonymousPost(req, res),
    requiresAuth: true,
  },
  {
    method: 'GET',
    path: '/anonymous/categories',
    handler: (req, res) => anonymousController.getConfessionCategories(req, res),
    requiresAuth: false,
  },
  {
    method: 'DELETE',
    path: '/anonymous/posts/:id',
    handler: (req, res) => anonymousController.deleteOwnAnonymousPost(req, res),
    requiresAuth: true,
  },
];
