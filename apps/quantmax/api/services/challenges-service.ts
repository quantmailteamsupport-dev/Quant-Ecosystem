// ============================================================================
// QuantMax - Challenges Service
// Challenge creation (verified creators only, min 50K followers), submission
// tracking, leaderboard by engagement, prize distribution to top 3, trending
// detection, duration management (1-7 days), moderation queue, hashtag
// ============================================================================

interface Challenge {
  id: string;
  creatorId: string;
  creatorName: string;
  title: string;
  description: string;
  hashtag: string;
  rules: string[];
  startDate: number;
  endDate: number;
  durationDays: number;
  status: 'pending' | 'active' | 'ended' | 'cancelled' | 'moderation';
  prizes: ChallengePrize[];
  totalSubmissions: number;
  totalViews: number;
  createdAt: number;
  moderationStatus: 'approved' | 'pending' | 'rejected';
  moderationNote?: string;
}

interface ChallengePrize {
  rank: number;
  description: string;
  value: number; // in diamonds
  winnerId?: string;
  awarded: boolean;
}

interface ChallengeSubmission {
  id: string;
  challengeId: string;
  userId: string;
  userName: string;
  videoId: string;
  videoUrl: string;
  thumbnailUrl: string;
  likes: number;
  comments: number;
  shares: number;
  engagementScore: number;
  submittedAt: number;
  status: 'pending' | 'approved' | 'rejected';
  moderationNote?: string;
}

interface ChallengeLeaderboardEntry {
  rank: number;
  userId: string;
  userName: string;
  videoId: string;
  engagementScore: number;
  likes: number;
  comments: number;
  shares: number;
  prizeWon?: ChallengePrize;
}

interface TrendingChallenge {
  challenge: Challenge;
  submissionVelocity: number; // submissions per hour
  trendScore: number;
  peakHour: number;
}

interface CreatorEligibility {
  userId: string;
  eligible: boolean;
  followers: number;
  verified: boolean;
  requiredFollowers: number;
  requiresVerification: boolean;
}

interface ModerationAction {
  id: string;
  targetId: string;
  targetType: 'challenge' | 'submission';
  action: 'approve' | 'reject' | 'flag';
  moderatorId: string;
  reason?: string;
  timestamp: number;
}

// Constants
const MIN_CREATOR_FOLLOWERS = 50000;
const ENGAGEMENT_WEIGHTS = { likes: 1, comments: 2, shares: 5 };
const MIN_DURATION_DAYS = 1;
const MAX_DURATION_DAYS = 7;
const TRENDING_VELOCITY_THRESHOLD = 50; // 50 submissions/hour
const TOP_PRIZES_COUNT = 3;

class ChallengesService {
  private challenges: Map<string, Challenge> = new Map();
  private submissions: Map<string, ChallengeSubmission[]> = new Map();
  private hashtags: Map<string, string> = new Map(); // hashtag -> challengeId
  private moderationQueue: ModerationAction[] = [];

  // Check creator eligibility
  checkCreatorEligibility(userId: string, followers: number, verified: boolean): CreatorEligibility {
    return {
      userId,
      eligible: followers >= MIN_CREATOR_FOLLOWERS && verified,
      followers,
      verified,
      requiredFollowers: MIN_CREATOR_FOLLOWERS,
      requiresVerification: true,
    };
  }

  // Create a new challenge
  createChallenge(params: {
    creatorId: string;
    creatorName: string;
    title: string;
    description: string;
    hashtag: string;
    rules: string[];
    durationDays: number;
    prizes: { rank: number; description: string; value: number }[];
    creatorFollowers: number;
    creatorVerified: boolean;
  }): { success: boolean; challenge?: Challenge; error?: string } {
    // Verify eligibility
    const eligibility = this.checkCreatorEligibility(
      params.creatorId, params.creatorFollowers, params.creatorVerified
    );
    if (!eligibility.eligible) {
      return { success: false, error: 'Creator does not meet eligibility requirements (50K followers + verified)' };
    }

    // Validate duration
    if (params.durationDays < MIN_DURATION_DAYS || params.durationDays > MAX_DURATION_DAYS) {
      return { success: false, error: `Duration must be ${MIN_DURATION_DAYS}-${MAX_DURATION_DAYS} days` };
    }

    // Check hashtag availability
    const normalizedHashtag = params.hashtag.toLowerCase().replace(/^#/, '');
    if (this.hashtags.has(normalizedHashtag)) {
      return { success: false, error: 'Hashtag already in use' };
    }

    const now = Date.now();
    const challenge: Challenge = {
      id: `challenge_${now}_${Math.random().toString(36).substr(2, 8)}`,
      creatorId: params.creatorId,
      creatorName: params.creatorName,
      title: params.title,
      description: params.description,
      hashtag: `#${normalizedHashtag}`,
      rules: params.rules,
      startDate: now,
      endDate: now + (params.durationDays * 86400000),
      durationDays: params.durationDays,
      status: 'pending',
      prizes: params.prizes.map(p => ({ ...p, awarded: false })),
      totalSubmissions: 0,
      totalViews: 0,
      createdAt: now,
      moderationStatus: 'pending',
    };

    this.challenges.set(challenge.id, challenge);
    this.submissions.set(challenge.id, []);
    this.hashtags.set(normalizedHashtag, challenge.id);

    return { success: true, challenge };
  }

  // Submit entry to challenge
  submitEntry(params: {
    challengeId: string;
    userId: string;
    userName: string;
    videoId: string;
    videoUrl: string;
    thumbnailUrl: string;
  }): { success: boolean; submission?: ChallengeSubmission; error?: string } {
    const challenge = this.challenges.get(params.challengeId);
    if (!challenge) return { success: false, error: 'Challenge not found' };
    if (challenge.status !== 'active') return { success: false, error: 'Challenge is not active' };
    if (Date.now() > challenge.endDate) return { success: false, error: 'Challenge has ended' };

    const submissions = this.submissions.get(params.challengeId) || [];

    // Check for duplicate submission
    const existing = submissions.find(s => s.userId === params.userId);
    if (existing) return { success: false, error: 'Already submitted to this challenge' };

    const submission: ChallengeSubmission = {
      id: `sub_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      challengeId: params.challengeId,
      userId: params.userId,
      userName: params.userName,
      videoId: params.videoId,
      videoUrl: params.videoUrl,
      thumbnailUrl: params.thumbnailUrl,
      likes: 0,
      comments: 0,
      shares: 0,
      engagementScore: 0,
      submittedAt: Date.now(),
      status: 'approved', // Auto-approve for now
    };

    submissions.push(submission);
    this.submissions.set(params.challengeId, submissions);
    challenge.totalSubmissions++;
    this.challenges.set(params.challengeId, challenge);

    return { success: true, submission };
  }

  // Update submission engagement metrics
  updateSubmissionMetrics(submissionId: string, metrics: {
    likes: number;
    comments: number;
    shares: number;
  }): void {
    for (const [challengeId, subs] of this.submissions.entries()) {
      const sub = subs.find(s => s.id === submissionId);
      if (sub) {
        sub.likes = metrics.likes;
        sub.comments = metrics.comments;
        sub.shares = metrics.shares;
        sub.engagementScore = this.calculateEngagementScore(metrics);
        break;
      }
    }
  }

  // Calculate engagement score (weighted)
  private calculateEngagementScore(metrics: { likes: number; comments: number; shares: number }): number {
    return (
      metrics.likes * ENGAGEMENT_WEIGHTS.likes +
      metrics.comments * ENGAGEMENT_WEIGHTS.comments +
      metrics.shares * ENGAGEMENT_WEIGHTS.shares
    );
  }

  // Get leaderboard for a challenge
  getLeaderboard(challengeId: string, limit: number = 50): ChallengeLeaderboardEntry[] {
    const submissions = this.submissions.get(challengeId) || [];
    const challenge = this.challenges.get(challengeId);

    const sorted = [...submissions]
      .filter(s => s.status === 'approved')
      .sort((a, b) => b.engagementScore - a.engagementScore);

    return sorted.slice(0, limit).map((sub, index) => {
      const prize = challenge?.prizes.find(p => p.rank === index + 1);
      return {
        rank: index + 1,
        userId: sub.userId,
        userName: sub.userName,
        videoId: sub.videoId,
        engagementScore: sub.engagementScore,
        likes: sub.likes,
        comments: sub.comments,
        shares: sub.shares,
        prizeWon: prize && index < TOP_PRIZES_COUNT ? prize : undefined,
      };
    });
  }

  // Distribute prizes to top 3
  distributePrizes(challengeId: string): { success: boolean; winners: { rank: number; userId: string; prize: ChallengePrize }[] } {
    const challenge = this.challenges.get(challengeId);
    if (!challenge) return { success: false, winners: [] };
    if (challenge.status !== 'ended') return { success: false, winners: [] };

    const leaderboard = this.getLeaderboard(challengeId, TOP_PRIZES_COUNT);
    const winners: { rank: number; userId: string; prize: ChallengePrize }[] = [];

    for (let i = 0; i < Math.min(leaderboard.length, challenge.prizes.length); i++) {
      const entry = leaderboard[i];
      const prize = challenge.prizes[i];
      if (prize && entry) {
        prize.winnerId = entry.userId;
        prize.awarded = true;
        winners.push({ rank: i + 1, userId: entry.userId, prize });
      }
    }

    this.challenges.set(challengeId, challenge);
    return { success: true, winners };
  }

  // Detect trending challenges
  detectTrending(): TrendingChallenge[] {
    const trending: TrendingChallenge[] = [];
    const oneHourAgo = Date.now() - 3600000;

    for (const [challengeId, subs] of this.submissions.entries()) {
      const challenge = this.challenges.get(challengeId);
      if (!challenge || challenge.status !== 'active') continue;

      const recentSubs = subs.filter(s => s.submittedAt >= oneHourAgo);
      const velocity = recentSubs.length;

      if (velocity >= TRENDING_VELOCITY_THRESHOLD) {
        // Find peak hour
        const hourBuckets: Map<number, number> = new Map();
        for (const sub of subs) {
          const hour = Math.floor(sub.submittedAt / 3600000);
          hourBuckets.set(hour, (hourBuckets.get(hour) || 0) + 1);
        }
        const peakHour = Array.from(hourBuckets.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || 0;

        const trendScore = velocity * 2 + challenge.totalViews / 10000;
        trending.push({ challenge, submissionVelocity: velocity, trendScore, peakHour });
      }
    }

    return trending.sort((a, b) => b.trendScore - a.trendScore);
  }

  // Moderate challenge or submission
  moderate(params: {
    targetId: string;
    targetType: 'challenge' | 'submission';
    action: 'approve' | 'reject' | 'flag';
    moderatorId: string;
    reason?: string;
  }): { success: boolean } {
    const moderationAction: ModerationAction = {
      id: `mod_${Date.now()}`,
      ...params,
      timestamp: Date.now(),
    };
    this.moderationQueue.push(moderationAction);

    if (params.targetType === 'challenge') {
      const challenge = this.challenges.get(params.targetId);
      if (challenge) {
        if (params.action === 'approve') {
          challenge.moderationStatus = 'approved';
          challenge.status = 'active';
        } else if (params.action === 'reject') {
          challenge.moderationStatus = 'rejected';
          challenge.status = 'cancelled';
          challenge.moderationNote = params.reason;
        }
        this.challenges.set(params.targetId, challenge);
      }
    } else {
      for (const [_, subs] of this.submissions.entries()) {
        const sub = subs.find(s => s.id === params.targetId);
        if (sub) {
          sub.status = params.action === 'approve' ? 'approved' : 'rejected';
          sub.moderationNote = params.reason;
          break;
        }
      }
    }

    return { success: true };
  }

  // List challenges with filters
  listChallenges(filters?: { status?: string; creatorId?: string; trending?: boolean }): Challenge[] {
    let challenges = Array.from(this.challenges.values());

    if (filters?.status) challenges = challenges.filter(c => c.status === filters.status);
    if (filters?.creatorId) challenges = challenges.filter(c => c.creatorId === filters.creatorId);

    // Check and update status for expired challenges
    const now = Date.now();
    for (const challenge of challenges) {
      if (challenge.status === 'active' && now > challenge.endDate) {
        challenge.status = 'ended';
        this.challenges.set(challenge.id, challenge);
      }
    }

    return challenges.sort((a, b) => b.createdAt - a.createdAt);
  }

  // Get challenge by ID
  getChallenge(challengeId: string): Challenge | null {
    return this.challenges.get(challengeId) || null;
  }

  // Get moderation queue
  getModerationQueue(): { challenges: Challenge[]; submissions: ChallengeSubmission[] } {
    const pendingChallenges = Array.from(this.challenges.values())
      .filter(c => c.moderationStatus === 'pending');

    const pendingSubmissions: ChallengeSubmission[] = [];
    for (const [_, subs] of this.submissions.entries()) {
      pendingSubmissions.push(...subs.filter(s => s.status === 'pending'));
    }

    return { challenges: pendingChallenges, submissions: pendingSubmissions };
  }
}

export const challengesService = new ChallengesService();
export default challengesService;
