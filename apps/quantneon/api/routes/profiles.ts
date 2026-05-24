// ============================================================================
// QuantNeon API - Profiles Routes
// User profiles, bio, highlights, grid layout, tagged, followers/following
// ============================================================================

import { profilesController } from '../controllers/profiles-controller';
import type { Request, Response, NextFunction } from '../middleware';
import type { RouteDefinition } from './posts';

export const profileRoutes: RouteDefinition[] = [
  { method: 'GET', path: '/profiles/:id', handler: (req, res) => profilesController.getProfile(req, res), requiresAuth: false },
  { method: 'PUT', path: '/profiles/:id', handler: (req, res) => profilesController.updateProfile(req, res), requiresAuth: true },
  { method: 'GET', path: '/profiles/:id/posts', handler: (req, res) => profilesController.getProfilePosts(req, res), requiresAuth: false },
  { method: 'GET', path: '/profiles/:id/reels', handler: (req, res) => profilesController.getProfileReels(req, res), requiresAuth: false },
  { method: 'GET', path: '/profiles/:id/tagged', handler: (req, res) => profilesController.getTaggedPosts(req, res), requiresAuth: false },
  { method: 'POST', path: '/profiles/:id/follow', handler: (req, res) => profilesController.follow(req, res), requiresAuth: true },
  { method: 'DELETE', path: '/profiles/:id/follow', handler: (req, res) => profilesController.unfollow(req, res), requiresAuth: true },
  { method: 'GET', path: '/profiles/:id/followers', handler: (req, res) => profilesController.getFollowers(req, res), requiresAuth: false },
  { method: 'GET', path: '/profiles/:id/following', handler: (req, res) => profilesController.getFollowing(req, res), requiresAuth: false },
  { method: 'POST', path: '/profiles/:id/block', handler: (req, res) => profilesController.blockUser(req, res), requiresAuth: true },
  { method: 'POST', path: '/profiles/close-friends', handler: (req, res) => profilesController.updateCloseFriends(req, res), requiresAuth: true },
  { method: 'GET', path: '/profiles/suggestions', handler: (req, res) => profilesController.getSuggestions(req, res), requiresAuth: true },
];
