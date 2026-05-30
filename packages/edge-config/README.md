# @quant/edge-config

Edge/CDN optimization package for Next.js applications. Provides cache control policies, edge middleware (geo-routing, A/B testing, bot detection), static asset optimization, and security headers.

## Installation

```bash
pnpm add @quant/edge-config
```

## Usage in next.config.js

```javascript
import {
  getSecurityHeaders,
  getImageOptimizationConfig,
  getFontOptimizationConfig,
} from '@quant/edge-config';

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: getImageOptimizationConfig(),

  headers: async () => [
    {
      source: '/(.*)',
      headers: getSecurityHeaders(),
    },
  ],
};

export default nextConfig;
```

## Features

### Cache Control Policies

Pre-configured cache policies for different content types:

```typescript
import { CacheControlPolicies } from '@quant/edge-config';

// Available policies:
CacheControlPolicies.STATIC; // "public, max-age=31536000, immutable"
CacheControlPolicies.DYNAMIC; // "private, no-cache, must-revalidate"
CacheControlPolicies.API; // "private, no-store"
CacheControlPolicies.HTML; // "public, max-age=0, must-revalidate"
CacheControlPolicies.MEDIA; // "public, max-age=86400"
```

### Edge Middleware

Create middleware for Next.js edge runtime:

```typescript
import { createEdgeMiddleware, createGeoRouteRule, createABTest } from '@quant/edge-config';

// Geo-based routing
const geoRule = createGeoRouteRule({
  country: 'IN',
  redirect: '/in',
});

// A/B testing
const abTest = createABTest({
  name: 'new-checkout',
  variants: ['control', 'variant-a', 'variant-b'],
  weights: [50, 25, 25],
});

// Combined edge middleware
const middleware = createEdgeMiddleware({
  geoRoutes: [geoRule],
  abTests: [abTest],
  rateLimitRequests: 100,
  rateLimitWindow: 60,
  botPatterns: [/googlebot/i, /bingbot/i],
});
```

### Security Headers

Automatically generates security headers for all responses:

```typescript
import { getSecurityHeaders, getCSPHeader } from '@quant/edge-config';

const headers = getSecurityHeaders();
// Returns array of:
// - X-Frame-Options: DENY
// - X-Content-Type-Options: nosniff
// - X-XSS-Protection: 1; mode=block
// - Referrer-Policy: strict-origin-when-cross-origin
// - Permissions-Policy: camera=(), microphone=(), geolocation=()
// - Strict-Transport-Security: max-age=31536000; includeSubDomains

// Custom CSP
const csp = getCSPHeader({
  defaultSrc: ["'self'"],
  scriptSrc: ["'self'", "'unsafe-inline'"],
  styleSrc: ["'self'", "'unsafe-inline'"],
  imgSrc: ["'self'", 'data:', 'https:'],
  connectSrc: ["'self'", 'wss://*.quant.app'],
});
```

### Static Asset Optimization

Configure Next.js image and font optimization:

```typescript
import {
  getImageOptimizationConfig,
  getFontOptimizationConfig,
  getBundleAnalyzerConfig,
} from '@quant/edge-config';

// Image optimization settings
const imageConfig = getImageOptimizationConfig();
// { formats: ['image/avif', 'image/webp'], deviceSizes: [...], imageSizes: [...] }

// Font optimization
const fontConfig = getFontOptimizationConfig();
// { display: 'swap', preload: true, subsets: ['latin'] }

// Bundle analyzer (development)
const analyzerConfig = getBundleAnalyzerConfig();
```

## Type Exports

```typescript
import type {
  CachePolicy,
  GeoRouteRule,
  ABTestConfig,
  BotPattern,
  SecurityHeader,
  SecurityHeadersConfig,
  EdgeRateLimitConfig,
  EdgeMiddlewareConfig,
  EdgeConfig,
  ImageOptimizationConfig,
  FontOptimizationConfig,
  BundleAnalyzerConfig,
} from '@quant/edge-config';
```

## Validation Schemas

All configuration types include Zod validation schemas:

```typescript
import {
  CachePolicySchema,
  GeoRouteRuleSchema,
  ABTestConfigSchema,
  BotPatternSchema,
  SecurityHeaderSchema,
} from '@quant/edge-config';

// Validate configuration at build time
const rule = GeoRouteRuleSchema.parse(userConfig);
```

## Dependencies

- `zod` - Configuration validation
- `@quant/common` - Shared types
