# @quant/security-advanced

Advanced security controls for production deployments. Builds on `@quant/security` with enhanced CSRF protection (double-submit pattern), IP reputation scoring, secure session management with device fingerprinting, and field-level encryption.

## Installation

```bash
pnpm add @quant/security-advanced
```

## Features

### DoubleSubmitCSRF

Enhanced CSRF protection using the double-submit cookie pattern. More secure than single-token CSRF because it requires both a cookie (automatically sent) and a header (must be explicitly set by JavaScript).

```typescript
import { DoubleSubmitCSRF } from '@quant/security-advanced';

const csrf = new DoubleSubmitCSRF({
  cookieName: '__csrf',
  headerName: 'x-csrf-token',
  secret: process.env.CSRF_SECRET!,
  tokenLength: 32,
  cookieOptions: {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
  },
});

// Generate a token pair (cookie value + header value)
const pair = csrf.generate(sessionId);
// pair.cookie -> set as HTTP-only cookie
// pair.token -> send to client for header inclusion

// Validate on subsequent requests
const isValid = csrf.validate(pair.cookie, pair.token);
```

### IPReputationService

Score IP addresses based on configurable rules. Useful for adaptive security (challenge suspicious IPs, block known-bad ranges).

```typescript
import { IPReputationService } from '@quant/security-advanced';

const ipRep = new IPReputationService();

// Add reputation rules
ipRep.addRule({
  cidr: '10.0.0.0/8',
  score: 100,
  reason: 'internal network',
});

ipRep.addRule({
  cidr: '203.0.113.0/24',
  score: -80,
  reason: 'known spam network',
});

// Evaluate an IP
const result = ipRep.evaluate('203.0.113.45');
// {
//   ip: '203.0.113.45',
//   score: -80,         // negative = bad
//   factors: ['known spam network'],
//   action: 'block'     // 'allow' | 'challenge' | 'block'
// }

// Thresholds:
// score >= 0: allow
// -50 < score < 0: challenge (CAPTCHA)
// score <= -50: block
```

### SecureSessionManager

Session management with device fingerprinting, concurrent session limits, and automatic expiration.

```typescript
import { SecureSessionManager } from '@quant/security-advanced';

const sessions = new SecureSessionManager({
  maxConcurrentSessions: 5,
  sessionTTL: 3600, // 1 hour
  rotationInterval: 900, // rotate ID every 15 min
  fingerprintFields: ['userAgent', 'ip', 'acceptLanguage'],
});

// Create a new session
const fingerprint = {
  userAgent: req.headers['user-agent'],
  ip: req.ip,
  acceptLanguage: req.headers['accept-language'],
};

const session = sessions.create('user_123', fingerprint);
// { id: 'sess_abc...', userId: 'user_123', expiresAt: ..., fingerprint: '...' }

// Validate (checks expiration + fingerprint match)
const valid = sessions.validate(session.id, fingerprint);
// true if session exists, not expired, and fingerprint matches

// Revoke single session
sessions.revoke(session.id);

// Revoke all sessions for a user (logout everywhere)
sessions.revokeAll('user_123');

// List active sessions
const active = sessions.listForUser('user_123');
// [{ id, createdAt, lastActivity, fingerprint, ... }]
```

### FieldEncryption

Encrypt individual database fields with per-field keys derived from a master key. Useful for PII, financial data, and health records.

```typescript
import { FieldEncryption } from '@quant/security-advanced';

const fieldEnc = new FieldEncryption({
  masterKey: process.env.FIELD_ENCRYPTION_KEY!, // 32-byte hex key
  algorithm: 'aes-256-gcm',
  keyDerivation: 'hkdf',
});

// Encrypt a field value
const encrypted = fieldEnc.encrypt('user-ssn', '123-45-6789');
// Returns opaque string: 'enc_v1:...'

// Decrypt
const plaintext = fieldEnc.decrypt('user-ssn', encrypted);
// '123-45-6789'

// Rotate master key (re-encrypts all fields)
await fieldEnc.rotateKey(newMasterKey, async (fieldName) => {
  // Callback to fetch all encrypted values for re-encryption
  return getAllEncryptedValues(fieldName);
});
```

### APIKeyManager (Advanced)

Production-grade API key management with scopes, rotation, and audit trail.

```typescript
import { APIKeyManager } from '@quant/security-advanced';

const keys = new APIKeyManager({
  prefix: 'qk_', // Key prefix for identification
  hashAlgorithm: 'sha256', // Only hash stored, not raw key
  rotationPeriodDays: 90, // Auto-remind for rotation
});

// Create a key with fine-grained scopes
const key = keys.create({
  name: 'Production API',
  ownerId: 'org_123',
  scopes: [
    { resource: 'emails', actions: ['read', 'write'] },
    { resource: 'contacts', actions: ['read'] },
  ],
  expiresAt: new Date('2025-12-31'),
  rateLimit: { requests: 1000, windowMs: 60_000 },
});
// key.token: 'qk_live_abc123...' (only shown once)
// key.id: 'key_xyz...' (for management)

// Validate and check scopes
const result = keys.validate('qk_live_abc123...');
// { valid: true, keyId: 'key_xyz', scopes: [...], ownerId: 'org_123' }

// Check specific permission
const canWrite = keys.hasPermission(result, 'emails', 'write'); // true
const canDelete = keys.hasPermission(result, 'emails', 'delete'); // false

// Revoke
keys.revoke('key_xyz');
```

## Type Exports

```typescript
import type {
  CSRFConfig,
  CSRFTokenPair,
  APIKeyConfig,
  APIKeyRecord,
  APIKeyScope,
  IPReputationRule,
  IPScore,
  SessionConfig,
  SessionRecord,
  SessionFingerprint,
  EncryptionConfig,
  EncryptedField,
} from '@quant/security-advanced';
```

## Dependencies

- `@quant/common` - Shared types and utilities
- `zod` - Input validation
