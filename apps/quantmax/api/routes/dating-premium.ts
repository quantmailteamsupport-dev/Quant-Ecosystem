// ============================================================================
// QuantMax API - Dating Premium Routes
// ============================================================================

import { datingController } from '../controllers/dating-controller';
import type { Request, Response } from '../middleware';
import type { RouteDefinition } from './feed';

export const datingPremiumRoutes: RouteDefinition[] = [
  { method: 'POST', path: '/dating/verify', handler: (req, res) => datingController.submitVerification(req, res), requiresAuth: true },
  { method: 'GET', path: '/dating/badge/:userId', handler: (req, res) => datingController.getBadge(req, res), requiresAuth: true },
  { method: 'GET', path: '/dating/trust/:userId', handler: (req, res) => datingController.getTrustScore(req, res), requiresAuth: true },
  { method: 'POST', path: '/dating/icebreaker', handler: (req, res) => datingController.suggestIcebreaker(req, res), requiresAuth: true },
  { method: 'POST', path: '/dating/premium/subscribe', handler: (req, res) => datingController.subscribe(req, res), requiresAuth: true },
  { method: 'POST', path: '/dating/premium/boost', handler: (req, res) => datingController.boost(req, res), requiresAuth: true },
  { method: 'POST', path: '/dating/premium/super-like', handler: (req, res) => datingController.superLike(req, res), requiresAuth: true },
];
