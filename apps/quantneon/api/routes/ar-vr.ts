// ============================================================================
// QuantNeon API - AR/VR Routes
// AR filters/effects, VR experiences, 3D posts, spatial content, try-on
// ============================================================================

import { arVrController } from '../controllers/ar-vr-controller';
import type { Request, Response, NextFunction } from '../middleware';
import type { RouteDefinition } from './posts';

export const arVrRoutes: RouteDefinition[] = [
  { method: 'GET', path: '/ar/filters', handler: (req, res) => arVrController.getFilters(req, res), requiresAuth: false },
  { method: 'GET', path: '/ar/filters/:id', handler: (req, res) => arVrController.getFilter(req, res), requiresAuth: false },
  { method: 'GET', path: '/ar/filters/trending', handler: (req, res) => arVrController.getTrendingFilters(req, res), requiresAuth: false },
  { method: 'POST', path: '/ar/filters', handler: (req, res) => arVrController.createFilter(req, res), requiresAuth: true },
  { method: 'POST', path: '/ar/process', handler: (req, res) => arVrController.processARContent(req, res), requiresAuth: true },
  { method: 'GET', path: '/ar/try-on/:productId', handler: (req, res) => arVrController.getTryOn(req, res), requiresAuth: false },
  { method: 'POST', path: '/ar/try-on/render', handler: (req, res) => arVrController.renderTryOn(req, res), requiresAuth: true },
  { method: 'GET', path: '/vr/experiences', handler: (req, res) => arVrController.getVRExperiences(req, res), requiresAuth: false },
  { method: 'GET', path: '/vr/experiences/:id', handler: (req, res) => arVrController.getVRExperience(req, res), requiresAuth: false },
  { method: 'POST', path: '/vr/experiences/:id/join', handler: (req, res) => arVrController.joinVRExperience(req, res), requiresAuth: true },
  { method: 'POST', path: '/3d/posts', handler: (req, res) => arVrController.create3DPost(req, res), requiresAuth: true },
  { method: 'GET', path: '/3d/posts/:id', handler: (req, res) => arVrController.get3DPost(req, res), requiresAuth: false },
  { method: 'POST', path: '/spatial/content', handler: (req, res) => arVrController.createSpatialContent(req, res), requiresAuth: true },
];
