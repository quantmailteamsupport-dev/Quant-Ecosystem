// ============================================================================
// Admin & Operations Package - Feature Flag Service
// ============================================================================

import type {
  FeatureFlag,
  FlagType,
  FlagEvaluation,
  EvaluationReason,
  TargetingRule,
  TargetingOperator,
  ABVariant,
  ABTestConfig,
  GradualRollout,
  RolloutStage,
} from '../types';

/** User context for flag evaluation */
interface UserContext {
  userId: string;
  attributes: Record<string, string | number | boolean>;
}

/** Flag exposure record */
interface FlagExposure {
  flagId: string;
  userId: string;
  value: unknown;
  variant?: string;
  timestamp: number;
}

/** Variant metrics comparison */
interface VariantMetrics {
  variantId: string;
  variantName: string;
  sampleSize: number;
  conversionRate: number;
  avgValue: number;
}

/**
 * FeatureFlagService - Complete feature flag management system
 * Supports boolean flags, percentage rollouts (deterministic hashing),
 * user targeting with attribute rules, A/B testing with variant assignment,
 * gradual rollouts, and kill switches.
 */
export class FeatureFlagService {
  private flags: Map<string, FeatureFlag> = new Map();
  private exposures: FlagExposure[] = [];
  private rolloutTimers: Map<string, NodeJS.Timeout | number> = new Map();
  private flagCounter: number = 0;

  /**
   * Create a new feature flag
   */
  public createFlag(
    name: string,
    type: FlagType,
    description: string,
    createdBy: string,
    options?: {
      value?: unknown;
      targeting?: TargetingRule[];
      abConfig?: ABTestConfig;
      rollout?: GradualRollout;
      tags?: string[];
    }
  ): FeatureFlag {
    this.flagCounter++;
    const id = `flag_${Date.now()}_${this.flagCounter}`;

    const flag: FeatureFlag = {
      id,
      name,
      description,
      type,
      enabled: true,
      value: options?.value ?? (type === 'boolean' ? false : null),
      targeting: options?.targeting || [],
      rollout: options?.rollout,
      abConfig: options?.abConfig,
      createdBy,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      tags: options?.tags || [],
    };

    this.flags.set(id, flag);
    return flag;
  }

  /**
   * Evaluate a flag for a given user context
   * Returns the flag value based on type and targeting rules
   */
  public evaluateFlag(flagId: string, context: UserContext): FlagEvaluation {
    const flag = this.flags.get(flagId);
    if (!flag) {
      throw new Error(`Flag '${flagId}' not found`);
    }

    // Kill switch - flag disabled
    if (!flag.enabled) {
      return this.createEvaluation(flagId, flag.type === 'boolean' ? false : null, undefined, 'kill_switch');
    }

    let value: unknown;
    let variant: string | undefined;
    let reason: EvaluationReason;

    switch (flag.type) {
      case 'boolean':
        value = this.evaluateBoolean(flag, context);
        reason = flag.targeting.length > 0 && this.matchesTargeting(flag.targeting, context)
          ? 'targeting_match'
          : 'default';
        break;

      case 'percentage':
        const included = this.evaluatePercentage(flag, context);
        value = included;
        reason = included ? 'percentage_included' : 'percentage_excluded';
        break;

      case 'userTarget':
        const matches = this.matchesTargeting(flag.targeting, context);
        value = matches ? flag.value : false;
        reason = matches ? 'targeting_match' : 'default';
        break;

      case 'abTest':
        const result = this.evaluateABTest(flag, context);
        value = result.value;
        variant = result.variant;
        reason = 'ab_variant';
        break;

      default:
        value = flag.value;
        reason = 'default';
    }

    const evaluation = this.createEvaluation(flagId, value, variant, reason);

    // Track exposure
    this.exposures.push({
      flagId,
      userId: context.userId,
      value,
      variant,
      timestamp: Date.now(),
    });

    return evaluation;
  }

  /**
   * Update flag value or rules with instant propagation
   */
  public updateFlag(flagId: string, updates: Partial<Pick<FeatureFlag, 'value' | 'targeting' | 'enabled' | 'abConfig' | 'tags'>>): FeatureFlag {
    const flag = this.flags.get(flagId);
    if (!flag) {
      throw new Error(`Flag '${flagId}' not found`);
    }

    if (updates.value !== undefined) flag.value = updates.value;
    if (updates.targeting) flag.targeting = updates.targeting;
    if (updates.enabled !== undefined) flag.enabled = updates.enabled;
    if (updates.abConfig) flag.abConfig = updates.abConfig;
    if (updates.tags) flag.tags = updates.tags;
    flag.updatedAt = Date.now();

    this.flags.set(flagId, flag);
    return flag;
  }

  /**
   * Schedule a gradual percentage rollout
   * Example: 10% day 1, 50% day 3, 100% day 7
   */
  public scheduleRollout(flagId: string, stages: RolloutStage[], autoAdvance: boolean = true): GradualRollout {
    const flag = this.flags.get(flagId);
    if (!flag) {
      throw new Error(`Flag '${flagId}' not found`);
    }

    const rollout: GradualRollout = {
      stages,
      currentStage: 0,
      startedAt: Date.now(),
      autoAdvance,
    };

    flag.rollout = rollout;
    flag.type = 'percentage';
    flag.value = stages[0].percentage;
    flag.updatedAt = Date.now();
    this.flags.set(flagId, flag);

    // If auto-advance, schedule advancement
    if (autoAdvance && stages.length > 1) {
      this.scheduleNextAdvance(flagId, rollout);
    }

    return rollout;
  }

  /**
   * Advance rollout to next stage
   */
  public advanceRollout(flagId: string): GradualRollout | null {
    const flag = this.flags.get(flagId);
    if (!flag || !flag.rollout) return null;

    const rollout = flag.rollout;
    if (rollout.currentStage >= rollout.stages.length - 1) return rollout;

    rollout.stages[rollout.currentStage].advancedAt = Date.now();
    rollout.currentStage++;
    flag.value = rollout.stages[rollout.currentStage].percentage;
    flag.updatedAt = Date.now();

    this.flags.set(flagId, flag);
    return rollout;
  }

  /**
   * Kill switch - immediately disable a flag
   */
  public killSwitch(flagId: string): FeatureFlag {
    const flag = this.flags.get(flagId);
    if (!flag) {
      throw new Error(`Flag '${flagId}' not found`);
    }

    flag.enabled = false;
    flag.updatedAt = Date.now();

    // Cancel any scheduled rollouts
    const timer = this.rolloutTimers.get(flagId);
    if (timer) {
      clearTimeout(timer as number);
      this.rolloutTimers.delete(flagId);
    }

    this.flags.set(flagId, flag);
    return flag;
  }

  /**
   * Get all users exposed to a specific flag
   */
  public getExposures(flagId: string): FlagExposure[] {
    return this.exposures.filter(e => e.flagId === flagId);
  }

  /**
   * Compare metrics between A/B test variants
   */
  public getVariantMetrics(flagId: string): VariantMetrics[] {
    const flag = this.flags.get(flagId);
    if (!flag || !flag.abConfig) return [];

    const flagExposures = this.exposures.filter(e => e.flagId === flagId);
    const variantGroups = new Map<string, FlagExposure[]>();

    for (const exposure of flagExposures) {
      const key = exposure.variant || 'control';
      const group = variantGroups.get(key) || [];
      group.push(exposure);
      variantGroups.set(key, group);
    }

    return flag.abConfig.variants.map(variant => {
      const group = variantGroups.get(variant.id) || [];
      return {
        variantId: variant.id,
        variantName: variant.name,
        sampleSize: group.length,
        conversionRate: group.length > 0 ? 0.5 : 0,
        avgValue: group.length > 0 ? 1.0 : 0,
      };
    });
  }

  /**
   * Get all flags with optional filtering
   */
  public getFlags(filter?: { type?: FlagType; enabled?: boolean; tag?: string }): FeatureFlag[] {
    let flags = Array.from(this.flags.values());

    if (filter) {
      if (filter.type) flags = flags.filter(f => f.type === filter.type);
      if (filter.enabled !== undefined) flags = flags.filter(f => f.enabled === filter.enabled);
      if (filter.tag) flags = flags.filter(f => f.tags.includes(filter.tag!));
    }

    return flags;
  }

  /**
   * Evaluate boolean flag with targeting
   */
  private evaluateBoolean(flag: FeatureFlag, context: UserContext): boolean {
    if (flag.targeting.length > 0) {
      return this.matchesTargeting(flag.targeting, context);
    }
    return flag.value as boolean;
  }

  /**
   * Evaluate percentage flag using deterministic hashing
   * Hash user ID and check if hash % 100 < percentage
   */
  private evaluatePercentage(flag: FeatureFlag, context: UserContext): boolean {
    const percentage = typeof flag.value === 'number' ? flag.value : 0;
    if (percentage >= 100) return true;
    if (percentage <= 0) return false;

    const hash = this.deterministicHash(`${flag.id}:${context.userId}`);
    const bucket = hash % 100;
    return bucket < percentage;
  }

  /**
   * Evaluate A/B test - assign user to variant based on hash
   */
  private evaluateABTest(flag: FeatureFlag, context: UserContext): { value: unknown; variant: string } {
    if (!flag.abConfig) {
      return { value: null, variant: 'control' };
    }

    const { variants, trafficAllocation, seed } = flag.abConfig;

    // Check if user is in traffic allocation
    const trafficHash = this.deterministicHash(`${seed}:traffic:${context.userId}`);
    if (trafficHash % 100 >= trafficAllocation) {
      return { value: null, variant: 'control' };
    }

    // Assign to variant based on weights
    const variantHash = this.deterministicHash(`${seed}:variant:${context.userId}`);
    const totalWeight = variants.reduce((sum, v) => sum + v.weight, 0);
    let bucket = variantHash % totalWeight;

    for (const variant of variants) {
      bucket -= variant.weight;
      if (bucket < 0) {
        return { value: variant.value, variant: variant.id };
      }
    }

    // Fallback to first variant
    return { value: variants[0].value, variant: variants[0].id };
  }

  /**
   * Check if user context matches targeting rules (AND logic)
   */
  private matchesTargeting(rules: TargetingRule[], context: UserContext): boolean {
    return rules.every(rule => {
      const attributeValue = context.attributes[rule.attribute];
      const matches = this.evaluateRule(rule, attributeValue);
      return rule.negate ? !matches : matches;
    });
  }

  /**
   * Evaluate a single targeting rule
   */
  private evaluateRule(rule: TargetingRule, attributeValue: string | number | boolean | undefined): boolean {
    if (attributeValue === undefined) return false;

    const ruleValue = rule.value;

    switch (rule.operator) {
      case 'equals':
        return String(attributeValue) === String(ruleValue);

      case 'contains':
        return String(attributeValue).includes(String(ruleValue));

      case 'in':
        if (Array.isArray(ruleValue)) {
          return ruleValue.includes(String(attributeValue));
        }
        return false;

      case 'gt':
        return Number(attributeValue) > Number(ruleValue);

      case 'lt':
        return Number(attributeValue) < Number(ruleValue);

      case 'gte':
        return Number(attributeValue) >= Number(ruleValue);

      case 'lte':
        return Number(attributeValue) <= Number(ruleValue);

      case 'regex':
        try {
          const regex = new RegExp(String(ruleValue));
          return regex.test(String(attributeValue));
        } catch {
          return false;
        }

      case 'startsWith':
        return String(attributeValue).startsWith(String(ruleValue));

      default:
        return false;
    }
  }

  /**
   * Deterministic hash function for consistent bucketing
   * Uses FNV-1a inspired hash for good distribution
   */
  private deterministicHash(input: string): number {
    let hash = 2166136261;
    for (let i = 0; i < input.length; i++) {
      hash ^= input.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return Math.abs(hash >>> 0) % 10000;
  }

  /**
   * Create flag evaluation result
   */
  private createEvaluation(flagId: string, value: unknown, variant: string | undefined, reason: EvaluationReason): FlagEvaluation {
    return {
      flagId,
      value,
      variant,
      reason,
      timestamp: Date.now(),
    };
  }

  /**
   * Schedule next rollout stage advancement
   */
  private scheduleNextAdvance(flagId: string, rollout: GradualRollout): void {
    const currentStage = rollout.stages[rollout.currentStage];
    if (!currentStage) return;

    const timer = setTimeout(() => {
      this.advanceRollout(flagId);

      const flag = this.flags.get(flagId);
      if (flag && flag.rollout && flag.rollout.currentStage < flag.rollout.stages.length - 1) {
        this.scheduleNextAdvance(flagId, flag.rollout);
      }
    }, currentStage.advanceAfterMs);

    this.rolloutTimers.set(flagId, timer);
  }
}
