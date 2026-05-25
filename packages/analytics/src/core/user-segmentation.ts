// ============================================================================
// Analytics - User Segmentation
// RFM analysis, K-means clustering, lifecycle classification, and lookalike
// audience generation
// ============================================================================

import type {
  RFMScore,
  ClusterConfig,
  Centroid,
  ClusterAssignment,
  LifecycleStage,
  UserLifecycleData,
  SegmentOverlap,
  SegmentGrowth,
} from '../types';

/** Default cluster configuration */
const DEFAULT_CLUSTER_CONFIG: ClusterConfig = {
  k: 5,
  maxIterations: 100,
  convergenceThreshold: 0.001,
  distanceMetric: 'euclidean',
  initMethod: 'kmeans++',
};

/**
 * UserSegmentation - Advanced user segmentation engine
 *
 * Implements multiple segmentation strategies:
 * - RFM (Recency-Frequency-Monetary) analysis with quintile bucketing
 * - K-means clustering with k-means++ initialization
 * - Lifecycle stage classification (new/active/at_risk/dormant/churned)
 * - Lookalike audience generation using feature similarity
 * - Segment overlap analysis (Jaccard coefficient)
 * - Real-time segment membership updates
 */
export class UserSegmentation {
  private clusterConfig: ClusterConfig;
  private centroids: Centroid[] = [];
  private assignments: Map<string, ClusterAssignment> = new Map();
  private rfmScores: Map<string, RFMScore> = new Map();
  private lifecycleData: Map<string, UserLifecycleData> = new Map();
  private segmentMembers: Map<string, Set<string>> = new Map();
  private segmentHistory: Map<string, SegmentGrowth[]> = new Map();
  private currentPeriod: number = 0;

  constructor(config: Partial<ClusterConfig> = {}) {
    this.clusterConfig = { ...DEFAULT_CLUSTER_CONFIG, ...config };
  }

  /**
   * Compute RFM scores for users
   * Recency: days since last activity
   * Frequency: number of events in period
   * Monetary: total revenue
   */
  computeRFM(
    users: Array<{
      userId: string;
      lastActivityAt: number;
      eventCount: number;
      totalRevenue: number;
    }>,
    referenceDate: number = Date.now(),
  ): RFMScore[] {
    if (users.length === 0) return [];

    const msPerDay = 24 * 60 * 60 * 1000;

    // Calculate raw values
    const rawValues = users.map((u) => ({
      userId: u.userId,
      recency: (referenceDate - u.lastActivityAt) / msPerDay,
      frequency: u.eventCount,
      monetary: u.totalRevenue,
    }));

    // Sort for quintile bucketing
    const recencyValues = rawValues.map((r) => r.recency).sort((a, b) => a - b);
    const frequencyValues = rawValues.map((r) => r.frequency).sort((a, b) => a - b);
    const monetaryValues = rawValues.map((r) => r.monetary).sort((a, b) => a - b);

    const scores: RFMScore[] = rawValues.map((raw) => {
      // Recency: lower is better (more recent), so reverse scoring
      const recencyScore = 6 - this.getQuintile(raw.recency, recencyValues);
      const frequencyScore = this.getQuintile(raw.frequency, frequencyValues);
      const monetaryScore = this.getQuintile(raw.monetary, monetaryValues);
      const compositeScore = (recencyScore + frequencyScore + monetaryScore) / 3;

      const segment = this.classifyRFMSegment(recencyScore, frequencyScore, monetaryScore);

      const rfm: RFMScore = {
        userId: raw.userId,
        recency: raw.recency,
        frequency: raw.frequency,
        monetary: raw.monetary,
        recencyScore,
        frequencyScore,
        monetaryScore,
        compositeScore,
        segment,
      };

      this.rfmScores.set(raw.userId, rfm);
      return rfm;
    });

    // Update segment membership
    for (const score of scores) {
      const members = this.segmentMembers.get(score.segment) ?? new Set();
      members.add(score.userId);
      this.segmentMembers.set(score.segment, members);
    }

    return scores;
  }

  /**
   * K-means clustering with k-means++ initialization
   * Groups users into k clusters based on feature vectors
   */
  cluster(
    dataPoints: Array<{ userId: string; features: number[] }>,
    config?: Partial<ClusterConfig>,
  ): ClusterAssignment[] {
    const cfg = { ...this.clusterConfig, ...config };
    const k = cfg.k;
    const points = dataPoints.map((dp) => ({ userId: dp.userId, features: [...dp.features] }));

    if (points.length < k) {
      throw new Error(`Need at least ${k} data points for ${k} clusters`);
    }

    // Initialize centroids using k-means++
    let centroids: number[][];
    if (cfg.initMethod === 'kmeans++') {
      centroids = this.kMeansPlusPlusInit(
        points.map((p) => p.features),
        k,
      );
    } else {
      centroids = this.randomInit(
        points.map((p) => p.features),
        k,
      );
    }

    let assignments: number[] = new Array(points.length).fill(0);
    let converged = false;
    let iterations = 0;

    while (!converged && iterations < cfg.maxIterations) {
      // Assignment step: assign each point to nearest centroid
      const newAssignments: number[] = [];
      for (const point of points) {
        let minDist = Infinity;
        let bestCluster = 0;

        for (let c = 0; c < centroids.length; c++) {
          const centroid = centroids[c]!;
          const dist = this.computeDistance(point.features, centroid, cfg.distanceMetric);
          if (dist < minDist) {
            minDist = dist;
            bestCluster = c;
          }
        }
        newAssignments.push(bestCluster);
      }

      // Check convergence
      let changed = 0;
      for (let i = 0; i < assignments.length; i++) {
        if (assignments[i] !== newAssignments[i]) changed++;
      }
      converged = changed / points.length < cfg.convergenceThreshold;
      assignments = newAssignments;

      // Update step: recompute centroids
      const newCentroids: number[][] = [];
      for (let c = 0; c < k; c++) {
        const clusterPoints = points.filter((_, idx) => assignments[idx] === c);
        if (clusterPoints.length > 0) {
          const dims = clusterPoints[0]!.features.length;
          const centroid: number[] = new Array(dims).fill(0);
          for (const cp of clusterPoints) {
            for (let d = 0; d < dims; d++) {
              centroid[d] = (centroid[d] ?? 0) + (cp.features[d] ?? 0);
            }
          }
          for (let d = 0; d < dims; d++) {
            centroid[d] = (centroid[d] ?? 0) / clusterPoints.length;
          }
          newCentroids.push(centroid);
        } else {
          // Empty cluster: reinitialize randomly
          const randomIdx = Math.floor(Math.random() * points.length);
          newCentroids.push([...(points[randomIdx]?.features ?? [])]);
        }
      }
      centroids = newCentroids;
      iterations++;
    }

    // Store centroids
    this.centroids = centroids.map((coords, idx) => ({
      id: idx,
      coordinates: coords,
      memberCount: assignments.filter((a) => a === idx).length,
    }));

    // Create final assignments
    const results: ClusterAssignment[] = [];
    for (let i = 0; i < points.length; i++) {
      const point = points[i]!;
      const clusterId = assignments[i] ?? 0;
      const centroid = centroids[clusterId] ?? [];
      const distance = this.computeDistance(point.features, centroid, cfg.distanceMetric);

      const assignment: ClusterAssignment = {
        userId: point.userId,
        clusterId,
        distance,
        features: point.features,
      };
      results.push(assignment);
      this.assignments.set(point.userId, assignment);
    }

    return results;
  }

  /**
   * Classify user lifecycle stage based on activity
   * - new: < 7 days since first activity
   * - active: event in last 7 days
   * - at_risk: 14-30 days inactive
   * - dormant: 30-60 days inactive
   * - churned: 60+ days inactive
   */
  classifyLifecycle(
    users: Array<{
      userId: string;
      firstActivityAt: number;
      lastActivityAt: number;
      totalEvents: number;
      totalRevenue: number;
    }>,
    referenceDate: number = Date.now(),
  ): UserLifecycleData[] {
    const msPerDay = 24 * 60 * 60 * 1000;
    const results: UserLifecycleData[] = [];

    for (const user of users) {
      const daysSinceFirst = (referenceDate - user.firstActivityAt) / msPerDay;
      const daysSinceLast = (referenceDate - user.lastActivityAt) / msPerDay;

      let stage: LifecycleStage;
      if (daysSinceFirst < 7) {
        stage = 'new';
      } else if (daysSinceLast < 7) {
        stage = 'active';
      } else if (daysSinceLast < 30) {
        stage = 'at_risk';
      } else if (daysSinceLast < 60) {
        stage = 'dormant';
      } else {
        stage = 'churned';
      }

      const data: UserLifecycleData = {
        userId: user.userId,
        firstActivityAt: user.firstActivityAt,
        lastActivityAt: user.lastActivityAt,
        totalEvents: user.totalEvents,
        totalRevenue: user.totalRevenue,
        lifecycleStage: stage,
        daysSinceLastActivity: daysSinceLast,
      };

      results.push(data);
      this.lifecycleData.set(user.userId, data);

      // Update segment membership
      const members = this.segmentMembers.get(`lifecycle_${stage}`) ?? new Set();
      members.add(user.userId);
      this.segmentMembers.set(`lifecycle_${stage}`, members);
    }

    return results;
  }

  /**
   * Real-time segment membership update
   * Reassigns a user based on new data
   */
  updateMembership(userId: string, newFeatures: number[]): ClusterAssignment | null {
    if (this.centroids.length === 0) return null;

    // Remove from old cluster segment
    const oldAssignment = this.assignments.get(userId);
    if (oldAssignment) {
      const oldSegment = this.segmentMembers.get(`cluster_${oldAssignment.clusterId}`);
      if (oldSegment) oldSegment.delete(userId);
    }

    // Find nearest centroid
    let minDist = Infinity;
    let bestCluster = 0;

    for (const centroid of this.centroids) {
      const dist = this.computeDistance(
        newFeatures,
        centroid.coordinates,
        this.clusterConfig.distanceMetric,
      );
      if (dist < minDist) {
        minDist = dist;
        bestCluster = centroid.id;
      }
    }

    const newAssignment: ClusterAssignment = {
      userId,
      clusterId: bestCluster,
      distance: minDist,
      features: newFeatures,
    };

    this.assignments.set(userId, newAssignment);

    // Add to new cluster segment
    const newSegment = this.segmentMembers.get(`cluster_${bestCluster}`) ?? new Set();
    newSegment.add(userId);
    this.segmentMembers.set(`cluster_${bestCluster}`, newSegment);

    return newAssignment;
  }

  /**
   * Compute segment overlap using Jaccard coefficient
   * J(A,B) = |A intersect B| / |A union B|
   */
  computeSegmentOverlap(segmentAId: string, segmentBId: string): SegmentOverlap {
    const membersA = this.segmentMembers.get(segmentAId) ?? new Set();
    const membersB = this.segmentMembers.get(segmentBId) ?? new Set();

    let overlapCount = 0;
    for (const member of membersA) {
      if (membersB.has(member)) overlapCount++;
    }

    const unionSize = membersA.size + membersB.size - overlapCount;
    const jaccard = unionSize > 0 ? overlapCount / unionSize : 0;

    return {
      segmentA: segmentAId,
      segmentB: segmentBId,
      overlapCount,
      jaccard,
      sizeA: membersA.size,
      sizeB: membersB.size,
    };
  }

  /**
   * Generate lookalike audience: find users closest to target segment centroid
   */
  generateLookalikes(
    targetSegmentId: string,
    candidateUsers: Array<{ userId: string; features: number[] }>,
    topN: number = 100,
  ): Array<{ userId: string; similarityScore: number }> {
    // Compute target segment centroid from member features
    const members = this.segmentMembers.get(targetSegmentId);
    if (!members || members.size === 0) return [];

    const memberFeatures: number[][] = [];
    for (const memberId of members) {
      const assignment = this.assignments.get(memberId);
      if (assignment) {
        memberFeatures.push(assignment.features);
      }
    }

    if (memberFeatures.length === 0) return [];

    // Compute centroid of target segment
    const dims = memberFeatures[0]!.length;
    const centroid: number[] = new Array(dims).fill(0);
    for (const features of memberFeatures) {
      for (let d = 0; d < dims; d++) {
        centroid[d] = (centroid[d] ?? 0) + (features[d] ?? 0);
      }
    }
    for (let d = 0; d < dims; d++) {
      centroid[d] = (centroid[d] ?? 0) / memberFeatures.length;
    }

    // Score candidates by distance to centroid (closer = higher similarity)
    const scored = candidateUsers
      .filter((u) => !members.has(u.userId))
      .map((u) => {
        const distance = this.computeDistance(
          u.features,
          centroid,
          this.clusterConfig.distanceMetric,
        );
        // Convert distance to similarity score (1 / (1 + distance))
        const similarityScore = 1 / (1 + distance);
        return { userId: u.userId, similarityScore };
      });

    scored.sort((a, b) => b.similarityScore - a.similarityScore);
    return scored.slice(0, topN);
  }

  /**
   * Track segment growth/shrink rate over time
   */
  trackSegmentGrowth(segmentId: string): SegmentGrowth {
    const members = this.segmentMembers.get(segmentId) ?? new Set();
    const currentCount = members.size;

    const history = this.segmentHistory.get(segmentId) ?? [];
    const previousEntry = history.length > 0 ? history[history.length - 1] : undefined;
    const previousCount = previousEntry?.memberCount ?? 0;

    const netChange = currentCount - previousCount;
    const growthRate = previousCount > 0 ? netChange / previousCount : currentCount > 0 ? 1 : 0;

    const growth: SegmentGrowth = {
      segmentId,
      period: this.currentPeriod++,
      memberCount: currentCount,
      growthRate,
      netChange,
    };

    history.push(growth);
    this.segmentHistory.set(segmentId, history);
    return growth;
  }

  /**
   * Get all centroids
   */
  getCentroids(): Centroid[] {
    return [...this.centroids];
  }

  /**
   * Get segment members
   */
  getSegmentMembers(segmentId: string): string[] {
    const members = this.segmentMembers.get(segmentId);
    return members ? Array.from(members) : [];
  }

  /**
   * Get segment growth history
   */
  getSegmentGrowthHistory(segmentId: string): SegmentGrowth[] {
    return this.segmentHistory.get(segmentId) ?? [];
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  /**
   * K-means++ initialization: choose initial centroids that are well-spread
   */
  private kMeansPlusPlusInit(points: number[][], k: number): number[][] {
    const centroids: number[][] = [];

    // Choose first centroid randomly
    const firstIdx = Math.floor(Math.random() * points.length);
    centroids.push([...(points[firstIdx] ?? [])]);

    // Choose remaining centroids proportional to squared distance from nearest centroid
    for (let c = 1; c < k; c++) {
      const distances: number[] = [];
      let totalDist = 0;

      for (const point of points) {
        let minDist = Infinity;
        for (const centroid of centroids) {
          const dist = this.computeDistance(point, centroid, this.clusterConfig.distanceMetric);
          if (dist < minDist) minDist = dist;
        }
        const squaredDist = minDist * minDist;
        distances.push(squaredDist);
        totalDist += squaredDist;
      }

      // Weighted random selection
      if (totalDist === 0) {
        const randomIdx = Math.floor(Math.random() * points.length);
        centroids.push([...(points[randomIdx] ?? [])]);
        continue;
      }

      let target = Math.random() * totalDist;
      let selectedIdx = 0;
      for (let i = 0; i < distances.length; i++) {
        target -= distances[i] ?? 0;
        if (target <= 0) {
          selectedIdx = i;
          break;
        }
      }
      centroids.push([...(points[selectedIdx] ?? [])]);
    }

    return centroids;
  }

  private randomInit(points: number[][], k: number): number[][] {
    const indices = new Set<number>();
    while (indices.size < k) {
      indices.add(Math.floor(Math.random() * points.length));
    }
    return Array.from(indices).map((idx) => [...(points[idx] ?? [])]);
  }

  private computeDistance(a: number[], b: number[], metric: string): number {
    switch (metric) {
      case 'manhattan':
        return this.manhattanDistance(a, b);
      case 'cosine':
        return this.cosineDistance(a, b);
      default:
        return this.euclideanDistance(a, b);
    }
  }

  private euclideanDistance(a: number[], b: number[]): number {
    let sum = 0;
    for (let i = 0; i < a.length; i++) {
      const diff = (a[i] ?? 0) - (b[i] ?? 0);
      sum += diff * diff;
    }
    return Math.sqrt(sum);
  }

  private manhattanDistance(a: number[], b: number[]): number {
    let sum = 0;
    for (let i = 0; i < a.length; i++) {
      sum += Math.abs((a[i] ?? 0) - (b[i] ?? 0));
    }
    return sum;
  }

  private cosineDistance(a: number[], b: number[]): number {
    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
      const va = a[i] ?? 0;
      const vb = b[i] ?? 0;
      dot += va * vb;
      normA += va * va;
      normB += vb * vb;
    }
    const denom = Math.sqrt(normA) * Math.sqrt(normB);
    const similarity = denom > 0 ? dot / denom : 0;
    return 1 - similarity;
  }

  /**
   * Get quintile bucket (1-5) for a value within sorted values
   */
  private getQuintile(value: number, sortedValues: number[]): number {
    const n = sortedValues.length;
    if (n === 0) return 3;

    let rank = 0;
    for (let i = 0; i < n; i++) {
      if ((sortedValues[i] ?? 0) <= value) rank = i + 1;
    }

    const percentile = rank / n;
    if (percentile <= 0.2) return 1;
    if (percentile <= 0.4) return 2;
    if (percentile <= 0.6) return 3;
    if (percentile <= 0.8) return 4;
    return 5;
  }

  /**
   * Classify RFM segment based on scores
   */
  private classifyRFMSegment(recency: number, frequency: number, monetary: number): string {
    const avg = (recency + frequency + monetary) / 3;
    if (avg >= 4.5) return 'champions';
    if (recency >= 4 && frequency >= 4) return 'loyal_customers';
    if (recency >= 4 && frequency <= 2) return 'new_customers';
    if (recency >= 3 && frequency >= 3) return 'potential_loyalists';
    if (recency <= 2 && frequency >= 4) return 'at_risk';
    if (recency <= 2 && frequency >= 2) return 'need_attention';
    if (recency <= 1 && frequency >= 3) return 'cant_lose_them';
    if (recency <= 2 && frequency <= 2) return 'hibernating';
    if (recency <= 1 && frequency <= 1) return 'lost';
    return 'about_to_sleep';
  }
}
