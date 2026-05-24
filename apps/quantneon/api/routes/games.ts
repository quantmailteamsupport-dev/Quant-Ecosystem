// ============================================================================
// QuantNeon API - Games Routes
// Mini games, AR games, multiplayer, leaderboards, rewards, tournaments, daily challenges
// ============================================================================

import { gamesController } from '../controllers/games-controller';
import type { Request, Response, NextFunction } from '../middleware';
import type { RouteDefinition } from './posts';

export const gameRoutes: RouteDefinition[] = [
  { method: 'GET', path: '/games', handler: (req, res) => gamesController.listGames(req, res), requiresAuth: false },
  { method: 'GET', path: '/games/featured', handler: (req, res) => gamesController.getFeatured(req, res), requiresAuth: false },
  { method: 'GET', path: '/games/:id', handler: (req, res) => gamesController.getGame(req, res), requiresAuth: false },
  { method: 'POST', path: '/games/:id/start', handler: (req, res) => gamesController.startGame(req, res), requiresAuth: true },
  { method: 'POST', path: '/games/:id/action', handler: (req, res) => gamesController.submitAction(req, res), requiresAuth: true },
  { method: 'POST', path: '/games/:id/end', handler: (req, res) => gamesController.endGame(req, res), requiresAuth: true },
  { method: 'GET', path: '/games/:id/leaderboard', handler: (req, res) => gamesController.getLeaderboard(req, res), requiresAuth: false },
  { method: 'GET', path: '/games/tournaments', handler: (req, res) => gamesController.getTournaments(req, res), requiresAuth: false },
  { method: 'POST', path: '/games/tournaments/:id/join', handler: (req, res) => gamesController.joinTournament(req, res), requiresAuth: true },
  { method: 'GET', path: '/games/challenges/daily', handler: (req, res) => gamesController.getDailyChallenges(req, res), requiresAuth: true },
  { method: 'POST', path: '/games/challenges/:id/complete', handler: (req, res) => gamesController.completeChallenge(req, res), requiresAuth: true },
  { method: 'GET', path: '/games/rewards', handler: (req, res) => gamesController.getRewards(req, res), requiresAuth: true },
  { method: 'POST', path: '/games/multiplayer/:id/join', handler: (req, res) => gamesController.joinMultiplayer(req, res), requiresAuth: true },
];
