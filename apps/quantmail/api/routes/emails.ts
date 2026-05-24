// ============================================================================
// QuantMail API - Email Routes
// Full email CRUD: compose, send, receive, reply, forward, archive, delete, search, labels, filters, attachments
// ============================================================================

import { EmailController } from '../controllers/email-controller';
import { EmailService } from '../services/email-service';
import type { Request, Response, NextFunction } from '../middleware';
import type { RouteDefinition } from './auth';

// Initialize
const emailService = new EmailService();
const emailController = new EmailController(emailService);

export const emailRoutes: RouteDefinition[] = [
  // Email listing and search
  {
    method: 'GET',
    path: '/emails',
    handler: (req, res) => emailController.listEmails(req, res),
    requiresAuth: true,
  },
  {
    method: 'GET',
    path: '/emails/search',
    handler: (req, res) => emailController.search(req, res),
    requiresAuth: true,
  },
  {
    method: 'GET',
    path: '/emails/stats',
    handler: (req, res) => emailController.getStats(req, res),
    requiresAuth: true,
  },

  // Single email operations
  {
    method: 'GET',
    path: '/emails/:id',
    handler: (req, res) => emailController.getEmail(req, res),
    requiresAuth: true,
  },
  {
    method: 'DELETE',
    path: '/emails/:id',
    handler: (req, res) => emailController.deleteEmail(req, res),
    requiresAuth: true,
  },

  // Compose and send
  {
    method: 'POST',
    path: '/emails/compose',
    handler: (req, res) => emailController.compose(req, res),
    requiresAuth: true,
  },
  {
    method: 'POST',
    path: '/emails/:id/send',
    handler: (req, res) => emailController.send(req, res),
    requiresAuth: true,
  },

  // Reply and forward
  {
    method: 'POST',
    path: '/emails/:id/reply',
    handler: (req, res) => emailController.reply(req, res),
    requiresAuth: true,
  },
  {
    method: 'POST',
    path: '/emails/:id/forward',
    handler: (req, res) => emailController.forward(req, res),
    requiresAuth: true,
  },

  // Actions
  {
    method: 'POST',
    path: '/emails/:id/archive',
    handler: (req, res) => emailController.archive(req, res),
    requiresAuth: true,
  },
  {
    method: 'POST',
    path: '/emails/:id/star',
    handler: (req, res) => emailController.toggleStar(req, res),
    requiresAuth: true,
  },

  // Labels
  {
    method: 'POST',
    path: '/emails/:id/labels',
    handler: (req, res) => emailController.addLabel(req, res),
    requiresAuth: true,
  },
  {
    method: 'DELETE',
    path: '/emails/:id/labels/:label',
    handler: (req, res) => emailController.removeLabel(req, res),
    requiresAuth: true,
  },

  // Attachments
  {
    method: 'POST',
    path: '/emails/:id/attachments',
    handler: (req, res) => emailController.addAttachment(req, res),
    requiresAuth: true,
  },

  // Threads
  {
    method: 'GET',
    path: '/threads/:threadId',
    handler: (req, res) => emailController.getThread(req, res),
    requiresAuth: true,
  },

  // Labels management
  {
    method: 'GET',
    path: '/labels',
    handler: (req, res) => emailController.getLabels(req, res),
    requiresAuth: true,
  },
  {
    method: 'POST',
    path: '/labels',
    handler: (req, res) => emailController.createLabel(req, res),
    requiresAuth: true,
  },

  // Filters
  {
    method: 'GET',
    path: '/filters',
    handler: (req, res) => emailController.getFilters(req, res),
    requiresAuth: true,
  },
  {
    method: 'POST',
    path: '/filters',
    handler: (req, res) => emailController.createFilter(req, res),
    requiresAuth: true,
  },
];

export { emailService, emailController };
