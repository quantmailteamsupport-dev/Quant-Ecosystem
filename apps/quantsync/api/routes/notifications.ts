// ============================================================================
// QuantSync API - Notifications Routes
// Notification preferences and delivery
// ============================================================================

import { notificationsController } from '../controllers/notifications-controller';
import type { RouteDefinition } from './auth';

export const notificationRoutes: RouteDefinition[] = [
  {
    method: 'GET',
    path: '/notifications',
    handler: (req, res) => notificationsController.getNotifications(req, res),
    requiresAuth: true,
  },
  {
    method: 'POST',
    path: '/notifications/read',
    handler: (req, res) => notificationsController.markAsRead(req, res),
    requiresAuth: true,
  },
  {
    method: 'GET',
    path: '/notifications/preferences',
    handler: (req, res) => notificationsController.getPreferences(req, res),
    requiresAuth: true,
  },
  {
    method: 'PUT',
    path: '/notifications/preferences',
    handler: (req, res) => notificationsController.updatePreferences(req, res),
    requiresAuth: true,
  },
  {
    method: 'DELETE',
    path: '/notifications/:id',
    handler: (req, res) => notificationsController.deleteNotification(req, res),
    requiresAuth: true,
  },
];
