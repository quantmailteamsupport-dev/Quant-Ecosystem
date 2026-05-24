// ============================================================================
// QuantSync - Notifications Page
// Notification center with preferences
// ============================================================================

import type { Notification, NotificationType } from '../types';

interface NotificationsPageState {
  notifications: Notification[];
  filter: NotificationType | 'all';
  unreadCount: number;
  isLoading: boolean;
}

export function NotificationsPage() {
  const state: NotificationsPageState = {
    notifications: [],
    filter: 'all',
    unreadCount: 0,
    isLoading: true,
  };

  async function loadNotifications(filter?: NotificationType): Promise<void> {
    state.isLoading = true;
    // API call: quantSyncAPI.getNotifications()
    state.isLoading = false;
  }

  async function markAllRead(): Promise<void> {
    // API call: quantSyncAPI.markNotificationsRead()
    state.unreadCount = 0;
  }

  return {
    type: 'NotificationsPage',
    layout: 'two-column',
    components: {
      header: { type: 'PageHeader', props: { title: 'Notifications', action: { label: 'Mark all read', onClick: markAllRead } } },
      filters: { type: 'NotificationFilters', props: { active: state.filter, unreadCount: state.unreadCount } },
      list: { type: 'NotificationList', props: { notifications: state.notifications, isLoading: state.isLoading } },
      sidebar: { type: 'TrendingSidebar', props: {} },
    },
  };
}

export default NotificationsPage;
