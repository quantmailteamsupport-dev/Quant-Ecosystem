// ============================================================================
// QuantAI API - Agents Routes
// ============================================================================

import { agentsController } from '../controllers/agents-controller';
import type { Request, Response } from '../middleware';
import type { RouteDefinition } from './assistant';

export const agentRoutes: RouteDefinition[] = [
  { method: 'POST', path: '/agents', handler: (req, res) => agentsController.createAgent(req, res), requiresAuth: true },
  { method: 'POST', path: '/agents/:agentId/execute', handler: (req, res) => agentsController.executeAction(req, res), requiresAuth: true },
  { method: 'POST', path: '/agents/:agentId/chain', handler: (req, res) => agentsController.chainActions(req, res), requiresAuth: true },
  { method: 'GET', path: '/agents/:agentId/state', handler: (req, res) => agentsController.getState(req, res), requiresAuth: true },
  { method: 'POST', path: '/agents/:agentId/pause', handler: (req, res) => agentsController.pauseAgent(req, res), requiresAuth: true },
  { method: 'GET', path: '/agents/:agentId/history', handler: (req, res) => agentsController.getHistory(req, res), requiresAuth: true },
];
