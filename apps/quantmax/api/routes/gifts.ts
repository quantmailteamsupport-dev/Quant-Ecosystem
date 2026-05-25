// ============================================================================
// QuantMax - Gifts Routes
// Routes: GET /gifts/catalog, POST /gifts/send, GET /gifts/balance,
// POST /gifts/topup, GET /gifts/leaderboard/:streamId
// ============================================================================

import { GiftsController } from '../controllers/gifts-controller';

interface RouteDefinition {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  handler: string;
  middleware?: string[];
  description: string;
}

const controller = new GiftsController();

export const giftRoutes: RouteDefinition[] = [
  {
    method: 'GET',
    path: '/api/gifts/catalog',
    handler: 'getCatalog',
    middleware: ['authenticate'],
    description: 'Get available gift catalog with prices',
  },
  {
    method: 'POST',
    path: '/api/gifts/send',
    handler: 'sendGift',
    middleware: ['authenticate', 'rateLimit', 'validateBody'],
    description: 'Send a gift to a streamer/creator',
  },
  {
    method: 'GET',
    path: '/api/gifts/balance',
    handler: 'getBalance',
    middleware: ['authenticate'],
    description: 'Get user diamond balance',
  },
  {
    method: 'POST',
    path: '/api/gifts/topup',
    handler: 'topUp',
    middleware: ['authenticate', 'validateBody'],
    description: 'Top up diamond balance with a package purchase',
  },
  {
    method: 'GET',
    path: '/api/gifts/leaderboard/:streamId',
    handler: 'getLeaderboard',
    middleware: ['authenticate'],
    description: 'Get top gifters leaderboard for a stream',
  },
];

export function registerGiftRoutes(router: any): void {
  router.get('/api/gifts/catalog', (req: any, res: any) => controller.getCatalog(req, res));
  router.post('/api/gifts/send', (req: any, res: any) => controller.sendGift(req, res));
  router.get('/api/gifts/balance', (req: any, res: any) => controller.getBalance(req, res));
  router.post('/api/gifts/topup', (req: any, res: any) => controller.topUp(req, res));
  router.get('/api/gifts/leaderboard/:streamId', (req: any, res: any) => controller.getLeaderboard(req, res));
}

export default giftRoutes;
