// ============================================================================
// QuantSync API - Monetization Routes
// Subscription, tips, paywalls, earnings endpoints
// ============================================================================

import { monetizationController } from '../controllers/monetization-controller';

export interface RouteDefinition {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  handler: (req: any, res: any) => Promise<void> | void;
  middleware?: any[];
  requiresAuth: boolean;
}

export const monetizationRoutes: RouteDefinition[] = [
  {
    method: 'POST',
    path: '/monetization/tiers',
    handler: (req, res) => monetizationController.createTier(req, res),
    requiresAuth: true,
  },
  {
    method: 'POST',
    path: '/monetization/tiers/:tierId/subscribe',
    handler: (req, res) => monetizationController.subscribe(req, res),
    requiresAuth: true,
  },
  {
    method: 'DELETE',
    path: '/monetization/tiers/:tierId/subscribe',
    handler: (req, res) => monetizationController.unsubscribe(req, res),
    requiresAuth: true,
  },
  {
    method: 'POST',
    path: '/monetization/tips',
    handler: (req, res) => monetizationController.tipCreator(req, res),
    requiresAuth: true,
  },
  {
    method: 'GET',
    path: '/monetization/earnings',
    handler: (req, res) => monetizationController.getEarnings(req, res),
    requiresAuth: true,
  },
  {
    method: 'GET',
    path: '/monetization/subscribers',
    handler: (req, res) => monetizationController.getSubscribers(req, res),
    requiresAuth: true,
  },
  {
    method: 'POST',
    path: '/monetization/withdraw',
    handler: (req, res) => monetizationController.withdraw(req, res),
    requiresAuth: true,
  },
];
