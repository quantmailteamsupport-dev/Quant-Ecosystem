// ============================================================================
// QuantOS - Notification Center
// ============================================================================

import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import type { Notification, NotificationFilter, PushNotificationInput } from '../types';

// ============================================================================
// Validation Schemas
// ============================================================================

export const PushNotificationSchema = z.object({
  title: z.string().min(1).max(256),
  body: z.string().min(1).max(1024),
  appId: z.string().min(1),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
  actions: z
    .array(
      z.object({
        id: z.string().min(1),
        label: z.string().min(1),
        action: z.string().min(1),
      }),
    )
    .optional(),
});

// ============================================================================
// NotificationCenter Class
// ============================================================================

export class NotificationCenter {
  private notifications: Map<string, Notification> = new Map();
  private doNotDisturb = false;

  push(input: PushNotificationInput): Notification {
    const validated = PushNotificationSchema.parse(input);

    if (this.doNotDisturb && validated.priority !== 'urgent') {
      // Still store it but silently
    }

    const notification: Notification = {
      id: randomUUID(),
      title: validated.title,
      body: validated.body,
      appId: validated.appId,
      priority: validated.priority ?? 'normal',
      timestamp: Date.now(),
      read: false,
      actions: validated.actions ?? [],
    };

    this.notifications.set(notification.id, notification);
    return notification;
  }

  dismiss(notificationId: string): void {
    if (!this.notifications.has(notificationId)) {
      throw new Error(`Notification not found: ${notificationId}`);
    }
    this.notifications.delete(notificationId);
  }

  markAsRead(notificationId: string): void {
    const notification = this.notifications.get(notificationId);
    if (!notification) {
      throw new Error(`Notification not found: ${notificationId}`);
    }
    notification.read = true;
  }

  getAll(filters?: NotificationFilter): Notification[] {
    let results = Array.from(this.notifications.values());

    if (filters?.appId) {
      results = results.filter((n) => n.appId === filters.appId);
    }
    if (filters?.priority) {
      results = results.filter((n) => n.priority === filters.priority);
    }
    if (filters?.read !== undefined) {
      results = results.filter((n) => n.read === filters.read);
    }

    return results.sort((a, b) => b.timestamp - a.timestamp);
  }

  getUnreadCount(): number {
    return Array.from(this.notifications.values()).filter((n) => !n.read).length;
  }

  setDoNotDisturb(enabled: boolean): void {
    this.doNotDisturb = enabled;
  }

  isDoNotDisturb(): boolean {
    return this.doNotDisturb;
  }

  clearAll(): void {
    this.notifications.clear();
  }

  groupByApp(): Record<string, Notification[]> {
    const groups: Record<string, Notification[]> = {};

    for (const notification of this.notifications.values()) {
      if (!groups[notification.appId]) {
        groups[notification.appId] = [];
      }
      groups[notification.appId]!.push(notification);
    }

    return groups;
  }
}
