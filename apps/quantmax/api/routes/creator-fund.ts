// ============================================================================
// QuantMax - Creator Fund Routes
// Routes: GET /fund/eligibility, GET /fund/earnings, GET /fund/payouts,
// POST /fund/enroll, GET /fund/analytics
// ============================================================================

import { CreatorFundController } from '../controllers/creator-fund-controller';

interface RouteDefinition {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  handler: string;
  middleware?: string[];
  description: string;
}

const controller = new CreatorFundController();

export const creatorFundRoutes: RouteDefinition[] = [
  {
    method: 'GET',
    path: '/api/creator-fund/eligibility',
    handler: 'checkEligibility',
    middleware: ['authenticate'],
    description: 'Check if user is eligible for creator fund',
  },
  {
    method: 'GET',
    path: '/api/creator-fund/earnings',
    handler: 'getEarnings',
    middleware: ['authenticate'],
    description: 'Get earnings history for enrolled creator',
  },
  {
    method: 'GET',
    path: '/api/creator-fund/payouts',
    handler: 'getPayouts',
    middleware: ['authenticate'],
    description: 'Get payout history and pending payouts',
  },
  {
    method: 'POST',
    path: '/api/creator-fund/enroll',
    handler: 'enroll',
    middleware: ['authenticate', 'validateBody'],
    description: 'Enroll in the creator fund program',
  },
  {
    method: 'GET',
    path: '/api/creator-fund/analytics',
    handler: 'getAnalytics',
    middleware: ['authenticate'],
    description: 'Get detailed creator fund analytics',
  },
];

export function registerCreatorFundRoutes(router: any): void {
  router.get('/api/creator-fund/eligibility', (req: any, res: any) => controller.checkEligibility(req, res));
  router.get('/api/creator-fund/earnings', (req: any, res: any) => controller.getEarnings(req, res));
  router.get('/api/creator-fund/payouts', (req: any, res: any) => controller.getPayouts(req, res));
  router.post('/api/creator-fund/enroll', (req: any, res: any) => controller.enroll(req, res));
  router.get('/api/creator-fund/analytics', (req: any, res: any) => controller.getAnalytics(req, res));
}

export default creatorFundRoutes;
