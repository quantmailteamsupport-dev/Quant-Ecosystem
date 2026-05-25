// ============================================================================
// QuantChat API - Voice Rooms Routes
// Voice room creation, joining, management endpoints
// ============================================================================

import { voiceRoomsController } from '../controllers/voice-rooms-controller';
import type { RouteDefinition } from './auth';

export const voiceRoomRoutes: RouteDefinition[] = [
  {
    method: 'GET',
    path: '/voice-rooms',
    handler: (req, res) => voiceRoomsController.listActiveRooms(req, res),
    requiresAuth: true,
  },
  {
    method: 'POST',
    path: '/voice-rooms',
    handler: (req, res) => voiceRoomsController.createRoom(req, res),
    requiresAuth: true,
  },
  {
    method: 'POST',
    path: '/voice-rooms/:roomId/join',
    handler: (req, res) => voiceRoomsController.joinRoom(req, res),
    requiresAuth: true,
  },
  {
    method: 'POST',
    path: '/voice-rooms/:roomId/leave',
    handler: (req, res) => voiceRoomsController.leaveRoom(req, res),
    requiresAuth: true,
  },
  {
    method: 'POST',
    path: '/voice-rooms/:roomId/end',
    handler: (req, res) => voiceRoomsController.endRoom(req, res),
    requiresAuth: true,
  },
  {
    method: 'POST',
    path: '/voice-rooms/:roomId/mute',
    handler: (req, res) => voiceRoomsController.muteUser(req, res),
    requiresAuth: true,
  },
  {
    method: 'POST',
    path: '/voice-rooms/:roomId/speaker',
    handler: (req, res) => voiceRoomsController.setSpeaker(req, res),
    requiresAuth: true,
  },
  {
    method: 'GET',
    path: '/voice-rooms/:roomId/participants',
    handler: (req, res) => voiceRoomsController.getParticipants(req, res),
    requiresAuth: true,
  },
  {
    method: 'PUT',
    path: '/voice-rooms/:roomId/permissions',
    handler: (req, res) => voiceRoomsController.setPermissions(req, res),
    requiresAuth: true,
  },
];
