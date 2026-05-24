// ============================================================================
// QuantSync API Server
// Twitter/X + Threads + Reddit hybrid with anonymous feeds and live spaces
// ============================================================================

import type { Request, Response, NextFunction, Middleware } from './middleware';
import {
  RateLimiter,
  corsMiddleware,
  requestIdMiddleware,
  securityHeaders,
  loggingMiddleware,
  errorHandler,
  AppError,
} from './middleware';

import { authRoutes } from './routes/auth';
import { postRoutes } from './routes/posts';
import { feedRoutes } from './routes/feed';
import { communityRoutes } from './routes/communities';
import { interactionRoutes } from './routes/interactions';
import { trendingRoutes } from './routes/trending';
import { spaceRoutes } from './routes/spaces';
import { anonymousRoutes } from './routes/anonymous';
import { aiRoutes } from './routes/ai';
import { notificationRoutes } from './routes/notifications';

import type { RouteDefinition } from './routes/auth';

// ============================================================================
// Server Configuration
// ============================================================================

export interface ServerConfig {
  port: number;
  host: string;
  corsOrigins: string[];
  rateLimit: { windowMs: number; maxRequests: number };
  jwtSecret: string;
  env: 'development' | 'production' | 'test';
}

const defaultConfig: ServerConfig = {
  port: 3003,
  host: '0.0.0.0',
  corsOrigins: [
    'https://sync.quant.app',
    'https://mail.quant.app',
    'https://ads.quant.app',
    'http://localhost:3000',
    'http://localhost:3003',
  ],
  rateLimit: { windowMs: 15 * 60 * 1000, maxRequests: 3000 },
  jwtSecret: process.env['JWT_SECRET'] || 'quantsync-development-secret-key',
  env: (process.env['NODE_ENV'] as 'development' | 'production' | 'test') || 'development',
};

// ============================================================================
// Router
// ============================================================================

interface RegisteredRoute {
  method: string;
  pathPattern: RegExp;
  paramNames: string[];
  handler: (req: Request, res: Response) => Promise<void>;
  middleware: Middleware[];
  requiresAuth: boolean;
}

class Router {
  private routes: RegisteredRoute[] = [];

  register(routes: RouteDefinition[]): void {
    for (const route of routes) {
      const { pattern, paramNames } = this.pathToRegex(route.path);
      this.routes.push({
        method: route.method,
        pathPattern: pattern,
        paramNames,
        handler: route.handler,
        middleware: route.middleware || [],
        requiresAuth: route.requiresAuth ?? true,
      });
    }
  }

  match(method: string, path: string): { route: RegisteredRoute; params: Record<string, string> } | null {
    for (const route of this.routes) {
      if (route.method !== method) continue;
      const match = path.match(route.pathPattern);
      if (match) {
        const params: Record<string, string> = {};
        route.paramNames.forEach((name, index) => {
          params[name] = match[index + 1];
        });
        return { route, params };
      }
    }
    return null;
  }

  private pathToRegex(path: string): { pattern: RegExp; paramNames: string[] } {
    const paramNames: string[] = [];
    const regexStr = path
      .replace(/:([a-zA-Z0-9_]+)/g, (_, name) => {
        paramNames.push(name);
        return '([^/]+)';
      });
    return { pattern: new RegExp(`^${regexStr}$`), paramNames };
  }
}

// ============================================================================
// Application Server
// ============================================================================

export class QuantSyncServer {
  private config: ServerConfig;
  private router: Router;
  private globalMiddleware: Middleware[] = [];

  constructor(config: Partial<ServerConfig> = {}) {
    this.config = { ...defaultConfig, ...config };
    this.router = new Router();
    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware(): void {
    this.globalMiddleware.push(requestIdMiddleware());
    this.globalMiddleware.push(securityHeaders());
    this.globalMiddleware.push(corsMiddleware({
      origins: this.config.corsOrigins,
      credentials: true,
    }));
    const globalLimiter = new RateLimiter(this.config.rateLimit);
    this.globalMiddleware.push(globalLimiter.middleware());
    if (this.config.env !== 'test') {
      this.globalMiddleware.push(loggingMiddleware());
    }
  }

  private setupRoutes(): void {
    this.router.register(authRoutes);
    this.router.register(postRoutes);
    this.router.register(feedRoutes);
    this.router.register(communityRoutes);
    this.router.register(interactionRoutes);
    this.router.register(trendingRoutes);
    this.router.register(spaceRoutes);
    this.router.register(anonymousRoutes);
    this.router.register(aiRoutes);
    this.router.register(notificationRoutes);
  }

  async handleRequest(req: Request, res: Response): Promise<void> {
    try {
      for (const mw of this.globalMiddleware) {
        let shouldContinue = true;
        await new Promise<void>((resolve) => {
          mw(req, res, (err?: Error) => {
            if (err) shouldContinue = false;
            resolve();
          });
        });
        if (!shouldContinue || res.headersSent) return;
      }

      const match = this.router.match(req.method, req.path);
      if (!match) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: `${req.method} ${req.path} not found`, statusCode: 404 },
        });
        return;
      }

      const { route, params } = match;
      req.params = params;

      if (route.requiresAuth) {
        const authHeader = req.headers['authorization'] || '';
        if (!authHeader.startsWith('Bearer ')) {
          res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Bearer token required', statusCode: 401 } });
          return;
        }
        const token = authHeader.substring(7);
        const decoded = this.decodeToken(token);
        if (!decoded) {
          res.status(401).json({ success: false, error: { code: 'INVALID_TOKEN', message: 'Invalid or expired token', statusCode: 401 } });
          return;
        }
        req.userId = decoded.sub;
        req.user = {
          id: decoded.sub,
          email: decoded.email || '',
          username: decoded.username || '',
          displayName: decoded.displayName || '',
          role: decoded.role || 'user',
          isAnonymous: req.headers['x-anonymous-mode'] === 'true',
        };
      }

      for (const mw of route.middleware) {
        let shouldContinue = true;
        await new Promise<void>((resolve) => {
          mw(req, res, (err?: Error) => {
            if (err) shouldContinue = false;
            resolve();
          });
        });
        if (!shouldContinue || res.headersSent) return;
      }

      await route.handler(req, res);
    } catch (error) {
      const handler = errorHandler();
      handler(error as Error, req, res, () => {});
    }
  }

  private decodeToken(token: string): Record<string, any> | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
      if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
      return payload;
    } catch { return null; }
  }

  getRoutes(): Array<{ method: string; path: string; requiresAuth: boolean }> {
    const allRoutes = [
      ...authRoutes, ...postRoutes, ...feedRoutes, ...communityRoutes,
      ...interactionRoutes, ...trendingRoutes, ...spaceRoutes,
      ...anonymousRoutes, ...aiRoutes, ...notificationRoutes,
    ];
    return allRoutes.map(r => ({ method: r.method, path: r.path, requiresAuth: r.requiresAuth ?? true }));
  }

  getHealthStatus() {
    return {
      status: 'healthy',
      service: 'quantsync',
      uptime: process.uptime(),
      version: '1.0.0',
      routes: this.getRoutes().length,
      features: ['posts', 'feed-algorithm', 'communities', 'spaces', 'anonymous', 'ai', 'trending'],
    };
  }

  start(): void {
    const http = require('http');
    const server = http.createServer(async (incomingReq: any, outgoingRes: any) => {
      let body = '';
      incomingReq.on('data', (chunk: Buffer) => { body += chunk.toString(); });
      incomingReq.on('end', async () => {
        const url = new URL(incomingReq.url || '/', `http://${incomingReq.headers.host}`);
        const req: Request = {
          method: incomingReq.method || 'GET',
          url: incomingReq.url || '/',
          path: url.pathname,
          params: {},
          query: Object.fromEntries(url.searchParams.entries()),
          body: body ? JSON.parse(body) : {},
          headers: incomingReq.headers as Record<string, string>,
          ip: incomingReq.socket?.remoteAddress || '127.0.0.1',
        };

        let statusCode = 200;
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        const res: Response = {
          statusCode: 200,
          headersSent: false,
          status(code: number) { statusCode = code; res.statusCode = code; return res; },
          json(data: unknown) { if (res.headersSent) return; res.headersSent = true; outgoingRes.writeHead(statusCode, headers); outgoingRes.end(JSON.stringify(data)); },
          send(data: string) { if (res.headersSent) return; res.headersSent = true; outgoingRes.writeHead(statusCode, headers); outgoingRes.end(data); },
          setHeader(name: string, value: string) { headers[name] = value; return res; },
        };

        if (req.path === '/health') { res.status(200).json(this.getHealthStatus()); return; }
        await this.handleRequest(req, res);
        if (!res.headersSent) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Endpoint not found', statusCode: 404 } }); }
      });
    });

    server.listen(this.config.port, this.config.host, () => {
      console.log(`[QuantSync] Server running at http://${this.config.host}:${this.config.port}`);
      console.log(`[QuantSync] Environment: ${this.config.env}`);
      console.log(`[QuantSync] Routes registered: ${this.getRoutes().length}`);
    });
  }
}

export default QuantSyncServer;
