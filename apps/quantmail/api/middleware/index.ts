// ============================================================================
// QuantMail API - Middleware
// ============================================================================

// ----------------------------------------------------------------------------
// Types for Express-like request/response handling
// ----------------------------------------------------------------------------

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
    role: string;
    scopes: string[];
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
  skipFailedRequests?: boolean;
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
      skipFailedRequests: options.skipFailedRequests || false,
    };

    // Cleanup interval
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
        res.setHeader('X-RateLimit-Reset', String(Math.ceil((now + this.options.windowMs) / 1000)));
        next();
        return;
      }

      if (entry.count >= this.options.maxRequests) {
        const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
        res.setHeader('Retry-After', String(retryAfter));
        res.setHeader('X-RateLimit-Limit', String(this.options.maxRequests));
        res.setHeader('X-RateLimit-Remaining', '0');
        res.setHeader('X-RateLimit-Reset', String(Math.ceil(entry.resetAt / 1000)));
        res.status(429).json({
          success: false,
          error: { code: 'RATE_LIMIT_EXCEEDED', message: this.options.message, statusCode: 429 },
        });
        return;
      }

      entry.count++;
      res.setHeader('X-RateLimit-Limit', String(this.options.maxRequests));
      res.setHeader('X-RateLimit-Remaining', String(this.options.maxRequests - entry.count));
      res.setHeader('X-RateLimit-Reset', String(Math.ceil(entry.resetAt / 1000)));
      next();
    };
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store) {
      if (entry.resetAt <= now) {
        this.store.delete(key);
      }
    }
  }
}

// ----------------------------------------------------------------------------
// CORS Middleware
// ----------------------------------------------------------------------------

export interface CorsOptions {
  origins: string[];
  methods?: string[];
  allowedHeaders?: string[];
  exposedHeaders?: string[];
  credentials?: boolean;
  maxAge?: number;
}

export function corsMiddleware(options: CorsOptions): Middleware {
  const allowedMethods = (options.methods || ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS']).join(', ');
  const allowedHeaders = (options.allowedHeaders || ['Content-Type', 'Authorization', 'X-Request-ID']).join(', ');
  const exposedHeaders = (options.exposedHeaders || ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-Request-ID']).join(', ');

  return (req: Request, res: Response, next: NextFunction): void => {
    const origin = req.headers['origin'] || '';
    const isAllowed = options.origins.includes('*') || options.origins.includes(origin);

    if (isAllowed) {
      res.setHeader('Access-Control-Allow-Origin', origin || '*');
    }

    if (options.credentials) {
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    }

    res.setHeader('Access-Control-Allow-Methods', allowedMethods);
    res.setHeader('Access-Control-Allow-Headers', allowedHeaders);
    res.setHeader('Access-Control-Expose-Headers', exposedHeaders);

    if (options.maxAge) {
      res.setHeader('Access-Control-Max-Age', String(options.maxAge));
    }

    // Handle preflight
    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }

    next();
  };
}

// ----------------------------------------------------------------------------
// Request Validation Middleware
// ----------------------------------------------------------------------------

export interface ValidationSchema {
  body?: Record<string, FieldValidation>;
  query?: Record<string, FieldValidation>;
  params?: Record<string, FieldValidation>;
}

export interface FieldValidation {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'email';
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  enum?: string[];
}

export function validateRequest(schema: ValidationSchema): Middleware {
  return (req: Request, res: Response, next: NextFunction): void => {
    const errors: string[] = [];

    if (schema.body) {
      const body = req.body as Record<string, unknown> || {};
      for (const [field, validation] of Object.entries(schema.body)) {
        const value = body[field];
        const fieldErrors = validateField(field, value, validation);
        errors.push(...fieldErrors);
      }
    }

    if (schema.query) {
      for (const [field, validation] of Object.entries(schema.query)) {
        const value = req.query[field];
        const fieldErrors = validateField(`query.${field}`, value, validation);
        errors.push(...fieldErrors);
      }
    }

    if (schema.params) {
      for (const [field, validation] of Object.entries(schema.params)) {
        const value = req.params[field];
        const fieldErrors = validateField(`params.${field}`, value, validation);
        errors.push(...fieldErrors);
      }
    }

    if (errors.length > 0) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed',
          details: { errors },
          statusCode: 400,
        },
      });
      return;
    }

    next();
  };
}

function validateField(fieldName: string, value: unknown, rules: FieldValidation): string[] {
  const errors: string[] = [];

  if (rules.required && (value === undefined || value === null || value === '')) {
    errors.push(`${fieldName} is required`);
    return errors;
  }

  if (value === undefined || value === null) return errors;

  switch (rules.type) {
    case 'string':
      if (typeof value !== 'string') {
        errors.push(`${fieldName} must be a string`);
      } else {
        if (rules.minLength && value.length < rules.minLength) {
          errors.push(`${fieldName} must be at least ${rules.minLength} characters`);
        }
        if (rules.maxLength && value.length > rules.maxLength) {
          errors.push(`${fieldName} must be at most ${rules.maxLength} characters`);
        }
        if (rules.pattern && !rules.pattern.test(value)) {
          errors.push(`${fieldName} format is invalid`);
        }
        if (rules.enum && !rules.enum.includes(value)) {
          errors.push(`${fieldName} must be one of: ${rules.enum.join(', ')}`);
        }
      }
      break;
    case 'email':
      if (typeof value !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        errors.push(`${fieldName} must be a valid email address`);
      }
      break;
    case 'number':
      const num = typeof value === 'number' ? value : Number(value);
      if (isNaN(num)) {
        errors.push(`${fieldName} must be a number`);
      } else {
        if (rules.min !== undefined && num < rules.min) errors.push(`${fieldName} must be >= ${rules.min}`);
        if (rules.max !== undefined && num > rules.max) errors.push(`${fieldName} must be <= ${rules.max}`);
      }
      break;
    case 'boolean':
      if (typeof value !== 'boolean' && value !== 'true' && value !== 'false') {
        errors.push(`${fieldName} must be a boolean`);
      }
      break;
    case 'array':
      if (!Array.isArray(value)) {
        errors.push(`${fieldName} must be an array`);
      }
      break;
    case 'object':
      if (typeof value !== 'object' || Array.isArray(value)) {
        errors.push(`${fieldName} must be an object`);
      }
      break;
  }

  return errors;
}

// ----------------------------------------------------------------------------
// Error Handler Middleware
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
  return (error: Error, req: Request, res: Response, _next: NextFunction): void => {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({
        success: false,
        error: {
          code: error.code,
          message: error.message,
          statusCode: error.statusCode,
        },
        metadata: {
          requestId: req.requestId || 'unknown',
          timestamp: Date.now(),
          duration: req.startTime ? Date.now() - req.startTime : 0,
          version: '1.0.0',
        },
      });
      return;
    }

    // Unhandled error
    console.error('Unhandled error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred',
        statusCode: 500,
      },
      metadata: {
        requestId: req.requestId || 'unknown',
        timestamp: Date.now(),
        duration: req.startTime ? Date.now() - req.startTime : 0,
        version: '1.0.0',
      },
    });
  };
}

// ----------------------------------------------------------------------------
// Request ID and Logging Middleware
// ----------------------------------------------------------------------------

export function requestIdMiddleware(): Middleware {
  return (req: Request, res: Response, next: NextFunction): void => {
    const id = req.headers['x-request-id'] || generateRequestId();
    req.requestId = id;
    req.startTime = Date.now();
    res.setHeader('X-Request-ID', id);
    next();
  };
}

export function loggingMiddleware(): Middleware {
  return (req: Request, res: Response, next: NextFunction): void => {
    const start = Date.now();
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - Request ID: ${req.requestId}`);

    // Wrap the response to log completion
    const originalJson = res.json.bind(res);
    res.json = (data: unknown): void => {
      const duration = Date.now() - start;
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
      originalJson(data);
    };

    next();
  };
}

function generateRequestId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `req_${timestamp}_${random}`;
}

// ----------------------------------------------------------------------------
// Security Headers Middleware
// ----------------------------------------------------------------------------

export function securityHeaders(): Middleware {
  return (_req: Request, res: Response, next: NextFunction): void => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    next();
  };
}
