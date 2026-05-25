// ============================================================================
// QuantNeon API - Fundraiser Routes
// ============================================================================

import { fundraiserController } from '../controllers/fundraiser-controller';
import type { Request, Response } from '../middleware';
import type { RouteDefinition } from './feed';

export const fundraiserRoutes: RouteDefinition[] = [
  { method: 'POST', path: '/fundraisers', handler: (req, res) => fundraiserController.create(req, res), requiresAuth: true },
  { method: 'POST', path: '/fundraisers/:fundraiserId/donate', handler: (req, res) => fundraiserController.donate(req, res), requiresAuth: true },
  { method: 'GET', path: '/fundraisers/:fundraiserId/progress', handler: (req, res) => fundraiserController.getProgress(req, res), requiresAuth: false },
  { method: 'POST', path: '/fundraisers/:fundraiserId/end', handler: (req, res) => fundraiserController.endFundraiser(req, res), requiresAuth: true },
  { method: 'GET', path: '/fundraisers/:fundraiserId/donors', handler: (req, res) => fundraiserController.getDonors(req, res), requiresAuth: false },
  { method: 'POST', path: '/fundraisers/:fundraiserId/withdraw', handler: (req, res) => fundraiserController.withdraw(req, res), requiresAuth: true },
];
