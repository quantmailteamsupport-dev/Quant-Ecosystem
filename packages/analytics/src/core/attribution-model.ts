// ============================================================================
// Analytics - Attribution Model
// Multi-touch attribution with Shapley values, time-decay, and journey stitching
// ============================================================================

import type {
  Touchpoint,
  TouchpointJourney,
  AttributionResultEntry,
  AttributionAnalysisResult,
  AdvancedAttributionModelType,
  ShapleyConfig,
  ChannelInteraction,
  DeviceMatch,
} from '../types';

/** Default Shapley configuration */
const DEFAULT_SHAPLEY_CONFIG: ShapleyConfig = {
  maxSamples: 1000,
  convergenceThreshold: 0.001,
};

/**
 * AttributionModel - Multi-touch attribution engine
 *
 * Implements multiple attribution models including:
 * - Last-touch: 100% credit to last touchpoint before conversion
 * - First-touch: 100% credit to first touchpoint
 * - Linear: Equal credit across all touchpoints
 * - Time-decay: Exponential weight toward conversion (2^((t_i - t_conv) / halflife))
 * - Position-based: 40% first, 40% last, 20% split among middle
 * - Shapley value: Marginal contribution across all subset orderings
 *
 * Also supports cross-device journey stitching and channel interaction analysis.
 */
export class AttributionModel {
  private journeys: TouchpointJourney[] = [];
  private attributionWindowMs: number;
  private shapleyConfig: ShapleyConfig;
  private deviceGraph: Map<string, Set<string>> = new Map();
  private channelConversions: Map<string, number> = new Map();

  constructor(
    attributionWindowMs: number = 30 * 24 * 60 * 60 * 1000,
    shapleyConfig: Partial<ShapleyConfig> = {},
  ) {
    this.attributionWindowMs = attributionWindowMs;
    this.shapleyConfig = { ...DEFAULT_SHAPLEY_CONFIG, ...shapleyConfig };
  }

  /**
   * Record a touchpoint journey
   */
  recordJourney(journey: TouchpointJourney): void {
    // Apply attribution window filter
    if (journey.converted && journey.conversionTimestamp) {
      const windowStart = journey.conversionTimestamp - this.attributionWindowMs;
      const filteredTouchpoints = journey.touchpoints.filter(
        (tp) => tp.timestamp >= windowStart && tp.timestamp <= journey.conversionTimestamp!,
      );
      this.journeys.push({ ...journey, touchpoints: filteredTouchpoints });
    } else {
      this.journeys.push(journey);
    }

    // Update device graph for cross-device stitching
    for (const tp of journey.touchpoints) {
      if (tp.deviceId) {
        const existingDevices = this.deviceGraph.get(journey.userId) ?? new Set();
        existingDevices.add(tp.deviceId);
        this.deviceGraph.set(journey.userId, existingDevices);
      }
    }
  }

  /**
   * Run attribution using specified model
   */
  computeAttribution(modelType: AdvancedAttributionModelType): AttributionAnalysisResult {
    const convertedJourneys = this.journeys.filter((j) => j.converted);
    const channelCredits = new Map<
      string,
      { credit: number; touchpoints: number; conversions: number; revenue: number }
    >();

    for (const journey of convertedJourneys) {
      if (journey.touchpoints.length === 0) continue;

      const credits = this.computeCreditsForJourney(journey, modelType);
      const conversionValue = journey.conversionValue ?? 0;

      for (const [channel, credit] of credits.entries()) {
        const existing = channelCredits.get(channel) ?? {
          credit: 0,
          touchpoints: 0,
          conversions: 0,
          revenue: 0,
        };
        existing.credit += credit;
        existing.touchpoints += journey.touchpoints.filter((tp) => tp.channel === channel).length;
        existing.conversions += credit; // fractional conversions
        existing.revenue += credit * conversionValue;
        channelCredits.set(channel, existing);
      }
    }

    const totalConversions = convertedJourneys.length;
    const totalRevenue = convertedJourneys.reduce((sum, j) => sum + (j.conversionValue ?? 0), 0);
    const totalCredit = Array.from(channelCredits.values()).reduce((sum, c) => sum + c.credit, 0);

    const results: AttributionResultEntry[] = Array.from(channelCredits.entries()).map(
      ([channel, data]) => ({
        channel,
        credit: data.credit,
        creditPercentage: totalCredit > 0 ? (data.credit / totalCredit) * 100 : 0,
        touchpointCount: data.touchpoints,
        conversions: data.conversions,
        revenue: data.revenue,
      }),
    );

    results.sort((a, b) => b.credit - a.credit);

    return {
      modelType,
      results,
      totalConversions,
      totalRevenue,
      journeysAnalyzed: convertedJourneys.length,
      attributionWindow: this.attributionWindowMs,
    };
  }

  /**
   * Compute channel interaction effects (co-occurrence lift)
   */
  computeChannelInteractions(): ChannelInteraction[] {
    const convertedJourneys = this.journeys.filter((j) => j.converted);
    const allJourneys = this.journeys;

    // Get unique channels
    const channels = new Set<string>();
    for (const journey of allJourneys) {
      for (const tp of journey.touchpoints) {
        channels.add(tp.channel);
      }
    }

    const channelList = Array.from(channels);
    const interactions: ChannelInteraction[] = [];

    for (let i = 0; i < channelList.length; i++) {
      for (let j = i + 1; j < channelList.length; j++) {
        const channelA = channelList[i]!;
        const channelB = channelList[j]!;

        // Count journeys with both channels
        const withBoth = convertedJourneys.filter((journey) => {
          const channelsInJourney = new Set(journey.touchpoints.map((tp) => tp.channel));
          return channelsInJourney.has(channelA) && channelsInJourney.has(channelB);
        });

        const allWithBoth = allJourneys.filter((journey) => {
          const channelsInJourney = new Set(journey.touchpoints.map((tp) => tp.channel));
          return channelsInJourney.has(channelA) && channelsInJourney.has(channelB);
        });

        const withoutBoth = allJourneys.filter((journey) => {
          const channelsInJourney = new Set(journey.touchpoints.map((tp) => tp.channel));
          return !(channelsInJourney.has(channelA) && channelsInJourney.has(channelB));
        });

        const convertedWithoutBoth = convertedJourneys.filter((journey) => {
          const channelsInJourney = new Set(journey.touchpoints.map((tp) => tp.channel));
          return !(channelsInJourney.has(channelA) && channelsInJourney.has(channelB));
        });

        const convRateWithBoth = allWithBoth.length > 0 ? withBoth.length / allWithBoth.length : 0;
        const convRateWithout =
          withoutBoth.length > 0 ? convertedWithoutBoth.length / withoutBoth.length : 0;
        const liftFactor = convRateWithout > 0 ? convRateWithBoth / convRateWithout : 0;

        interactions.push({
          channelA,
          channelB,
          coOccurrenceCount: allWithBoth.length,
          liftFactor,
          conversionRateWithBoth: convRateWithBoth,
          conversionRateWithout: convRateWithout,
        });
      }
    }

    interactions.sort((a, b) => b.liftFactor - a.liftFactor);
    return interactions;
  }

  /**
   * Cross-device journey stitching using deterministic + probabilistic matching
   */
  stitchCrossDeviceJourneys(): DeviceMatch[] {
    const matches: DeviceMatch[] = [];

    // Deterministic matching: same userId across devices
    for (const [userId, deviceIds] of this.deviceGraph.entries()) {
      if (deviceIds.size > 1) {
        matches.push({
          userId,
          deviceIds: Array.from(deviceIds),
          matchType: 'deterministic',
          confidence: 1.0,
        });
      }
    }

    // Probabilistic matching: similar behavioral patterns across unmatched devices
    const unmatchedDevices = this.findUnmatchedDevices();
    const deviceBehaviors = this.computeDeviceBehaviors(unmatchedDevices);

    for (let i = 0; i < unmatchedDevices.length; i++) {
      for (let j = i + 1; j < unmatchedDevices.length; j++) {
        const deviceA = unmatchedDevices[i]!;
        const deviceB = unmatchedDevices[j]!;
        const behaviorA = deviceBehaviors.get(deviceA);
        const behaviorB = deviceBehaviors.get(deviceB);

        if (behaviorA && behaviorB) {
          const similarity = this.cosineSimilarity(behaviorA, behaviorB);
          if (similarity > 0.8) {
            matches.push({
              userId: `inferred_${deviceA}_${deviceB}`,
              deviceIds: [deviceA, deviceB],
              matchType: 'probabilistic',
              confidence: similarity,
            });
          }
        }
      }
    }

    return matches;
  }

  /**
   * Get all recorded journeys
   */
  getJourneys(): TouchpointJourney[] {
    return [...this.journeys];
  }

  /**
   * Clear all recorded data
   */
  reset(): void {
    this.journeys = [];
    this.deviceGraph.clear();
    this.channelConversions.clear();
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private computeCreditsForJourney(
    journey: TouchpointJourney,
    modelType: AdvancedAttributionModelType,
  ): Map<string, number> {
    const credits = new Map<string, number>();
    const touchpoints = journey.touchpoints.sort((a, b) => a.timestamp - b.timestamp);

    if (touchpoints.length === 0) return credits;

    switch (modelType) {
      case 'last_touch':
        return this.lastTouchAttribution(touchpoints);
      case 'first_touch':
        return this.firstTouchAttribution(touchpoints);
      case 'linear':
        return this.linearAttribution(touchpoints);
      case 'time_decay':
        return this.timeDecayAttribution(touchpoints, journey.conversionTimestamp);
      case 'position_based':
        return this.positionBasedAttribution(touchpoints);
      case 'shapley':
        return this.shapleyAttribution(touchpoints);
      default:
        return this.linearAttribution(touchpoints);
    }
  }

  private lastTouchAttribution(touchpoints: Touchpoint[]): Map<string, number> {
    const credits = new Map<string, number>();
    const lastTp = touchpoints[touchpoints.length - 1];
    if (lastTp) {
      credits.set(lastTp.channel, 1.0);
    }
    return credits;
  }

  private firstTouchAttribution(touchpoints: Touchpoint[]): Map<string, number> {
    const credits = new Map<string, number>();
    const firstTp = touchpoints[0];
    if (firstTp) {
      credits.set(firstTp.channel, 1.0);
    }
    return credits;
  }

  private linearAttribution(touchpoints: Touchpoint[]): Map<string, number> {
    const credits = new Map<string, number>();
    const creditPerTouch = 1.0 / touchpoints.length;
    for (const tp of touchpoints) {
      const current = credits.get(tp.channel) ?? 0;
      credits.set(tp.channel, current + creditPerTouch);
    }
    return credits;
  }

  private timeDecayAttribution(
    touchpoints: Touchpoint[],
    conversionTimestamp?: number,
  ): Map<string, number> {
    const credits = new Map<string, number>();
    const convTime = conversionTimestamp ?? touchpoints[touchpoints.length - 1]?.timestamp ?? 0;

    // Half-life: 7 days in milliseconds
    const halfLifeMs = 7 * 24 * 60 * 60 * 1000;

    // weight_i = 2^((t_i - t_conversion) / halflife)
    let totalWeight = 0;
    const weights: number[] = [];

    for (const tp of touchpoints) {
      const timeDiff = tp.timestamp - convTime; // negative value (before conversion)
      const weight = Math.pow(2, timeDiff / halfLifeMs);
      weights.push(weight);
      totalWeight += weight;
    }

    for (let i = 0; i < touchpoints.length; i++) {
      const tp = touchpoints[i]!;
      const weight = weights[i] ?? 0;
      const normalizedCredit = totalWeight > 0 ? weight / totalWeight : 0;
      const current = credits.get(tp.channel) ?? 0;
      credits.set(tp.channel, current + normalizedCredit);
    }

    return credits;
  }

  private positionBasedAttribution(touchpoints: Touchpoint[]): Map<string, number> {
    const credits = new Map<string, number>();

    if (touchpoints.length === 1) {
      const tp = touchpoints[0]!;
      credits.set(tp.channel, 1.0);
      return credits;
    }

    if (touchpoints.length === 2) {
      const first = touchpoints[0]!;
      const last = touchpoints[1]!;
      const firstCredit = credits.get(first.channel) ?? 0;
      credits.set(first.channel, firstCredit + 0.5);
      const lastCredit = credits.get(last.channel) ?? 0;
      credits.set(last.channel, lastCredit + 0.5);
      return credits;
    }

    // 40% first, 40% last, 20% split among middle
    const firstTp = touchpoints[0]!;
    const lastTp = touchpoints[touchpoints.length - 1]!;
    const middleCount = touchpoints.length - 2;
    const middleCredit = middleCount > 0 ? 0.2 / middleCount : 0;

    const firstCredit = credits.get(firstTp.channel) ?? 0;
    credits.set(firstTp.channel, firstCredit + 0.4);

    const lastCredit = credits.get(lastTp.channel) ?? 0;
    credits.set(lastTp.channel, lastCredit + 0.4);

    for (let i = 1; i < touchpoints.length - 1; i++) {
      const tp = touchpoints[i]!;
      const current = credits.get(tp.channel) ?? 0;
      credits.set(tp.channel, current + middleCredit);
    }

    return credits;
  }

  /**
   * Shapley value approximation using sample-based marginal contribution
   * For each channel, compute its marginal contribution across sampled orderings
   */
  private shapleyAttribution(touchpoints: Touchpoint[]): Map<string, number> {
    const credits = new Map<string, number>();
    const channels = [...new Set(touchpoints.map((tp) => tp.channel))];

    if (channels.length === 0) return credits;
    if (channels.length === 1) {
      credits.set(channels[0]!, 1.0);
      return credits;
    }

    // Build coalition value function based on conversion presence
    const channelPresence = new Map<string, number>();
    for (const tp of touchpoints) {
      channelPresence.set(tp.channel, (channelPresence.get(tp.channel) ?? 0) + 1);
    }

    const totalTouchpoints = touchpoints.length;
    const shapleyValues = new Map<string, number>();

    // Sample random permutations to approximate Shapley values
    const numSamples = Math.min(this.shapleyConfig.maxSamples, this.factorial(channels.length));

    for (let sample = 0; sample < numSamples; sample++) {
      const permutation = this.randomPermutation(channels);
      let coalitionValue = 0;

      for (let i = 0; i < permutation.length; i++) {
        const channel = permutation[i]!;
        // Coalition value: fraction of touchpoints covered by coalition members
        const coalitionWithChannel = permutation.slice(0, i + 1);
        const coveredWithChannel = coalitionWithChannel.reduce(
          (sum, ch) => sum + (channelPresence.get(ch) ?? 0),
          0,
        );
        const newValue = totalTouchpoints > 0 ? coveredWithChannel / totalTouchpoints : 0;

        const marginalContribution = newValue - coalitionValue;
        const current = shapleyValues.get(channel) ?? 0;
        shapleyValues.set(channel, current + marginalContribution);

        coalitionValue = newValue;
      }
    }

    // Normalize Shapley values
    let totalShapley = 0;
    for (const [channel] of shapleyValues) {
      const value = (shapleyValues.get(channel) ?? 0) / numSamples;
      shapleyValues.set(channel, value);
      totalShapley += value;
    }

    for (const [channel, value] of shapleyValues) {
      credits.set(channel, totalShapley > 0 ? value / totalShapley : 0);
    }

    return credits;
  }

  private randomPermutation(arr: string[]): string[] {
    const result = [...arr];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = result[i]!;
      result[i] = result[j]!;
      result[j] = temp;
    }
    return result;
  }

  private factorial(n: number): number {
    if (n <= 1) return 1;
    let result = 1;
    for (let i = 2; i <= Math.min(n, 20); i++) {
      result *= i;
    }
    return result;
  }

  private findUnmatchedDevices(): string[] {
    const matchedDevices = new Set<string>();
    for (const deviceIds of this.deviceGraph.values()) {
      for (const deviceId of deviceIds) {
        matchedDevices.add(deviceId);
      }
    }

    const allDevices = new Set<string>();
    for (const journey of this.journeys) {
      for (const tp of journey.touchpoints) {
        if (tp.deviceId) {
          allDevices.add(tp.deviceId);
        }
      }
    }

    return Array.from(allDevices).filter((d) => !matchedDevices.has(d));
  }

  private computeDeviceBehaviors(deviceIds: string[]): Map<string, number[]> {
    const behaviors = new Map<string, number[]>();
    const allChannels = new Set<string>();

    for (const journey of this.journeys) {
      for (const tp of journey.touchpoints) {
        allChannels.add(tp.channel);
      }
    }

    const channelList = Array.from(allChannels);

    for (const deviceId of deviceIds) {
      const channelCounts = new Map<string, number>();
      for (const journey of this.journeys) {
        for (const tp of journey.touchpoints) {
          if (tp.deviceId === deviceId) {
            channelCounts.set(tp.channel, (channelCounts.get(tp.channel) ?? 0) + 1);
          }
        }
      }

      const vector = channelList.map((ch) => channelCounts.get(ch) ?? 0);
      behaviors.set(deviceId, vector);
    }

    return behaviors;
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      const va = a[i] ?? 0;
      const vb = b[i] ?? 0;
      dotProduct += va * vb;
      normA += va * va;
      normB += vb * vb;
    }

    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    return denominator > 0 ? dotProduct / denominator : 0;
  }
}
