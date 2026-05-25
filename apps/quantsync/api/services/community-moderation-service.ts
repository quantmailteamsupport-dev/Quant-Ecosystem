// ============================================================================
// QuantSync - Community Moderation Service
// Auto-moderation rules, banned words, role management, mod actions
// ============================================================================

interface AutoModConfig {
  id: string;
  communityId: string;
  rules: AutoModRule[];
  bannedWords: string[];
  bannedPatterns: string[];
  spamThreshold: number;
  linkFilter: boolean;
  mediaFilter: boolean;
  isActive: boolean;
  updatedAt: Date;
}

interface AutoModRule {
  id: string;
  name: string;
  type: 'word_filter' | 'spam_detection' | 'link_filter' | 'rate_limit' | 'new_account';
  config: Record<string, any>;
  action: 'warn' | 'mute' | 'delete' | 'ban' | 'flag';
  isActive: boolean;
}

interface ModAction {
  id: string;
  communityId: string;
  moderatorId: string;
  targetUserId: string;
  action: 'warn' | 'mute' | 'ban' | 'unban' | 'delete_post' | 'pin' | 'lock';
  reason: string;
  duration: number | null;
  postId: string | null;
  createdAt: Date;
  expiresAt: Date | null;
}

interface CommunityRole {
  id: string;
  communityId: string;
  name: string;
  color: string;
  permissions: string[];
  position: number;
  memberCount: number;
  createdAt: Date;
}

interface MemberRole {
  userId: string;
  roleId: string;
  assignedAt: Date;
  assignedBy: string;
}

export class CommunityMod {
  private autoModConfigs: Map<string, AutoModConfig> = new Map();
  private modActions: Map<string, ModAction[]> = new Map();
  private roles: Map<string, CommunityRole> = new Map();
  private memberRoles: Map<string, MemberRole[]> = new Map();
  private mutedUsers: Map<string, { userId: string; until: Date; reason: string }[]> = new Map();
  private bannedUsers: Map<string, Set<string>> = new Map();

  async setAutoMod(communityId: string, rules: Omit<AutoModRule, 'id'>[]): Promise<AutoModConfig> {
    let config = this.autoModConfigs.get(communityId);
    if (!config) {
      config = {
        id: `am_${communityId}`,
        communityId,
        rules: [],
        bannedWords: [],
        bannedPatterns: [],
        spamThreshold: 5,
        linkFilter: false,
        mediaFilter: false,
        isActive: true,
        updatedAt: new Date(),
      };
    }

    config.rules = rules.map((rule, idx) => ({
      ...rule,
      id: `rule_${idx}_${Date.now()}`,
    }));
    config.updatedAt = new Date();

    this.autoModConfigs.set(communityId, config);
    return config;
  }

  async addBannedWords(communityId: string, words: string[]): Promise<{ added: number; total: number }> {
    let config = this.autoModConfigs.get(communityId);
    if (!config) {
      config = this.createDefaultConfig(communityId);
    }

    const normalizedWords = words.map(w => w.toLowerCase().trim()).filter(w => w.length > 0);
    const existingSet = new Set(config.bannedWords);
    let added = 0;

    for (const word of normalizedWords) {
      if (!existingSet.has(word)) {
        config.bannedWords.push(word);
        existingSet.add(word);
        added++;
      }
    }

    config.updatedAt = new Date();
    this.autoModConfigs.set(communityId, config);

    return { added, total: config.bannedWords.length };
  }

  async removeBannedWords(communityId: string, words: string[]): Promise<{ removed: number; total: number }> {
    const config = this.autoModConfigs.get(communityId);
    if (!config) throw new Error('AutoMod not configured');

    const removeSet = new Set(words.map(w => w.toLowerCase().trim()));
    const before = config.bannedWords.length;
    config.bannedWords = config.bannedWords.filter(w => !removeSet.has(w));
    const removed = before - config.bannedWords.length;
    config.updatedAt = new Date();

    return { removed, total: config.bannedWords.length };
  }

  async checkContent(communityId: string, content: string, userId: string): Promise<{ allowed: boolean; violations: string[]; action: string | null }> {
    const config = this.autoModConfigs.get(communityId);
    if (!config || !config.isActive) return { allowed: true, violations: [], action: null };

    const violations: string[] = [];
    const contentLower = content.toLowerCase();

    // Check banned words
    for (const word of config.bannedWords) {
      if (contentLower.includes(word)) {
        violations.push(`Banned word: "${word}"`);
      }
    }

    // Check banned patterns
    for (const pattern of config.bannedPatterns) {
      try {
        if (new RegExp(pattern, 'i').test(content)) {
          violations.push(`Pattern match: ${pattern}`);
        }
      } catch { /* invalid regex */ }
    }

    // Check link filter
    if (config.linkFilter && /https?:\/\//.test(content)) {
      violations.push('Links not allowed');
    }

    if (violations.length === 0) return { allowed: true, violations: [], action: null };

    const action = violations.length >= 3 ? 'mute' : 'delete';
    return { allowed: false, violations, action };
  }

  async assignRole(communityId: string, userId: string, roleId: string, assignedBy: string): Promise<MemberRole> {
    const role = this.roles.get(roleId);
    if (!role) throw new Error('Role not found');
    if (role.communityId !== communityId) throw new Error('Role not in this community');

    const key = `${communityId}:${userId}`;
    const userRoles = this.memberRoles.get(key) || [];

    if (userRoles.find(r => r.roleId === roleId)) {
      throw new Error('User already has this role');
    }

    const memberRole: MemberRole = { userId, roleId, assignedAt: new Date(), assignedBy };
    userRoles.push(memberRole);
    this.memberRoles.set(key, userRoles);
    role.memberCount++;

    return memberRole;
  }

  async removeRole(communityId: string, userId: string, roleId: string): Promise<void> {
    const key = `${communityId}:${userId}`;
    const userRoles = this.memberRoles.get(key) || [];
    const before = userRoles.length;
    const filtered = userRoles.filter(r => r.roleId !== roleId);

    if (filtered.length === before) throw new Error('User does not have this role');

    this.memberRoles.set(key, filtered);
    const role = this.roles.get(roleId);
    if (role) role.memberCount = Math.max(0, role.memberCount - 1);
  }

  async createRole(communityId: string, config: { name: string; color: string; permissions: string[] }): Promise<CommunityRole> {
    if (!config.name || config.name.trim().length === 0) throw new Error('Role name required');

    const roleId = `role_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const existingRoles = Array.from(this.roles.values()).filter(r => r.communityId === communityId);
    if (existingRoles.length >= 25) throw new Error('Maximum 25 roles per community');

    const role: CommunityRole = {
      id: roleId,
      communityId,
      name: config.name.trim(),
      color: config.color || '#808080',
      permissions: config.permissions,
      position: existingRoles.length + 1,
      memberCount: 0,
      createdAt: new Date(),
    };

    this.roles.set(roleId, role);
    return role;
  }

  async createModAction(communityId: string, moderatorId: string, config: {
    targetUserId: string;
    action: ModAction['action'];
    reason: string;
    duration?: number;
    postId?: string;
  }): Promise<ModAction> {
    const actionId = `mod_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const expiresAt = config.duration ? new Date(Date.now() + config.duration * 60000) : null;

    const modAction: ModAction = {
      id: actionId,
      communityId,
      moderatorId,
      targetUserId: config.targetUserId,
      action: config.action,
      reason: config.reason,
      duration: config.duration || null,
      postId: config.postId || null,
      createdAt: new Date(),
      expiresAt,
    };

    const actions = this.modActions.get(communityId) || [];
    actions.push(modAction);
    this.modActions.set(communityId, actions);

    // Execute action
    if (config.action === 'ban') {
      const banned = this.bannedUsers.get(communityId) || new Set();
      banned.add(config.targetUserId);
      this.bannedUsers.set(communityId, banned);
    } else if (config.action === 'mute') {
      const muted = this.mutedUsers.get(communityId) || [];
      muted.push({
        userId: config.targetUserId,
        until: expiresAt || new Date(Date.now() + 3600000),
        reason: config.reason,
      });
      this.mutedUsers.set(communityId, muted);
    }

    return modAction;
  }

  async getModLog(communityId: string, options?: { limit?: number; action?: string }): Promise<ModAction[]> {
    let actions = this.modActions.get(communityId) || [];
    if (options?.action) actions = actions.filter(a => a.action === options.action);
    return actions
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, options?.limit || 50);
  }

  async muteUser(communityId: string, moderatorId: string, userId: string, durationMinutes: number, reason: string): Promise<ModAction> {
    return this.createModAction(communityId, moderatorId, {
      targetUserId: userId,
      action: 'mute',
      reason,
      duration: durationMinutes,
    });
  }

  async banUser(communityId: string, moderatorId: string, userId: string, reason: string): Promise<ModAction> {
    return this.createModAction(communityId, moderatorId, {
      targetUserId: userId,
      action: 'ban',
      reason,
    });
  }

  private createDefaultConfig(communityId: string): AutoModConfig {
    const config: AutoModConfig = {
      id: `am_${communityId}`,
      communityId,
      rules: [],
      bannedWords: [],
      bannedPatterns: [],
      spamThreshold: 5,
      linkFilter: false,
      mediaFilter: false,
      isActive: true,
      updatedAt: new Date(),
    };
    this.autoModConfigs.set(communityId, config);
    return config;
  }
}

export const communityMod = new CommunityMod();
