// ============================================================================
// QuantAds API - Placements Routes
// ============================================================================

import { placementsController } from '../controllers/placements-controller';
import type { RouteDefinition } from './campaigns';

export const placementRoutes: RouteDefinition[] = [
  { method: 'GET', path: '/placements', handler: (req, res) => placementsController.listPlacements(req, res), requiresAuth: true },
  { method: 'GET', path: '/placements/:app', handler: (req, res) => placementsController.getPlacementsByApp(req, res), requiresAuth: true },
  { method: 'GET', path: '/placements/specs', handler: (req, res) => placementsController.getPlacementSpecs(req, res), requiresAuth: false },
  { method: 'POST', path: '/placements/preview', handler: (req, res) => placementsController.previewPlacement(req, res), requiresAuth: true },
];
