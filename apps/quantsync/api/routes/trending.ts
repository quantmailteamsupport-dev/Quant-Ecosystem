// ============================================================================
// QuantSync API - Trending Routes
// Trending topics, hashtags, explore, search
// ============================================================================

import { trendingController } from '../controllers/trending-controller';
import type { RouteDefinition } from './auth';

export const trendingRoutes: RouteDefinition[] = [
  {
    method: 'GET',
    path: '/trending',
    handler: (req, res) => trendingController.getTrending(req, res),
    requiresAuth: false,
  },
  {
    method: 'GET',
    path: '/explore',
    handler: (req, res) => trendingController.getExplore(req, res),
    requiresAuth: false,
  },
  {
    method: 'GET',
    path: '/search',
    handler: (req, res) => trendingController.search(req, res),
    requiresAuth: true,
  },
  {
    method: 'GET',
    path: '/search/suggestions',
    handler: (req, res) => trendingController.getSuggestions(req, res),
    requiresAuth: false,
  },
  {
    method: 'GET',
    path: '/search/history',
    handler: (req, res) => trendingController.getSearchHistory(req, res),
    requiresAuth: true,
  },
  {
    method: 'DELETE',
    path: '/search/history',
    handler: (req, res) => trendingController.clearSearchHistory(req, res),
    requiresAuth: true,
  },
  {
    method: 'GET',
    path: '/hashtag/:hashtag',
    handler: (req, res) => trendingController.getHashtagPosts(req, res),
    requiresAuth: true,
  },
];
