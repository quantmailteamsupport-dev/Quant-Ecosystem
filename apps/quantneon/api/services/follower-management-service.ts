// ============================================================================
// QuantNeon - Follower Management Service
// Follower removal, restrictions, blocking, activity status, growth tracking
// ============================================================================

interface FollowerRelation {
  userId: string;
  followerId: string;
  status: 'active' | 'removed' | 'restricted' | 'blocked';
  followedAt: string;
  removedAt?: string;
  restrictedAt?: string;
  blockedAt?: string;
}

interface BlockedUser {
  userId: string;
  blockedUserId: string;
  reason?: string;
  blockedAt: string;
}

interface ActivityStatus {
  userId: string;
  isOnline: boolean;
  lastActive: string;
  activityText: string;
  showStatus: boolean;
}

interface FollowerGrowth {
  userId: string;
  period: string;
  dataPoints: { date: string; followers: number; gained: number; lost: number }[];
  totalGrowth: number;
  growthRate: number;
  avgDailyGain: number;
  projectedMonthly: number;
}

interface MutualFollower {
  userId: string;
  username: string;
  followingSince: string;
  mutualSince: string;
  interactionScore: number;
}

interface UserRestriction {
  userId: string;
  restrictedUserId: string;
  hideComments: boolean;
  hideMessages: boolean;
  hideStoryViews: boolean;
  restrictedAt: string;
}

class FollowerManagementService {
  private relations: Map<string, FollowerRelation> = new Map();
  private blockedUsers: Map<string, BlockedUser[]> = new Map();
  private restrictions: Map<string, UserRestriction[]> = new Map();
  private activityStatuses: Map<string, ActivityStatus> = new Map();
  private vanishMode: Map<string, boolean> = new Map();
  private followerCounts: Map<string, number> = new Map();
  private counter: number = 0;

  private genKey(userId: string, followerId: string): string {
    return `${userId}:${followerId}`;
  }

  async removeFollower(userId: string, followerId: string): Promise<{ removed: boolean; relation: FollowerRelation }> {
    const key = this.genKey(userId, followerId);
    const relation = this.relations.get(key);

    if (!relation) {
      const newRelation: FollowerRelation = {
        userId, followerId, status: 'removed',
        followedAt: new Date(Date.now() - Math.random() * 365 * 86400000).toISOString(),
        removedAt: new Date().toISOString(),
      };
      this.relations.set(key, newRelation);
      this.decrementFollowers(userId);
      return { removed: true, relation: newRelation };
    }

    if (relation.status === 'removed') throw new Error('Follower already removed');
    relation.status = 'removed';
    relation.removedAt = new Date().toISOString();
    this.decrementFollowers(userId);
    return { removed: true, relation };
  }

  async restrictUser(userId: string, targetUserId: string, options?: { hideComments?: boolean; hideMessages?: boolean; hideStoryViews?: boolean }): Promise<UserRestriction> {
    const restriction: UserRestriction = {
      userId,
      restrictedUserId: targetUserId,
      hideComments: options?.hideComments ?? true,
      hideMessages: options?.hideMessages ?? true,
      hideStoryViews: options?.hideStoryViews ?? true,
      restrictedAt: new Date().toISOString(),
    };

    const userRestrictions = this.restrictions.get(userId) || [];
    const existingIdx = userRestrictions.findIndex(r => r.restrictedUserId === targetUserId);
    if (existingIdx >= 0) userRestrictions[existingIdx] = restriction;
    else userRestrictions.push(restriction);
    this.restrictions.set(userId, userRestrictions);

    const key = this.genKey(userId, targetUserId);
    const relation = this.relations.get(key);
    if (relation) relation.status = 'restricted';

    return restriction;
  }

  async blockUser(userId: string, targetUserId: string, reason?: string): Promise<BlockedUser> {
    if (userId === targetUserId) throw new Error('Cannot block yourself');

    const blocked: BlockedUser = {
      userId,
      blockedUserId: targetUserId,
      reason,
      blockedAt: new Date().toISOString(),
    };

    const userBlocked = this.blockedUsers.get(userId) || [];
    if (userBlocked.find(b => b.blockedUserId === targetUserId)) throw new Error('User already blocked');
    userBlocked.push(blocked);
    this.blockedUsers.set(userId, userBlocked);

    // Remove follow relationship both ways
    const key1 = this.genKey(userId, targetUserId);
    const key2 = this.genKey(targetUserId, userId);
    const rel1 = this.relations.get(key1);
    const rel2 = this.relations.get(key2);
    if (rel1) { rel1.status = 'blocked'; rel1.blockedAt = new Date().toISOString(); }
    if (rel2) { rel2.status = 'blocked'; rel2.blockedAt = new Date().toISOString(); }

    return blocked;
  }

  async unblockUser(userId: string, targetUserId: string): Promise<boolean> {
    const userBlocked = this.blockedUsers.get(userId) || [];
    const idx = userBlocked.findIndex(b => b.blockedUserId === targetUserId);
    if (idx === -1) throw new Error('User is not blocked');
    userBlocked.splice(idx, 1);
    this.blockedUsers.set(userId, userBlocked);
    return true;
  }

  async getBlockedList(userId: string): Promise<BlockedUser[]> {
    return this.blockedUsers.get(userId) || [];
  }

  async getActivityStatus(userId: string): Promise<ActivityStatus> {
    const existing = this.activityStatuses.get(userId);
    if (existing) return existing;

    const minutesAgo = Math.floor(Math.random() * 1440);
    const isOnline = minutesAgo < 5;
    let activityText = 'Active now';
    if (!isOnline) {
      if (minutesAgo < 60) activityText = `Active ${minutesAgo}m ago`;
      else if (minutesAgo < 1440) activityText = `Active ${Math.floor(minutesAgo / 60)}h ago`;
      else activityText = 'Active yesterday';
    }

    const status: ActivityStatus = {
      userId,
      isOnline,
      lastActive: new Date(Date.now() - minutesAgo * 60000).toISOString(),
      activityText,
      showStatus: true,
    };

    this.activityStatuses.set(userId, status);
    return status;
  }

  async setVanishMode(userId: string, targetUserId: string, enabled: boolean): Promise<{ enabled: boolean; userId: string; targetUserId: string }> {
    const key = `${userId}:${targetUserId}`;
    this.vanishMode.set(key, enabled);
    return { enabled, userId, targetUserId };
  }

  async getFollowerGrowth(userId: string, period: string = '30d'): Promise<FollowerGrowth> {
    const days = period === '7d' ? 7 : period === '90d' ? 90 : 30;
    const baseFollowers = this.followerCounts.get(userId) || (1000 + Math.floor(Math.random() * 50000));
    let currentFollowers = baseFollowers;
    const dataPoints: { date: string; followers: number; gained: number; lost: number }[] = [];

    for (let i = days - 1; i >= 0; i--) {
      const gained = Math.floor(10 + Math.random() * 100);
      const lost = Math.floor(2 + Math.random() * 30);
      currentFollowers += gained - lost;
      dataPoints.push({
        date: new Date(Date.now() - i * 86400000).toISOString().split('T')[0],
        followers: currentFollowers,
        gained,
        lost,
      });
    }

    const totalGrowth = currentFollowers - baseFollowers;
    const growthRate = baseFollowers > 0 ? (totalGrowth / baseFollowers) * 100 : 0;
    const avgDailyGain = totalGrowth / days;

    this.followerCounts.set(userId, currentFollowers);

    return {
      userId, period, dataPoints, totalGrowth,
      growthRate: Math.round(growthRate * 100) / 100,
      avgDailyGain: Math.round(avgDailyGain * 100) / 100,
      projectedMonthly: Math.round(avgDailyGain * 30),
    };
  }

  async getUnfollowers(userId: string, since?: string): Promise<{ userId: string; unfollowedAt: string }[]> {
    const removed = Array.from(this.relations.values())
      .filter(r => r.userId === userId && r.status === 'removed' && r.removedAt);

    if (since) {
      const sinceTime = new Date(since).getTime();
      return removed.filter(r => new Date(r.removedAt!).getTime() >= sinceTime)
        .map(r => ({ userId: r.followerId, unfollowedAt: r.removedAt! }));
    }

    return removed.map(r => ({ userId: r.followerId, unfollowedAt: r.removedAt! }));
  }

  async getMutuals(userId: string): Promise<MutualFollower[]> {
    const following = Array.from(this.relations.values()).filter(r => r.followerId === userId && r.status === 'active');
    const followers = Array.from(this.relations.values()).filter(r => r.userId === userId && r.status === 'active');

    const followerIds = new Set(followers.map(f => f.followerId));
    const mutuals = following.filter(f => followerIds.has(f.userId));

    return mutuals.map(m => ({
      userId: m.userId,
      username: `user_${m.userId.substring(0, 8)}`,
      followingSince: m.followedAt,
      mutualSince: m.followedAt,
      interactionScore: Math.round(Math.random() * 100),
    }));
  }

  private decrementFollowers(userId: string): void {
    const current = this.followerCounts.get(userId) || 0;
    this.followerCounts.set(userId, Math.max(0, current - 1));
  }
}

export const followerManagementService = new FollowerManagementService();
export { FollowerManagementService };
