// ============================================================================
// QuantNeon API - Explore Routes
// Explore feed, categories, trending, hashtags, locations, curated collections
// ============================================================================

import { exploreController } from '../controllers/explore-controller';
import type { Request, Response, NextFunction } from '../middleware';
import type { RouteDefinition } from './posts';

export const exploreRoutes: RouteDefinition[] = [
  { method: 'GET', path: '/explore', handler: (req, res) => exploreController.getExploreFeed(req, res), requiresAuth: false },
  { method: 'GET', path: '/explore/categories', handler: (req, res) => exploreController.getCategories(req, res), requiresAuth: false },
  { method: 'GET', path: '/explore/trending', handler: (req, res) => exploreController.getTrending(req, res), requiresAuth: false },
  { method: 'GET', path: '/explore/hashtags/:tag', handler: (req, res) => exploreController.getHashtag(req, res), requiresAuth: false },
  { method: 'GET', path: '/explore/hashtags/trending', handler: (req, res) => exploreController.getTrendingHashtags(req, res), requiresAuth: false },
  { method: 'GET', path: '/explore/locations/:locationId', handler: (req, res) => exploreController.getLocationPosts(req, res), requiresAuth: false },
  { method: 'GET', path: '/explore/collections', handler: (req, res) => exploreController.getCuratedCollections(req, res), requiresAuth: false },
  { method: 'GET', path: '/explore/search', handler: (req, res) => exploreController.search(req, res), requiresAuth: false },
];
