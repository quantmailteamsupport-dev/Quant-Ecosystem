// ============================================================================
// Quant Developer Platform - Tiered Rate Limiter
// ============================================================================

import {
  RateLimitTier,
  TierConfig,
  RateLimitResult,
  BurstConfig,
  WindowConfig,
} from '../types';

// ============================================================================
// Constants - Tier Configurations
// ============================================================================

const DEFAULT_TIER_CONFIGS: Record<RateLimitTier, TierConfig> = {
  free: {
    tier: 'free',
    requestsPerMinute: 100,
    burstAllowance: 20,
    dailyLimit: 10000,
    concurrentLimit: 5,
  },
  basic: {
    tier: 'basic',
    requestsPerMinute: 1000,
    burstAllowance: 100,
    dailyLimit: 100000,
    concurrentLimit: 25,
  },
  pro: {
    tier: 'pro',
    requestsPerMinute: 10000,
    burstAllowance: 500,
    dailyLimit: 1000000,
    concurrentLimit: 100,
  },
  enterprise: {
    tier: 'enterprise',
    requestsPerMinute: Infinity,
    burstAllowance: Infinity,
    dailyLimit: null,
    concurrentLimit: Infinity,
  },
};

// ============================================================================
// Sliding Window Segment
// ============================================================================

interface WindowSegment {
  timestamp: number;
  count: number;
}

interface KeyState {
  tier: RateLimitTier;
  segments: WindowSegment[];
  burstTokens: number;
  lastBurstRefill: number;
  dailyCount: number;
  dailyResetAt: number;
  concurrentRequests: number;
}

// ============================================================================
// Tiered Rate Limiter Class
// ============================================================================

export class TieredRateLimiter {
  private keyStates: Map<string, KeyState> = new Map();
  private tierConfigs: Record<RateLimitTier, TierConfig>;
  private windowConfig: WindowConfig;
  private burstConfig: BurstConfig;

  constructor(options?: {
    tierConfigs?: Partial<Record<RateLimitTier, Partial<TierConfig>>>;
    windowConfig?: Partial<WindowConfig>;
    burstConfig?: Partial<BurstConfig>;
  }) {
    // Merge custom tier configs with defaults
    this.tierConfigs = { ...DEFAULT_TIER_CONFIGS };
    if (options?.tierConfigs) {
      for (const [tier, config] of Object.entries(options.tierConfigs)) {
        this.tierConfigs[tier as RateLimitTier] = {
          ...this.tierConfigs[tier as RateLimitTier],
          ...config,
        };
      }
    }

    this.windowConfig = {
      windowSizeMs: options?.windowConfig?.windowSizeMs || 60000, // 1 minute
      segmentCount: options?.windowConfig?.segmentCount || 12, // 5-second segments
      slidingWindow: options?.windowConfig?.slidingWindow !== false,
    };

    this.burstConfig = {
      maxBurst: options?.burstConfig?.maxBurst || 50,
      refillRate: options?.burstConfig?.refillRate || 10, // tokens per second
      windowMs: options?.burstConfig?.windowMs || 1000,
    };
  }

  /**
   * Check if a request is allowed under the rate limit
   * Uses sliding window algorithm with burst allowance
   */
  public checkLimit(key: string): RateLimitResult {
    const state = this.getOrCreateState(key);
    const tierConfig = this.tierConfigs[state.tier];
    const now = Date.now();

    // Enterprise tier - unlimited
    if (state.tier === 'enterprise') {
      return {
        allowed: true,
        tier: state.tier,
        remaining: Infinity,
        limit: Infinity,
        resetAt: 0,
        retryAfter: null,
        burstRemaining: Infinity,
      };
    }

    // Check daily limit
    if (tierConfig.dailyLimit !== null) {
      if (now > state.dailyResetAt) {
        // Reset daily counter
        state.dailyCount = 0;
        state.dailyResetAt = this.getEndOfDay(now);
      }
      if (state.dailyCount >= tierConfig.dailyLimit) {
        return {
          allowed: false,
          tier: state.tier,
          remaining: 0,
          limit: tierConfig.requestsPerMinute,
          resetAt: state.dailyResetAt,
          retryAfter: state.dailyResetAt - now,
          burstRemaining: 0,
        };
      }
    }

    // Clean up old segments and calculate current window count
    this.cleanSegments(state, now);
    const currentCount = this.getWindowCount(state, now);

    // Refill burst tokens
    this.refillBurstTokens(state, tierConfig, now);

    // Check rate limit
    if (currentCount >= tierConfig.requestsPerMinute) {
      // Check if burst allowance can cover this request
      if (state.burstTokens > 0) {
        state.burstTokens--;
        this.recordRequest(state, now);
        state.dailyCount++;
        this.keyStates.set(key, state);

        return {
          allowed: true,
          tier: state.tier,
          remaining: 0,
          limit: tierConfig.requestsPerMinute,
          resetAt: now + this.windowConfig.windowSizeMs,
          retryAfter: null,
          burstRemaining: state.burstTokens,
        };
      }

      // Rate limited
      const oldestSegment = state.segments[0];
      const resetAt = oldestSegment
        ? oldestSegment.timestamp + this.windowConfig.windowSizeMs
        : now + this.windowConfig.windowSizeMs;

      return {
        allowed: false,
        tier: state.tier,
        remaining: 0,
        limit: tierConfig.requestsPerMinute,
        resetAt,
        retryAfter: resetAt - now,
        burstRemaining: state.burstTokens,
      };
    }

    // Allowed - record the request
    this.recordRequest(state, now);
    state.dailyCount++;
    this.keyStates.set(key, state);

    const remaining = tierConfig.requestsPerMinute - (currentCount + 1);

    return {
      allowed: true,
      tier: state.tier,
      remaining: Math.max(0, remaining),
      limit: tierConfig.requestsPerMinute,
      resetAt: now + this.windowConfig.windowSizeMs,
      retryAfter: null,
      burstRemaining: state.burstTokens,
    };
  }

  private getOrCreateState(key: string): KeyState {
    let state = this.keyStates.get(key);
    if (!state) {
      state = {
        tier: 'free',
        segments: [],
        burstTokens: this.tierConfigs.free.burstAllowance,
        lastBurstRefill: Date.now(),
        dailyCount: 0,
        dailyResetAt: this.getEndOfDay(Date.now()),
        concurrentRequests: 0,
      };
      this.keyStates.set(key, state);
    }
    return state;
  }

  private cleanSegments(state: KeyState, now: number): void {
    const windowStart = now - this.windowConfig.windowSizeMs;
    state.segments = state.segments.filter(s => s.timestamp > windowStart);
  }

  private getWindowCount(state: KeyState, now: number): number {
    if (!this.windowConfig.slidingWindow) {
      // Fixed window - just sum all segments
      return state.segments.reduce((sum, s) => sum + s.count, 0);
    }

    // Sliding window - weight segments by how much they overlap with the window
    const windowStart = now - this.windowConfig.windowSizeMs;
    let count = 0;

    for (const segment of state.segments) {
      if (segment.timestamp > windowStart) {
        const segmentDuration = this.windowConfig.windowSizeMs / this.windowConfig.segmentCount;
        const segmentStart = segment.timestamp;
        const segmentEnd = segmentStart + segmentDuration;

        if (segmentStart >= windowStart) {
          // Fully within window
          count += segment.count;
        } else {
          // Partially within window - weight by overlap
          const overlap = (segmentEnd - windowStart) / segmentDuration;
          count += segment.count * Math.min(1, Math.max(0, overlap));
        }
      }
    }

    return Math.floor(count);
  }

  private recordRequest(state: KeyState, now: number): void {
    const segmentDuration = this.windowConfig.windowSizeMs / this.windowConfig.segmentCount;
    const segmentTimestamp = Math.floor(now / segmentDuration) * segmentDuration;

    const existingSegment = state.segments.find(s => s.timestamp === segmentTimestamp);
    if (existingSegment) {
      existingSegment.count++;
    } else {
      state.segments.push({ timestamp: segmentTimestamp, count: 1 });
    }
  }

  private refillBurstTokens(state: KeyState, tierConfig: TierConfig, now: number): void {
    const elapsed = now - state.lastBurstRefill;
    const tokensToAdd = Math.floor(elapsed / 1000) * this.burstConfig.refillRate;

    if (tokensToAdd > 0) {
      state.burstTokens = Math.min(tierConfig.burstAllowance, state.burstTokens + tokensToAdd);
      state.lastBurstRefill = now;
    }
  }

  private getEndOfDay(timestamp: number): number {
    const date = new Date(timestamp);
    date.setHours(23, 59, 59, 999);
    return date.getTime();
  }

  /**
   * Upgrade a key's tier
   */
  public upgradeTier(key: string, newTier: RateLimitTier): void {
    const state = this.getOrCreateState(key);
    const oldTier = state.tier;

    // Only allow upgrades (free -> basic -> pro -> enterprise)
    const tierOrder: RateLimitTier[] = ['free', 'basic', 'pro', 'enterprise'];
    const oldIndex = tierOrder.indexOf(oldTier);
    const newIndex = tierOrder.indexOf(newTier);

    if (newIndex > oldIndex) {
      state.tier = newTier;
      // Refill burst tokens to new tier's allowance
      state.burstTokens = this.tierConfigs[newTier].burstAllowance;
      this.keyStates.set(key, state);
    }
  }

  /**
   * Downgrade a key's tier
   */
  public downgradeTier(key: string, newTier: RateLimitTier): void {
    const state = this.getOrCreateState(key);
    state.tier = newTier;
    // Cap burst tokens to new tier's allowance
    const maxBurst = this.tierConfigs[newTier].burstAllowance;
    if (state.burstTokens > maxBurst) {
      state.burstTokens = maxBurst;
    }
    this.keyStates.set(key, state);
  }

  /**
   * Get current usage stats for a key
   */
  public getUsage(key: string): {
    tier: RateLimitTier;
    currentMinuteRequests: number;
    dailyRequests: number;
    burstTokensRemaining: number;
    limit: number;
    dailyLimit: number | null;
  } {
    const state = this.getOrCreateState(key);
    const tierConfig = this.tierConfigs[state.tier];
    const now = Date.now();

    this.cleanSegments(state, now);
    const currentCount = this.getWindowCount(state, now);

    return {
      tier: state.tier,
      currentMinuteRequests: currentCount,
      dailyRequests: state.dailyCount,
      burstTokensRemaining: state.burstTokens,
      limit: tierConfig.requestsPerMinute,
      dailyLimit: tierConfig.dailyLimit,
    };
  }

  /**
   * Manually reset rate limit for a key (admin action)
   */
  public resetLimit(key: string): void {
    const state = this.getOrCreateState(key);
    const tierConfig = this.tierConfigs[state.tier];

    state.segments = [];
    state.burstTokens = tierConfig.burstAllowance;
    state.dailyCount = 0;
    state.dailyResetAt = this.getEndOfDay(Date.now());
    state.concurrentRequests = 0;

    this.keyStates.set(key, state);
  }

  /**
   * Get tier configuration
   */
  public getTierConfig(tier: RateLimitTier): TierConfig {
    return { ...this.tierConfigs[tier] };
  }

  /**
   * Get all tier configurations
   */
  public getAllTierConfigs(): Record<RateLimitTier, TierConfig> {
    return { ...this.tierConfigs };
  }

  /**
   * Set a key's tier directly
   */
  public setTier(key: string, tier: RateLimitTier): void {
    const state = this.getOrCreateState(key);
    state.tier = tier;
    this.keyStates.set(key, state);
  }

  /**
   * Check concurrent request limit
   */
  public acquireConcurrency(key: string): boolean {
    const state = this.getOrCreateState(key);
    const tierConfig = this.tierConfigs[state.tier];

    if (state.concurrentRequests >= tierConfig.concurrentLimit) {
      return false;
    }

    state.concurrentRequests++;
    this.keyStates.set(key, state);
    return true;
  }

  /**
   * Release a concurrent request slot
   */
  public releaseConcurrency(key: string): void {
    const state = this.getOrCreateState(key);
    if (state.concurrentRequests > 0) {
      state.concurrentRequests--;
      this.keyStates.set(key, state);
    }
  }
}
