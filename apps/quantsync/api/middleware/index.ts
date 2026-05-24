// ============================================================================
// QuantSync API - Middleware
// Authentication, rate limiting, content validation for social platform
// ============================================================================

export interface Request {
  method: string;
  url: string;
  path: string;
  params: Record<string, string>;
  query: Record<string, string | string[]>;
  body: unknown;
  headers: Record<string, string>;
  ip: string;
  userId?: string;
  user?: {
    id: string;
    email: string;
    username: string;
    displayName: string;
    role: string;
    isAnonymous?: boolean;
  };
  startTime?: number;
  requestId?: string;
}

export interface Response {
  status(code: number): Response;
  json(data: unknown): void;
  send(data: string): void;
  setHeader(name: string, value: string): Response;
  statusCode: number;
  headersSent: boolean;
}

export type NextFunction = (error?: Error) => void;
export type Middleware = (req: Request, res: Response, next: NextFunction) => void | Promise<void>;

// ----------------------------------------------------------------------------
// Rate Limiter
// ----------------------------------------------------------------------------

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

export interface RateLimitOptions {
  windowMs: number;
  maxRequests: number;
  keyGenerator?: (req: Request) => string;
  message?: string;
}

export class RateLimiter {
  private store: Map<string, RateLimitEntry> = new Map();
  private options: Required<RateLimitOptions>;

  constructor(options: RateLimitOptions) {
    this.options = {
      windowMs: options.windowMs,
      maxRequests: options.maxRequests,
      keyGenerator: options.keyGenerator || ((req) => req.ip || 'unknown'),
      message: options.message || 'Too many requests, please try again later.',
    };
    setInterval(() => this.cleanup(), this.options.windowMs);
  }

  middleware(): Middleware {
    return (req: Request, res: Response, next: NextFunction): void => {
      const key = this.options.keyGenerator(req);
      const now = Date.now();
      const entry = this.store.get(key);

      if (!entry || entry.resetAt <= now) {
        this.store.set(key, { count: 1, resetAt: now + this.options.windowMs });
        res.setHeader('X-RateLimit-Limit', String(this.options.maxRequests));
        res.setHeader('X-RateLimit-Remaining', String(this.options.maxRequests - 1));
        next();
        return;
      }

      if (entry.count >= this.options.maxRequests) {
        const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
        res.setHeader('Retry-After', String(retryAfter));
        res.status(429).json({
          success: false,
          error: { code: 'RATE_LIMIT_EXCEEDED', message: this.options.message, statusCode: 429 },
        });
        return;
      }

      entry.count++;
      res.setHeader('X-RateLimit-Remaining', String(this.options.maxRequests - entry.count));
      next();
    };
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store) {
      if (entry.resetAt <= now) this.store.delete(key);
    }
  }
}

// ----------------------------------------------------------------------------
// CORS Middleware
// ----------------------------------------------------------------------------

export interface CorsOptions {
  origins: string[];
  credentials?: boolean;
}

export function corsMiddleware(options: CorsOptions): Middleware {
  return (req: Request, res: Response, next: NextFunction): void => {
    const origin = req.headers['origin'] || '';
    const isAllowed = options.origins.includes('*') || options.origins.includes(origin);
    if (isAllowed) res.setHeader('Access-Control-Allow-Origin', origin || '*');
    if (options.credentials) res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Request-ID, X-Anonymous-Mode');
    if (req.method === 'OPTIONS') { res.status(204).send(''); return; }
    next();
  };
}

// ----------------------------------------------------------------------------
// Auth Middleware
// ----------------------------------------------------------------------------

export function authMiddleware(): Middleware {
  return (req: Request, res: Response, next: NextFunction): void => {
    const authHeader = req.headers['authorization'] || '';
    if (!authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Bearer token required', statusCode: 401 },
      });
      return;
    }
    const token = authHeader.substring(7);
    const decoded = decodeToken(token);
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
      displayName: decoded.displayName || '',
      role: decoded.role || 'user',
      isAnonymous: req.headers['x-anonymous-mode'] === 'true',
    };
    next();
  };
}

function decodeToken(token: string): Record<string, any> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch { return null; }
}

// ----------------------------------------------------------------------------
// Request ID & Security
// ----------------------------------------------------------------------------

export function requestIdMiddleware(): Middleware {
  return (req: Request, res: Response, next: NextFunction): void => {
    const id = req.headers['x-request-id'] || `req_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 10)}`;
    req.requestId = id;
    req.startTime = Date.now();
    res.setHeader('X-Request-ID', id);
    next();
  };
}

export function securityHeaders(): Middleware {
  return (_req: Request, res: Response, next: NextFunction): void => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    next();
  };
}

export function loggingMiddleware(): Middleware {
  return (req: Request, _res: Response, next: NextFunction): void => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - ID: ${req.requestId}`);
    next();
  };
}

// ----------------------------------------------------------------------------
// Error Handling
// ----------------------------------------------------------------------------

export class AppError extends Error {
  public statusCode: number;
  public code: string;
  public isOperational: boolean;

  constructor(message: string, statusCode: number, code: string) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export function errorHandler(): (error: Error, req: Request, res: Response, next: NextFunction) => void {
  return (error: Error, _req: Request, res: Response, _next: NextFunction): void => {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({
        success: false,
        error: { code: error.code, message: error.message, statusCode: error.statusCode },
      });
      return;
    }
    console.error('Unhandled error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: 'An unexpected error occurred', statusCode: 500 },
    });
  };
}
