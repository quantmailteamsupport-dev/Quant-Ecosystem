import { describe, it, expect, beforeEach } from 'vitest';
import { NotificationCenter } from '../core/notification-center';

describe('NotificationCenter', () => {
  let nc: NotificationCenter;

  beforeEach(() => {
    nc = new NotificationCenter();
  });

  describe('push', () => {
    it('should push a notification with defaults', () => {
      const notification = nc.push({
        title: 'Test Notification',
        body: 'Hello world',
        appId: 'app-1',
      });

      expect(notification.id).toBeTruthy();
      expect(notification.title).toBe('Test Notification');
      expect(notification.body).toBe('Hello world');
      expect(notification.appId).toBe('app-1');
      expect(notification.priority).toBe('normal');
      expect(notification.read).toBe(false);
      expect(notification.actions).toEqual([]);
      expect(notification.timestamp).toBeGreaterThan(0);
    });

    it('should push a notification with custom priority', () => {
      const notification = nc.push({
        title: 'Urgent',
        body: 'Critical alert',
        appId: 'app-1',
        priority: 'urgent',
      });

      expect(notification.priority).toBe('urgent');
    });

    it('should push a notification with actions', () => {
      const notification = nc.push({
        title: 'Invite',
        body: 'Join meeting?',
        appId: 'app-1',
        actions: [
          { id: '1', label: 'Accept', action: 'accept' },
          { id: '2', label: 'Decline', action: 'decline' },
        ],
      });

      expect(notification.actions).toHaveLength(2);
      expect(notification.actions[0]!.label).toBe('Accept');
    });

    it('should throw on empty title', () => {
      expect(() => nc.push({ title: '', body: 'test', appId: 'app-1' })).toThrow();
    });

    it('should still store notification in DND mode for non-urgent', () => {
      nc.setDoNotDisturb(true);
      nc.push({ title: 'Test', body: 'Hello', appId: 'app-1' });

      expect(nc.getAll()).toHaveLength(1);
    });
  });

  describe('dismiss', () => {
    it('should dismiss a notification', () => {
      const notification = nc.push({
        title: 'Test',
        body: 'Hello',
        appId: 'app-1',
      });

      nc.dismiss(notification.id);
      expect(nc.getAll()).toHaveLength(0);
    });

    it('should throw for non-existent notification', () => {
      expect(() => nc.dismiss('nonexistent')).toThrow('Notification not found');
    });
  });

  describe('markAsRead', () => {
    it('should mark notification as read', () => {
      const notification = nc.push({
        title: 'Test',
        body: 'Hello',
        appId: 'app-1',
      });

      nc.markAsRead(notification.id);
      const all = nc.getAll();
      expect(all[0]!.read).toBe(true);
    });

    it('should throw for non-existent notification', () => {
      expect(() => nc.markAsRead('nonexistent')).toThrow('Notification not found');
    });
  });

  describe('getAll', () => {
    it('should return all notifications sorted by timestamp desc', () => {
      nc.push({ title: 'First', body: 'a', appId: 'app-1' });
      nc.push({ title: 'Second', body: 'b', appId: 'app-2' });

      const all = nc.getAll();
      expect(all).toHaveLength(2);
      expect(all[0]!.timestamp).toBeGreaterThanOrEqual(all[1]!.timestamp);
    });

    it('should filter by appId', () => {
      nc.push({ title: 'A', body: 'a', appId: 'app-1' });
      nc.push({ title: 'B', body: 'b', appId: 'app-2' });
      nc.push({ title: 'C', body: 'c', appId: 'app-1' });

      const filtered = nc.getAll({ appId: 'app-1' });
      expect(filtered).toHaveLength(2);
      expect(filtered.every((n) => n.appId === 'app-1')).toBe(true);
    });

    it('should filter by priority', () => {
      nc.push({ title: 'Low', body: 'a', appId: 'app-1', priority: 'low' });
      nc.push({ title: 'High', body: 'b', appId: 'app-1', priority: 'high' });

      const filtered = nc.getAll({ priority: 'high' });
      expect(filtered).toHaveLength(1);
      expect(filtered[0]!.title).toBe('High');
    });

    it('should filter by read status', () => {
      const n1 = nc.push({ title: 'A', body: 'a', appId: 'app-1' });
      nc.push({ title: 'B', body: 'b', appId: 'app-1' });
      nc.markAsRead(n1.id);

      const unread = nc.getAll({ read: false });
      expect(unread).toHaveLength(1);
      expect(unread[0]!.title).toBe('B');
    });
  });

  describe('getUnreadCount', () => {
    it('should return count of unread notifications', () => {
      nc.push({ title: 'A', body: 'a', appId: 'app-1' });
      const n2 = nc.push({ title: 'B', body: 'b', appId: 'app-1' });
      nc.push({ title: 'C', body: 'c', appId: 'app-1' });

      nc.markAsRead(n2.id);

      expect(nc.getUnreadCount()).toBe(2);
    });

    it('should return 0 when no notifications', () => {
      expect(nc.getUnreadCount()).toBe(0);
    });
  });

  describe('setDoNotDisturb', () => {
    it('should enable and disable DND mode', () => {
      nc.setDoNotDisturb(true);
      expect(nc.isDoNotDisturb()).toBe(true);

      nc.setDoNotDisturb(false);
      expect(nc.isDoNotDisturb()).toBe(false);
    });
  });

  describe('clearAll', () => {
    it('should clear all notifications', () => {
      nc.push({ title: 'A', body: 'a', appId: 'app-1' });
      nc.push({ title: 'B', body: 'b', appId: 'app-2' });

      nc.clearAll();
      expect(nc.getAll()).toHaveLength(0);
    });
  });

  describe('groupByApp', () => {
    it('should group notifications by appId', () => {
      nc.push({ title: 'A', body: 'a', appId: 'app-1' });
      nc.push({ title: 'B', body: 'b', appId: 'app-2' });
      nc.push({ title: 'C', body: 'c', appId: 'app-1' });

      const groups = nc.groupByApp();

      expect(Object.keys(groups)).toHaveLength(2);
      expect(groups['app-1']).toHaveLength(2);
      expect(groups['app-2']).toHaveLength(1);
    });

    it('should return empty object when no notifications', () => {
      const groups = nc.groupByApp();
      expect(Object.keys(groups)).toHaveLength(0);
    });
  });
});
