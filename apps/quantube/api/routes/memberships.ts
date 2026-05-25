// ============================================================================
// QuantTube API - Membership Routes
// ============================================================================

import { membershipController } from '../controllers/membership-controller';
import type { Request, Response, NextFunction } from '../middleware';
import type { RouteDefinition } from './videos';

export const membershipRoutes: RouteDefinition[] = [
  { method: 'POST', path: '/memberships/tiers', handler: (req, res) => membershipController.createTier(req, res), requiresAuth: true },
  { method: 'POST', path: '/memberships/subscribe', handler: (req, res) => membershipController.subscribe(req, res), requiresAuth: true },
  { method: 'POST', path: '/memberships/:membershipId/cancel', handler: (req, res) => membershipController.cancel(req, res), requiresAuth: true },
  { method: 'GET', path: '/memberships/:membershipId/perks', handler: (req, res) => membershipController.getPerks(req, res), requiresAuth: true },
  { method: 'GET', path: '/memberships/channel/:channelId/members', handler: (req, res) => membershipController.getMembers(req, res), requiresAuth: true },
  { method: 'POST', path: '/memberships/:membershipId/renew', handler: (req, res) => membershipController.processRenewal(req, res), requiresAuth: true },
  { method: 'GET', path: '/memberships/channel/:channelId/revenue', handler: (req, res) => membershipController.getRevenue(req, res), requiresAuth: true },
  { method: 'POST', path: '/memberships/:channelId/tiers/:tierId/badge', handler: (req, res) => membershipController.addBadge(req, res), requiresAuth: true },
];
