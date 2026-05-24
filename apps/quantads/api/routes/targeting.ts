// ============================================================================
// QuantAds API - Targeting Routes
// ============================================================================

import { targetingController } from '../controllers/targeting-controller';
import type { RouteDefinition } from './campaigns';

export const targetingRoutes: RouteDefinition[] = [
  { method: 'POST', path: '/targeting/estimate', handler: (req, res) => targetingController.estimateAudience(req, res), requiresAuth: true },
  { method: 'POST', path: '/audiences', handler: (req, res) => targetingController.createAudience(req, res), requiresAuth: true },
  { method: 'GET', path: '/audiences', handler: (req, res) => targetingController.listAudiences(req, res), requiresAuth: true },
  { method: 'GET', path: '/audiences/:id', handler: (req, res) => targetingController.getAudience(req, res), requiresAuth: true },
  { method: 'DELETE', path: '/audiences/:id', handler: (req, res) => targetingController.deleteAudience(req, res), requiresAuth: true },
  { method: 'POST', path: '/audiences/lookalike', handler: (req, res) => targetingController.createLookalikeAudience(req, res), requiresAuth: true },
  { method: 'GET', path: '/targeting/interests', handler: (req, res) => targetingController.getInterestCategories(req, res), requiresAuth: true },
  { method: 'GET', path: '/targeting/behaviors', handler: (req, res) => targetingController.getBehaviorCategories(req, res), requiresAuth: true },
];
