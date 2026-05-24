// ============================================================================
// QuantAds API - Policies Routes
// ============================================================================

import { policiesController } from '../controllers/policies-controller';
import type { RouteDefinition } from './campaigns';

export const policyRoutes: RouteDefinition[] = [
  { method: 'POST', path: '/policies/review', handler: (req, res) => policiesController.submitForReview(req, res), requiresAuth: true },
  { method: 'GET', path: '/policies/reviews/:id', handler: (req, res) => policiesController.getReview(req, res), requiresAuth: true },
  { method: 'POST', path: '/policies/reviews/:id/approve', handler: (req, res) => policiesController.approveReview(req, res), requiresAuth: true },
  { method: 'POST', path: '/policies/reviews/:id/reject', handler: (req, res) => policiesController.rejectReview(req, res), requiresAuth: true },
  { method: 'GET', path: '/policies', handler: (req, res) => policiesController.getPolicies(req, res), requiresAuth: false },
  { method: 'GET', path: '/policies/pending', handler: (req, res) => policiesController.getPendingReviews(req, res), requiresAuth: true },
];
