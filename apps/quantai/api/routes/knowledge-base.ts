// ============================================================================
// QuantAI API - Knowledge Base Routes
// ============================================================================

import { knowledgeBaseController } from '../controllers/knowledge-base-controller';
import type { Request, Response } from '../middleware';
import type { RouteDefinition } from './assistant';

export const knowledgeBaseRoutes: RouteDefinition[] = [
  { method: 'POST', path: '/kb/upload', handler: (req, res) => knowledgeBaseController.uploadDocument(req, res), requiresAuth: true },
  { method: 'POST', path: '/kb/:docId/index', handler: (req, res) => knowledgeBaseController.index(req, res), requiresAuth: true },
  { method: 'POST', path: '/kb/query', handler: (req, res) => knowledgeBaseController.query(req, res), requiresAuth: true },
  { method: 'POST', path: '/kb/context', handler: (req, res) => knowledgeBaseController.getContext(req, res), requiresAuth: true },
  { method: 'GET', path: '/kb/:userId/stats', handler: (req, res) => knowledgeBaseController.getStats(req, res), requiresAuth: true },
  { method: 'GET', path: '/kb/:userId/documents', handler: (req, res) => knowledgeBaseController.listDocuments(req, res), requiresAuth: true },
];
