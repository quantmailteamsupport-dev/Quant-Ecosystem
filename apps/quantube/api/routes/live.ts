// ============================================================================
// QuantTube API - Live Streaming Routes
// Live streaming, real-time chat, donations/super chats, raids, clips, replay
// ============================================================================

import { liveController } from '../controllers/live-controller';
import type { Request, Response, NextFunction } from '../middleware';
import type { RouteDefinition } from './videos';

export const liveRoutes: RouteDefinition[] = [
  { method: 'POST', path: '/live/start', handler: (req, res) => liveController.startStream(req, res), requiresAuth: true },
  { method: 'POST', path: '/live/:id/stop', handler: (req, res) => liveController.stopStream(req, res), requiresAuth: true },
  { method: 'GET', path: '/live', handler: (req, res) => liveController.listStreams(req, res), requiresAuth: false },
  { method: 'GET', path: '/live/featured', handler: (req, res) => liveController.getFeatured(req, res), requiresAuth: false },
  { method: 'GET', path: '/live/:id', handler: (req, res) => liveController.getStream(req, res), requiresAuth: false },
  { method: 'GET', path: '/live/:id/watch', handler: (req, res) => liveController.watchStream(req, res), requiresAuth: false },
  { method: 'POST', path: '/live/:id/chat', handler: (req, res) => liveController.sendChatMessage(req, res), requiresAuth: true },
  { method: 'GET', path: '/live/:id/chat', handler: (req, res) => liveController.getChatMessages(req, res), requiresAuth: false },
  { method: 'POST', path: '/live/:id/superchat', handler: (req, res) => liveController.sendSuperChat(req, res), requiresAuth: true },
  { method: 'POST', path: '/live/:id/donate', handler: (req, res) => liveController.donate(req, res), requiresAuth: true },
  { method: 'POST', path: '/live/:id/raid', handler: (req, res) => liveController.raid(req, res), requiresAuth: true },
  { method: 'POST', path: '/live/:id/clip', handler: (req, res) => liveController.createClip(req, res), requiresAuth: true },
  { method: 'GET', path: '/live/:id/clips', handler: (req, res) => liveController.getClips(req, res), requiresAuth: false },
  { method: 'GET', path: '/live/:id/replay', handler: (req, res) => liveController.getReplay(req, res), requiresAuth: false },
  { method: 'PUT', path: '/live/:id/settings', handler: (req, res) => liveController.updateSettings(req, res), requiresAuth: true },
  { method: 'POST', path: '/live/:id/schedule', handler: (req, res) => liveController.scheduleStream(req, res), requiresAuth: true },
];
