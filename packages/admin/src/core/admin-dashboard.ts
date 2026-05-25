// ============================================================================
// Admin & Operations Package - Admin Dashboard
// ============================================================================

import type {
  AdminUser,
  AdminRole,
  AdminPermission,
  RBACPolicy,
  UserProfile,
} from '../types';

/** System overview stats */
interface SystemOverview {
  totalUsers: number;
  activeToday: number;
  revenueToday: number;
  openTickets: number;
  pendingModeration: number;
  activeIncidents: number;
  systemHealth: string;
  errorRate: number;
}

/** Active user data with geo distribution */
interface ActiveUserData {
  total: number;
  byRegion: Record<string, number>;
  peakHour: number;
  trend: 'up' | 'down' | 'stable';
  percentChange: number;
}

/** Resource utilization metrics */
interface ResourceUtilization {
  service: string;
  cpu: number;
  memory: number;
  disk: number;
  network: number;
  timestamp: number;
}

/** Recent activity entry */
interface ActivityEntry {
  id: string;
  type: 'admin_action' | 'user_signup' | 'transaction' | 'incident' | 'deployment';
  description: string;
  actor: string;
  timestamp: number;
  metadata: Record<string, unknown>;
}

/** Quick action shortcut */
interface QuickAction {
  id: string;
  label: string;
  description: string;
  action: string;
  priority: number;
  requiredPermission: AdminPermission;
}

/**
 * AdminDashboard - Central administrative dashboard service
 * Provides system overview, real-time metrics, activity feeds,
 * RBAC permission checks, and contextual quick actions.
 */
export class AdminDashboard {
  private admins: Map<string, AdminUser> = new Map();
  private policies: Map<AdminRole, RBACPolicy> = new Map();
  private activityLog: ActivityEntry[] = [];
  private userProfiles: Map<string, UserProfile> = new Map();
  private resourceMetrics: Map<string, ResourceUtilization[]> = new Map();
  private activeUsers: Map<string, { region: string; lastSeen: number }> = new Map();

  constructor() {
    this.initializeDefaultPolicies();
  }

  /**
   * Initialize default RBAC policies for all admin roles
   */
  private initializeDefaultPolicies(): void {
    this.policies.set('super_admin', {
      role: 'super_admin',
      permissions: [
        'users.read', 'users.write', 'users.delete', 'users.ban', 'users.impersonate',
        'content.read', 'content.moderate', 'content.delete',
        'system.health', 'system.deploy', 'system.config',
        'flags.read', 'flags.write', 'flags.delete',
        'incidents.read', 'incidents.declare', 'incidents.resolve',
        'revenue.read', 'revenue.refund',
        'audit.read', 'audit.export',
        'tickets.read', 'tickets.assign', 'tickets.respond',
        'alerts.read', 'alerts.manage',
        'jobs.read', 'jobs.manage',
        'migrations.read', 'migrations.execute',
      ],
    });

    this.policies.set('moderator', {
      role: 'moderator',
      permissions: [
        'users.read', 'content.read', 'content.moderate', 'content.delete',
        'tickets.read', 'tickets.respond',
      ],
    });

    this.policies.set('support', {
      role: 'support',
      permissions: [
        'users.read', 'users.write',
        'tickets.read', 'tickets.assign', 'tickets.respond',
        'revenue.read',
      ],
    });

    this.policies.set('analyst', {
      role: 'analyst',
      permissions: [
        'users.read', 'revenue.read', 'audit.read',
        'system.health', 'flags.read', 'alerts.read',
      ],
    });

    this.policies.set('engineer', {
      role: 'engineer',
      permissions: [
        'system.health', 'system.deploy', 'system.config',
        'flags.read', 'flags.write',
        'incidents.read', 'incidents.declare', 'incidents.resolve',
        'jobs.read', 'jobs.manage',
        'migrations.read', 'migrations.execute',
        'alerts.read', 'alerts.manage',
      ],
    });

    this.policies.set('billing_admin', {
      role: 'billing_admin',
      permissions: [
        'users.read', 'revenue.read', 'revenue.refund',
        'tickets.read', 'tickets.respond',
      ],
    });
  }

  /**
   * Register an admin user
   */
  public registerAdmin(admin: AdminUser): void {
    this.admins.set(admin.id, admin);
  }

  /**
   * Get system overview with key operational metrics
   */
  public getOverview(): SystemOverview {
    const now = Date.now();
    const todayStart = now - (now % 86400000);

    let activeToday = 0;
    for (const [, user] of this.activeUsers) {
      if (user.lastSeen >= todayStart) {
        activeToday++;
      }
    }

    const revenueToday = this.calculateRevenueToday(todayStart);
    const openTickets = this.countOpenTickets();
    const pendingModeration = this.countPendingModeration();
    const errorRate = this.calculateCurrentErrorRate();

    return {
      totalUsers: this.userProfiles.size,
      activeToday,
      revenueToday,
      openTickets,
      pendingModeration,
      activeIncidents: 0,
      systemHealth: errorRate < 0.01 ? 'healthy' : errorRate < 0.05 ? 'degraded' : 'unhealthy',
      errorRate,
    };
  }

  /**
   * Get real-time active user count with geographic distribution
   */
  public getActiveUsers(): ActiveUserData {
    const now = Date.now();
    const fiveMinutesAgo = now - 300000;
    const tenMinutesAgo = now - 600000;

    const byRegion: Record<string, number> = {};
    let currentActive = 0;
    let previousActive = 0;

    for (const [, user] of this.activeUsers) {
      if (user.lastSeen >= fiveMinutesAgo) {
        currentActive++;
        byRegion[user.region] = (byRegion[user.region] || 0) + 1;
      }
      if (user.lastSeen >= tenMinutesAgo && user.lastSeen < fiveMinutesAgo) {
        previousActive++;
      }
    }

    const percentChange = previousActive > 0
      ? ((currentActive - previousActive) / previousActive) * 100
      : 0;

    let trend: 'up' | 'down' | 'stable' = 'stable';
    if (percentChange > 5) trend = 'up';
    else if (percentChange < -5) trend = 'down';

    return {
      total: currentActive,
      byRegion,
      peakHour: this.calculatePeakHour(),
      trend,
      percentChange: Math.round(percentChange * 100) / 100,
    };
  }

  /**
   * Get resource utilization across all services
   */
  public getResourceUtilization(): ResourceUtilization[] {
    const latest: ResourceUtilization[] = [];

    for (const [service, metrics] of this.resourceMetrics) {
      if (metrics.length > 0) {
        latest.push(metrics[metrics.length - 1]);
      } else {
        latest.push({
          service,
          cpu: 0,
          memory: 0,
          disk: 0,
          network: 0,
          timestamp: Date.now(),
        });
      }
    }

    return latest;
  }

  /**
   * Record resource metrics for a service
   */
  public recordResourceMetrics(service: string, cpu: number, memory: number, disk: number, network: number): void {
    if (!this.resourceMetrics.has(service)) {
      this.resourceMetrics.set(service, []);
    }

    const metrics = this.resourceMetrics.get(service)!;
    metrics.push({ service, cpu, memory, disk, network, timestamp: Date.now() });

    // Keep last 1000 entries per service
    if (metrics.length > 1000) {
      metrics.splice(0, metrics.length - 1000);
    }
  }

  /**
   * Get recent activity feed with admin actions, signups, transactions
   */
  public getRecentActivity(limit: number = 50): ActivityEntry[] {
    return this.activityLog
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  /**
   * Log an activity entry
   */
  public logActivity(entry: Omit<ActivityEntry, 'id'>): void {
    const id = `act_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.activityLog.push({ ...entry, id });

    // Keep last 10000 entries
    if (this.activityLog.length > 10000) {
      this.activityLog.splice(0, this.activityLog.length - 10000);
    }
  }

  /**
   * Track active user
   */
  public trackActiveUser(userId: string, region: string): void {
    this.activeUsers.set(userId, { region, lastSeen: Date.now() });
  }

  /**
   * Get contextual quick actions based on current system state
   */
  public getQuickActions(adminId: string): QuickAction[] {
    const admin = this.admins.get(adminId);
    if (!admin) return [];

    const actions: QuickAction[] = [];
    const overview = this.getOverview();

    if (overview.pendingModeration > 100 && this.hasPermission(admin.role, 'content.moderate')) {
      actions.push({
        id: 'clear_mod_queue',
        label: 'Review Moderation Queue',
        description: `${overview.pendingModeration} items pending review`,
        action: 'navigate:moderation',
        priority: 1,
        requiredPermission: 'content.moderate',
      });
    }

    if (overview.errorRate > 0.05 && this.hasPermission(admin.role, 'incidents.declare')) {
      actions.push({
        id: 'declare_incident',
        label: 'Declare Incident',
        description: `Error rate at ${(overview.errorRate * 100).toFixed(1)}%`,
        action: 'modal:declare_incident',
        priority: 0,
        requiredPermission: 'incidents.declare',
      });
    }

    if (overview.openTickets > 50 && this.hasPermission(admin.role, 'tickets.assign')) {
      actions.push({
        id: 'assign_tickets',
        label: 'Assign Open Tickets',
        description: `${overview.openTickets} tickets awaiting assignment`,
        action: 'navigate:tickets',
        priority: 2,
        requiredPermission: 'tickets.assign',
      });
    }

    if (this.hasPermission(admin.role, 'system.deploy')) {
      actions.push({
        id: 'view_deployments',
        label: 'Recent Deployments',
        description: 'View deployment status and history',
        action: 'navigate:deployments',
        priority: 3,
        requiredPermission: 'system.deploy',
      });
    }

    return actions.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Check if an admin role has a specific permission (RBAC)
   */
  public checkPermission(adminId: string, permission: AdminPermission): boolean {
    const admin = this.admins.get(adminId);
    if (!admin) return false;
    return this.hasPermission(admin.role, permission);
  }

  /**
   * Check if a role has a permission via policy
   */
  private hasPermission(role: AdminRole, permission: AdminPermission): boolean {
    const policy = this.policies.get(role);
    if (!policy) return false;

    if (policy.permissions.includes(permission)) return true;

    // Check inherited roles
    if (policy.inherits) {
      for (const inheritedRole of policy.inherits) {
        if (this.hasPermission(inheritedRole, permission)) return true;
      }
    }

    return false;
  }

  /**
   * Calculate revenue for today (simplified)
   */
  private calculateRevenueToday(todayStart: number): number {
    let revenue = 0;
    for (const entry of this.activityLog) {
      if (entry.type === 'transaction' && entry.timestamp >= todayStart) {
        revenue += (entry.metadata.amount as number) || 0;
      }
    }
    return revenue;
  }

  /**
   * Count open tickets from activity log
   */
  private countOpenTickets(): number {
    return this.activityLog.filter(
      e => e.type === 'admin_action' && e.metadata.category === 'ticket_open'
    ).length;
  }

  /**
   * Count pending moderation items
   */
  private countPendingModeration(): number {
    return this.activityLog.filter(
      e => e.type === 'admin_action' && e.metadata.category === 'moderation_pending'
    ).length;
  }

  /**
   * Calculate current error rate
   */
  private calculateCurrentErrorRate(): number {
    const recentMetrics = Array.from(this.resourceMetrics.values())
      .flat()
      .filter(m => m.timestamp > Date.now() - 300000);

    if (recentMetrics.length === 0) return 0;

    const avgCpu = recentMetrics.reduce((sum, m) => sum + m.cpu, 0) / recentMetrics.length;
    return avgCpu > 90 ? 0.1 : avgCpu > 70 ? 0.03 : 0.005;
  }

  /**
   * Calculate peak activity hour (0-23)
   */
  private calculatePeakHour(): number {
    const hourCounts: number[] = new Array(24).fill(0);

    for (const entry of this.activityLog) {
      const hour = new Date(entry.timestamp).getHours();
      hourCounts[hour]++;
    }

    let peakHour = 0;
    let maxCount = 0;
    for (let i = 0; i < 24; i++) {
      if (hourCounts[i] > maxCount) {
        maxCount = hourCounts[i];
        peakHour = i;
      }
    }

    return peakHour;
  }
}
