// ============================================================================
// QuantEdits API - Plugin Routes
// ============================================================================

import { pluginsController } from '../controllers/plugins-controller';
import type { Request, Response } from '../middleware';
import type { RouteDefinition } from './editor';

export const pluginRoutes: RouteDefinition[] = [
  { method: 'GET', path: '/plugins/marketplace', handler: (req, res) => pluginsController.getMarketplace(req, res), requiresAuth: false },
  { method: 'GET', path: '/plugins/search', handler: (req, res) => pluginsController.searchPlugins(req, res), requiresAuth: false },
  { method: 'POST', path: '/plugins/install', handler: (req, res) => pluginsController.installPlugin(req, res), requiresAuth: true },
  { method: 'DELETE', path: '/plugins/:pluginId', handler: (req, res) => pluginsController.uninstallPlugin(req, res), requiresAuth: true },
  { method: 'POST', path: '/plugins/:pluginId/load', handler: (req, res) => pluginsController.loadPlugin(req, res), requiresAuth: true },
  { method: 'POST', path: '/plugins/:pluginId/execute', handler: (req, res) => pluginsController.executePlugin(req, res), requiresAuth: true },
  { method: 'POST', path: '/plugins/validate', handler: (req, res) => pluginsController.validatePlugin(req, res), requiresAuth: true },
];
