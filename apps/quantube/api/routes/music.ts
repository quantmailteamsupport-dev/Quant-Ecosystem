// ============================================================================
// QuantTube API - Music Routes
// Music streaming, albums, artists, playlists, radio, lyrics sync, podcasts
// ============================================================================

import { musicController } from '../controllers/music-controller';
import type { Request, Response, NextFunction } from '../middleware';
import type { RouteDefinition } from './videos';

export const musicRoutes: RouteDefinition[] = [
  { method: 'GET', path: '/music', handler: (req, res) => musicController.getHome(req, res), requiresAuth: false },
  { method: 'GET', path: '/music/tracks', handler: (req, res) => musicController.listTracks(req, res), requiresAuth: false },
  { method: 'GET', path: '/music/tracks/:id', handler: (req, res) => musicController.getTrack(req, res), requiresAuth: false },
  { method: 'GET', path: '/music/tracks/:id/stream', handler: (req, res) => musicController.streamTrack(req, res), requiresAuth: false },
  { method: 'GET', path: '/music/tracks/:id/lyrics', handler: (req, res) => musicController.getLyrics(req, res), requiresAuth: false },
  { method: 'GET', path: '/music/albums', handler: (req, res) => musicController.listAlbums(req, res), requiresAuth: false },
  { method: 'GET', path: '/music/albums/:id', handler: (req, res) => musicController.getAlbum(req, res), requiresAuth: false },
  { method: 'GET', path: '/music/artists', handler: (req, res) => musicController.listArtists(req, res), requiresAuth: false },
  { method: 'GET', path: '/music/artists/:id', handler: (req, res) => musicController.getArtist(req, res), requiresAuth: false },
  { method: 'GET', path: '/music/artists/:id/discography', handler: (req, res) => musicController.getDiscography(req, res), requiresAuth: false },
  { method: 'GET', path: '/music/radio', handler: (req, res) => musicController.getRadioStations(req, res), requiresAuth: false },
  { method: 'POST', path: '/music/radio/generate', handler: (req, res) => musicController.generateRadio(req, res), requiresAuth: true },
  { method: 'GET', path: '/music/podcasts', handler: (req, res) => musicController.listPodcasts(req, res), requiresAuth: false },
  { method: 'GET', path: '/music/podcasts/:id', handler: (req, res) => musicController.getPodcast(req, res), requiresAuth: false },
  { method: 'GET', path: '/music/podcasts/:id/episodes', handler: (req, res) => musicController.getPodcastEpisodes(req, res), requiresAuth: false },
  { method: 'POST', path: '/music/queue', handler: (req, res) => musicController.addToQueue(req, res), requiresAuth: true },
  { method: 'GET', path: '/music/queue', handler: (req, res) => musicController.getQueue(req, res), requiresAuth: true },
  { method: 'DELETE', path: '/music/queue/:id', handler: (req, res) => musicController.removeFromQueue(req, res), requiresAuth: true },
  { method: 'POST', path: '/music/tracks/upload', handler: (req, res) => musicController.uploadTrack(req, res), requiresAuth: true },
];
