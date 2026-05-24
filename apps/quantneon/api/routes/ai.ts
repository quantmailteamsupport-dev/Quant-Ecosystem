// ============================================================================
// QuantNeon API - AI Routes
// AI filters, caption generation, alt-text, content suggestions, auto-hashtags, object recognition
// ============================================================================

import { aiController } from '../controllers/ai-controller';
import type { Request, Response, NextFunction } from '../middleware';
import type { RouteDefinition } from './posts';

export const aiRoutes: RouteDefinition[] = [
  { method: 'POST', path: '/ai/filters/apply', handler: (req, res) => aiController.applyAIFilter(req, res), requiresAuth: true },
  { method: 'POST', path: '/ai/caption/generate', handler: (req, res) => aiController.generateCaption(req, res), requiresAuth: true },
  { method: 'POST', path: '/ai/alt-text', handler: (req, res) => aiController.generateAltText(req, res), requiresAuth: true },
  { method: 'POST', path: '/ai/hashtags/suggest', handler: (req, res) => aiController.suggestHashtags(req, res), requiresAuth: true },
  { method: 'POST', path: '/ai/objects/recognize', handler: (req, res) => aiController.recognizeObjects(req, res), requiresAuth: true },
  { method: 'GET', path: '/ai/content/suggestions', handler: (req, res) => aiController.getContentSuggestions(req, res), requiresAuth: true },
  { method: 'POST', path: '/ai/enhance', handler: (req, res) => aiController.enhanceImage(req, res), requiresAuth: true },
  { method: 'POST', path: '/ai/background/remove', handler: (req, res) => aiController.removeBackground(req, res), requiresAuth: true },
  { method: 'POST', path: '/ai/style-transfer', handler: (req, res) => aiController.styleTransfer(req, res), requiresAuth: true },
  { method: 'POST', path: '/ai/moderate', handler: (req, res) => aiController.moderateContent(req, res), requiresAuth: true },
];
