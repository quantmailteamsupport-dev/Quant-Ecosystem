// ============================================================================
// QuantAds - Targeting Service
// Audience matching, segmentation, lookalike audiences
// ============================================================================

import type { TargetingConfig, UserAdProfile, CustomAudience, LookalikeAudience } from '../../src/types';

interface AudienceSegment {
  id: string;
  name: string;
  description: string;
  size: number;
  criteria: Partial<TargetingConfig>;
  createdAt: string;
}

interface UserSegmentMembership {
  userId: string;
  segments: string[];
  interests: string[];
  behaviors: string[];
  demographics: { age?: number; gender?: string; location?: string };
  engagementScore: number;
  lastActive: number;
}

class TargetingService {
  private audiences: Map<string, CustomAudience> = new Map();
  private segments: Map<string, AudienceSegment> = new Map();
  private userProfiles: Map<string, UserSegmentMembership> = new Map();
  private lookalikeModels: Map<string, { sourceUsers: string[]; features: Map<string, number> }> = new Map();

  // --------------------------------------------------------------------------
  // Audience Matching
  // --------------------------------------------------------------------------

  matchUser(userId: string, targeting: TargetingConfig): { matches: boolean; score: number; matchedCriteria: string[] } {
    const profile = this.userProfiles.get(userId);
    if (!profile) return { matches: false, score: 0, matchedCriteria: [] };

    const matchedCriteria: string[] = [];
    let score = 0;
    let totalWeight = 0;

    // Demographics matching
    if (targeting.demographics) {
      const demoResult = this.matchDemographics(profile, targeting.demographics);
      if (demoResult.matches) {
        score += demoResult.score * 0.25;
        matchedCriteria.push(...demoResult.criteria);
      }
      totalWeight += 0.25;
    }

    // Interest matching
    if (targeting.interests.length > 0) {
      const interestMatch = profile.interests.filter(i => targeting.interests.includes(i));
      const interestScore = interestMatch.length / targeting.interests.length;
      score += interestScore * 0.3;
      totalWeight += 0.3;
      if (interestScore > 0) matchedCriteria.push(`interests:${interestMatch.join(',')}`);
    }

    // Behavior matching
    if (targeting.behaviors.length > 0) {
      const behaviorMatch = profile.behaviors.filter(b => targeting.behaviors.includes(b));
      const behaviorScore = behaviorMatch.length / targeting.behaviors.length;
      score += behaviorScore * 0.25;
      totalWeight += 0.25;
      if (behaviorScore > 0) matchedCriteria.push(`behaviors:${behaviorMatch.join(',')}`);
    }

    // Location matching
    if (targeting.locations.length > 0) {
      const locationMatch = targeting.locations.some(loc => {
        if (loc.type === 'country' && profile.demographics.location?.startsWith(loc.value)) return true;
        if (loc.type === 'city' && profile.demographics.location === loc.value) return true;
        return false;
      });
      if (locationMatch) { score += 0.2; matchedCriteria.push('location'); }
      totalWeight += 0.2;
    }

    // Custom audience matching
    if (targeting.custom.length > 0) {
      const inCustom = targeting.custom.some(ca => {
        const audience = this.audiences.get(ca.id);
        return audience !== undefined;
      });
      if (inCustom) { score += 0.3; matchedCriteria.push('custom_audience'); }
    }

    // Exclusion check
    if (targeting.exclusions.includes(userId)) {
      return { matches: false, score: 0, matchedCriteria: [] };
    }

    // Normalize score
    const normalizedScore = totalWeight > 0 ? score / totalWeight : score;
    const matches = normalizedScore > 0.3; // Minimum 30% match

    return { matches, score: normalizedScore, matchedCriteria };
  }

  private matchDemographics(profile: UserSegmentMembership, demo: TargetingConfig['demographics']): { matches: boolean; score: number; criteria: string[] } {
    const criteria: string[] = [];
    let matches = 0;
    let checks = 0;

    // Age
    if (demo.ageMin || demo.ageMax) {
      checks++;
      if (profile.demographics.age) {
        if (profile.demographics.age >= demo.ageMin && profile.demographics.age <= demo.ageMax) {
          matches++;
          criteria.push('age');
        }
      }
    }

    // Gender
    if (demo.genders.length > 0 && !demo.genders.includes('all')) {
      checks++;
      if (profile.demographics.gender && demo.genders.includes(profile.demographics.gender as any)) {
        matches++;
        criteria.push('gender');
      }
    }

    return {
      matches: checks === 0 || matches > 0,
      score: checks > 0 ? matches / checks : 1,
      criteria,
    };
  }

  // --------------------------------------------------------------------------
  // Audience Estimation
  // --------------------------------------------------------------------------

  estimateAudienceSize(targeting: TargetingConfig): { estimated: number; breakdown: Record<string, number> } {
    let baseSize = 10000000; // Total platform users (simulated)
    const breakdown: Record<string, number> = {};

    // Apply demographic filters
    if (targeting.demographics.ageMin > 13 || targeting.demographics.ageMax < 65) {
      const ageRange = targeting.demographics.ageMax - targeting.demographics.ageMin;
      const ageFactor = ageRange / 52; // Full range is 13-65
      baseSize *= ageFactor;
      breakdown['demographics'] = Math.round(baseSize);
    }

    if (!targeting.demographics.genders.includes('all')) {
      baseSize *= targeting.demographics.genders.length * 0.45;
      breakdown['gender'] = Math.round(baseSize);
    }

    // Interest narrowing
    if (targeting.interests.length > 0) {
      const interestFactor = Math.max(0.05, 1 - targeting.interests.length * 0.1);
      baseSize *= interestFactor;
      breakdown['interests'] = Math.round(baseSize);
    }

    // Location narrowing
    if (targeting.locations.length > 0) {
      const locationFactor = targeting.locations.length * 0.1;
      baseSize *= Math.min(locationFactor, 0.8);
      breakdown['location'] = Math.round(baseSize);
    }

    // Device targeting
    if (targeting.devices.platforms.length < 4) {
      baseSize *= targeting.devices.platforms.length * 0.3;
      breakdown['devices'] = Math.round(baseSize);
    }

    return { estimated: Math.round(Math.max(baseSize, 1000)), breakdown };
  }

  // --------------------------------------------------------------------------
  // Audience Management
  // --------------------------------------------------------------------------

  createAudience(audience: Omit<CustomAudience, 'id' | 'createdAt'>): CustomAudience {
    const newAudience: CustomAudience = {
      ...audience,
      id: `aud_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      createdAt: new Date().toISOString(),
    };
    this.audiences.set(newAudience.id, newAudience);
    return newAudience;
  }

  getAudience(id: string): CustomAudience | undefined {
    return this.audiences.get(id);
  }

  listAudiences(advertiserId: string): CustomAudience[] {
    return Array.from(this.audiences.values());
  }

  deleteAudience(id: string): boolean {
    return this.audiences.delete(id);
  }

  // --------------------------------------------------------------------------
  // Lookalike Audiences
  // --------------------------------------------------------------------------

  createLookalikeAudience(config: LookalikeAudience): CustomAudience {
    const sourceModel = this.lookalikeModels.get(config.sourceAudienceId);
    const estimatedSize = Math.round(10000000 * (config.size / 100));

    const audience: CustomAudience = {
      id: `lal_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      name: `Lookalike - ${config.sourceAudienceId} (${config.size}%)`,
      size: estimatedSize,
      source: 'engagement',
      createdAt: new Date().toISOString(),
    };

    this.audiences.set(audience.id, audience);
    return audience;
  }

  // --------------------------------------------------------------------------
  // User Profile Management
  // --------------------------------------------------------------------------

  updateUserProfile(userId: string, data: Partial<UserSegmentMembership>): void {
    const existing = this.userProfiles.get(userId) || {
      userId,
      segments: [],
      interests: [],
      behaviors: [],
      demographics: {},
      engagementScore: 0.5,
      lastActive: Date.now(),
    };
    this.userProfiles.set(userId, { ...existing, ...data, lastActive: Date.now() });
  }

  getUserProfile(userId: string): UserAdProfile {
    const profile = this.userProfiles.get(userId);
    if (!profile) {
      return {
        userId,
        demographics: {},
        interests: [],
        recentActivity: [],
        engagementRate: 0.5,
        deviceInfo: { platform: 'web', deviceType: 'desktop' },
      };
    }
    return {
      userId,
      demographics: profile.demographics,
      interests: profile.interests,
      recentActivity: profile.behaviors,
      engagementRate: profile.engagementScore,
      deviceInfo: { platform: 'web', deviceType: 'desktop' },
    };
  }
}

export const targetingService = new TargetingService();
export default TargetingService;
