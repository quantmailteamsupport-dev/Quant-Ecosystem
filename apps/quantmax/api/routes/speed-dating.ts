// ============================================================================
// QuantMax - Speed Dating Routes
// Routes: GET /sessions, POST /sessions, POST /sessions/:id/join,
// POST /sessions/:id/extend, POST /sessions/:id/rate, GET /sessions/:id/history
// ============================================================================

import { SpeedDatingController } from '../controllers/speed-dating-controller';

interface RouteDefinition {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  handler: string;
  middleware?: string[];
  description: string;
}

const controller = new SpeedDatingController();

export const speedDatingRoutes: RouteDefinition[] = [
  {
    method: 'GET',
    path: '/api/speed-dating/sessions',
    handler: 'listSessions',
    middleware: ['authenticate', 'rateLimit'],
    description: 'List available speed dating sessions',
  },
  {
    method: 'POST',
    path: '/api/speed-dating/sessions',
    handler: 'createSession',
    middleware: ['authenticate', 'rateLimit', 'validateBody'],
    description: 'Create a new speed dating session',
  },
  {
    method: 'POST',
    path: '/api/speed-dating/sessions/:id/join',
    handler: 'joinSession',
    middleware: ['authenticate', 'rateLimit'],
    description: 'Join an existing speed dating session',
  },
  {
    method: 'POST',
    path: '/api/speed-dating/sessions/:id/extend',
    handler: 'extendTime',
    middleware: ['authenticate'],
    description: 'Extend time for current speed date pair',
  },
  {
    method: 'POST',
    path: '/api/speed-dating/sessions/:id/rate',
    handler: 'ratePartner',
    middleware: ['authenticate', 'validateBody'],
    description: 'Rate partner after speed date',
  },
  {
    method: 'GET',
    path: '/api/speed-dating/sessions/:id/history',
    handler: 'getHistory',
    middleware: ['authenticate'],
    description: 'Get speed dating history for user',
  },
];

export function registerSpeedDatingRoutes(router: any): void {
  router.get('/api/speed-dating/sessions', (req: any, res: any) => controller.listSessions(req, res));
  router.post('/api/speed-dating/sessions', (req: any, res: any) => controller.createSession(req, res));
  router.post('/api/speed-dating/sessions/:id/join', (req: any, res: any) => controller.joinSession(req, res));
  router.post('/api/speed-dating/sessions/:id/extend', (req: any, res: any) => controller.extendTime(req, res));
  router.post('/api/speed-dating/sessions/:id/rate', (req: any, res: any) => controller.ratePartner(req, res));
  router.get('/api/speed-dating/sessions/:id/history', (req: any, res: any) => controller.getHistory(req, res));
}

export default speedDatingRoutes;
