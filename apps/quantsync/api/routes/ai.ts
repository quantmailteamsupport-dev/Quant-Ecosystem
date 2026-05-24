// ============================================================================
// QuantSync API - AI Routes
// AI content suggestions, fact-checking, content moderation, trending analysis
// ============================================================================

import { aiController } from '../controllers/ai-controller';
import type { RouteDefinition } from './auth';

export const aiRoutes: RouteDefinition[] = [
  {
    method: 'GET',
    path: '/ai/suggestions',
    handler: (req, res) => aiController.getSuggestions(req, res),
    requiresAuth: true,
  },
  {
    method: 'POST',
    path: '/ai/fact-check',
    handler: (req, res) => aiController.factCheck(req, res),
    requiresAuth: true,
  },
  {
    method: 'POST',
    path: '/ai/moderate',
    handler: (req, res) => aiController.moderateContent(req, res),
    requiresAuth: true,
  },
  {
    method: 'POST',
    path: '/ai/trending-analysis',
    handler: (req, res) => aiController.analyzeTrending(req, res),
    requiresAuth: true,
  },
  {
    method: 'POST',
    path: '/ai/classify',
    handler: (req, res) => aiController.classifyContent(req, res),
    requiresAuth: true,
  },
  {
    method: 'POST',
    path: '/ai/sentiment',
    handler: (req, res) => aiController.analyzeSentiment(req, res),
    requiresAuth: true,
  },
];
