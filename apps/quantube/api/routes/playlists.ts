// ============================================================================
// QuantTube API - Playlists Routes
// Create/manage playlists (video + music), collaborative, auto-mix, smart shuffle
// ============================================================================

import { playlistsController } from '../controllers/playlists-controller';
import type { Request, Response, NextFunction } from '../middleware';
import type { RouteDefinition } from './videos';

export const playlistRoutes: RouteDefinition[] = [
  { method: 'POST', path: '/playlists', handler: (req, res) => playlistsController.createPlaylist(req, res), requiresAuth: true },
  { method: 'GET', path: '/playlists', handler: (req, res) => playlistsController.listPlaylists(req, res), requiresAuth: true },
  { method: 'GET', path: '/playlists/:id', handler: (req, res) => playlistsController.getPlaylist(req, res), requiresAuth: false },
  { method: 'PUT', path: '/playlists/:id', handler: (req, res) => playlistsController.updatePlaylist(req, res), requiresAuth: true },
  { method: 'DELETE', path: '/playlists/:id', handler: (req, res) => playlistsController.deletePlaylist(req, res), requiresAuth: true },
  { method: 'POST', path: '/playlists/:id/items', handler: (req, res) => playlistsController.addItem(req, res), requiresAuth: true },
  { method: 'DELETE', path: '/playlists/:id/items/:itemId', handler: (req, res) => playlistsController.removeItem(req, res), requiresAuth: true },
  { method: 'PUT', path: '/playlists/:id/items/reorder', handler: (req, res) => playlistsController.reorderItems(req, res), requiresAuth: true },
  { method: 'POST', path: '/playlists/:id/collaborators', handler: (req, res) => playlistsController.addCollaborator(req, res), requiresAuth: true },
  { method: 'DELETE', path: '/playlists/:id/collaborators/:userId', handler: (req, res) => playlistsController.removeCollaborator(req, res), requiresAuth: true },
  { method: 'POST', path: '/playlists/auto-mix', handler: (req, res) => playlistsController.generateAutoMix(req, res), requiresAuth: true },
  { method: 'POST', path: '/playlists/:id/shuffle', handler: (req, res) => playlistsController.smartShuffle(req, res), requiresAuth: true },
  { method: 'GET', path: '/playlists/suggested', handler: (req, res) => playlistsController.getSuggested(req, res), requiresAuth: true },
];
