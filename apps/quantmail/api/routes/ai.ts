// ============================================================================
// QuantMail API - AI Routes
// AI features: smart compose, email summarization, auto-categorize, priority inbox, meeting extraction
// ============================================================================

import { AIController } from '../controllers/ai-controller';
import { AIService } from '../services/ai-service';
import { EmailService } from '../services/email-service';
import type { RouteDefinition } from './auth';

// Initialize
const aiService = new AIService();
const emailService = new EmailService();
const aiController = new AIController(aiService, emailService);

export const aiRoutes: RouteDefinition[] = [
  // Smart Compose
  {
    method: 'POST',
    path: '/ai/compose',
    handler: (req, res) => aiController.smartCompose(req, res),
    requiresAuth: true,
  },
  {
    method: 'POST',
    path: '/ai/autocomplete',
    handler: (req, res) => aiController.autocomplete(req, res),
    requiresAuth: true,
  },

  // Summarization
  {
    method: 'GET',
    path: '/ai/summarize/email/:emailId',
    handler: (req, res) => aiController.summarizeEmail(req, res),
    requiresAuth: true,
  },
  {
    method: 'GET',
    path: '/ai/summarize/thread/:threadId',
    handler: (req, res) => aiController.summarizeThread(req, res),
    requiresAuth: true,
  },

  // Categorization and Priority
  {
    method: 'POST',
    path: '/ai/categorize',
    handler: (req, res) => aiController.categorizeEmails(req, res),
    requiresAuth: true,
  },
  {
    method: 'POST',
    path: '/ai/priority',
    handler: (req, res) => aiController.detectPriority(req, res),
    requiresAuth: true,
  },

  // Meeting Extraction
  {
    method: 'GET',
    path: '/ai/meetings/:emailId',
    handler: (req, res) => aiController.extractMeetings(req, res),
    requiresAuth: true,
  },

  // Reply Suggestions
  {
    method: 'GET',
    path: '/ai/replies/:emailId',
    handler: (req, res) => aiController.suggestReplies(req, res),
    requiresAuth: true,
  },
];

export { aiService, aiController };
