// ============================================================================
// QuantMail API - Templates Routes
// Email template management, rendering, and mail merge endpoints
// ============================================================================

import { templatesController } from '../controllers/templates-controller';

export interface RouteDefinition {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  handler: (req: any, res: any) => Promise<void> | void;
  middleware?: any[];
  requiresAuth: boolean;
}

export const templateRoutes: RouteDefinition[] = [
  {
    method: 'GET',
    path: '/templates',
    handler: (req, res) => templatesController.listTemplates(req, res),
    requiresAuth: true,
  },
  {
    method: 'POST',
    path: '/templates',
    handler: (req, res) => templatesController.createTemplate(req, res),
    requiresAuth: true,
  },
  {
    method: 'GET',
    path: '/templates/stats',
    handler: (req, res) => templatesController.getUsageStats(req, res),
    requiresAuth: true,
  },
  {
    method: 'GET',
    path: '/templates/:templateId',
    handler: (req, res) => templatesController.getTemplate(req, res),
    requiresAuth: true,
  },
  {
    method: 'PUT',
    path: '/templates/:templateId',
    handler: (req, res) => templatesController.updateTemplate(req, res),
    requiresAuth: true,
  },
  {
    method: 'DELETE',
    path: '/templates/:templateId',
    handler: (req, res) => templatesController.deleteTemplate(req, res),
    requiresAuth: true,
  },
  {
    method: 'POST',
    path: '/templates/:templateId/render',
    handler: (req, res) => templatesController.renderTemplate(req, res),
    requiresAuth: true,
  },
  {
    method: 'POST',
    path: '/templates/:templateId/preview',
    handler: (req, res) => templatesController.previewTemplate(req, res),
    requiresAuth: true,
  },
  {
    method: 'POST',
    path: '/templates/:templateId/merge',
    handler: (req, res) => templatesController.mailMerge(req, res),
    requiresAuth: true,
  },
  {
    method: 'POST',
    path: '/templates/:templateId/duplicate',
    handler: (req, res) => templatesController.duplicateTemplate(req, res),
    requiresAuth: true,
  },
];
