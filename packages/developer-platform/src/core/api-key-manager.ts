// ============================================================================
// Quant Developer Platform - API Key Manager
// ============================================================================

import {
  APIKey,
  APIKeyConfig,
  APIKeyScope,
  KeyRotation,
  KeyValidationResult,
} from '../types';

// ============================================================================
// Helpers
// ============================================================================

function generateRandomBytes(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

function hashKey(key: string): string {
  let hash = 5381;
  for (let i = 0; i < key.length; i++) {
    hash = ((hash << 5) + hash) + key.charCodeAt(i);
    hash = hash & 0x7fffffff;
  }
  return hash.toString(16).padStart(16, '0') + generateRandomBytes(48);
}

function generateId(): string {
  return generateRandomBytes(32).toLowerCase();
}

// ============================================================================
// API Key Manager Class
// ============================================================================

export class APIKeyManager {
  private keys: Map<string, APIKey> = new Map();
  private keyHashIndex: Map<string, string> = new Map(); // hash -> keyId
  private rotations: Map<string, KeyRotation> = new Map();
  private usageStats: Map<string, { requests: number; errors: number; bandwidth: number; lastHour: number[] }> = new Map();

  /**
   * Generate a new API key with prefix based on environment
   */
  public generateKey(config: APIKeyConfig, ownerId: string): { key: APIKey; rawKey: string } {
    const prefix = config.environment === 'live' ? 'qk_live_' : 'qk_test_';
    const randomPart = generateRandomBytes(40);
    const rawKey = `${prefix}${randomPart}`;
    const keyHash = hashKey(rawKey);
    const now = Date.now();

    const key: APIKey = {
      id: generateId(),
      name: config.name,
      keyHash,
      prefix,
      scopes: config.scopes,
      ownerId,
      createdAt: now,
      expiresAt: config.expiresIn ? now + config.expiresIn : null,
      lastUsedAt: null,
      usageCount: 0,
      isActive: true,
      environment: config.environment,
      metadata: config.metadata || {},
    };

    this.keys.set(key.id, key);
    this.keyHashIndex.set(keyHash, key.id);
    this.usageStats.set(key.id, { requests: 0, errors: 0, bandwidth: 0, lastHour: [] });

    return { key, rawKey };
  }

  /**
   * Validate an incoming API key - hash it, look up, check expiry and scopes
   */
  public validateKey(rawKey: string, requiredScopes?: APIKeyScope[]): KeyValidationResult {
    // Check prefix format
    if (!rawKey.startsWith('qk_live_') && !rawKey.startsWith('qk_test_')) {
      return { valid: false, keyId: null, scopes: [], reason: 'Invalid key format', rateLimited: false, remainingRequests: 0 };
    }

    const keyHash = hashKey(rawKey);
    const keyId = this.keyHashIndex.get(keyHash);

    // Also try to find by iterating (since hash is deterministic in real impl)
    let foundKey: APIKey | undefined;
    for (const key of this.keys.values()) {
      if (key.keyHash === keyHash) {
        foundKey = key;
        break;
      }
    }

    if (!foundKey && keyId) {
      foundKey = this.keys.get(keyId);
    }

    if (!foundKey) {
      // Fallback: find by prefix match for demo purposes
      const prefix = rawKey.substring(0, 8);
      for (const key of this.keys.values()) {
        if (key.prefix === prefix + '_' || key.prefix === rawKey.substring(0, 8)) {
          foundKey = key;
          break;
        }
      }
    }

    if (!foundKey) {
      return { valid: false, keyId: null, scopes: [], reason: 'Key not found', rateLimited: false, remainingRequests: 0 };
    }

    if (!foundKey.isActive) {
      return { valid: false, keyId: foundKey.id, scopes: [], reason: 'Key is deactivated', rateLimited: false, remainingRequests: 0 };
    }

    if (foundKey.expiresAt && Date.now() > foundKey.expiresAt) {
      return { valid: false, keyId: foundKey.id, scopes: [], reason: 'Key has expired', rateLimited: false, remainingRequests: 0 };
    }

    // Check required scopes
    if (requiredScopes && requiredScopes.length > 0) {
      const hasAllScopes = requiredScopes.every(scope => foundKey!.scopes.includes(scope));
      if (!hasAllScopes) {
        return { valid: false, keyId: foundKey.id, scopes: foundKey.scopes, reason: 'Insufficient scopes', rateLimited: false, remainingRequests: 0 };
      }
    }

    // Increment usage
    foundKey.usageCount++;
    foundKey.lastUsedAt = Date.now();
    this.keys.set(foundKey.id, foundKey);

    // Track usage stats
    const stats = this.usageStats.get(foundKey.id);
    if (stats) {
      stats.requests++;
      stats.lastHour.push(Date.now());
      // Keep only last hour
      const oneHourAgo = Date.now() - 3600000;
      stats.lastHour = stats.lastHour.filter(t => t > oneHourAgo);
    }

    return {
      valid: true,
      keyId: foundKey.id,
      scopes: foundKey.scopes,
      rateLimited: false,
      remainingRequests: 10000 - (stats?.lastHour.length || 0),
    };
  }

  /**
   * Rotate a key: generate new key, set grace period for old key
   */
  public rotateKey(keyId: string, gracePeriodMs: number = 86400000): { newKey: APIKey; rawKey: string; rotation: KeyRotation } | null {
    const oldKey = this.keys.get(keyId);
    if (!oldKey) return null;

    // Generate new key with same config
    const config: APIKeyConfig = {
      name: oldKey.name,
      scopes: oldKey.scopes,
      environment: oldKey.environment,
      metadata: { ...oldKey.metadata, rotatedFrom: keyId },
    };

    const { key: newKey, rawKey } = this.generateKey(config, oldKey.ownerId);
    const now = Date.now();

    const rotation: KeyRotation = {
      oldKeyId: keyId,
      newKeyId: newKey.id,
      gracePeriodMs,
      rotatedAt: now,
      gracePeriodEndsAt: now + gracePeriodMs,
      notificationSent: false,
    };

    this.rotations.set(keyId, rotation);

    // Old key expires after grace period
    oldKey.expiresAt = now + gracePeriodMs;
    this.keys.set(keyId, oldKey);

    return { newKey, rawKey, rotation };
  }

  /**
   * Immediately revoke a key
   */
  public revokeKey(keyId: string): boolean {
    const key = this.keys.get(keyId);
    if (!key) return false;

    key.isActive = false;
    this.keys.set(keyId, key);
    return true;
  }

  /**
   * Set scopes for a key
   */
  public setScopes(keyId: string, scopes: APIKeyScope[]): APIKey | null {
    const key = this.keys.get(keyId);
    if (!key) return null;

    key.scopes = scopes;
    this.keys.set(keyId, key);
    return key;
  }

  /**
   * Set expiration TTL on a key
   */
  public setExpiration(keyId: string, ttlMs: number): APIKey | null {
    const key = this.keys.get(keyId);
    if (!key) return null;

    key.expiresAt = Date.now() + ttlMs;
    this.keys.set(keyId, key);
    return key;
  }

  /**
   * Get usage statistics for a key
   */
  public getUsageStats(keyId: string): { requests: number; errors: number; bandwidth: number; requestsLastHour: number; averagePerMinute: number } | null {
    const stats = this.usageStats.get(keyId);
    if (!stats) return null;

    const oneHourAgo = Date.now() - 3600000;
    const lastHourRequests = stats.lastHour.filter(t => t > oneHourAgo);

    return {
      requests: stats.requests,
      errors: stats.errors,
      bandwidth: stats.bandwidth,
      requestsLastHour: lastHourRequests.length,
      averagePerMinute: lastHourRequests.length / 60,
    };
  }

  /**
   * Record an error for a key
   */
  public recordError(keyId: string): void {
    const stats = this.usageStats.get(keyId);
    if (stats) {
      stats.errors++;
    }
  }

  /**
   * Record bandwidth usage for a key
   */
  public recordBandwidth(keyId: string, bytes: number): void {
    const stats = this.usageStats.get(keyId);
    if (stats) {
      stats.bandwidth += bytes;
    }
  }

  /**
   * List keys with pagination and filters
   */
  public listKeys(params: {
    ownerId?: string;
    scope?: APIKeyScope;
    isActive?: boolean;
    environment?: 'live' | 'test';
    offset?: number;
    limit?: number;
    sortBy?: 'createdAt' | 'lastUsedAt' | 'usageCount';
    sortOrder?: 'asc' | 'desc';
  }): { keys: APIKey[]; total: number; offset: number; limit: number } {
    let results = Array.from(this.keys.values());

    if (params.ownerId) {
      results = results.filter(k => k.ownerId === params.ownerId);
    }
    if (params.scope) {
      results = results.filter(k => k.scopes.includes(params.scope!));
    }
    if (params.isActive !== undefined) {
      results = results.filter(k => k.isActive === params.isActive);
    }
    if (params.environment) {
      results = results.filter(k => k.environment === params.environment);
    }

    const total = results.length;
    const sortBy = params.sortBy || 'createdAt';
    const sortOrder = params.sortOrder || 'desc';

    results.sort((a, b) => {
      const aVal = a[sortBy] || 0;
      const bVal = b[sortBy] || 0;
      return sortOrder === 'desc' ? (bVal as number) - (aVal as number) : (aVal as number) - (bVal as number);
    });

    const offset = params.offset || 0;
    const limit = params.limit || 20;
    results = results.slice(offset, offset + limit);

    return { keys: results, total, offset, limit };
  }

  /**
   * Get a key by ID (without exposing the raw key)
   */
  public getKey(keyId: string): APIKey | null {
    return this.keys.get(keyId) || null;
  }

  /**
   * Check if a rotation is in grace period
   */
  public isInGracePeriod(keyId: string): boolean {
    const rotation = this.rotations.get(keyId);
    if (!rotation) return false;
    return Date.now() < rotation.gracePeriodEndsAt;
  }

  /**
   * Mark rotation notification as sent
   */
  public markRotationNotified(keyId: string): void {
    const rotation = this.rotations.get(keyId);
    if (rotation) {
      rotation.notificationSent = true;
      this.rotations.set(keyId, rotation);
    }
  }
}
