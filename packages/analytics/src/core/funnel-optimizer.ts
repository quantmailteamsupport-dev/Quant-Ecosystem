// ============================================================================
// Analytics - Funnel Optimizer
// Multi-step funnel analysis with statistical significance, Markov chains,
// and bottleneck identification
// ============================================================================

import type {
  OptimizedFunnelDefinition,
  OptimizedFunnelStep,
  FunnelComputationResult,
  StepResult,
  DropOffAnalysis,
  SegmentComparisonResult,
  MarkovTransition,
  FunnelEvent,
} from '../types';

/**
 * FunnelOptimizer - Advanced funnel analysis engine
 *
 * Provides multi-step funnel computation with:
 * - Drop-off rate per step with chi-squared statistical significance testing
 * - Bottleneck identification (highest drop-off rate * traffic volume)
 * - Segment comparison across different user cohorts
 * - Funnel velocity with percentile distributions (P50, P75, P90)
 * - Completion probability prediction from partial progress
 * - Optimal path discovery using Markov chain transition probabilities
 */
export class FunnelOptimizer {
  private funnels: Map<string, OptimizedFunnelDefinition> = new Map();
  private events: FunnelEvent[] = [];
  private userPaths: Map<string, FunnelEvent[]> = new Map();

  constructor() {}

  /**
   * Define a multi-step funnel
   */
  defineFunnel(funnel: OptimizedFunnelDefinition): void {
    this.funnels.set(funnel.id, funnel);
  }

  /**
   * Ingest events for funnel computation
   */
  ingestEvents(events: FunnelEvent[]): void {
    for (const event of events) {
      this.events.push(event);
      const userEvents = this.userPaths.get(event.userId) ?? [];
      userEvents.push(event);
      this.userPaths.set(event.userId, userEvents);
    }
  }

  /**
   * Compute funnel metrics for a given funnel definition
   */
  computeFunnel(funnelId: string, segment?: string): FunnelComputationResult {
    const funnel = this.funnels.get(funnelId);
    if (!funnel) {
      throw new Error(`Funnel ${funnelId} not found`);
    }

    const steps = funnel.steps.sort((a, b) => a.order - b.order);
    const userProgressions = this.computeUserProgressions(steps, segment);

    const stepResults: StepResult[] = [];

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i]!;
      const usersAtStep = this.countUsersAtStep(userProgressions, i);
      const usersCompletedStep = this.countUsersCompletedStep(userProgressions, i);
      const dropOff = usersAtStep - usersCompletedStep;
      const dropOffRate = usersAtStep > 0 ? dropOff / usersAtStep : 0;
      const conversionRate = usersAtStep > 0 ? usersCompletedStep / usersAtStep : 0;

      // Calculate time metrics for this step
      const timesAtStep = this.getTimesForStep(userProgressions, i);
      const sortedTimes = timesAtStep.sort((a, b) => a - b);

      stepResults.push({
        stepId: step.id,
        stepName: step.name,
        entered: usersAtStep,
        completed: usersCompletedStep,
        dropOff,
        dropOffRate,
        conversionRate,
        averageTimeMs: this.mean(sortedTimes),
        medianTimeMs: this.percentile(sortedTimes, 50),
        p75TimeMs: this.percentile(sortedTimes, 75),
        p90TimeMs: this.percentile(sortedTimes, 90),
      });
    }

    // Identify bottleneck: step with highest drop-off rate * traffic volume
    let bottleneckStep = steps[0]?.id ?? '';
    let maxBottleneckScore = 0;
    for (const result of stepResults) {
      const score = result.dropOffRate * result.entered;
      if (score > maxBottleneckScore) {
        maxBottleneckScore = score;
        bottleneckStep = result.stepId;
      }
    }

    const totalUsers = userProgressions.size;
    const completedUsers = this.countUsersCompletedStep(userProgressions, steps.length - 1);
    const overallConversionRate = totalUsers > 0 ? completedUsers / totalUsers : 0;

    // Average completion time across all steps
    const allTimes = stepResults.reduce((sum, s) => sum + s.averageTimeMs, 0);

    return {
      funnelId,
      totalUsers,
      completedUsers,
      overallConversionRate,
      stepResults,
      bottleneckStep,
      averageCompletionTimeMs: allTimes,
    };
  }

  /**
   * Compare funnel performance across segments with statistical significance
   */
  compareSegments(funnelId: string, segments: string[]): SegmentComparisonResult[] {
    // Compute baseline (all users)
    const baseline = this.computeFunnel(funnelId);
    const results: SegmentComparisonResult[] = [];

    for (const segment of segments) {
      const segmentResult = this.computeFunnel(funnelId, segment);
      const comparisons: DropOffAnalysis[] = [];

      for (let i = 0; i < baseline.stepResults.length; i++) {
        const baseStep = baseline.stepResults[i]!;
        const segStep = segmentResult.stepResults[i];

        if (segStep) {
          // Chi-squared test for drop-off rate difference
          const chiSquaredResult = this.chiSquaredTest(
            baseStep.entered,
            baseStep.dropOff,
            segStep.entered,
            segStep.dropOff,
          );

          comparisons.push({
            stepId: baseStep.stepId,
            stepName: baseStep.stepName,
            baselineDropOffRate: baseStep.dropOffRate,
            segmentDropOffRate: segStep.dropOffRate,
            chiSquared: chiSquaredResult.chiSquared,
            pValue: chiSquaredResult.pValue,
            isSignificant: chiSquaredResult.pValue < 0.05,
            sampleSize: baseStep.entered + segStep.entered,
          });
        }
      }

      results.push({
        segmentName: segment,
        funnelResult: segmentResult,
        comparisonToBaseline: comparisons,
      });
    }

    return results;
  }

  /**
   * Predict completion probability based on partial progress through the funnel
   */
  predictCompletionProbability(funnelId: string, currentStepIndex: number): number {
    const funnel = this.funnels.get(funnelId);
    if (!funnel) return 0;

    const steps = funnel.steps.sort((a, b) => a.order - b.order);
    const userProgressions = this.computeUserProgressions(steps);

    // Calculate historical completion rates from current step onward
    let usersAtCurrentStep = 0;
    let usersCompleted = 0;

    for (const [, progression] of userProgressions) {
      if (progression.maxStep >= currentStepIndex) {
        usersAtCurrentStep++;
        if (progression.maxStep >= steps.length - 1) {
          usersCompleted++;
        }
      }
    }

    return usersAtCurrentStep > 0 ? usersCompleted / usersAtCurrentStep : 0;
  }

  /**
   * Discover optimal paths using Markov chain transition probabilities
   * P(step_j | step_i) computed from historical transition data
   */
  computeMarkovTransitions(funnelId: string): MarkovTransition[] {
    const funnel = this.funnels.get(funnelId);
    if (!funnel) return [];

    const steps = funnel.steps.sort((a, b) => a.order - b.order);
    const stepNames = steps.map((s) => s.eventName);
    const transitions: Map<string, Map<string, number>> = new Map();

    // Count transitions between steps for each user
    for (const [, events] of this.userPaths) {
      const sortedEvents = events
        .filter((e) => stepNames.includes(e.eventName))
        .sort((a, b) => a.timestamp - b.timestamp);

      for (let i = 0; i < sortedEvents.length - 1; i++) {
        const from = sortedEvents[i]!.eventName;
        const to = sortedEvents[i + 1]!.eventName;

        const fromTransitions = transitions.get(from) ?? new Map();
        fromTransitions.set(to, (fromTransitions.get(to) ?? 0) + 1);
        transitions.set(from, fromTransitions);
      }
    }

    // Convert counts to probabilities
    const result: MarkovTransition[] = [];
    for (const [fromStep, toSteps] of transitions) {
      let totalFromStep = 0;
      for (const count of toSteps.values()) {
        totalFromStep += count;
      }

      for (const [toStep, count] of toSteps) {
        result.push({
          fromStep,
          toStep,
          probability: totalFromStep > 0 ? count / totalFromStep : 0,
          count,
        });
      }
    }

    result.sort((a, b) => b.probability - a.probability);
    return result;
  }

  /**
   * Get funnel velocity - time distribution between steps
   */
  computeFunnelVelocity(
    funnelId: string,
  ): Array<{
    fromStep: string;
    toStep: string;
    p50: number;
    p75: number;
    p90: number;
    mean: number;
  }> {
    const funnel = this.funnels.get(funnelId);
    if (!funnel) return [];

    const steps = funnel.steps.sort((a, b) => a.order - b.order);
    const userProgressions = this.computeUserProgressions(steps);
    const velocities: Array<{
      fromStep: string;
      toStep: string;
      p50: number;
      p75: number;
      p90: number;
      mean: number;
    }> = [];

    for (let i = 0; i < steps.length - 1; i++) {
      const fromStep = steps[i]!;
      const toStep = steps[i + 1]!;
      const durations: number[] = [];

      for (const [, progression] of userProgressions) {
        if (progression.maxStep > i) {
          const fromTime = progression.stepTimestamps[i];
          const toTime = progression.stepTimestamps[i + 1];
          if (fromTime !== undefined && toTime !== undefined) {
            durations.push(toTime - fromTime);
          }
        }
      }

      const sorted = durations.sort((a, b) => a - b);

      velocities.push({
        fromStep: fromStep.name,
        toStep: toStep.name,
        p50: this.percentile(sorted, 50),
        p75: this.percentile(sorted, 75),
        p90: this.percentile(sorted, 90),
        mean: this.mean(sorted),
      });
    }

    return velocities;
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  private computeUserProgressions(
    steps: OptimizedFunnelStep[],
    segment?: string,
  ): Map<string, { maxStep: number; stepTimestamps: number[] }> {
    const progressions = new Map<string, { maxStep: number; stepTimestamps: number[] }>();

    for (const [userId, events] of this.userPaths) {
      // Filter by segment if specified
      if (segment) {
        const hasSegment = events.some((e) => e.segment === segment);
        if (!hasSegment) continue;
      }

      const sortedEvents = events.sort((a, b) => a.timestamp - b.timestamp);
      let currentStep = -1;
      const stepTimestamps: number[] = [];

      for (const event of sortedEvents) {
        const nextStepIndex = currentStep + 1;
        const nextStep = steps[nextStepIndex];
        if (nextStep && this.matchesStep(event, nextStep)) {
          currentStep = nextStepIndex;
          stepTimestamps.push(event.timestamp);
        }
      }

      if (currentStep >= 0) {
        progressions.set(userId, { maxStep: currentStep, stepTimestamps });
      }
    }

    return progressions;
  }

  private matchesStep(event: FunnelEvent, step: OptimizedFunnelStep): boolean {
    if (event.eventName !== step.eventName) return false;
    if (step.conditions && event.properties) {
      for (const [key, value] of Object.entries(step.conditions)) {
        if (event.properties[key] !== value) return false;
      }
    }
    return true;
  }

  private countUsersAtStep(
    progressions: Map<string, { maxStep: number; stepTimestamps: number[] }>,
    stepIndex: number,
  ): number {
    let count = 0;
    for (const [, progression] of progressions) {
      if (progression.maxStep >= stepIndex) {
        count++;
      }
    }
    // For step 0, count all users who entered the funnel
    if (stepIndex === 0) return progressions.size;
    return count;
  }

  private countUsersCompletedStep(
    progressions: Map<string, { maxStep: number; stepTimestamps: number[] }>,
    stepIndex: number,
  ): number {
    let count = 0;
    for (const [, progression] of progressions) {
      if (progression.maxStep >= stepIndex) {
        count++;
      }
    }
    return count;
  }

  private getTimesForStep(
    progressions: Map<string, { maxStep: number; stepTimestamps: number[] }>,
    stepIndex: number,
  ): number[] {
    const times: number[] = [];
    if (stepIndex === 0) return times;

    for (const [, progression] of progressions) {
      if (progression.maxStep >= stepIndex) {
        const prevTime = progression.stepTimestamps[stepIndex - 1];
        const currTime = progression.stepTimestamps[stepIndex];
        if (prevTime !== undefined && currTime !== undefined) {
          times.push(currTime - prevTime);
        }
      }
    }
    return times;
  }

  /**
   * Chi-squared test for comparing drop-off rates between two groups
   * Tests H0: drop-off rates are equal between baseline and segment
   */
  private chiSquaredTest(
    baselineTotal: number,
    baselineDropped: number,
    segmentTotal: number,
    segmentDropped: number,
  ): { chiSquared: number; pValue: number } {
    const baselineRetained = baselineTotal - baselineDropped;
    const segmentRetained = segmentTotal - segmentDropped;

    const totalDropped = baselineDropped + segmentDropped;
    const totalRetained = baselineRetained + segmentRetained;
    const grandTotal = baselineTotal + segmentTotal;

    if (grandTotal === 0) return { chiSquared: 0, pValue: 1 };

    // Expected values under null hypothesis
    const expectedBaselineDropped = (baselineTotal * totalDropped) / grandTotal;
    const expectedBaselineRetained = (baselineTotal * totalRetained) / grandTotal;
    const expectedSegmentDropped = (segmentTotal * totalDropped) / grandTotal;
    const expectedSegmentRetained = (segmentTotal * totalRetained) / grandTotal;

    // Chi-squared statistic: sum((observed - expected)^2 / expected)
    let chiSquared = 0;
    if (expectedBaselineDropped > 0) {
      chiSquared +=
        Math.pow(baselineDropped - expectedBaselineDropped, 2) / expectedBaselineDropped;
    }
    if (expectedBaselineRetained > 0) {
      chiSquared +=
        Math.pow(baselineRetained - expectedBaselineRetained, 2) / expectedBaselineRetained;
    }
    if (expectedSegmentDropped > 0) {
      chiSquared += Math.pow(segmentDropped - expectedSegmentDropped, 2) / expectedSegmentDropped;
    }
    if (expectedSegmentRetained > 0) {
      chiSquared +=
        Math.pow(segmentRetained - expectedSegmentRetained, 2) / expectedSegmentRetained;
    }

    // Approximate p-value using chi-squared distribution with 1 degree of freedom
    const pValue = this.chiSquaredPValue(chiSquared, 1);

    return { chiSquared, pValue };
  }

  /**
   * Approximate chi-squared CDF complement (p-value)
   * Using the Wilson-Hilferty approximation for the incomplete gamma function
   */
  private chiSquaredPValue(chiSquared: number, degreesOfFreedom: number): number {
    if (chiSquared <= 0) return 1;
    if (degreesOfFreedom <= 0) return 1;

    // For df=1, use direct normal approximation
    const z = Math.sqrt(chiSquared);
    // P(Z > z) approximation using error function complement
    return this.normalCDFComplement(z);
  }

  private normalCDFComplement(z: number): number {
    // Abramowitz and Stegun approximation 7.1.26
    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const p = 0.3275911;

    const absZ = Math.abs(z);
    const t = 1.0 / (1.0 + p * absZ);
    const t2 = t * t;
    const t3 = t2 * t;
    const t4 = t3 * t;
    const t5 = t4 * t;

    const erfApprox =
      1 - (a1 * t + a2 * t2 + a3 * t3 + a4 * t4 + a5 * t5) * Math.exp((-absZ * absZ) / 2);
    const cdf = 0.5 * (1 + (z >= 0 ? erfApprox : -erfApprox));
    return 1 - cdf;
  }

  private mean(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, v) => sum + v, 0) / values.length;
  }

  private percentile(sortedValues: number[], p: number): number {
    if (sortedValues.length === 0) return 0;
    const index = (p / 100) * (sortedValues.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const lowerVal = sortedValues[lower] ?? 0;
    const upperVal = sortedValues[upper] ?? 0;
    const fraction = index - lower;
    return lowerVal + fraction * (upperVal - lowerVal);
  }
}
