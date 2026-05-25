// ============================================================================
// QuantAI API - Marketplace Routes
// ============================================================================

import { marketplaceController } from '../controllers/marketplace-controller';
import type { Request, Response } from '../middleware';
import type { RouteDefinition } from './assistant';

export const marketplaceRoutes: RouteDefinition[] = [
  { method: 'GET', path: '/marketplace/personas', handler: (req, res) => marketplaceController.listPersonas(req, res), requiresAuth: false },
  { method: 'GET', path: '/marketplace/search', handler: (req, res) => marketplaceController.searchPersonas(req, res), requiresAuth: false },
  { method: 'POST', path: '/marketplace/personas', handler: (req, res) => marketplaceController.createPersona(req, res), requiresAuth: true },
  { method: 'POST', path: '/marketplace/personas/:personaId/publish', handler: (req, res) => marketplaceController.publishPersona(req, res), requiresAuth: true },
  { method: 'POST', path: '/marketplace/personas/:personaId/rate', handler: (req, res) => marketplaceController.ratePersona(req, res), requiresAuth: true },
  { method: 'POST', path: '/marketplace/personas/:personaId/purchase', handler: (req, res) => marketplaceController.purchase(req, res), requiresAuth: true },
  { method: 'GET', path: '/marketplace/earnings/:creatorId', handler: (req, res) => marketplaceController.getEarnings(req, res), requiresAuth: true },
];
