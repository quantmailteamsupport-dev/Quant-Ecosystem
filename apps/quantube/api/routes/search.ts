// ============================================================================
// QuantTube API - Search Routes
// Search videos, music, shows, channels with filters and voice search
// ============================================================================

import { searchController } from '../controllers/search-controller';
import type { Request, Response, NextFunction } from '../middleware';
import type { RouteDefinition } from './videos';

export const searchRoutes: RouteDefinition[] = [
  { method: 'GET', path: '/search', handler: (req, res) => searchController.search(req, res), requiresAuth: false },
  { method: 'GET', path: '/search/videos', handler: (req, res) => searchController.searchVideos(req, res), requiresAuth: false },
  { method: 'GET', path: '/search/music', handler: (req, res) => searchController.searchMusic(req, res), requiresAuth: false },
  { method: 'GET', path: '/search/shows', handler: (req, res) => searchController.searchShows(req, res), requiresAuth: false },
  { method: 'GET', path: '/search/channels', handler: (req, res) => searchController.searchChannels(req, res), requiresAuth: false },
  { method: 'GET', path: '/search/autocomplete', handler: (req, res) => searchController.autocomplete(req, res), requiresAuth: false },
  { method: 'POST', path: '/search/voice', handler: (req, res) => searchController.voiceSearch(req, res), requiresAuth: true },
  { method: 'GET', path: '/search/trending', handler: (req, res) => searchController.getTrendingSearches(req, res), requiresAuth: false },
  { method: 'GET', path: '/search/history', handler: (req, res) => searchController.getSearchHistory(req, res), requiresAuth: true },
  { method: 'DELETE', path: '/search/history', handler: (req, res) => searchController.clearSearchHistory(req, res), requiresAuth: true },
];
