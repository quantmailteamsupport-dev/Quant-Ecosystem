// ============================================================================
// QuantTube API - Video Analytics Routes
// ============================================================================

import { videoAnalyticsController } from '../controllers/video-analytics-controller';
import type { Request, Response, NextFunction } from '../middleware';
import type { RouteDefinition } from './videos';

export const videoAnalyticsRoutes: RouteDefinition[] = [
  { method: 'GET', path: '/analytics/retention/:videoId', handler: (req, res) => videoAnalyticsController.getRetentionGraph(req, res), requiresAuth: true },
  { method: 'GET', path: '/analytics/traffic/:channelId', handler: (req, res) => videoAnalyticsController.getTrafficSources(req, res), requiresAuth: true },
  { method: 'GET', path: '/analytics/demographics/:channelId', handler: (req, res) => videoAnalyticsController.getDemographics(req, res), requiresAuth: true },
  { method: 'GET', path: '/analytics/revenue/:channelId', handler: (req, res) => videoAnalyticsController.getRevenueMetrics(req, res), requiresAuth: true },
  { method: 'GET', path: '/analytics/watchtime/:channelId', handler: (req, res) => videoAnalyticsController.getWatchTime(req, res), requiresAuth: true },
  { method: 'GET', path: '/analytics/realtime/:channelId', handler: (req, res) => videoAnalyticsController.getRealTimeViews(req, res), requiresAuth: true },
  { method: 'GET', path: '/analytics/engagement/:videoId', handler: (req, res) => videoAnalyticsController.getEngagement(req, res), requiresAuth: true },
];
