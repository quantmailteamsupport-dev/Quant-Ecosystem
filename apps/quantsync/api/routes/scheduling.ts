// ============================================================================
// QuantSync API - Scheduling Routes
// Post scheduling, queue, optimal times endpoints
// ============================================================================

import { schedulingController } from '../controllers/scheduling-controller';
import type { RouteDefinition } from './monetization';

export const schedulingRoutes: RouteDefinition[] = [
  {
    method: 'POST',
    path: '/scheduling/posts',
    handler: (req, res) => schedulingController.schedulePost(req, res),
    requiresAuth: true,
  },
  {
    method: 'GET',
    path: '/scheduling/queue',
    handler: (req, res) => schedulingController.getQueue(req, res),
    requiresAuth: true,
  },
  {
    method: 'GET',
    path: '/scheduling/optimal-times',
    handler: (req, res) => schedulingController.getOptimalTimes(req, res),
    requiresAuth: true,
  },
  {
    method: 'GET',
    path: '/scheduling/analytics',
    handler: (req, res) => schedulingController.getAnalytics(req, res),
    requiresAuth: true,
  },
  {
    method: 'DELETE',
    path: '/scheduling/posts/:postId',
    handler: (req, res) => schedulingController.cancelScheduled(req, res),
    requiresAuth: true,
  },
  {
    method: 'PUT',
    path: '/scheduling/posts/:postId/reschedule',
    handler: (req, res) => schedulingController.reschedule(req, res),
    requiresAuth: true,
  },
];
