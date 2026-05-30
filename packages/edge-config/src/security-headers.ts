import type { SecurityHeader, SecurityHeadersConfig } from './types.js';

export type PermissionsPolicyFeature = 'camera' | 'microphone' | 'geolocation';

export interface SecurityHeadersOptions {
  permissionsPolicy?: Partial<Record<PermissionsPolicyFeature, string>>;
  cspOverrides?: Partial<Record<string, string>>;
}

export function getSecurityHeaders(options: SecurityHeadersOptions = {}): SecurityHeadersConfig {
  const cspDefaults: Record<string, string> = {
    'default-src': "'self'",
    'script-src': "'self'",
    'style-src': "'self' 'unsafe-inline'",
    'img-src': "'self' data: https:",
    'connect-src': "'self' https:",
    'font-src': "'self' data:",
    'frame-ancestors': "'none'",
    'base-uri': "'self'",
    'form-action': "'self'",
  };

  const mergedCsp = { ...cspDefaults, ...options.cspOverrides };
  const cspValue = Object.entries(mergedCsp)
    .map(([directive, sources]) => `${directive} ${sources}`)
    .join('; ');

  const permDefaults: Record<PermissionsPolicyFeature, string> = {
    camera: '()',
    microphone: '()',
    geolocation: '()',
  };

  const mergedPerm = { ...permDefaults, ...options.permissionsPolicy };
  const permValue = Object.entries(mergedPerm)
    .map(([feature, value]) => `${feature}=${value}`)
    .join(', ');

  const headers: SecurityHeader[] = [
    {
      key: 'Content-Security-Policy',
      value: cspValue,
    },
    {
      key: 'Strict-Transport-Security',
      value: 'max-age=63072000; includeSubDomains; preload',
    },
    {
      key: 'X-Frame-Options',
      value: 'DENY',
    },
    {
      key: 'X-Content-Type-Options',
      value: 'nosniff',
    },
    {
      key: 'Referrer-Policy',
      value: 'strict-origin-when-cross-origin',
    },
    {
      key: 'Permissions-Policy',
      value: permValue,
    },
  ];

  return { headers };
}

export function getCSPHeader(overrides: Partial<Record<string, string>> = {}): SecurityHeader {
  const defaults: Record<string, string> = {
    'default-src': "'self'",
    'script-src': "'self'",
    'style-src': "'self' 'unsafe-inline'",
    'img-src': "'self' data: https:",
    'connect-src': "'self' https:",
    'font-src': "'self' data:",
    'frame-ancestors': "'none'",
    'base-uri': "'self'",
    'form-action': "'self'",
  };

  const merged = { ...defaults, ...overrides };
  const value = Object.entries(merged)
    .map(([directive, sources]) => `${directive} ${sources}`)
    .join('; ');

  return { key: 'Content-Security-Policy', value };
}
