// ============================================================================
// QuantMail API - Rules Routes
// Email rules engine endpoints for CRUD and evaluation
// ============================================================================

import { rulesController } from '../controllers/rules-controller';
import type { RouteDefinition } from './templates';

export const rulesRoutes: RouteDefinition[] = [
  {
    method: 'GET',
    path: '/rules',
    handler: (req, res) => rulesController.getRules(req, res),
    requiresAuth: true,
  },
  {
    method: 'POST',
    path: '/rules',
    handler: (req, res) => rulesController.createRule(req, res),
    requiresAuth: true,
  },
  {
    method: 'GET',
    path: '/rules/stats',
    handler: (req, res) => rulesController.getRuleStats(req, res),
    requiresAuth: true,
  },
  {
    method: 'GET',
    path: '/rules/:ruleId',
    handler: (req, res) => rulesController.getRule(req, res),
    requiresAuth: true,
  },
  {
    method: 'PUT',
    path: '/rules/:ruleId',
    handler: (req, res) => rulesController.updateRule(req, res),
    requiresAuth: true,
  },
  {
    method: 'DELETE',
    path: '/rules/:ruleId',
    handler: (req, res) => rulesController.deleteRule(req, res),
    requiresAuth: true,
  },
  {
    method: 'POST',
    path: '/rules/:ruleId/toggle',
    handler: (req, res) => rulesController.toggleRule(req, res),
    requiresAuth: true,
  },
  {
    method: 'PUT',
    path: '/rules/:ruleId/priority',
    handler: (req, res) => rulesController.reorderRule(req, res),
    requiresAuth: true,
  },
  {
    method: 'POST',
    path: '/rules/evaluate',
    handler: (req, res) => rulesController.evaluateRules(req, res),
    requiresAuth: true,
  },
];
