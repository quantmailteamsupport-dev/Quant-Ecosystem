// ============================================================================
// QuantNeon API - Messages Routes
// DMs integrated with QuantChat (cross-app messaging)
// ============================================================================

import { messagesController } from '../controllers/messages-controller';
import type { Request, Response, NextFunction } from '../middleware';
import type { RouteDefinition } from './posts';

export const messageRoutes: RouteDefinition[] = [
  { method: 'GET', path: '/messages', handler: (req, res) => messagesController.getConversations(req, res), requiresAuth: true },
  { method: 'POST', path: '/messages', handler: (req, res) => messagesController.sendMessage(req, res), requiresAuth: true },
  { method: 'GET', path: '/messages/:conversationId', handler: (req, res) => messagesController.getMessages(req, res), requiresAuth: true },
  { method: 'POST', path: '/messages/:conversationId/read', handler: (req, res) => messagesController.markRead(req, res), requiresAuth: true },
  { method: 'DELETE', path: '/messages/:messageId', handler: (req, res) => messagesController.deleteMessage(req, res), requiresAuth: true },
  { method: 'POST', path: '/messages/share-post', handler: (req, res) => messagesController.sharePost(req, res), requiresAuth: true },
  { method: 'POST', path: '/messages/share-reel', handler: (req, res) => messagesController.shareReel(req, res), requiresAuth: true },
];
