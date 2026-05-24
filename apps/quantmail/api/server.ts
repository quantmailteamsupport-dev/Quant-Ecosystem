// ============================================================================
// QuantMail API Server
// Central authentication hub and email/code management for the Quant Ecosystem
// ============================================================================

import type { Request, Response, NextFunction, Middleware } from './middleware';
import {
  RateLimiter,
  corsMiddleware,
  requestIdMiddleware,
  loggingMiddleware,
  securityHeaders,
  errorHandler,
  AppError,
} from './middleware';

import { authRoutes } from './routes/auth';
import { emailRoutes } from './routes/emails';
import { repoRoutes } from './routes/repos';
import { cicdRoutes } from './routes/ci-cd';
import { aiRoutes } from './routes/ai';
import { contactRoutes } from './routes/contacts';
import { calendarRoutes } from './routes/calendar';

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
  port: 3001,
  host: '0.0.0.0',
  corsOrigins: [
    'https://mail.quant.app',
    'https://chat.quant.app',
    'https://sync.quant.app',
    'https://ads.quant.app',
    'https://tube.quant.app',
    'https://neon.quant.app',
    'https://edits.quant.app',
    'https://max.quant.app',
    'https://ai.quant.app',
    'http://localhost:3000',
    'http://localhost:3001',
  ],
  rateLimit: { windowMs: 15 * 60 * 1000, maxRequests: 1000 },
  jwtSecret: process.env['JWT_SECRET'] || 'quantmail-development-secret-key',
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
      })
      .replace(/\[([a-zA-Z0-9_]+)\]/g, (_, name) => {
        paramNames.push(name);
        return '([^/]+)';
      });
    return { pattern: new RegExp(`^${regexStr}$`), paramNames };
  }
}

// ============================================================================
// Application Server
// ============================================================================

export class QuantMailServer {
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
    // Request ID and start time tracking
    this.globalMiddleware.push(requestIdMiddleware());

    // Security headers
    this.globalMiddleware.push(securityHeaders());

    // CORS
    this.globalMiddleware.push(corsMiddleware({
      origins: this.config.corsOrigins,
      credentials: true,
      maxAge: 86400,
    }));

    // Global rate limiter
    const globalLimiter = new RateLimiter(this.config.rateLimit);
    this.globalMiddleware.push(globalLimiter.middleware());

    // Logging (only in non-test)
    if (this.config.env !== 'test') {
      this.globalMiddleware.push(loggingMiddleware());
    }
  }

  private setupRoutes(): void {
    // Register all route groups
    this.router.register(authRoutes);
    this.router.register(emailRoutes);
    this.router.register(repoRoutes);
    this.router.register(cicdRoutes);
    this.router.register(aiRoutes);
    this.router.register(contactRoutes);
    this.router.register(calendarRoutes);
  }

  /**
   * Handle an incoming request
   */
  async handleRequest(req: Request, res: Response): Promise<void> {
    try {
      // Run global middleware
      for (const mw of this.globalMiddleware) {
        let shouldContinue = true;
        await new Promise<void>((resolve) => {
          mw(req, res, (err?: Error) => {
            if (err) { shouldContinue = false; }
            resolve();
          });
        });
        if (!shouldContinue || res.headersSent) return;
      }

      // Match route
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

      // Auth check
      if (route.requiresAuth) {
        const authHeader = req.headers['authorization'] || '';
        if (!authHeader.startsWith('Bearer ')) {
          res.status(401).json({
            success: false,
            error: { code: 'UNAUTHORIZED', message: 'Bearer token required', statusCode: 401 },
          });
          return;
        }

        const token = authHeader.substring(7);
        const decoded = this.decodeToken(token);
        if (!decoded) {
          res.status(401).json({
            success: false,
            error: { code: 'INVALID_TOKEN', message: 'Invalid or expired token', statusCode: 401 },
          });
          return;
        }

        req.userId = decoded.sub;
        req.user = {
          id: decoded.sub,
          email: decoded.email || '',
          username: decoded.username || '',
          role: decoded.role || 'user',
          scopes: decoded.scopes || [],
        };
      }

      // Run route-specific middleware
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

      // Execute handler
      await route.handler(req, res);
    } catch (error) {
      const handler = errorHandler();
      handler(error as Error, req, res, () => {});
    }
  }

  /**
   * Decode a JWT token (simplified)
   */
  private decodeToken(token: string): Record<string, any> | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());

      // Check expiration
      if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
        return null;
      }

      return payload;
    } catch {
      return null;
    }
  }

  /**
   * Get all registered route paths for documentation
   */
  getRoutes(): Array<{ method: string; path: string; requiresAuth: boolean }> {
    const allRoutes = [
      ...authRoutes,
      ...emailRoutes,
      ...repoRoutes,
      ...cicdRoutes,
      ...aiRoutes,
      ...contactRoutes,
      ...calendarRoutes,
    ];
    return allRoutes.map((r) => ({
      method: r.method,
      path: r.path,
      requiresAuth: r.requiresAuth ?? true,
    }));
  }

  /**
   * Health check endpoint
   */
  getHealthStatus(): { status: string; uptime: number; version: string; routes: number } {
    return {
      status: 'healthy',
      uptime: process.uptime(),
      version: '1.0.0',
      routes: this.getRoutes().length,
    };
  }

  /**
   * Start the server (uses Node.js built-in http module)
   */
  start(): void {
    const http = require('http');
    const server = http.createServer(async (incomingReq: any, outgoingRes: any) => {
      // Parse request body
      let body = '';
      incomingReq.on('data', (chunk: Buffer) => { body += chunk.toString(); });
      incomingReq.on('end', async () => {
        const url = new URL(incomingReq.url || '/', `http://${incomingReq.headers.host}`);

        // Build Request object
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

        // Build Response object
        let statusCode = 200;
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        const res: Response = {
          statusCode: 200,
          headersSent: false,
          status(code: number) { statusCode = code; res.statusCode = code; return res; },
          json(data: unknown) {
            if (res.headersSent) return;
            res.headersSent = true;
            outgoingRes.writeHead(statusCode, headers);
            outgoingRes.end(JSON.stringify(data));
          },
          send(data: string) {
            if (res.headersSent) return;
            res.headersSent = true;
            outgoingRes.writeHead(statusCode, headers);
            outgoingRes.end(data);
          },
          setHeader(name: string, value: string) { headers[name] = value; return res; },
        };

        // Handle health check
        if (req.path === '/health') {
          res.status(200).json(this.getHealthStatus());
          return;
        }

        // Handle API routes
        await this.handleRequest(req, res);

        // If no response was sent
        if (!res.headersSent) {
          res.status(404).json({
            success: false,
            error: { code: 'NOT_FOUND', message: 'Endpoint not found', statusCode: 404 },
          });
        }
      });
    });

    server.listen(this.config.port, this.config.host, () => {
      console.log(`[QuantMail] Server running at http://${this.config.host}:${this.config.port}`);
      console.log(`[QuantMail] Environment: ${this.config.env}`);
      console.log(`[QuantMail] Routes registered: ${this.getRoutes().length}`);
    });
  }
}

// Export for use in other modules
export { Router };
export default QuantMailServer;
