// ============================================================================
// QuantSync API - Auth Routes
// QuantMail SSO + anonymous mode toggle
// ============================================================================

import { authController } from '../controllers/auth-controller';
import type { Request, Response, NextFunction } from '../middleware';
import { RateLimiter } from '../middleware';

export interface RouteDefinition {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  handler: (req: Request, res: Response) => Promise<void>;
  middleware?: Array<(req: Request, res: Response, next: NextFunction) => void>;
  requiresAuth?: boolean;
}

const ssoLimiter = new RateLimiter({ windowMs: 60 * 1000, maxRequests: 10, message: 'Too many login attempts' });

export const authRoutes: RouteDefinition[] = [
  {
    method: 'POST',
    path: '/auth/sso/login',
    handler: (req, res) => authController.loginWithSSO(req, res),
    middleware: [ssoLimiter.middleware()],
    requiresAuth: false,
  },
  {
    method: 'POST',
    path: '/auth/anonymous/toggle',
    handler: (req, res) => authController.toggleAnonymousMode(req, res),
    requiresAuth: true,
  },
  {
    method: 'GET',
    path: '/auth/session',
    handler: (req, res) => authController.getSession(req, res),
    requiresAuth: true,
  },
  {
    method: 'POST',
    path: '/auth/refresh',
    handler: (req, res) => authController.refreshToken(req, res),
    requiresAuth: false,
  },
  {
    method: 'POST',
    path: '/auth/logout',
    handler: (req, res) => authController.logout(req, res),
    requiresAuth: true,
  },
];
