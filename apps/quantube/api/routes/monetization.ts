// ============================================================================
// QuantTube API - Monetization Routes
// Creator monetization, ad revenue share, memberships, super chats, merchandise
// ============================================================================

import { monetizationController } from '../controllers/monetization-controller';
import type { Request, Response, NextFunction } from '../middleware';
import type { RouteDefinition } from './videos';

export const monetizationRoutes: RouteDefinition[] = [
  { method: 'POST', path: '/monetization/enroll', handler: (req, res) => monetizationController.enroll(req, res), requiresAuth: true },
  { method: 'GET', path: '/monetization/status', handler: (req, res) => monetizationController.getStatus(req, res), requiresAuth: true },
  { method: 'GET', path: '/monetization/earnings', handler: (req, res) => monetizationController.getEarnings(req, res), requiresAuth: true },
  { method: 'GET', path: '/monetization/earnings/breakdown', handler: (req, res) => monetizationController.getEarningsBreakdown(req, res), requiresAuth: true },
  { method: 'POST', path: '/monetization/payout', handler: (req, res) => monetizationController.requestPayout(req, res), requiresAuth: true },
  { method: 'GET', path: '/monetization/payouts', handler: (req, res) => monetizationController.getPayoutHistory(req, res), requiresAuth: true },
  { method: 'POST', path: '/monetization/memberships/setup', handler: (req, res) => monetizationController.setupMembership(req, res), requiresAuth: true },
  { method: 'PUT', path: '/monetization/memberships/tiers', handler: (req, res) => monetizationController.updateMembershipTiers(req, res), requiresAuth: true },
  { method: 'GET', path: '/monetization/memberships/subscribers', handler: (req, res) => monetizationController.getMembershipSubscribers(req, res), requiresAuth: true },
  { method: 'GET', path: '/monetization/superchats', handler: (req, res) => monetizationController.getSuperChatRevenue(req, res), requiresAuth: true },
  { method: 'POST', path: '/monetization/merchandise', handler: (req, res) => monetizationController.setupMerchandise(req, res), requiresAuth: true },
  { method: 'GET', path: '/monetization/merchandise', handler: (req, res) => monetizationController.getMerchandise(req, res), requiresAuth: true },
  { method: 'GET', path: '/monetization/ad-revenue', handler: (req, res) => monetizationController.getAdRevenue(req, res), requiresAuth: true },
  { method: 'PUT', path: '/monetization/ad-settings', handler: (req, res) => monetizationController.updateAdSettings(req, res), requiresAuth: true },
  { method: 'GET', path: '/monetization/sponsorships', handler: (req, res) => monetizationController.getSponsorships(req, res), requiresAuth: true },
];
