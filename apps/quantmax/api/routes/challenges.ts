// ============================================================================
// QuantMax - Challenges Routes
// Routes: GET /challenges, POST /challenges, GET /challenges/:id,
// POST /challenges/:id/submit, GET /challenges/:id/leaderboard,
// POST /challenges/:id/moderate
// ============================================================================

import { ChallengesController } from '../controllers/challenges-controller';

interface RouteDefinition {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  handler: string;
  middleware?: string[];
  description: string;
}

const controller = new ChallengesController();

export const challengeRoutes: RouteDefinition[] = [
  {
    method: 'GET',
    path: '/api/challenges',
    handler: 'listChallenges',
    middleware: ['authenticate', 'rateLimit'],
    description: 'List all active challenges',
  },
  {
    method: 'POST',
    path: '/api/challenges',
    handler: 'createChallenge',
    middleware: ['authenticate', 'rateLimit', 'validateBody'],
    description: 'Create a new hashtag challenge',
  },
  {
    method: 'GET',
    path: '/api/challenges/:id',
    handler: 'getChallenge',
    middleware: ['authenticate'],
    description: 'Get challenge details by ID',
  },
  {
    method: 'POST',
    path: '/api/challenges/:id/submit',
    handler: 'submitEntry',
    middleware: ['authenticate', 'rateLimit', 'validateBody'],
    description: 'Submit a video entry to a challenge',
  },
  {
    method: 'GET',
    path: '/api/challenges/:id/leaderboard',
    handler: 'getLeaderboard',
    middleware: ['authenticate'],
    description: 'Get challenge leaderboard sorted by engagement',
  },
  {
    method: 'POST',
    path: '/api/challenges/:id/moderate',
    handler: 'moderate',
    middleware: ['authenticate', 'requireModerator'],
    description: 'Moderate a challenge or submission',
  },
];

export function registerChallengeRoutes(router: any): void {
  router.get('/api/challenges', (req: any, res: any) => controller.listChallenges(req, res));
  router.post('/api/challenges', (req: any, res: any) => controller.createChallenge(req, res));
  router.get('/api/challenges/:id', (req: any, res: any) => controller.getChallenge(req, res));
  router.post('/api/challenges/:id/submit', (req: any, res: any) => controller.submitEntry(req, res));
  router.get('/api/challenges/:id/leaderboard', (req: any, res: any) => controller.getLeaderboard(req, res));
  router.post('/api/challenges/:id/moderate', (req: any, res: any) => controller.moderate(req, res));
}

export default challengeRoutes;
