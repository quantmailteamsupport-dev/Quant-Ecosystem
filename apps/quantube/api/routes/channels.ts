// ============================================================================
// QuantTube API - Channels Routes
// Creator channels, subscriptions, memberships, community posts
// ============================================================================

import { channelsController } from '../controllers/channels-controller';
import type { Request, Response, NextFunction } from '../middleware';
import type { RouteDefinition } from './videos';

export const channelRoutes: RouteDefinition[] = [
  { method: 'POST', path: '/channels', handler: (req, res) => channelsController.createChannel(req, res), requiresAuth: true },
  { method: 'GET', path: '/channels', handler: (req, res) => channelsController.listChannels(req, res), requiresAuth: false },
  { method: 'GET', path: '/channels/:id', handler: (req, res) => channelsController.getChannel(req, res), requiresAuth: false },
  { method: 'PUT', path: '/channels/:id', handler: (req, res) => channelsController.updateChannel(req, res), requiresAuth: true },
  { method: 'GET', path: '/channels/:id/videos', handler: (req, res) => channelsController.getChannelVideos(req, res), requiresAuth: false },
  { method: 'GET', path: '/channels/:id/playlists', handler: (req, res) => channelsController.getChannelPlaylists(req, res), requiresAuth: false },
  { method: 'GET', path: '/channels/:id/community', handler: (req, res) => channelsController.getCommunityPosts(req, res), requiresAuth: false },
  { method: 'POST', path: '/channels/:id/community', handler: (req, res) => channelsController.createCommunityPost(req, res), requiresAuth: true },
  { method: 'POST', path: '/channels/:id/subscribe', handler: (req, res) => channelsController.subscribe(req, res), requiresAuth: true },
  { method: 'DELETE', path: '/channels/:id/subscribe', handler: (req, res) => channelsController.unsubscribe(req, res), requiresAuth: true },
  { method: 'GET', path: '/channels/:id/memberships', handler: (req, res) => channelsController.getMemberships(req, res), requiresAuth: false },
  { method: 'POST', path: '/channels/:id/memberships', handler: (req, res) => channelsController.joinMembership(req, res), requiresAuth: true },
  { method: 'GET', path: '/channels/:id/analytics', handler: (req, res) => channelsController.getAnalytics(req, res), requiresAuth: true },
  { method: 'GET', path: '/subscriptions', handler: (req, res) => channelsController.getSubscriptions(req, res), requiresAuth: true },
];
