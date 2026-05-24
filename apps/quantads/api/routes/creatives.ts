// ============================================================================
// QuantAds API - Creatives Routes
// ============================================================================

import { creativesController } from '../controllers/creatives-controller';
import type { RouteDefinition } from './campaigns';

export const creativeRoutes: RouteDefinition[] = [
  { method: 'POST', path: '/creatives', handler: (req, res) => creativesController.createCreative(req, res), requiresAuth: true },
  { method: 'GET', path: '/creatives', handler: (req, res) => creativesController.listCreatives(req, res), requiresAuth: true },
  { method: 'GET', path: '/creatives/:id', handler: (req, res) => creativesController.getCreative(req, res), requiresAuth: true },
  { method: 'PUT', path: '/creatives/:id', handler: (req, res) => creativesController.updateCreative(req, res), requiresAuth: true },
  { method: 'DELETE', path: '/creatives/:id', handler: (req, res) => creativesController.deleteCreative(req, res), requiresAuth: true },
  { method: 'POST', path: '/creatives/:id/duplicate', handler: (req, res) => creativesController.duplicateCreative(req, res), requiresAuth: true },
  { method: 'GET', path: '/creatives/:id/preview', handler: (req, res) => creativesController.getCreativePreview(req, res), requiresAuth: true },
];
