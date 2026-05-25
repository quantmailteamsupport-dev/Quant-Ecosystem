// ============================================================================
// QuantTube API - Content ID Routes
// ============================================================================

import { contentIDController } from '../controllers/content-id-controller';
import type { Request, Response, NextFunction } from '../middleware';
import type { RouteDefinition } from './videos';

export const contentIdRoutes: RouteDefinition[] = [
  { method: 'POST', path: '/content-id/fingerprint', handler: (req, res) => contentIDController.fingerprint(req, res), requiresAuth: true },
  { method: 'GET', path: '/content-id/match/:fingerprintId', handler: (req, res) => contentIDController.match(req, res), requiresAuth: true },
  { method: 'POST', path: '/content-id/claim', handler: (req, res) => contentIDController.claimContent(req, res), requiresAuth: true },
  { method: 'POST', path: '/content-id/disputes/:disputeId/resolve', handler: (req, res) => contentIDController.resolveDispute(req, res), requiresAuth: true },
  { method: 'POST', path: '/content-id/claims/:claimId/release', handler: (req, res) => contentIDController.releaseClaim(req, res), requiresAuth: true },
  { method: 'GET', path: '/content-id/history/:videoId', handler: (req, res) => contentIDController.getMatchHistory(req, res), requiresAuth: true },
  { method: 'POST', path: '/content-id/claims/:claimId/monetize', handler: (req, res) => contentIDController.monetize(req, res), requiresAuth: true },
  { method: 'POST', path: '/content-id/claims/:claimId/block', handler: (req, res) => contentIDController.block(req, res), requiresAuth: true },
  { method: 'GET', path: '/content-id/owners/:videoId', handler: (req, res) => contentIDController.getOwners(req, res), requiresAuth: true },
];
