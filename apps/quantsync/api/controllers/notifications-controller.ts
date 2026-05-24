// ============================================================================
// QuantSync - Notifications Controller
// Notification preferences and delivery
// ============================================================================

import type { Request, Response } from '../middleware';
import type { Notification, NotificationType, NotificationPreferences } from '../../src/types';

class NotificationsController {
  private notifications: Map<string, Notification[]> = new Map(); // userId -> notifications
  private preferences: Map<string, NotificationPreferences> = new Map();
  private unreadCounts: Map<string, number> = new Map();

  async getNotifications(req: Request, res: Response): Promise<void> {
    const userId = req.userId!;
    const query = req.query as Record<string, string>;
    const filter = query['type'] as NotificationType | undefined;
    const unreadOnly = query['unread'] === 'true';
    const limit = Math.min(parseInt(query['limit'] || '30', 10), 100);
    const offset = parseInt(query['offset'] || '0', 10);

    let userNotifs = this.notifications.get(userId) || [];

    if (filter) {
      userNotifs = userNotifs.filter(n => n.type === filter);
    }

    if (unreadOnly) {
      userNotifs = userNotifs.filter(n => !n.isRead);
    }

    const paginated = userNotifs.slice(offset, offset + limit);
    const unreadCount = this.unreadCounts.get(userId) || 0;

    res.status(200).json({
      success: true,
      data: paginated,
      meta: { total: userNotifs.length, unreadCount, limit, offset },
    });
  }

  async markAsRead(req: Request, res: Response): Promise<void> {
    const userId = req.userId!;
    const body = req.body as { notificationIds?: string[]; markAll?: boolean };

    const userNotifs = this.notifications.get(userId) || [];

    if (body.markAll) {
      userNotifs.forEach(n => { n.isRead = true; });
      this.unreadCounts.set(userId, 0);
    } else if (body.notificationIds) {
      const idSet = new Set(body.notificationIds);
      let markedCount = 0;
      userNotifs.forEach(n => {
        if (idSet.has(n.id) && !n.isRead) {
          n.isRead = true;
          markedCount++;
        }
      });
      const current = this.unreadCounts.get(userId) || 0;
      this.unreadCounts.set(userId, Math.max(0, current - markedCount));
    }

    res.status(200).json({ success: true, data: { unreadCount: this.unreadCounts.get(userId) || 0 } });
  }

  async getPreferences(req: Request, res: Response): Promise<void> {
    const userId = req.userId!;
    const prefs = this.preferences.get(userId) || this.getDefaultPreferences();
    res.status(200).json({ success: true, data: prefs });
  }

  async updatePreferences(req: Request, res: Response): Promise<void> {
    const userId = req.userId!;
    const body = req.body as Partial<NotificationPreferences>;

    const current = this.preferences.get(userId) || this.getDefaultPreferences();
    const updated: NotificationPreferences = { ...current, ...body };
    this.preferences.set(userId, updated);

    res.status(200).json({ success: true, data: updated });
  }

  async deleteNotification(req: Request, res: Response): Promise<void> {
    const userId = req.userId!;
    const notifId = req.params['id'];

    const userNotifs = this.notifications.get(userId) || [];
    const index = userNotifs.findIndex(n => n.id === notifId);

    if (index === -1) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Notification not found', statusCode: 404 } });
      return;
    }

    const [removed] = userNotifs.splice(index, 1);
    if (!removed.isRead) {
      const current = this.unreadCounts.get(userId) || 0;
      this.unreadCounts.set(userId, Math.max(0, current - 1));
    }

    res.status(200).json({ success: true, data: { deleted: true } });
  }

  // Used internally by other controllers
  sendNotification(userId: string, notification: Omit<Notification, 'id' | 'userId' | 'isRead' | 'createdAt'>): void {
    const prefs = this.preferences.get(userId) || this.getDefaultPreferences();

    // Check if user wants this type of notification
    if (!this.shouldSend(notification.type, prefs)) return;

    const notif: Notification = {
      ...notification,
      id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      userId,
      isRead: false,
      createdAt: new Date().toISOString(),
    };

    const userNotifs = this.notifications.get(userId) || [];
    userNotifs.unshift(notif);

    // Keep last 200 notifications
    if (userNotifs.length > 200) userNotifs.pop();
    this.notifications.set(userId, userNotifs);

    const current = this.unreadCounts.get(userId) || 0;
    this.unreadCounts.set(userId, current + 1);
  }

  private shouldSend(type: NotificationType, prefs: NotificationPreferences): boolean {
    switch (type) {
      case 'like':
      case 'upvote':
      case 'downvote':
        return prefs.likes;
      case 'comment':
      case 'reply':
        return prefs.comments;
      case 'repost':
      case 'quote':
        return prefs.reposts;
      case 'mention':
        return prefs.mentions;
      case 'follow':
        return prefs.follows;
      case 'community_invite':
        return prefs.communityUpdates;
      case 'trending':
        return prefs.trendingTopics;
      case 'space_invite':
      case 'space_start':
        return prefs.spaces;
      default:
        return true;
    }
  }

  private getDefaultPreferences(): NotificationPreferences {
    return {
      likes: true,
      comments: true,
      reposts: true,
      mentions: true,
      follows: true,
      communityUpdates: true,
      trendingTopics: false,
      spaces: true,
      pushEnabled: true,
      emailDigest: 'daily',
    };
  }
}

export const notificationsController = new NotificationsController();
export default NotificationsController;
