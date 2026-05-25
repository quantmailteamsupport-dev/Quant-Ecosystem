// ============================================================================
// Admin & Operations Package - User Management
// ============================================================================

import type {
  UserSearchQuery,
  UserSearchResult,
  UserProfile,
  UserAction,
  UserActionType,
  BanConfig,
  SuspensionConfig,
  ImpersonationSession,
  UserStatus,
} from '../types';

/** Bulk action configuration */
interface BulkActionConfig {
  userIds: string[];
  action: UserActionType;
  reason: string;
  performedBy: string;
  options?: Record<string, unknown>;
}

/** Bulk action result */
interface BulkActionResult {
  successful: string[];
  failed: Array<{ userId: string; error: string }>;
  total: number;
}

/** GDPR export data */
interface GDPRExport {
  userId: string;
  profile: UserProfile;
  actions: UserAction[];
  exportedAt: number;
  format: 'json';
}

/**
 * UserManagement - Comprehensive user administration service
 * Provides search, profile management, account actions (suspend/ban/verify),
 * impersonation with audit trails, bulk operations, and GDPR exports.
 */
export class UserManagement {
  private users: Map<string, UserProfile> = new Map();
  private actions: UserAction[] = [];
  private sessions: Map<string, ImpersonationSession> = new Map();
  private suspensions: Map<string, { expiresAt: number; config: SuspensionConfig }> = new Map();
  private bans: Map<string, BanConfig> = new Map();
  private ipTracker: Map<string, Set<string>> = new Map();

  /**
   * Add a user to the management system
   */
  public addUser(user: UserProfile): void {
    this.users.set(user.id, user);
  }

  /**
   * Full-text search with advanced filters
   */
  public searchUsers(query: UserSearchQuery): UserSearchResult {
    let results = Array.from(this.users.values());

    // Text search across name and email
    if (query.text) {
      const searchLower = query.text.toLowerCase();
      results = results.filter(user =>
        user.name.toLowerCase().includes(searchLower) ||
        user.email.toLowerCase().includes(searchLower) ||
        user.id.toLowerCase().includes(searchLower)
      );
    }

    // Status filter
    if (query.status) {
      results = results.filter(user => user.status === query.status);
    }

    // Plan filter
    if (query.plan) {
      results = results.filter(user => user.plan === query.plan);
    }

    // Country filter
    if (query.country) {
      results = results.filter(user => user.country === query.country);
    }

    // Date range filter
    if (query.dateFrom) {
      results = results.filter(user => user.createdAt >= query.dateFrom!);
    }
    if (query.dateTo) {
      results = results.filter(user => user.createdAt <= query.dateTo!);
    }

    // Risk score filter
    if (query.riskScoreMin !== undefined) {
      results = results.filter(user => user.riskScore >= query.riskScoreMin!);
    }
    if (query.riskScoreMax !== undefined) {
      results = results.filter(user => user.riskScore <= query.riskScoreMax!);
    }

    // Sort
    results.sort((a, b) => {
      const aVal = (a as Record<string, unknown>)[query.sortBy];
      const bVal = (b as Record<string, unknown>)[query.sortBy];
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return query.sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return query.sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
      }
      return 0;
    });

    // Pagination
    const total = results.length;
    const start = (query.page - 1) * query.pageSize;
    const paged = results.slice(start, start + query.pageSize);

    return {
      users: paged,
      total,
      page: query.page,
      pageSize: query.pageSize,
      hasMore: start + query.pageSize < total,
    };
  }

  /**
   * Get comprehensive user profile with activity summary
   */
  public getUserProfile(userId: string): UserProfile | null {
    const user = this.users.get(userId);
    if (!user) return null;

    // Check if suspension has expired
    const suspension = this.suspensions.get(userId);
    if (suspension && suspension.expiresAt <= Date.now() && user.status === 'suspended') {
      user.status = 'active';
      this.suspensions.delete(userId);
      this.recordAction(userId, 'unsuspend', 'system', 'Suspension expired');
    }

    return { ...user };
  }

  /**
   * Edit user profile fields with audit trail
   */
  public editUser(userId: string, updates: Partial<UserProfile>, performedBy: string): UserProfile | null {
    const user = this.users.get(userId);
    if (!user) return null;

    const allowedFields: Array<keyof UserProfile> = ['name', 'email', 'plan', 'country', 'metadata'];
    const appliedUpdates: Record<string, unknown> = {};

    for (const field of allowedFields) {
      if (field in updates) {
        appliedUpdates[field] = (updates as Record<string, unknown>)[field];
        (user as Record<string, unknown>)[field] = (updates as Record<string, unknown>)[field];
      }
    }

    this.recordAction(userId, 'edit_profile', performedBy, 'Profile updated', { updates: appliedUpdates });
    this.users.set(userId, user);
    return { ...user };
  }

  /**
   * Suspend a user temporarily
   */
  public suspendUser(config: SuspensionConfig): UserAction {
    const user = this.users.get(config.userId);
    if (!user) {
      throw new Error(`User '${config.userId}' not found`);
    }

    if (user.status === 'banned') {
      throw new Error(`Cannot suspend banned user '${config.userId}'`);
    }

    user.status = 'suspended';
    this.users.set(config.userId, user);

    const expiresAt = Date.now() + config.duration;
    this.suspensions.set(config.userId, { expiresAt, config });

    return this.recordAction(
      config.userId,
      'suspend',
      config.suspendedBy,
      config.reason,
      { duration: config.duration, notifyUser: config.notifyUser, expiresAt }
    );
  }

  /**
   * Permanently ban a user
   */
  public banUser(config: BanConfig): UserAction {
    const user = this.users.get(config.userId);
    if (!user) {
      throw new Error(`User '${config.userId}' not found`);
    }

    user.status = 'banned';
    this.users.set(config.userId, user);
    this.bans.set(config.userId, config);

    // Track IP if configured
    if (config.trackIP) {
      const ips = this.ipTracker.get(config.userId) || new Set();
      this.ipTracker.set(config.userId, ips);
    }

    return this.recordAction(
      config.userId,
      'ban',
      config.bannedBy,
      config.reason,
      { trackIP: config.trackIP, removeContent: config.removeContent, notifyUser: config.notifyUser }
    );
  }

  /**
   * Unban a user
   */
  public unbanUser(userId: string, performedBy: string, reason: string): UserAction {
    const user = this.users.get(userId);
    if (!user) {
      throw new Error(`User '${userId}' not found`);
    }

    user.status = 'active';
    this.users.set(userId, user);
    this.bans.delete(userId);

    return this.recordAction(userId, 'unban', performedBy, reason);
  }

  /**
   * Verify user (email, phone, or identity)
   */
  public verifyUser(userId: string, verificationType: 'email' | 'phone' | 'identity', performedBy: string): UserAction {
    const user = this.users.get(userId);
    if (!user) {
      throw new Error(`User '${userId}' not found`);
    }

    switch (verificationType) {
      case 'email':
        user.emailVerified = true;
        break;
      case 'phone':
        user.phoneVerified = true;
        break;
      case 'identity':
        user.identityVerified = true;
        break;
    }

    this.users.set(userId, user);

    const actionType: UserActionType = `verify_${verificationType}` as UserActionType;
    return this.recordAction(userId, actionType, performedBy, `${verificationType} verified`);
  }

  /**
   * Start impersonation session with time limit and audit logging
   */
  public impersonateUser(adminId: string, targetUserId: string, durationMs: number = 3600000): ImpersonationSession {
    const user = this.users.get(targetUserId);
    if (!user) {
      throw new Error(`User '${targetUserId}' not found`);
    }

    if (user.status === 'banned') {
      throw new Error(`Cannot impersonate banned user '${targetUserId}'`);
    }

    // Check for existing active session
    for (const [, session] of this.sessions) {
      if (session.adminId === adminId && session.expiresAt > Date.now()) {
        throw new Error(`Admin '${adminId}' already has an active impersonation session`);
      }
    }

    const session: ImpersonationSession = {
      id: `imp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      adminId,
      targetUserId,
      startedAt: Date.now(),
      expiresAt: Date.now() + durationMs,
      restrictedActions: ['delete_account', 'change_password', 'change_email', 'manage_billing'],
      auditLog: [`Session started by ${adminId} at ${new Date().toISOString()}`],
    };

    this.sessions.set(session.id, session);
    this.recordAction(targetUserId, 'impersonate_start', adminId, 'Impersonation session started', {
      sessionId: session.id,
      duration: durationMs,
    });

    return session;
  }

  /**
   * End impersonation session
   */
  public endImpersonation(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session '${sessionId}' not found`);
    }

    session.auditLog.push(`Session ended at ${new Date().toISOString()}`);
    this.sessions.delete(sessionId);
    this.recordAction(session.targetUserId, 'impersonate_end', session.adminId, 'Impersonation session ended', {
      sessionId,
      duration: Date.now() - session.startedAt,
    });
  }

  /**
   * Perform action on multiple users with confirmation
   */
  public bulkAction(config: BulkActionConfig): BulkActionResult {
    const result: BulkActionResult = {
      successful: [],
      failed: [],
      total: config.userIds.length,
    };

    for (const userId of config.userIds) {
      try {
        switch (config.action) {
          case 'suspend':
            this.suspendUser({
              userId,
              reason: config.reason,
              duration: (config.options?.duration as number) || 86400000,
              notifyUser: true,
              suspendedBy: config.performedBy,
            });
            break;
          case 'ban':
            this.banUser({
              userId,
              reason: config.reason,
              trackIP: false,
              removeContent: false,
              notifyUser: true,
              bannedBy: config.performedBy,
            });
            break;
          case 'verify_email':
            this.verifyUser(userId, 'email', config.performedBy);
            break;
          case 'force_logout':
            this.recordAction(userId, 'force_logout', config.performedBy, config.reason);
            break;
          default:
            this.recordAction(userId, config.action, config.performedBy, config.reason);
        }
        result.successful.push(userId);
      } catch (error) {
        result.failed.push({
          userId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return result;
  }

  /**
   * Export user data for GDPR compliance
   */
  public exportUserData(userId: string, requestedBy: string): GDPRExport {
    const user = this.users.get(userId);
    if (!user) {
      throw new Error(`User '${userId}' not found`);
    }

    const userActions = this.actions.filter(a => a.userId === userId);

    this.recordAction(userId, 'export_data', requestedBy, 'GDPR data export requested');

    return {
      userId,
      profile: { ...user },
      actions: [...userActions],
      exportedAt: Date.now(),
      format: 'json',
    };
  }

  /**
   * Get all actions for a user
   */
  public getUserActions(userId: string): UserAction[] {
    return this.actions.filter(a => a.userId === userId);
  }

  /**
   * Record a user action in the audit log
   */
  private recordAction(
    userId: string,
    type: UserActionType,
    performedBy: string,
    reason: string,
    metadata: Record<string, unknown> = {}
  ): UserAction {
    const action: UserAction = {
      id: `ua_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      type,
      performedBy,
      reason,
      metadata,
      timestamp: Date.now(),
    };

    this.actions.push(action);
    return action;
  }
}
