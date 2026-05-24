// ============================================================================
// QuantTube API - AI Routes
// AI recommendations, auto-chapters, transcription, translation, content moderation, thumbnail generation
// ============================================================================

import { aiController } from '../controllers/ai-controller';
import type { Request, Response, NextFunction } from '../middleware';
import type { RouteDefinition } from './videos';

export const aiRoutes: RouteDefinition[] = [
  { method: 'GET', path: '/ai/recommendations', handler: (req, res) => aiController.getRecommendations(req, res), requiresAuth: true },
  { method: 'GET', path: '/ai/recommendations/personalized', handler: (req, res) => aiController.getPersonalizedFeed(req, res), requiresAuth: true },
  { method: 'POST', path: '/ai/chapters/generate', handler: (req, res) => aiController.generateChapters(req, res), requiresAuth: true },
  { method: 'POST', path: '/ai/transcription', handler: (req, res) => aiController.transcribe(req, res), requiresAuth: true },
  { method: 'POST', path: '/ai/translation', handler: (req, res) => aiController.translate(req, res), requiresAuth: true },
  { method: 'POST', path: '/ai/moderate', handler: (req, res) => aiController.moderateContent(req, res), requiresAuth: true },
  { method: 'POST', path: '/ai/thumbnail/generate', handler: (req, res) => aiController.generateThumbnail(req, res), requiresAuth: true },
  { method: 'POST', path: '/ai/tags/suggest', handler: (req, res) => aiController.suggestTags(req, res), requiresAuth: true },
  { method: 'POST', path: '/ai/description/generate', handler: (req, res) => aiController.generateDescription(req, res), requiresAuth: true },
  { method: 'GET', path: '/ai/trending-topics', handler: (req, res) => aiController.getTrendingTopics(req, res), requiresAuth: false },
  { method: 'POST', path: '/ai/music/recommend', handler: (req, res) => aiController.recommendMusic(req, res), requiresAuth: true },
  { method: 'POST', path: '/ai/shows/recommend', handler: (req, res) => aiController.recommendShows(req, res), requiresAuth: true },
];
