// ============================================================================
// QuantAds API - Analytics Routes
// ============================================================================

import { analyticsController } from '../controllers/analytics-controller';
import type { RouteDefinition } from './campaigns';

export const analyticsRoutes: RouteDefinition[] = [
  { method: 'GET', path: '/analytics/campaigns/:id', handler: (req, res) => analyticsController.getCampaignAnalytics(req, res), requiresAuth: true },
  { method: 'GET', path: '/analytics/campaigns/:id/realtime', handler: (req, res) => analyticsController.getRealtimeStats(req, res), requiresAuth: true },
  { method: 'POST', path: '/analytics/reports', handler: (req, res) => analyticsController.generateReport(req, res), requiresAuth: true },
  { method: 'GET', path: '/analytics/reports/:id', handler: (req, res) => analyticsController.getReport(req, res), requiresAuth: true },
  { method: 'POST', path: '/analytics/reports/export', handler: (req, res) => analyticsController.exportReport(req, res), requiresAuth: true },
  { method: 'POST', path: '/track/impression', handler: (req, res) => analyticsController.trackImpression(req, res), requiresAuth: false },
  { method: 'POST', path: '/track/click', handler: (req, res) => analyticsController.trackClick(req, res), requiresAuth: false },
  { method: 'POST', path: '/track/conversion', handler: (req, res) => analyticsController.trackConversion(req, res), requiresAuth: false },
];
