// ============================================================================
// QuantSync - CrossPost Service
// Cross-platform posting to QuantNeon, QuantMax, and external platforms
// ============================================================================

interface LinkedAccount {
  id: string;
  userId: string;
  platform: 'neon' | 'max' | 'twitter' | 'instagram' | 'linkedin';
  accountId: string;
  username: string;
  isActive: boolean;
  permissions: string[];
  linkedAt: Date;
  lastSyncAt: Date | null;
}

interface CrossPost {
  id: string;
  originalPostId: string;
  userId: string;
  targetPlatform: string;
  targetPostId: string | null;
  status: 'pending' | 'posted' | 'failed' | 'deleted';
  adaptedContent: string;
  postedAt: Date | null;
  error: string | null;
  analytics: CrossPostAnalytics | null;
}

interface CrossPostAnalytics {
  impressions: number;
  engagement: number;
  clicks: number;
  platform: string;
  fetchedAt: Date;
}

interface AutoPostRule {
  id: string;
  userId: string;
  fromPlatform: string;
  toPlatform: string;
  isActive: boolean;
  adaptContent: boolean;
  includeMedia: boolean;
  excludeHashtags: string[];
  addHashtags: string[];
  conditions: { minLikes?: number; hasMedia?: boolean; containsKeyword?: string };
}

export class CrossPostService {
  private linkedAccounts: Map<string, LinkedAccount> = new Map();
  private crossPosts: Map<string, CrossPost> = new Map();
  private autoPostRules: Map<string, AutoPostRule> = new Map();
  private userAccountIndex: Map<string, string[]> = new Map();
  private userCrossPostIndex: Map<string, string[]> = new Map();

  async crossPostToNeon(userId: string, postId: string, options?: { adaptContent?: boolean }): Promise<CrossPost> {
    const account = this.getUserAccount(userId, 'neon');
    if (!account) throw new Error('Neon account not linked');

    const adapted = options?.adaptContent ? this.adaptForNeon(postId) : `Crossposted from QuantSync: ${postId}`;
    return this.createCrossPost(userId, postId, 'neon', adapted);
  }

  async crossPostToMax(userId: string, postId: string, options?: { adaptContent?: boolean }): Promise<CrossPost> {
    const account = this.getUserAccount(userId, 'max');
    if (!account) throw new Error('Max account not linked');

    const adapted = options?.adaptContent ? this.adaptForMax(postId) : `Crossposted from QuantSync: ${postId}`;
    return this.createCrossPost(userId, postId, 'max', adapted);
  }

  async crossPostToAll(userId: string, postId: string): Promise<CrossPost[]> {
    const accountIds = this.userAccountIndex.get(userId) || [];
    const accounts = accountIds
      .map(id => this.linkedAccounts.get(id))
      .filter((a): a is LinkedAccount => a !== undefined && a.isActive);

    const results: CrossPost[] = [];
    for (const account of accounts) {
      try {
        const crossPost = await this.createCrossPost(userId, postId, account.platform, `Cross-post to ${account.platform}`);
        results.push(crossPost);
      } catch {
        // Continue with other platforms
      }
    }

    return results;
  }

  async syncStatus(userId: string): Promise<{ accounts: LinkedAccount[]; pendingPosts: number; lastSync: Date | null }> {
    const accountIds = this.userAccountIndex.get(userId) || [];
    const accounts = accountIds
      .map(id => this.linkedAccounts.get(id))
      .filter((a): a is LinkedAccount => a !== undefined);

    const crossPostIds = this.userCrossPostIndex.get(userId) || [];
    const pendingPosts = crossPostIds.filter(id => {
      const cp = this.crossPosts.get(id);
      return cp && cp.status === 'pending';
    }).length;

    const lastSync = accounts.reduce((latest: Date | null, a) => {
      if (!a.lastSyncAt) return latest;
      if (!latest || a.lastSyncAt > latest) return a.lastSyncAt;
      return latest;
    }, null);

    return { accounts, pendingPosts, lastSync };
  }

  async getLinkedAccounts(userId: string): Promise<LinkedAccount[]> {
    const accountIds = this.userAccountIndex.get(userId) || [];
    return accountIds
      .map(id => this.linkedAccounts.get(id))
      .filter((a): a is LinkedAccount => a !== undefined);
  }

  async linkAccount(userId: string, config: {
    platform: LinkedAccount['platform'];
    accountId: string;
    username: string;
    permissions?: string[];
  }): Promise<LinkedAccount> {
    // Check if already linked
    const existing = this.getUserAccount(userId, config.platform);
    if (existing) throw new Error(`${config.platform} account already linked`);

    const linkId = `link_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const account: LinkedAccount = {
      id: linkId,
      userId,
      platform: config.platform,
      accountId: config.accountId,
      username: config.username,
      isActive: true,
      permissions: config.permissions || ['read', 'write'],
      linkedAt: new Date(),
      lastSyncAt: null,
    };

    this.linkedAccounts.set(linkId, account);
    const userAccounts = this.userAccountIndex.get(userId) || [];
    userAccounts.push(linkId);
    this.userAccountIndex.set(userId, userAccounts);

    return account;
  }

  async unlinkAccount(userId: string, platform: string): Promise<void> {
    const accountIds = this.userAccountIndex.get(userId) || [];
    let foundId: string | null = null;

    for (const id of accountIds) {
      const account = this.linkedAccounts.get(id);
      if (account && account.platform === platform) {
        foundId = id;
        break;
      }
    }

    if (!foundId) throw new Error('Account not found');
    this.linkedAccounts.delete(foundId);
    this.userAccountIndex.set(userId, accountIds.filter(id => id !== foundId));
  }

  async getCrossPostAnalytics(userId: string, options?: { platform?: string; days?: number }): Promise<{
    totalCrossPosts: number;
    successRate: number;
    platformBreakdown: Record<string, { posts: number; impressions: number; engagement: number }>;
    recentPosts: CrossPost[];
  }> {
    const crossPostIds = this.userCrossPostIndex.get(userId) || [];
    let posts = crossPostIds
      .map(id => this.crossPosts.get(id))
      .filter((cp): cp is CrossPost => cp !== undefined);

    if (options?.platform) {
      posts = posts.filter(p => p.targetPlatform === options.platform);
    }

    if (options?.days) {
      const cutoff = new Date(Date.now() - options.days * 86400000);
      posts = posts.filter(p => p.postedAt && p.postedAt > cutoff);
    }

    const total = posts.length;
    const successful = posts.filter(p => p.status === 'posted').length;
    const successRate = total > 0 ? (successful / total) * 100 : 0;

    const platformBreakdown: Record<string, { posts: number; impressions: number; engagement: number }> = {};
    for (const post of posts) {
      if (!platformBreakdown[post.targetPlatform]) {
        platformBreakdown[post.targetPlatform] = { posts: 0, impressions: 0, engagement: 0 };
      }
      platformBreakdown[post.targetPlatform].posts++;
      if (post.analytics) {
        platformBreakdown[post.targetPlatform].impressions += post.analytics.impressions;
        platformBreakdown[post.targetPlatform].engagement += post.analytics.engagement;
      }
    }

    return {
      totalCrossPosts: total,
      successRate: Math.round(successRate),
      platformBreakdown,
      recentPosts: posts.sort((a, b) => (b.postedAt?.getTime() || 0) - (a.postedAt?.getTime() || 0)).slice(0, 10),
    };
  }

  async setAutoPost(userId: string, config: {
    fromPlatform: string;
    toPlatform: string;
    adaptContent?: boolean;
    includeMedia?: boolean;
    conditions?: AutoPostRule['conditions'];
  }): Promise<AutoPostRule> {
    const ruleId = `auto_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const rule: AutoPostRule = {
      id: ruleId,
      userId,
      fromPlatform: config.fromPlatform,
      toPlatform: config.toPlatform,
      isActive: true,
      adaptContent: config.adaptContent ?? true,
      includeMedia: config.includeMedia ?? true,
      excludeHashtags: [],
      addHashtags: [],
      conditions: config.conditions || {},
    };

    this.autoPostRules.set(ruleId, rule);
    return rule;
  }

  private createCrossPost(userId: string, postId: string, platform: string, content: string): CrossPost {
    const cpId = `cp_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const crossPost: CrossPost = {
      id: cpId,
      originalPostId: postId,
      userId,
      targetPlatform: platform,
      targetPostId: `${platform}_post_${Date.now()}`,
      status: 'posted',
      adaptedContent: content,
      postedAt: new Date(),
      error: null,
      analytics: {
        impressions: Math.floor(Math.random() * 2000),
        engagement: Math.floor(Math.random() * 100),
        clicks: Math.floor(Math.random() * 50),
        platform,
        fetchedAt: new Date(),
      },
    };

    this.crossPosts.set(cpId, crossPost);
    const userCPs = this.userCrossPostIndex.get(userId) || [];
    userCPs.push(cpId);
    this.userCrossPostIndex.set(userId, userCPs);

    return crossPost;
  }

  private getUserAccount(userId: string, platform: string): LinkedAccount | null {
    const accountIds = this.userAccountIndex.get(userId) || [];
    for (const id of accountIds) {
      const account = this.linkedAccounts.get(id);
      if (account && account.platform === platform && account.isActive) return account;
    }
    return null;
  }

  private adaptForNeon(postId: string): string {
    return `[Shared from QuantSync] Check out this post! #crosspost`;
  }

  private adaptForMax(postId: string): string {
    return `Shared via QuantSync - engaging content awaits!`;
  }
}

export const crossPostService = new CrossPostService();
