// ============================================================================
// QuantTube API - Shows Routes
// Series, episodes, seasons, watch progress, downloads, originals catalog
// ============================================================================

import { showsController } from '../controllers/shows-controller';
import type { Request, Response, NextFunction } from '../middleware';
import type { RouteDefinition } from './videos';

export const showRoutes: RouteDefinition[] = [
  { method: 'GET', path: '/shows', handler: (req, res) => showsController.listShows(req, res), requiresAuth: false },
  { method: 'GET', path: '/shows/originals', handler: (req, res) => showsController.getOriginals(req, res), requiresAuth: false },
  { method: 'GET', path: '/shows/categories', handler: (req, res) => showsController.getCategories(req, res), requiresAuth: false },
  { method: 'GET', path: '/shows/:id', handler: (req, res) => showsController.getShow(req, res), requiresAuth: false },
  { method: 'GET', path: '/shows/:id/seasons', handler: (req, res) => showsController.getSeasons(req, res), requiresAuth: false },
  { method: 'GET', path: '/shows/:id/seasons/:seasonId', handler: (req, res) => showsController.getSeason(req, res), requiresAuth: false },
  { method: 'GET', path: '/shows/:id/episodes/:episodeId', handler: (req, res) => showsController.getEpisode(req, res), requiresAuth: false },
  { method: 'GET', path: '/shows/:id/episodes/:episodeId/stream', handler: (req, res) => showsController.streamEpisode(req, res), requiresAuth: true },
  { method: 'POST', path: '/shows/:id/progress', handler: (req, res) => showsController.updateProgress(req, res), requiresAuth: true },
  { method: 'GET', path: '/shows/:id/progress', handler: (req, res) => showsController.getProgress(req, res), requiresAuth: true },
  { method: 'POST', path: '/shows/:id/download', handler: (req, res) => showsController.downloadEpisode(req, res), requiresAuth: true },
  { method: 'GET', path: '/shows/continue-watching', handler: (req, res) => showsController.getContinueWatching(req, res), requiresAuth: true },
  { method: 'POST', path: '/shows', handler: (req, res) => showsController.createShow(req, res), requiresAuth: true },
  { method: 'PUT', path: '/shows/:id', handler: (req, res) => showsController.updateShow(req, res), requiresAuth: true },
];
