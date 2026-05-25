// ============================================================================
// QuantEdits API - AI Editing Routes
// ============================================================================

import { aiEditingController } from '../controllers/ai-editing-controller';
import type { Request, Response } from '../middleware';
import type { RouteDefinition } from './editor';

export const aiEditingRoutes: RouteDefinition[] = [
  { method: 'POST', path: '/ai/background/detect', handler: (req, res) => aiEditingController.detectBackground(req, res), requiresAuth: true },
  { method: 'POST', path: '/ai/background/replace', handler: (req, res) => aiEditingController.replaceBackground(req, res), requiresAuth: true },
  { method: 'POST', path: '/ai/background/blur', handler: (req, res) => aiEditingController.blurBackground(req, res), requiresAuth: true },
  { method: 'GET', path: '/ai/background/presets', handler: (req, res) => aiEditingController.getPresets(req, res), requiresAuth: false },
  { method: 'POST', path: '/ai/style/apply', handler: (req, res) => aiEditingController.applyStyle(req, res), requiresAuth: true },
  { method: 'GET', path: '/ai/style/list', handler: (req, res) => aiEditingController.listStyles(req, res), requiresAuth: false },
  { method: 'POST', path: '/ai/tracking/track', handler: (req, res) => aiEditingController.trackObject(req, res), requiresAuth: true },
  { method: 'POST', path: '/ai/beats/detect', handler: (req, res) => aiEditingController.detectBeats(req, res), requiresAuth: true },
  { method: 'POST', path: '/ai/beats/sync', handler: (req, res) => aiEditingController.autoSyncCuts(req, res), requiresAuth: true },
];
