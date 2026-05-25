// ============================================================================
// QuantChat - Status Service
// Ephemeral status/story creation, viewing, privacy, expiration
// ============================================================================

interface Status {
  id: string;
  userId: string;
  type: 'text' | 'image' | 'video';
  content: string;
  mediaUrl: string | null;
  backgroundColor: string | null;
  fontStyle: string | null;
  privacy: 'everyone' | 'contacts' | 'selected' | 'except';
  allowedViewers: string[];
  excludedViewers: string[];
  viewers: StatusView[];
  duration: number;
  createdAt: Date;
  expiresAt: Date;
}

interface StatusView {
  userId: string;
  viewedAt: Date;
}

interface MutedStatus {
  userId: string;
  mutedUserId: string;
  mutedAt: Date;
}

export class StatusService {
  private statuses: Map<string, Status> = new Map();
  private userStatusIndex: Map<string, string[]> = new Map();
  private mutedStatuses: Map<string, Set<string>> = new Map();
  private contacts: Map<string, Set<string>> = new Map();

  async createStatus(userId: string, config: {
    content: string;
    type?: 'text' | 'image' | 'video';
    mediaUrl?: string;
    backgroundColor?: string;
    fontStyle?: string;
    privacy?: 'everyone' | 'contacts' | 'selected' | 'except';
    allowedViewers?: string[];
    excludedViewers?: string[];
    duration?: number;
  }): Promise<Status> {
    if (!config.content && !config.mediaUrl) {
      throw new Error('Content or media URL is required');
    }

    const userStatuses = this.userStatusIndex.get(userId) || [];
    const activeCount = userStatuses.filter(id => {
      const s = this.statuses.get(id);
      return s && s.expiresAt > new Date();
    }).length;

    if (activeCount >= 30) {
      throw new Error('Maximum 30 active statuses allowed');
    }

    const duration = config.duration || 86400000; // 24 hours default
    const statusId = `status_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    const status: Status = {
      id: statusId,
      userId,
      type: config.type || 'text',
      content: config.content || '',
      mediaUrl: config.mediaUrl || null,
      backgroundColor: config.backgroundColor || null,
      fontStyle: config.fontStyle || null,
      privacy: config.privacy || 'contacts',
      allowedViewers: config.allowedViewers || [],
      excludedViewers: config.excludedViewers || [],
      viewers: [],
      duration,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + duration),
    };

    this.statuses.set(statusId, status);
    userStatuses.push(statusId);
    this.userStatusIndex.set(userId, userStatuses);

    return status;
  }

  async viewStatus(viewerId: string, statusId: string): Promise<Status> {
    const status = this.statuses.get(statusId);
    if (!status) throw new Error('Status not found');
    if (status.expiresAt < new Date()) throw new Error('Status has expired');

    if (!this.canView(viewerId, status)) {
      throw new Error('You do not have permission to view this status');
    }

    // Record view if not already viewed
    if (!status.viewers.find(v => v.userId === viewerId) && viewerId !== status.userId) {
      status.viewers.push({ userId: viewerId, viewedAt: new Date() });
    }

    return status;
  }

  async getViewers(statusId: string, userId: string): Promise<StatusView[]> {
    const status = this.statuses.get(statusId);
    if (!status) throw new Error('Status not found');
    if (status.userId !== userId) throw new Error('Only status owner can view viewers');

    return status.viewers.sort((a, b) => b.viewedAt.getTime() - a.viewedAt.getTime());
  }

  async deleteStatus(statusId: string, userId: string): Promise<void> {
    const status = this.statuses.get(statusId);
    if (!status) throw new Error('Status not found');
    if (status.userId !== userId) throw new Error('Access denied');

    this.statuses.delete(statusId);
    const userStatuses = this.userStatusIndex.get(userId) || [];
    this.userStatusIndex.set(userId, userStatuses.filter(id => id !== statusId));
  }

  async muteStatus(userId: string, targetUserId: string): Promise<void> {
    let muted = this.mutedStatuses.get(userId);
    if (!muted) {
      muted = new Set();
      this.mutedStatuses.set(userId, muted);
    }
    muted.add(targetUserId);
  }

  async unmuteStatus(userId: string, targetUserId: string): Promise<void> {
    const muted = this.mutedStatuses.get(userId);
    if (muted) muted.delete(targetUserId);
  }

  async setPrivacy(statusId: string, userId: string, privacy: Status['privacy'], viewers?: string[]): Promise<Status> {
    const status = this.statuses.get(statusId);
    if (!status) throw new Error('Status not found');
    if (status.userId !== userId) throw new Error('Access denied');

    status.privacy = privacy;
    if (privacy === 'selected' && viewers) {
      status.allowedViewers = viewers;
    } else if (privacy === 'except' && viewers) {
      status.excludedViewers = viewers;
    }

    return status;
  }

  async getActiveStatuses(viewerId: string): Promise<Map<string, Status[]>> {
    const now = new Date();
    const mutedUsers = this.mutedStatuses.get(viewerId) || new Set();
    const statusByUser = new Map<string, Status[]>();

    for (const status of this.statuses.values()) {
      if (status.expiresAt < now) continue;
      if (status.userId === viewerId) continue;
      if (mutedUsers.has(status.userId)) continue;
      if (!this.canView(viewerId, status)) continue;

      const userStatuses = statusByUser.get(status.userId) || [];
      userStatuses.push(status);
      statusByUser.set(status.userId, userStatuses);
    }

    // Sort each user's statuses by creation time
    for (const [uid, statuses] of statusByUser) {
      statusByUser.set(uid, statuses.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime()));
    }

    return statusByUser;
  }

  async getMyStatuses(userId: string): Promise<Status[]> {
    const statusIds = this.userStatusIndex.get(userId) || [];
    const now = new Date();

    return statusIds
      .map(id => this.statuses.get(id))
      .filter((s): s is Status => s !== undefined && s.expiresAt > now)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getStatusStats(userId: string): Promise<{ totalStatuses: number; totalViews: number; avgViews: number; mostViewed: string | null }> {
    const statusIds = this.userStatusIndex.get(userId) || [];
    const statuses = statusIds.map(id => this.statuses.get(id)).filter((s): s is Status => s !== undefined);

    const totalViews = statuses.reduce((sum, s) => sum + s.viewers.length, 0);
    const avgViews = statuses.length > 0 ? Math.round(totalViews / statuses.length) : 0;
    const mostViewed = statuses.sort((a, b) => b.viewers.length - a.viewers.length)[0]?.id || null;

    return { totalStatuses: statuses.length, totalViews, avgViews, mostViewed };
  }

  private canView(viewerId: string, status: Status): boolean {
    if (status.userId === viewerId) return true;

    switch (status.privacy) {
      case 'everyone': return true;
      case 'contacts': {
        const contacts = this.contacts.get(status.userId);
        return contacts ? contacts.has(viewerId) : false;
      }
      case 'selected':
        return status.allowedViewers.includes(viewerId);
      case 'except':
        return !status.excludedViewers.includes(viewerId);
      default:
        return false;
    }
  }
}

export const statusService = new StatusService();
