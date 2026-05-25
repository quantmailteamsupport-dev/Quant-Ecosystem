// ============================================================================
// QuantMax - Matching Algorithm Service
// Elo-based matching with scoring, preference weighting, mutual interest bonus,
// activity decay, queue generation, anti-repeat filter, daily like limit
// ============================================================================

interface UserProfile {
  id: string;
  displayName: string;
  age: number;
  gender: 'male' | 'female' | 'non_binary';
  interests: string[];
  location: { lat: number; lng: number; city: string };
  photos: string[];
  bio: string;
  verified: boolean;
  lastActive: number;
  createdAt: number;
}

interface EloScore {
  userId: string;
  score: number;
  matchCount: number;
  likeCount: number;
  passCount: number;
  superLikeCount: number;
  lastUpdated: number;
}

interface MatchPreferences {
  userId: string;
  ageRange: { min: number; max: number };
  maxDistance: number;
  genderPreference: 'male' | 'female' | 'everyone';
  interestPriority: string[];
}

interface QueueEntry {
  profile: UserProfile;
  compatibilityScore: number;
  distance: number;
  commonInterests: string[];
  eloScore: number;
}

interface DailyLikeTracker {
  userId: string;
  date: string;
  likeCount: number;
  superLikeCount: number;
  maxLikes: number;
  maxSuperLikes: number;
}

interface MatchResult {
  userId: string;
  targetId: string;
  action: 'like' | 'pass' | 'superlike';
  isMutual: boolean;
  timestamp: number;
}

interface ScoreUpdateResult {
  userId: string;
  previousScore: number;
  newScore: number;
  change: number;
  reason: string;
}

// Constants
const INITIAL_ELO_SCORE = 1000;
const K_FACTOR = 32;
const AGE_WEIGHT = 0.2;
const DISTANCE_WEIGHT = 0.3;
const INTEREST_OVERLAP_WEIGHT = 0.35;
const ACTIVITY_WEIGHT = 0.15;
const MUTUAL_INTEREST_BONUS = 50;
const MUTUAL_INTEREST_THRESHOLD = 3;
const ACTIVITY_DECAY_PER_DAY = 5;
const MAX_INACTIVE_DAYS = 30;
const DAILY_LIKE_LIMIT = 100;
const DAILY_SUPERLIKE_LIMIT = 5;
const QUEUE_SIZE = 50;
const ANTI_REPEAT_DAYS = 30;

class MatchingAlgorithmService {
  private eloScores: Map<string, EloScore> = new Map();
  private interactions: Map<string, Set<string>> = new Map();
  private dailyTrackers: Map<string, DailyLikeTracker> = new Map();
  private matchHistory: MatchResult[] = [];

  // Initialize Elo score for new user
  initializeScore(userId: string): EloScore {
    const score: EloScore = {
      userId,
      score: INITIAL_ELO_SCORE,
      matchCount: 0,
      likeCount: 0,
      passCount: 0,
      superLikeCount: 0,
      lastUpdated: Date.now(),
    };
    this.eloScores.set(userId, score);
    return score;
  }

  // Get or create Elo score
  getScore(userId: string): EloScore {
    const existing = this.eloScores.get(userId);
    if (existing) return existing;
    return this.initializeScore(userId);
  }

  // Calculate expected score (Elo formula)
  private calculateExpected(ratingA: number, ratingB: number): number {
    return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
  }

  // Update Elo score based on like/pass interaction
  updateScore(userId: string, targetId: string, action: 'like' | 'pass' | 'superlike'): ScoreUpdateResult {
    const userScore = this.getScore(userId);
    const targetScore = this.getScore(targetId);

    const expected = this.calculateExpected(userScore.score, targetScore.score);
    let actual: number;
    let kMultiplier = 1;

    switch (action) {
      case 'like':
        actual = 1;
        userScore.likeCount++;
        break;
      case 'superlike':
        actual = 1;
        kMultiplier = 1.5;
        userScore.superLikeCount++;
        break;
      case 'pass':
        actual = 0;
        userScore.passCount++;
        break;
    }

    const previousScore = targetScore.score;
    const scoreChange = Math.round(K_FACTOR * kMultiplier * (actual - expected));
    targetScore.score = Math.max(100, Math.min(2000, targetScore.score + scoreChange));
    targetScore.lastUpdated = Date.now();

    this.eloScores.set(targetId, targetScore);
    this.eloScores.set(userId, userScore);

    // Track interaction
    if (!this.interactions.has(userId)) {
      this.interactions.set(userId, new Set());
    }
    this.interactions.get(userId)!.add(targetId);

    return {
      userId: targetId,
      previousScore,
      newScore: targetScore.score,
      change: scoreChange,
      reason: `${action} from ${userId}`,
    };
  }

  // Calculate preference weight score between two users
  calculatePreferenceWeight(
    user: UserProfile,
    target: UserProfile,
    preferences: MatchPreferences
  ): number {
    let score = 0;

    // Age compatibility (0-1)
    const ageInRange = target.age >= preferences.ageRange.min && target.age <= preferences.ageRange.max;
    if (ageInRange) {
      const ageMid = (preferences.ageRange.min + preferences.ageRange.max) / 2;
      const ageDistance = Math.abs(target.age - ageMid) / ((preferences.ageRange.max - preferences.ageRange.min) / 2);
      score += (1 - ageDistance * 0.5) * AGE_WEIGHT;
    }

    // Distance compatibility (0-1)
    const distance = this.calculateDistance(user.location, target.location);
    if (distance <= preferences.maxDistance) {
      const distanceScore = 1 - (distance / preferences.maxDistance);
      score += distanceScore * DISTANCE_WEIGHT;
    }

    // Interest overlap score (0-1)
    const commonInterests = user.interests.filter(i => target.interests.includes(i));
    const totalUniqueInterests = new Set([...user.interests, ...target.interests]).size;
    const interestOverlap = totalUniqueInterests > 0 ? commonInterests.length / totalUniqueInterests : 0;
    score += interestOverlap * INTEREST_OVERLAP_WEIGHT;

    // Activity score (0-1)
    const hoursSinceActive = (Date.now() - target.lastActive) / 3600000;
    const activityScore = Math.max(0, 1 - (hoursSinceActive / (MAX_INACTIVE_DAYS * 24)));
    score += activityScore * ACTIVITY_WEIGHT;

    return score;
  }

  // Calculate mutual interest bonus
  calculateMutualInterestBonus(userInterests: string[], targetInterests: string[]): number {
    const common = userInterests.filter(i => targetInterests.includes(i));
    if (common.length >= MUTUAL_INTEREST_THRESHOLD) {
      return MUTUAL_INTEREST_BONUS;
    }
    return 0;
  }

  // Apply activity decay for inactive users
  applyActivityDecay(userId: string): ScoreUpdateResult {
    const score = this.getScore(userId);
    const daysSinceUpdate = (Date.now() - score.lastUpdated) / 86400000;

    if (daysSinceUpdate < 1) {
      return { userId, previousScore: score.score, newScore: score.score, change: 0, reason: 'no decay needed' };
    }

    const daysToDecay = Math.min(Math.floor(daysSinceUpdate), MAX_INACTIVE_DAYS);
    const decayAmount = daysToDecay * ACTIVITY_DECAY_PER_DAY;
    const previousScore = score.score;
    score.score = Math.max(100, score.score - decayAmount);
    score.lastUpdated = Date.now();
    this.eloScores.set(userId, score);

    return {
      userId,
      previousScore,
      newScore: score.score,
      change: -decayAmount,
      reason: `activity decay: ${daysToDecay} days inactive`,
    };
  }

  // Generate matching queue for a user
  generateQueue(
    user: UserProfile,
    preferences: MatchPreferences,
    allProfiles: UserProfile[]
  ): QueueEntry[] {
    const userScore = this.getScore(user.id);
    const interactedWith = this.interactions.get(user.id) || new Set();

    // Filter eligible profiles
    const eligible = allProfiles.filter(profile => {
      // Not self
      if (profile.id === user.id) return false;

      // Anti-repeat filter
      if (interactedWith.has(profile.id)) return false;

      // Gender preference
      if (preferences.genderPreference !== 'everyone' && profile.gender !== preferences.genderPreference) return false;

      // Age range
      if (profile.age < preferences.ageRange.min || profile.age > preferences.ageRange.max) return false;

      // Distance
      const distance = this.calculateDistance(user.location, profile.location);
      if (distance > preferences.maxDistance) return false;

      // Activity check (not too inactive)
      const daysSinceActive = (Date.now() - profile.lastActive) / 86400000;
      if (daysSinceActive > MAX_INACTIVE_DAYS) return false;

      return true;
    });

    // Score and sort profiles
    const scored: QueueEntry[] = eligible.map(profile => {
      const targetElo = this.getScore(profile.id);
      const preferenceWeight = this.calculatePreferenceWeight(user, profile, preferences);
      const mutualBonus = this.calculateMutualInterestBonus(user.interests, profile.interests);
      const commonInterests = user.interests.filter(i => profile.interests.includes(i));
      const distance = this.calculateDistance(user.location, profile.location);

      // Combined compatibility score
      const eloCompatibility = 1 - Math.abs(userScore.score - targetElo.score) / 2000;
      const compatibilityScore = (preferenceWeight * 100) + (eloCompatibility * 50) + mutualBonus;

      return {
        profile,
        compatibilityScore,
        distance,
        commonInterests,
        eloScore: targetElo.score,
      };
    });

    // Sort by compatibility score (descending)
    scored.sort((a, b) => b.compatibilityScore - a.compatibilityScore);

    // Return top entries
    return scored.slice(0, QUEUE_SIZE);
  }

  // Check and track daily like limit
  checkDailyLimit(userId: string, action: 'like' | 'superlike'): { allowed: boolean; remaining: number } {
    const today = new Date().toISOString().split('T')[0];
    const key = `${userId}_${today}`;
    let tracker = this.dailyTrackers.get(key);

    if (!tracker) {
      tracker = {
        userId,
        date: today,
        likeCount: 0,
        superLikeCount: 0,
        maxLikes: DAILY_LIKE_LIMIT,
        maxSuperLikes: DAILY_SUPERLIKE_LIMIT,
      };
      this.dailyTrackers.set(key, tracker);
    }

    if (action === 'like') {
      if (tracker.likeCount >= tracker.maxLikes) {
        return { allowed: false, remaining: 0 };
      }
      tracker.likeCount++;
      return { allowed: true, remaining: tracker.maxLikes - tracker.likeCount };
    } else {
      if (tracker.superLikeCount >= tracker.maxSuperLikes) {
        return { allowed: false, remaining: 0 };
      }
      tracker.superLikeCount++;
      return { allowed: true, remaining: tracker.maxSuperLikes - tracker.superLikeCount };
    }
  }

  // Record a match interaction
  recordInteraction(userId: string, targetId: string, action: 'like' | 'pass' | 'superlike'): MatchResult {
    // Check if target already liked user (mutual match)
    const targetInteractions = this.matchHistory.filter(
      m => m.userId === targetId && m.targetId === userId && (m.action === 'like' || m.action === 'superlike')
    );
    const isMutual = targetInteractions.length > 0 && (action === 'like' || action === 'superlike');

    const result: MatchResult = {
      userId,
      targetId,
      action,
      isMutual,
      timestamp: Date.now(),
    };

    this.matchHistory.push(result);
    this.updateScore(userId, targetId, action);

    return result;
  }

  // Get match statistics for a user
  getStats(userId: string): {
    eloScore: number;
    totalLikes: number;
    totalPasses: number;
    totalSuperLikes: number;
    matchRate: number;
    averageCompatibility: number;
  } {
    const score = this.getScore(userId);
    const userMatches = this.matchHistory.filter(m => m.userId === userId);
    const mutualMatches = userMatches.filter(m => m.isMutual);

    const totalActions = score.likeCount + score.passCount + score.superLikeCount;
    const matchRate = totalActions > 0 ? mutualMatches.length / totalActions : 0;

    return {
      eloScore: score.score,
      totalLikes: score.likeCount,
      totalPasses: score.passCount,
      totalSuperLikes: score.superLikeCount,
      matchRate,
      averageCompatibility: 0,
    };
  }

  // Utility: Calculate distance between two coordinates (Haversine)
  private calculateDistance(
    loc1: { lat: number; lng: number },
    loc2: { lat: number; lng: number }
  ): number {
    const R = 6371; // Earth radius in km
    const dLat = this.toRad(loc2.lat - loc1.lat);
    const dLng = this.toRad(loc2.lng - loc1.lng);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(loc1.lat)) * Math.cos(this.toRad(loc2.lat)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c);
  }

  private toRad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  // Clean up old anti-repeat data
  cleanupOldInteractions(): number {
    const cutoff = Date.now() - (ANTI_REPEAT_DAYS * 86400000);
    let cleaned = 0;
    const oldMatches = this.matchHistory.filter(m => m.timestamp < cutoff);
    for (const match of oldMatches) {
      const interactions = this.interactions.get(match.userId);
      if (interactions) {
        interactions.delete(match.targetId);
        cleaned++;
      }
    }
    this.matchHistory = this.matchHistory.filter(m => m.timestamp >= cutoff);
    return cleaned;
  }
}

export const matchingAlgorithmService = new MatchingAlgorithmService();
export default matchingAlgorithmService;
