// ============================================================================
// QuantAds API - Campaigns Routes
// ============================================================================

import { campaignsController } from '../controllers/campaigns-controller';
import type { Request, Response, NextFunction } from '../middleware';

export interface RouteDefinition {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  handler: (req: Request, res: Response) => Promise<void>;
  middleware?: Array<(req: Request, res: Response, next: NextFunction) => void>;
  requiresAuth?: boolean;
}

export const campaignRoutes: RouteDefinition[] = [
  { method: 'POST', path: '/campaigns', handler: (req, res) => campaignsController.createCampaign(req, res), requiresAuth: true },
  { method: 'GET', path: '/campaigns', handler: (req, res) => campaignsController.listCampaigns(req, res), requiresAuth: true },
  { method: 'GET', path: '/campaigns/dashboard', handler: (req, res) => campaignsController.getDashboard(req, res), requiresAuth: true },
  { method: 'GET', path: '/campaigns/:id', handler: (req, res) => campaignsController.getCampaign(req, res), requiresAuth: true },
  { method: 'PUT', path: '/campaigns/:id', handler: (req, res) => campaignsController.updateCampaign(req, res), requiresAuth: true },
  { method: 'PUT', path: '/campaigns/:id/status', handler: (req, res) => campaignsController.updateCampaignStatus(req, res), requiresAuth: true },
  { method: 'DELETE', path: '/campaigns/:id', handler: (req, res) => campaignsController.deleteCampaign(req, res), requiresAuth: true },
  { method: 'POST', path: '/campaigns/:id/ab-test', handler: (req, res) => campaignsController.createABTest(req, res), requiresAuth: true },
];
