// ============================================================================
// QuantTube API - Video Routes
// Upload, process, stream videos, shorts, live streams, premieres, chapters
// ============================================================================

import { videosController } from '../controllers/videos-controller';
import type { Request, Response, NextFunction } from '../middleware';

export interface RouteDefinition {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  handler: (req: Request, res: Response) => Promise<void>;
  middleware?: Array<(req: Request, res: Response, next: NextFunction) => void>;
  requiresAuth?: boolean;
}

export const videoRoutes: RouteDefinition[] = [
  { method: 'POST', path: '/videos/upload', handler: (req, res) => videosController.uploadVideo(req, res), requiresAuth: true },
  { method: 'POST', path: '/videos/upload/chunk', handler: (req, res) => videosController.uploadChunk(req, res), requiresAuth: true },
  { method: 'GET', path: '/videos', handler: (req, res) => videosController.listVideos(req, res), requiresAuth: false },
  { method: 'GET', path: '/videos/trending', handler: (req, res) => videosController.getTrending(req, res), requiresAuth: false },
  { method: 'GET', path: '/videos/shorts', handler: (req, res) => videosController.getShorts(req, res), requiresAuth: false },
  { method: 'GET', path: '/videos/:id', handler: (req, res) => videosController.getVideo(req, res), requiresAuth: false },
  { method: 'GET', path: '/videos/:id/stream', handler: (req, res) => videosController.streamVideo(req, res), requiresAuth: false },
  { method: 'GET', path: '/videos/:id/manifest', handler: (req, res) => videosController.getManifest(req, res), requiresAuth: false },
  { method: 'GET', path: '/videos/:id/chapters', handler: (req, res) => videosController.getChapters(req, res), requiresAuth: false },
  { method: 'GET', path: '/videos/:id/subtitles', handler: (req, res) => videosController.getSubtitles(req, res), requiresAuth: false },
  { method: 'PUT', path: '/videos/:id', handler: (req, res) => videosController.updateVideo(req, res), requiresAuth: true },
  { method: 'PUT', path: '/videos/:id/chapters', handler: (req, res) => videosController.updateChapters(req, res), requiresAuth: true },
  { method: 'PUT', path: '/videos/:id/subtitles', handler: (req, res) => videosController.updateSubtitles(req, res), requiresAuth: true },
  { method: 'DELETE', path: '/videos/:id', handler: (req, res) => videosController.deleteVideo(req, res), requiresAuth: true },
  { method: 'POST', path: '/videos/:id/premiere', handler: (req, res) => videosController.schedulePremiere(req, res), requiresAuth: true },
  { method: 'POST', path: '/videos/:id/process', handler: (req, res) => videosController.processVideo(req, res), requiresAuth: true },
  { method: 'GET', path: '/videos/:id/analytics', handler: (req, res) => videosController.getVideoAnalytics(req, res), requiresAuth: true },
];
