// ============================================================================
// QuantMail API - Auth Routes
// OAuth2 provider: /authorize, /token, /revoke, /userinfo, registration, login, 2FA, password reset
// ============================================================================

import { AuthController } from '../controllers/auth-controller';
import { OAuthService } from '../services/oauth-service';
import type { Request, Response, NextFunction } from '../middleware';
import { RateLimiter } from '../middleware';

// Initialize services
const oauthService = new OAuthService();
const authController = new AuthController(oauthService);

// Rate limiters for auth endpoints
const loginLimiter = new RateLimiter({ windowMs: 15 * 60 * 1000, maxRequests: 10, message: 'Too many login attempts' });
const registerLimiter = new RateLimiter({ windowMs: 60 * 60 * 1000, maxRequests: 5, message: 'Too many registration attempts' });
const resetLimiter = new RateLimiter({ windowMs: 60 * 60 * 1000, maxRequests: 3, message: 'Too many password reset attempts' });

// Route definitions
export interface RouteDefinition {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  handler: (req: Request, res: Response) => Promise<void>;
  middleware?: Array<(req: Request, res: Response, next: NextFunction) => void>;
  requiresAuth?: boolean;
}

export const authRoutes: RouteDefinition[] = [
  // Public auth endpoints
  {
    method: 'POST',
    path: '/auth/register',
    handler: (req, res) => authController.register(req, res),
    middleware: [registerLimiter.middleware()],
    requiresAuth: false,
  },
  {
    method: 'POST',
    path: '/auth/login',
    handler: (req, res) => authController.login(req, res),
    middleware: [loginLimiter.middleware()],
    requiresAuth: false,
  },
  {
    method: 'GET',
    path: '/auth/verify-email',
    handler: (req, res) => authController.verifyEmail(req, res),
    requiresAuth: false,
  },
  {
    method: 'POST',
    path: '/auth/password-reset',
    handler: (req, res) => authController.requestPasswordReset(req, res),
    middleware: [resetLimiter.middleware()],
    requiresAuth: false,
  },
  {
    method: 'POST',
    path: '/auth/password-reset/confirm',
    handler: (req, res) => authController.resetPassword(req, res),
    requiresAuth: false,
  },

  // OAuth2 endpoints
  {
    method: 'GET',
    path: '/oauth/authorize',
    handler: (req, res) => authController.authorize(req, res),
    requiresAuth: false,
  },
  {
    method: 'POST',
    path: '/oauth/token',
    handler: (req, res) => authController.token(req, res),
    requiresAuth: false,
  },
  {
    method: 'POST',
    path: '/oauth/revoke',
    handler: (req, res) => authController.revoke(req, res),
    requiresAuth: false,
  },
  {
    method: 'GET',
    path: '/oauth/userinfo',
    handler: (req, res) => authController.userInfo(req, res),
    requiresAuth: true,
  },

  // Two-factor authentication
  {
    method: 'POST',
    path: '/auth/2fa/setup',
    handler: (req, res) => authController.setupTwoFactor(req, res),
    requiresAuth: true,
  },
  {
    method: 'POST',
    path: '/auth/2fa/enable',
    handler: (req, res) => authController.enableTwoFactor(req, res),
    requiresAuth: true,
  },
  {
    method: 'POST',
    path: '/auth/2fa/disable',
    handler: (req, res) => authController.disableTwoFactor(req, res),
    requiresAuth: true,
  },
];

export { oauthService, authController };
