// ============================================================================
// QuantNeon API - Creators Routes
// Creator tools, insights/analytics, branded content, collaborations, marketplace
// ============================================================================

import { creatorsController } from '../controllers/creators-controller';
import type { Request, Response, NextFunction } from '../middleware';
import type { RouteDefinition } from './posts';

export const creatorRoutes: RouteDefinition[] = [
  { method: 'GET', path: '/creators/insights', handler: (req, res) => creatorsController.getInsights(req, res), requiresAuth: true },
  { method: 'GET', path: '/creators/insights/posts', handler: (req, res) => creatorsController.getPostInsights(req, res), requiresAuth: true },
  { method: 'GET', path: '/creators/insights/audience', handler: (req, res) => creatorsController.getAudienceInsights(req, res), requiresAuth: true },
  { method: 'GET', path: '/creators/branded-content', handler: (req, res) => creatorsController.getBrandedContent(req, res), requiresAuth: true },
  { method: 'POST', path: '/creators/branded-content', handler: (req, res) => creatorsController.createBrandedContent(req, res), requiresAuth: true },
  { method: 'GET', path: '/creators/collaborations', handler: (req, res) => creatorsController.getCollaborations(req, res), requiresAuth: true },
  { method: 'POST', path: '/creators/collaborations', handler: (req, res) => creatorsController.requestCollaboration(req, res), requiresAuth: true },
  { method: 'PUT', path: '/creators/collaborations/:id', handler: (req, res) => creatorsController.respondCollaboration(req, res), requiresAuth: true },
  { method: 'GET', path: '/creators/marketplace', handler: (req, res) => creatorsController.getMarketplace(req, res), requiresAuth: true },
  { method: 'POST', path: '/creators/marketplace/apply', handler: (req, res) => creatorsController.applyToMarketplace(req, res), requiresAuth: true },
];
