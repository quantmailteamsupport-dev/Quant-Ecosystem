// ============================================================================
// QuantNeon API - Games Controller
// Mini games, AR games, multiplayer, leaderboards, rewards, tournaments
// ============================================================================

import type { Request, Response } from '../middleware';
import { gameService } from '../services/game-service';

interface Game {
  id: string;
  title: string;
  description: string;
  type: 'casual' | 'puzzle' | 'ar' | 'multiplayer' | 'trivia';
  thumbnailUrl: string;
  maxPlayers: number;
  isMultiplayer: boolean;
  playCount: number;
  rating: number;
  category: string;
}

interface GameSession {
  id: string;
  gameId: string;
  userId: string;
  state: Record<string, any>;
  score: number;
  startedAt: string;
  endedAt?: string;
  status: 'active' | 'completed' | 'abandoned';
}

interface LeaderboardEntry {
  userId: string;
  username: string;
  score: number;
  rank: number;
  achievedAt: string;
}

interface Tournament {
  id: string;
  gameId: string;
  title: string;
  startAt: string;
  endAt: string;
  participants: string[];
  maxParticipants: number;
  prizes: { rank: number; reward: string }[];
  status: 'upcoming' | 'active' | 'completed';
}

const games: Map<string, Game> = new Map([
  ['game_match3', { id: 'game_match3', title: 'Neon Match', description: 'Match 3 puzzle game', type: 'puzzle', thumbnailUrl: '/games/match3.png', maxPlayers: 1, isMultiplayer: false, playCount: 150000, rating: 4.5, category: 'puzzle' }],
  ['game_trivia', { id: 'game_trivia', title: 'Neon Trivia', description: 'Test your knowledge', type: 'trivia', thumbnailUrl: '/games/trivia.png', maxPlayers: 4, isMultiplayer: true, playCount: 95000, rating: 4.2, category: 'trivia' }],
  ['game_ar_catch', { id: 'game_ar_catch', title: 'AR Catch', description: 'Catch items in AR', type: 'ar', thumbnailUrl: '/games/arcatch.png', maxPlayers: 1, isMultiplayer: false, playCount: 72000, rating: 4.0, category: 'ar' }],
  ['game_runner', { id: 'game_runner', title: 'Neon Runner', description: 'Endless runner', type: 'casual', thumbnailUrl: '/games/runner.png', maxPlayers: 1, isMultiplayer: false, playCount: 200000, rating: 4.7, category: 'casual' }],
  ['game_battle', { id: 'game_battle', title: 'Neon Battle', description: 'Real-time multiplayer battle', type: 'multiplayer', thumbnailUrl: '/games/battle.png', maxPlayers: 8, isMultiplayer: true, playCount: 88000, rating: 4.3, category: 'multiplayer' }],
]);

const sessions: Map<string, GameSession> = new Map();
const leaderboards: Map<string, LeaderboardEntry[]> = new Map();
const tournaments: Map<string, Tournament> = new Map();

class GamesController {
  async listGames(req: Request, res: Response): Promise<void> {
    const query = req.query as any;
    let allGames = Array.from(games.values());
    if (query.type) allGames = allGames.filter(g => g.type === query.type);
    if (query.category) allGames = allGames.filter(g => g.category === query.category);
    allGames.sort((a, b) => b.playCount - a.playCount);
    res.status(200).json({ success: true, data: { games: allGames } });
  }

  async getFeatured(req: Request, res: Response): Promise<void> {
    const featured = Array.from(games.values()).sort((a, b) => b.rating - a.rating).slice(0, 5);
    res.status(200).json({ success: true, data: { games: featured } });
  }

  async getGame(req: Request, res: Response): Promise<void> {
    const game = games.get(req.params.id);
    if (!game) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Game not found', statusCode: 404 } }); return; }
    res.status(200).json({ success: true, data: { game } });
  }

  async startGame(req: Request, res: Response): Promise<void> {
    const game = games.get(req.params.id);
    if (!game) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Game not found', statusCode: 404 } }); return; }
    const sessionId = `gsess_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;
    const initialState = gameService.initializeGameState(game.id, game.type);
    const session: GameSession = { id: sessionId, gameId: game.id, userId: req.userId || '', state: initialState, score: 0, startedAt: new Date().toISOString(), status: 'active' };
    sessions.set(sessionId, session);
    game.playCount++;
    res.status(201).json({ success: true, data: { session: { id: session.id, gameId: session.gameId, state: session.state, score: session.score } } });
  }

  async submitAction(req: Request, res: Response): Promise<void> {
    const body = req.body as any;
    const sessionId = body.sessionId;
    const session = sessions.get(sessionId);
    if (!session || session.status !== 'active') { res.status(400).json({ success: false, error: { code: 'INVALID_SESSION', message: 'No active session', statusCode: 400 } }); return; }
    const result = gameService.processAction(session.state, body.action, body.data);
    session.state = result.newState;
    session.score = result.score;
    res.status(200).json({ success: true, data: { state: session.state, score: session.score, result: result.actionResult } });
  }

  async endGame(req: Request, res: Response): Promise<void> {
    const body = req.body as any;
    const session = sessions.get(body.sessionId || '');
    if (!session) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Session not found', statusCode: 404 } }); return; }
    session.status = 'completed';
    session.endedAt = new Date().toISOString();
    // Update leaderboard
    const lb = leaderboards.get(session.gameId) || [];
    lb.push({ userId: session.userId, username: req.user?.username || '', score: session.score, rank: 0, achievedAt: session.endedAt });
    lb.sort((a, b) => b.score - a.score);
    lb.forEach((e, i) => e.rank = i + 1);
    leaderboards.set(session.gameId, lb.slice(0, 100));
    const rank = lb.findIndex(e => e.userId === session.userId) + 1;
    res.status(200).json({ success: true, data: { finalScore: session.score, rank, sessionId: session.id } });
  }

  async getLeaderboard(req: Request, res: Response): Promise<void> {
    const lb = leaderboards.get(req.params.id) || [];
    res.status(200).json({ success: true, data: { leaderboard: lb.slice(0, 50), gameId: req.params.id } });
  }

  async getTournaments(req: Request, res: Response): Promise<void> {
    const allTournaments = Array.from(tournaments.values());
    res.status(200).json({ success: true, data: { tournaments: allTournaments } });
  }

  async joinTournament(req: Request, res: Response): Promise<void> {
    const tournament = tournaments.get(req.params.id);
    if (!tournament) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Tournament not found', statusCode: 404 } }); return; }
    if (tournament.participants.length >= tournament.maxParticipants) { res.status(400).json({ success: false, error: { code: 'FULL', message: 'Tournament is full', statusCode: 400 } }); return; }
    if (!tournament.participants.includes(req.userId || '')) tournament.participants.push(req.userId || '');
    res.status(200).json({ success: true, data: { joined: true, participants: tournament.participants.length } });
  }

  async getDailyChallenges(req: Request, res: Response): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    const challenges = [
      { id: `challenge_${today}_1`, title: 'Score 1000 points', gameId: 'game_runner', target: 1000, reward: '50 coins', completed: false },
      { id: `challenge_${today}_2`, title: 'Win a multiplayer match', gameId: 'game_battle', target: 1, reward: '100 coins', completed: false },
      { id: `challenge_${today}_3`, title: 'Complete 5 trivia rounds', gameId: 'game_trivia', target: 5, reward: 'Special Badge', completed: false },
    ];
    res.status(200).json({ success: true, data: { challenges, date: today } });
  }

  async completeChallenge(req: Request, res: Response): Promise<void> {
    res.status(200).json({ success: true, data: { completed: true, challengeId: req.params.id, reward: 'Challenge Reward' } });
  }

  async getRewards(req: Request, res: Response): Promise<void> {
    res.status(200).json({ success: true, data: { coins: 500, badges: ['first_game', 'streak_3'], level: 5, xp: 2500 } });
  }

  async joinMultiplayer(req: Request, res: Response): Promise<void> {
    const game = games.get(req.params.id);
    if (!game || !game.isMultiplayer) { res.status(400).json({ success: false, error: { code: 'NOT_MULTIPLAYER', message: 'Game does not support multiplayer', statusCode: 400 } }); return; }
    res.status(200).json({ success: true, data: { roomId: `room_${Date.now().toString(36)}`, gameId: game.id, players: [req.userId], maxPlayers: game.maxPlayers, status: 'waiting' } });
  }
}

export const gamesController = new GamesController();
