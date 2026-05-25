// ============================================================================
// QuantNeon API - Professional Dashboard Routes
// ============================================================================

import { professionalController } from '../controllers/professional-controller';
import type { Request, Response } from '../middleware';
import type { RouteDefinition } from './feed';

export const professionalRoutes: RouteDefinition[] = [
  { method: 'GET', path: '/professional/:accountId/insights', handler: (req, res) => professionalController.getInsights(req, res), requiresAuth: true },
  { method: 'GET', path: '/professional/:accountId/reach', handler: (req, res) => professionalController.getReach(req, res), requiresAuth: true },
  { method: 'GET', path: '/professional/:accountId/demographics', handler: (req, res) => professionalController.getDemographics(req, res), requiresAuth: true },
  { method: 'GET', path: '/professional/:accountId/content', handler: (req, res) => professionalController.getContentPerformance(req, res), requiresAuth: true },
  { method: 'GET', path: '/professional/:accountId/top-posts', handler: (req, res) => professionalController.getTopPosts(req, res), requiresAuth: true },
  { method: 'GET', path: '/professional/:accountId/contact-actions', handler: (req, res) => professionalController.getContactActions(req, res), requiresAuth: true },
];
