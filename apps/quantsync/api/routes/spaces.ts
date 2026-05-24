// ============================================================================
// QuantSync API - Spaces Routes
// Live audio rooms (like Twitter Spaces)
// ============================================================================

import { spacesController } from '../controllers/spaces-controller';
import type { RouteDefinition } from './auth';

export const spaceRoutes: RouteDefinition[] = [
  {
    method: 'POST',
    path: '/spaces',
    handler: (req, res) => spacesController.createSpace(req, res),
    requiresAuth: true,
  },
  {
    method: 'GET',
    path: '/spaces/:id',
    handler: (req, res) => spacesController.getSpace(req, res),
    requiresAuth: false,
  },
  {
    method: 'GET',
    path: '/spaces/live',
    handler: (req, res) => spacesController.listLiveSpaces(req, res),
    requiresAuth: false,
  },
  {
    method: 'GET',
    path: '/spaces/scheduled',
    handler: (req, res) => spacesController.listScheduledSpaces(req, res),
    requiresAuth: false,
  },
  {
    method: 'POST',
    path: '/spaces/:id/join',
    handler: (req, res) => spacesController.joinSpace(req, res),
    requiresAuth: true,
  },
  {
    method: 'POST',
    path: '/spaces/:id/leave',
    handler: (req, res) => spacesController.leaveSpace(req, res),
    requiresAuth: true,
  },
  {
    method: 'POST',
    path: '/spaces/:id/raise-hand',
    handler: (req, res) => spacesController.raiseHand(req, res),
    requiresAuth: true,
  },
  {
    method: 'POST',
    path: '/spaces/:id/promote',
    handler: (req, res) => spacesController.promoteToSpeaker(req, res),
    requiresAuth: true,
  },
  {
    method: 'POST',
    path: '/spaces/:id/end',
    handler: (req, res) => spacesController.endSpace(req, res),
    requiresAuth: true,
  },
];
