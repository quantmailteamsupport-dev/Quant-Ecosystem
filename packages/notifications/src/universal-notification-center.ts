// ============================================================================
// Universal Notification Center - Cross-App Notification Aggregation
// ============================================================================

export type NotificationApp =
  | 'quantchat'
  | 'quantmail'
  | 'quantsync'
  | 'quantube'
  | 'quantneon'
  | 'quantedits'
  | 'quantmax'
  | 'quantai'
  | 'quantads'
  | 'quantmeet'
  | 'quantdocs'
  | 'quantdrive'
  | 'quantcalendar'
  | 'quantpay'
  | 'quantcloud'
  | 'quantmaps'
  | 'quanthealth'
  | 'quantlearn'
  | 'quantwork';

export type UniversalNotificationPriority = 'critical' | 'high' | 'medium' | 'low';

export interface UniversalNotification {
  id: string;
  app: NotificationApp;
  type: string;
  title: string;
  body: string;
  priority: UniversalNotificationPriority;
  timestamp: number;
  read: boolean;
  actionUrl?: string;
  metadata?: Record<string, string>;
}

export interface UniversalNotificationPreferences {
  userId: string;
  enabledApps: NotificationApp[];
  quietHours?: { start: number; end: number };
  digestMode: boolean;
  digestFrequency: 'hourly' | 'daily' | 'weekly';
}

export interface NotificationFilters {
  apps?: NotificationApp[];
  unreadOnly?: boolean;
  priority?: UniversalNotificationPriority;
}

type NotificationCallback = (notification: UniversalNotification) => void;

export class UniversalNotificationCenter {
  private notifications: Map<string, UniversalNotification> = new Map();
  private subscribers: Map<string, NotificationCallback[]> = new Map();
  private preferences: Map<string, UniversalNotificationPreferences> = new Map();
  private counter = 0;

  send(
    notification: Omit<UniversalNotification, 'id' | 'timestamp' | 'read'>,
  ): UniversalNotification {
    const id = `notif_${Date.now()}_${++this.counter}`;
    const full: UniversalNotification = {
      ...notification,
      id,
      timestamp: Date.now(),
      read: false,
    };
    this.notifications.set(id, full);

    // Notify subscribers
    for (const [, callbacks] of this.subscribers) {
      for (const cb of callbacks) {
        cb(full);
      }
    }

    return full;
  }

  getAll(userId: string, filters?: NotificationFilters): UniversalNotification[] {
    const prefs = this.preferences.get(userId);
    let results = Array.from(this.notifications.values());

    // Filter by user preferences (enabled apps)
    if (prefs) {
      results = results.filter((n) => prefs.enabledApps.includes(n.app));
    }

    if (filters?.apps) {
      const apps = filters.apps;
      results = results.filter((n) => apps.includes(n.app));
    }

    if (filters?.unreadOnly) {
      results = results.filter((n) => !n.read);
    }

    if (filters?.priority) {
      const priority = filters.priority;
      results = results.filter((n) => n.priority === priority);
    }

    return results.sort((a, b) => b.timestamp - a.timestamp);
  }

  markRead(notificationIds: string[]): number {
    let count = 0;
    for (const id of notificationIds) {
      const notif = this.notifications.get(id);
      if (notif && !notif.read) {
        notif.read = true;
        count++;
      }
    }
    return count;
  }

  markAllRead(app?: NotificationApp): number {
    let count = 0;
    for (const [, notif] of this.notifications) {
      if (!notif.read && (!app || notif.app === app)) {
        notif.read = true;
        count++;
      }
    }
    return count;
  }

  getUnreadCounts(): Record<NotificationApp, number> {
    const counts = {} as Record<NotificationApp, number>;
    const apps: NotificationApp[] = [
      'quantchat',
      'quantmail',
      'quantsync',
      'quantube',
      'quantneon',
      'quantedits',
      'quantmax',
      'quantai',
      'quantads',
      'quantmeet',
      'quantdocs',
      'quantdrive',
      'quantcalendar',
      'quantpay',
      'quantcloud',
      'quantmaps',
      'quanthealth',
      'quantlearn',
      'quantwork',
    ];

    for (const app of apps) {
      counts[app] = 0;
    }

    for (const [, notif] of this.notifications) {
      if (!notif.read) {
        counts[notif.app]++;
      }
    }

    return counts;
  }

  subscribe(userId: string, callback: NotificationCallback): () => void {
    const existing = this.subscribers.get(userId) ?? [];
    existing.push(callback);
    this.subscribers.set(userId, existing);

    return () => {
      const callbacks = this.subscribers.get(userId);
      if (callbacks) {
        const idx = callbacks.indexOf(callback);
        if (idx >= 0) {
          callbacks.splice(idx, 1);
        }
      }
    };
  }

  setPreferences(
    userId: string,
    prefs: Partial<UniversalNotificationPreferences>,
  ): UniversalNotificationPreferences {
    const existing = this.preferences.get(userId) ?? {
      userId,
      enabledApps: [
        'quantchat',
        'quantmail',
        'quantsync',
        'quantube',
        'quantneon',
        'quantedits',
        'quantmax',
        'quantai',
        'quantads',
        'quantmeet',
        'quantdocs',
        'quantdrive',
        'quantcalendar',
        'quantpay',
        'quantcloud',
        'quantmaps',
        'quanthealth',
        'quantlearn',
        'quantwork',
      ],
      digestMode: false,
      digestFrequency: 'daily' as const,
    };

    const updated: UniversalNotificationPreferences = { ...existing, ...prefs };
    this.preferences.set(userId, updated);
    return updated;
  }

  getPreferences(userId: string): UniversalNotificationPreferences {
    return (
      this.preferences.get(userId) ?? {
        userId,
        enabledApps: [
          'quantchat',
          'quantmail',
          'quantsync',
          'quantube',
          'quantneon',
          'quantedits',
          'quantmax',
          'quantai',
          'quantads',
          'quantmeet',
          'quantdocs',
          'quantdrive',
          'quantcalendar',
          'quantpay',
          'quantcloud',
          'quantmaps',
          'quanthealth',
          'quantlearn',
          'quantwork',
        ],
        digestMode: false,
        digestFrequency: 'daily',
      }
    );
  }

  getDigest(userId: string): UniversalNotification[] {
    const prefs = this.preferences.get(userId);
    if (!prefs?.digestMode) {
      return [];
    }

    const now = Date.now();
    let windowMs: number;
    switch (prefs.digestFrequency) {
      case 'hourly':
        windowMs = 60 * 60 * 1000;
        break;
      case 'daily':
        windowMs = 24 * 60 * 60 * 1000;
        break;
      case 'weekly':
        windowMs = 7 * 24 * 60 * 60 * 1000;
        break;
    }

    return Array.from(this.notifications.values())
      .filter((n) => n.timestamp >= now - windowMs && prefs.enabledApps.includes(n.app))
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  clearOlderThan(days: number): number {
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    let count = 0;
    for (const [id, notif] of this.notifications) {
      if (notif.timestamp < cutoff) {
        this.notifications.delete(id);
        count++;
      }
    }
    return count;
  }
}
