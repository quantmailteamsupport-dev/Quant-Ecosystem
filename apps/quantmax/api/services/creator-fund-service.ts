// ============================================================================
// QuantMax - Creator Fund Service
// Eligibility check (10K followers AND 100K monthly views), daily revenue
// calculation, quality score multiplier, payout scheduling (weekly Fridays),
// fraud prevention, earnings history, tier system
// ============================================================================

interface CreatorProfile {
  id: string;
  userId: string;
  displayName: string;
  followers: number;
  monthlyViews: number;
  totalViews: number;
  engagementRate: number;
  enrolledAt: number | null;
  tier: CreatorTier;
  isEligible: boolean;
  isSuspended: boolean;
  suspendedReason?: string;
}

type CreatorTier = 'bronze' | 'silver' | 'gold' | 'platinum';

interface EligibilityCheck {
  userId: string;
  eligible: boolean;
  requirements: {
    followers: { required: number; current: number; met: boolean };
    monthlyViews: { required: number; current: number; met: boolean };
    accountAge: { required: number; current: number; met: boolean };
    communityGuidelines: { violations: number; met: boolean };
  };
}

interface DailyEarnings {
  date: string;
  userId: string;
  views: number;
  qualityScore: number;
  cpmRate: number;
  baseRevenue: number;
  tierMultiplier: number;
  totalRevenue: number;
}

interface PayoutRecord {
  id: string;
  userId: string;
  amount: number;
  period: { start: string; end: string };
  status: 'pending' | 'processing' | 'completed' | 'failed';
  scheduledDate: string;
  processedDate?: string;
  method: 'bank_transfer' | 'paypal' | 'crypto';
}

interface FraudCheck {
  userId: string;
  passed: boolean;
  checks: {
    viewVelocity: { passed: boolean; detail: string };
    geographicDistribution: { passed: boolean; detail: string };
    engagementRatio: { passed: boolean; detail: string };
    botDetection: { passed: boolean; detail: string };
  };
}

interface EarningsAnalytics {
  userId: string;
  totalEarnings: number;
  thisMonth: number;
  lastMonth: number;
  averageDaily: number;
  topPerformingContent: { videoId: string; revenue: number }[];
  tierProgress: { current: CreatorTier; next: CreatorTier | null; progressPercent: number };
}

// Constants
const MIN_FOLLOWERS = 10000;
const MIN_MONTHLY_VIEWS = 100000;
const MIN_ACCOUNT_AGE_DAYS = 30;
const MAX_GUIDELINE_VIOLATIONS = 2;
const BASE_CPM_RATE = 0.02; // $0.02 per 1000 views base
const PAYOUT_DAY = 5; // Friday

const TIER_THRESHOLDS: Record<CreatorTier, { followers: number; views: number; multiplier: number }> = {
  bronze: { followers: 10000, views: 100000, multiplier: 1.0 },
  silver: { followers: 50000, views: 500000, multiplier: 1.25 },
  gold: { followers: 200000, views: 2000000, multiplier: 1.5 },
  platinum: { followers: 1000000, views: 10000000, multiplier: 2.0 },
};

// Fraud thresholds
const MAX_VIEW_VELOCITY = 10000; // max views per hour before flagging
const MIN_GEOGRAPHIC_COUNTRIES = 2;
const MIN_ENGAGEMENT_RATIO = 0.01;
const MAX_ENGAGEMENT_RATIO = 0.5;

class CreatorFundService {
  private creators: Map<string, CreatorProfile> = new Map();
  private earnings: DailyEarnings[] = [];
  private payouts: Map<string, PayoutRecord[]> = new Map();
  private fraudFlags: Map<string, FraudCheck> = new Map();

  // Check eligibility for creator fund
  checkEligibility(userId: string, profile: {
    followers: number;
    monthlyViews: number;
    accountAgeDays: number;
    violations: number;
  }): EligibilityCheck {
    const check: EligibilityCheck = {
      userId,
      eligible: true,
      requirements: {
        followers: {
          required: MIN_FOLLOWERS,
          current: profile.followers,
          met: profile.followers >= MIN_FOLLOWERS,
        },
        monthlyViews: {
          required: MIN_MONTHLY_VIEWS,
          current: profile.monthlyViews,
          met: profile.monthlyViews >= MIN_MONTHLY_VIEWS,
        },
        accountAge: {
          required: MIN_ACCOUNT_AGE_DAYS,
          current: profile.accountAgeDays,
          met: profile.accountAgeDays >= MIN_ACCOUNT_AGE_DAYS,
        },
        communityGuidelines: {
          violations: profile.violations,
          met: profile.violations <= MAX_GUIDELINE_VIOLATIONS,
        },
      },
    };

    check.eligible = Object.values(check.requirements).every(r => r.met);
    return check;
  }

  // Enroll creator in fund
  enrollCreator(userId: string, displayName: string, followers: number, monthlyViews: number): CreatorProfile {
    const tier = this.calculateTier(followers, monthlyViews);
    const profile: CreatorProfile = {
      id: `creator_${userId}`,
      userId,
      displayName,
      followers,
      monthlyViews,
      totalViews: monthlyViews,
      engagementRate: 0,
      enrolledAt: Date.now(),
      tier,
      isEligible: true,
      isSuspended: false,
    };
    this.creators.set(userId, profile);
    this.payouts.set(userId, []);
    return profile;
  }

  // Calculate creator tier
  calculateTier(followers: number, monthlyViews: number): CreatorTier {
    if (followers >= TIER_THRESHOLDS.platinum.followers && monthlyViews >= TIER_THRESHOLDS.platinum.views) return 'platinum';
    if (followers >= TIER_THRESHOLDS.gold.followers && monthlyViews >= TIER_THRESHOLDS.gold.views) return 'gold';
    if (followers >= TIER_THRESHOLDS.silver.followers && monthlyViews >= TIER_THRESHOLDS.silver.views) return 'silver';
    return 'bronze';
  }

  // Calculate daily revenue
  calculateDailyRevenue(userId: string, views: number, engagementMetrics: {
    likes: number;
    comments: number;
    shares: number;
  }): DailyEarnings {
    const creator = this.creators.get(userId);
    if (!creator) throw new Error('Creator not enrolled');

    // Quality score based on engagement
    const totalEngagement = engagementMetrics.likes + engagementMetrics.comments + engagementMetrics.shares;
    const qualityScore = views > 0 ? Math.min(totalEngagement / views, 1) : 0;

    // Weighted quality: comments worth more than likes
    const weightedEngagement = engagementMetrics.likes * 1 + engagementMetrics.comments * 2 + engagementMetrics.shares * 3;
    const weightedQualityScore = views > 0 ? Math.min(weightedEngagement / views, 1.5) : 0;

    // CPM rate adjusted by quality
    const cpmRate = BASE_CPM_RATE * (1 + weightedQualityScore * 2);

    // Tier multiplier
    const tierMultiplier = TIER_THRESHOLDS[creator.tier].multiplier;

    // Base revenue calculation: views * quality_score * CPM_rate
    const baseRevenue = (views / 1000) * cpmRate * qualityScore;
    const totalRevenue = baseRevenue * tierMultiplier;

    const today = new Date().toISOString().split('T')[0];
    const earning: DailyEarnings = {
      date: today,
      userId,
      views,
      qualityScore: Math.round(qualityScore * 100) / 100,
      cpmRate: Math.round(cpmRate * 1000) / 1000,
      baseRevenue: Math.round(baseRevenue * 100) / 100,
      tierMultiplier,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
    };

    this.earnings.push(earning);
    return earning;
  }

  // Fraud prevention check
  runFraudCheck(userId: string, metrics: {
    viewsPerHour: number;
    uniqueCountries: number;
    engagementRate: number;
    suspiciousIPs: number;
    totalViews: number;
  }): FraudCheck {
    const check: FraudCheck = {
      userId,
      passed: true,
      checks: {
        viewVelocity: {
          passed: metrics.viewsPerHour <= MAX_VIEW_VELOCITY,
          detail: `${metrics.viewsPerHour} views/hour (max: ${MAX_VIEW_VELOCITY})`,
        },
        geographicDistribution: {
          passed: metrics.uniqueCountries >= MIN_GEOGRAPHIC_COUNTRIES,
          detail: `${metrics.uniqueCountries} countries (min: ${MIN_GEOGRAPHIC_COUNTRIES})`,
        },
        engagementRatio: {
          passed: metrics.engagementRate >= MIN_ENGAGEMENT_RATIO && metrics.engagementRate <= MAX_ENGAGEMENT_RATIO,
          detail: `${(metrics.engagementRate * 100).toFixed(2)}% (range: ${MIN_ENGAGEMENT_RATIO * 100}%-${MAX_ENGAGEMENT_RATIO * 100}%)`,
        },
        botDetection: {
          passed: metrics.suspiciousIPs < metrics.totalViews * 0.1,
          detail: `${metrics.suspiciousIPs} suspicious IPs (threshold: ${Math.floor(metrics.totalViews * 0.1)})`,
        },
      },
    };

    check.passed = Object.values(check.checks).every(c => c.passed);
    this.fraudFlags.set(userId, check);

    // Suspend if fraud detected
    if (!check.passed) {
      const creator = this.creators.get(userId);
      if (creator) {
        creator.isSuspended = true;
        creator.suspendedReason = 'Fraud detected: ' + Object.entries(check.checks)
          .filter(([_, v]) => !v.passed)
          .map(([k]) => k)
          .join(', ');
        this.creators.set(userId, creator);
      }
    }

    return check;
  }

  // Schedule payout (weekly on Fridays)
  schedulePayout(userId: string, periodStart: string, periodEnd: string): PayoutRecord | null {
    const creator = this.creators.get(userId);
    if (!creator || creator.isSuspended) return null;

    // Calculate total earnings for period
    const periodEarnings = this.earnings.filter(
      e => e.userId === userId && e.date >= periodStart && e.date <= periodEnd
    );
    const totalAmount = periodEarnings.reduce((sum, e) => sum + e.totalRevenue, 0);

    if (totalAmount <= 0) return null;

    // Find next Friday
    const now = new Date();
    const daysUntilFriday = (PAYOUT_DAY - now.getDay() + 7) % 7 || 7;
    const nextFriday = new Date(now.getTime() + daysUntilFriday * 86400000);

    const payout: PayoutRecord = {
      id: `payout_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      userId,
      amount: Math.round(totalAmount * 100) / 100,
      period: { start: periodStart, end: periodEnd },
      status: 'pending',
      scheduledDate: nextFriday.toISOString().split('T')[0],
      method: 'bank_transfer',
    };

    const userPayouts = this.payouts.get(userId) || [];
    userPayouts.push(payout);
    this.payouts.set(userId, userPayouts);

    return payout;
  }

  // Get earnings history
  getEarningsHistory(userId: string, days: number = 30): DailyEarnings[] {
    const cutoff = new Date(Date.now() - days * 86400000).toISOString().split('T')[0];
    return this.earnings.filter(e => e.userId === userId && e.date >= cutoff);
  }

  // Get payout history
  getPayoutHistory(userId: string): PayoutRecord[] {
    return this.payouts.get(userId) || [];
  }

  // Get earnings analytics
  getAnalytics(userId: string): EarningsAnalytics {
    const creator = this.creators.get(userId);
    const allEarnings = this.earnings.filter(e => e.userId === userId);
    const totalEarnings = allEarnings.reduce((sum, e) => sum + e.totalRevenue, 0);

    const now = new Date();
    const thisMonthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthStart = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, '0')}-01`;
    const lastMonthEnd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

    const thisMonth = allEarnings.filter(e => e.date >= thisMonthStart).reduce((sum, e) => sum + e.totalRevenue, 0);
    const lastMonth = allEarnings.filter(e => e.date >= lastMonthStart && e.date < lastMonthEnd).reduce((sum, e) => sum + e.totalRevenue, 0);

    const currentTier = creator?.tier || 'bronze';
    const tiers: CreatorTier[] = ['bronze', 'silver', 'gold', 'platinum'];
    const tierIndex = tiers.indexOf(currentTier);
    const nextTier = tierIndex < tiers.length - 1 ? tiers[tierIndex + 1] : null;

    let progressPercent = 100;
    if (nextTier && creator) {
      const nextThreshold = TIER_THRESHOLDS[nextTier];
      const followerProgress = Math.min(creator.followers / nextThreshold.followers, 1);
      const viewProgress = Math.min(creator.monthlyViews / nextThreshold.views, 1);
      progressPercent = Math.round(((followerProgress + viewProgress) / 2) * 100);
    }

    return {
      userId,
      totalEarnings: Math.round(totalEarnings * 100) / 100,
      thisMonth: Math.round(thisMonth * 100) / 100,
      lastMonth: Math.round(lastMonth * 100) / 100,
      averageDaily: allEarnings.length > 0 ? Math.round((totalEarnings / allEarnings.length) * 100) / 100 : 0,
      topPerformingContent: [],
      tierProgress: { current: currentTier, next: nextTier, progressPercent },
    };
  }

  // Get creator profile
  getCreator(userId: string): CreatorProfile | null {
    return this.creators.get(userId) || null;
  }
}

export const creatorFundService = new CreatorFundService();
export default creatorFundService;
