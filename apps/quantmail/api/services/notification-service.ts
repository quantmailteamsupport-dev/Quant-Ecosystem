// ============================================================================
// QuantMail API - Notification Service
// Push notifications, email notifications, real-time alerts
// ============================================================================

import type { QuantApp } from '@quant/common';
import type { NotificationPreferences } from '../../src/types';

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  read: boolean;
  readAt?: Date;
  actionUrl?: string;
  sourceApp: QuantApp;
  createdAt: Date;
}

export type NotificationType =
  | 'new_email'
  | 'email_reply'
  | 'mention'
  | 'calendar_reminder'
  | 'build_complete'
  | 'pr_review'
  | 'pr_merged'
  | 'issue_assigned'
  | 'contact_sync'
  | 'security_alert'
  | 'system';

export interface NotificationChannel {
  type: 'push' | 'email' | 'sms' | 'websocket';
  target: string;
  isEnabled: boolean;
}

// ----------------------------------------------------------------------------
// Notification Service
// ----------------------------------------------------------------------------

export class NotificationService {
  private notifications: Map<string, Notification> = new Map();
  private preferences: Map<string, NotificationPreferences> = new Map();
  private channels: Map<string, NotificationChannel[]> = new Map();
  private subscribers: Map<string, Array<(notification: Notification) => void>> = new Map();

  // --------------------------------------------------------------------------
  // Send Notifications
  // --------------------------------------------------------------------------

  async send(userId: string, notification: Omit<Notification, 'id' | 'userId' | 'read' | 'createdAt'>): Promise<Notification> {
    const prefs = this.preferences.get(userId);

    // Check quiet hours
    if (prefs?.quietHours && this.isInQuietHours(prefs.quietHours)) {
      // Queue for later delivery
      return this.queueNotification(userId, notification);
    }

    // Check category preferences
    if (prefs?.categories && prefs.categories[notification.type] === false) {
      // User has disabled this notification type
      return this.createSilentNotification(userId, notification);
    }

    const notif: Notification = {
      ...notification,
      id: this.generateId('notif'),
      userId,
      read: false,
      createdAt: new Date(),
    };

    this.notifications.set(notif.id, notif);

    // Deliver through enabled channels
    await this.deliverToChannels(userId, notif, prefs);

    // Notify subscribers (websocket)
    const subs = this.subscribers.get(userId);
    if (subs) {
      for (const callback of subs) {
        try { callback(notif); } catch { /* ignore subscriber errors */ }
      }
    }

    return notif;
  }

  async sendBatch(userId: string, notifications: Array<Omit<Notification, 'id' | 'userId' | 'read' | 'createdAt'>>): Promise<Notification[]> {
    const results: Notification[] = [];
    for (const notification of notifications) {
      const sent = await this.send(userId, notification);
      results.push(sent);
    }
    return results;
  }

  async sendToMultipleUsers(userIds: string[], notification: Omit<Notification, 'id' | 'userId' | 'read' | 'createdAt'>): Promise<void> {
    for (const userId of userIds) {
      await this.send(userId, notification);
    }
  }

  // --------------------------------------------------------------------------
  // Notification Management
  // --------------------------------------------------------------------------

  async getNotifications(userId: string, options: {
    unreadOnly?: boolean;
    type?: NotificationType;
    page?: number;
    pageSize?: number;
  } = {}): Promise<{ notifications: Notification[]; total: number; unreadCount: number }> {
    let results: Notification[] = [];
    let unreadCount = 0;

    for (const notif of this.notifications.values()) {
      if (notif.userId !== userId) continue;
      if (!notif.read) unreadCount++;
      if (options.unreadOnly && notif.read) continue;
      if (options.type && notif.type !== options.type) continue;
      results.push(notif);
    }

    results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const total = results.length;
    const page = options.page || 1;
    const pageSize = options.pageSize || 20;
    results = results.slice((page - 1) * pageSize, page * pageSize);

    return { notifications: results, total, unreadCount };
  }

  async markAsRead(notificationId: string, userId: string): Promise<boolean> {
    const notif = this.notifications.get(notificationId);
    if (!notif || notif.userId !== userId) return false;
    notif.read = true;
    notif.readAt = new Date();
    return true;
  }

  async markAllAsRead(userId: string): Promise<number> {
    let count = 0;
    for (const notif of this.notifications.values()) {
      if (notif.userId === userId && !notif.read) {
        notif.read = true;
        notif.readAt = new Date();
        count++;
      }
    }
    return count;
  }

  async deleteNotification(notificationId: string, userId: string): Promise<boolean> {
    const notif = this.notifications.get(notificationId);
    if (!notif || notif.userId !== userId) return false;
    this.notifications.delete(notificationId);
    return true;
  }

  async clearAll(userId: string): Promise<number> {
    let count = 0;
    for (const [id, notif] of this.notifications) {
      if (notif.userId === userId) {
        this.notifications.delete(id);
        count++;
      }
    }
    return count;
  }

  // --------------------------------------------------------------------------
  // Preferences
  // --------------------------------------------------------------------------

  async getPreferences(userId: string): Promise<NotificationPreferences> {
    return this.preferences.get(userId) || this.getDefaultPreferences();
  }

  async updatePreferences(userId: string, prefs: Partial<NotificationPreferences>): Promise<NotificationPreferences> {
    const current = this.preferences.get(userId) || this.getDefaultPreferences();
    const updated = { ...current, ...prefs };
    this.preferences.set(userId, updated);
    return updated;
  }

  // --------------------------------------------------------------------------
  // Subscription (WebSocket)
  // --------------------------------------------------------------------------

  subscribe(userId: string, callback: (notification: Notification) => void): () => void {
    const subs = this.subscribers.get(userId) || [];
    subs.push(callback);
    this.subscribers.set(userId, subs);

    // Return unsubscribe function
    return () => {
      const current = this.subscribers.get(userId) || [];
      const idx = current.indexOf(callback);
      if (idx !== -1) current.splice(idx, 1);
    };
  }

  // --------------------------------------------------------------------------
  // Specific Notification Types
  // --------------------------------------------------------------------------

  async notifyNewEmail(userId: string, from: string, subject: string, emailId: string): Promise<void> {
    await this.send(userId, {
      type: 'new_email',
      title: `New email from ${from}`,
      body: subject,
      data: { emailId },
      actionUrl: `/inbox/${emailId}`,
      sourceApp: 'quantmail',
    });
  }

  async notifyCalendarReminder(userId: string, eventTitle: string, minutesBefore: number, eventId: string): Promise<void> {
    await this.send(userId, {
      type: 'calendar_reminder',
      title: `Upcoming: ${eventTitle}`,
      body: minutesBefore === 0 ? 'Starting now' : `Starting in ${minutesBefore} minutes`,
      data: { eventId, minutesBefore },
      actionUrl: `/calendar/${eventId}`,
      sourceApp: 'quantmail',
    });
  }

  async notifyBuildComplete(userId: string, repoName: string, buildStatus: string, buildId: string): Promise<void> {
    await this.send(userId, {
      type: 'build_complete',
      title: `Build ${buildStatus}: ${repoName}`,
      body: `Build #${buildId} has ${buildStatus}`,
      data: { buildId, repoName, buildStatus },
      actionUrl: `/pipelines/${buildId}`,
      sourceApp: 'quantmail',
    });
  }

  async notifyPRReview(userId: string, reviewer: string, prTitle: string, prId: string): Promise<void> {
    await this.send(userId, {
      type: 'pr_review',
      title: `Review requested by ${reviewer}`,
      body: prTitle,
      data: { prId },
      actionUrl: `/repos/pr/${prId}`,
      sourceApp: 'quantmail',
    });
  }

  async notifySecurityAlert(userId: string, alertType: string, details: string): Promise<void> {
    await this.send(userId, {
      type: 'security_alert',
      title: `Security Alert: ${alertType}`,
      body: details,
      data: { alertType },
      actionUrl: '/settings/security',
      sourceApp: 'quantmail',
    });
  }

  // --------------------------------------------------------------------------
  // Private Helpers
  // --------------------------------------------------------------------------

  private async deliverToChannels(userId: string, notification: Notification, prefs?: NotificationPreferences | null): Promise<void> {
    const channels = this.channels.get(userId) || [];

    for (const channel of channels) {
      if (!channel.isEnabled) continue;

      switch (channel.type) {
        case 'push':
          if (prefs?.pushNotifications !== false) {
            await this.sendPushNotification(channel.target, notification);
          }
          break;
        case 'email':
          if (prefs?.emailNotifications !== false) {
            await this.sendEmailNotification(channel.target, notification);
          }
          break;
        case 'websocket':
          // Already handled by subscriber mechanism
          break;
      }
    }
  }

  private async sendPushNotification(deviceToken: string, notification: Notification): Promise<void> {
    // In production: send via FCM, APNs, etc.
    console.log(`[PUSH] ${deviceToken}: ${notification.title}`);
  }

  private async sendEmailNotification(email: string, notification: Notification): Promise<void> {
    // In production: send via SMTP
    console.log(`[EMAIL] ${email}: ${notification.title}`);
  }

  private queueNotification(userId: string, notification: Omit<Notification, 'id' | 'userId' | 'read' | 'createdAt'>): Notification {
    const notif: Notification = {
      ...notification,
      id: this.generateId('notif'),
      userId,
      read: false,
      createdAt: new Date(),
    };
    this.notifications.set(notif.id, notif);
    return notif;
  }

  private createSilentNotification(userId: string, notification: Omit<Notification, 'id' | 'userId' | 'read' | 'createdAt'>): Notification {
    const notif: Notification = {
      ...notification,
      id: this.generateId('notif'),
      userId,
      read: false,
      createdAt: new Date(),
    };
    this.notifications.set(notif.id, notif);
    return notif;
  }

  private isInQuietHours(quietHours: { start: string; end: string; timezone: string }): boolean {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const currentTime = hours * 60 + minutes;

    const [startH, startM] = quietHours.start.split(':').map(Number);
    const [endH, endM] = quietHours.end.split(':').map(Number);
    const startTime = startH * 60 + startM;
    const endTime = endH * 60 + endM;

    if (startTime < endTime) {
      return currentTime >= startTime && currentTime <= endTime;
    }
    // Overnight quiet hours (e.g., 22:00 - 07:00)
    return currentTime >= startTime || currentTime <= endTime;
  }

  private getDefaultPreferences(): NotificationPreferences {
    return {
      emailNotifications: true,
      pushNotifications: true,
      desktopNotifications: true,
      digestFrequency: 'realtime',
      quietHours: null,
      categories: {
        new_email: true,
        email_reply: true,
        mention: true,
        calendar_reminder: true,
        build_complete: true,
        pr_review: true,
        pr_merged: true,
        issue_assigned: true,
        contact_sync: true,
        security_alert: true,
        system: true,
      },
    };
  }

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 10)}`;
  }
}
