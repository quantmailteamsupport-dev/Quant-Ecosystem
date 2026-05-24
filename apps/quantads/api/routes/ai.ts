// ============================================================================
// QuantAds API - AI Routes
// ============================================================================

import { aiController } from '../controllers/ai-controller';
import type { RouteDefinition } from './campaigns';

export const aiRoutes: RouteDefinition[] = [
  { method: 'POST', path: '/ai/predict-performance', handler: (req, res) => aiController.predictPerformance(req, res), requiresAuth: true },
  { method: 'POST', path: '/ai/recommend-budget', handler: (req, res) => aiController.recommendBudget(req, res), requiresAuth: true },
  { method: 'POST', path: '/ai/creative-suggestions', handler: (req, res) => aiController.generateCreativeSuggestions(req, res), requiresAuth: true },
  { method: 'POST', path: '/ai/audience-expansion', handler: (req, res) => aiController.predictAudienceExpansion(req, res), requiresAuth: true },
  { method: 'POST', path: '/ai/bid-adjustment', handler: (req, res) => aiController.suggestBidAdjustment(req, res), requiresAuth: true },
];
