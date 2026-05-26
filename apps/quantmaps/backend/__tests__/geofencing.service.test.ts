import { describe, it, expect, beforeEach } from 'vitest';
import { GeofencingService } from '../services/geofencing.service';
import type { CreateGeofenceInput } from '../services/geofencing.service';

describe('GeofencingService', () => {
  let service: GeofencingService;

  const defaultInput: CreateGeofenceInput = {
    name: 'Home Zone',
    userId: 'user-1',
    center: { lat: 37.7749, lng: -122.4194 },
    radius: 500,
    config: {
      triggerOnEnter: true,
      triggerOnExit: true,
      notifyEmail: false,
      notifyPush: true,
    },
  };

  beforeEach(() => {
    service = new GeofencingService();
  });

  describe('createGeofence', () => {
    it('creates a geofence with generated id', () => {
      const geofence = service.createGeofence(defaultInput);

      expect(geofence.id).toBeDefined();
      expect(geofence.name).toBe('Home Zone');
      expect(geofence.userId).toBe('user-1');
      expect(geofence.center).toEqual({ lat: 37.7749, lng: -122.4194 });
      expect(geofence.radius).toBe(500);
      expect(geofence.active).toBe(true);
      expect(geofence.createdAt).toBeInstanceOf(Date);
    });

    it('stores config options correctly', () => {
      const geofence = service.createGeofence(defaultInput);

      expect(geofence.config.triggerOnEnter).toBe(true);
      expect(geofence.config.triggerOnExit).toBe(true);
      expect(geofence.config.notifyEmail).toBe(false);
      expect(geofence.config.notifyPush).toBe(true);
    });

    it('generates unique ids for multiple geofences', () => {
      const g1 = service.createGeofence(defaultInput);
      const g2 = service.createGeofence({ ...defaultInput, name: 'Work Zone' });

      expect(g1.id).not.toBe(g2.id);
    });
  });

  describe('deleteGeofence', () => {
    it('deletes an existing geofence', () => {
      const geofence = service.createGeofence(defaultInput);

      service.deleteGeofence(geofence.id);

      const list = service.listGeofences();
      expect(list).toHaveLength(0);
    });

    it('throws for non-existent geofence', () => {
      expect(() => service.deleteGeofence('non-existent-id')).toThrow('Geofence not found');
    });
  });

  describe('checkLocation', () => {
    it('triggers enter event when location is inside geofence', () => {
      service.createGeofence(defaultInput);

      const events = service.checkLocation({
        lat: 37.7749,
        lng: -122.4194,
        userId: 'user-1',
      });

      expect(events.length).toBeGreaterThan(0);
      expect(events[0]!.type).toBe('enter');
      expect(events[0]!.fenceId).toBeDefined();
    });

    it('triggers exit event when location is outside geofence', () => {
      service.createGeofence(defaultInput);

      const events = service.checkLocation({
        lat: 38.0,
        lng: -123.0,
        userId: 'user-1',
      });

      expect(events.length).toBeGreaterThan(0);
      expect(events[0]!.type).toBe('exit');
    });

    it('only checks geofences belonging to specified user', () => {
      service.createGeofence(defaultInput);
      service.createGeofence({
        ...defaultInput,
        name: 'Other Zone',
        userId: 'user-2',
      });

      const events = service.checkLocation({
        lat: 37.7749,
        lng: -122.4194,
        userId: 'user-1',
      });

      expect(events).toHaveLength(1);
    });

    it('does not trigger enter if triggerOnEnter is false', () => {
      service.createGeofence({
        ...defaultInput,
        config: {
          triggerOnEnter: false,
          triggerOnExit: true,
          notifyEmail: false,
          notifyPush: true,
        },
      });

      const events = service.checkLocation({
        lat: 37.7749,
        lng: -122.4194,
        userId: 'user-1',
      });

      expect(events).toHaveLength(0);
    });
  });

  describe('listGeofences', () => {
    it('returns all geofences when no userId specified', () => {
      service.createGeofence(defaultInput);
      service.createGeofence({ ...defaultInput, name: 'Work', userId: 'user-2' });

      const list = service.listGeofences();

      expect(list).toHaveLength(2);
    });

    it('filters by userId', () => {
      service.createGeofence(defaultInput);
      service.createGeofence({ ...defaultInput, name: 'Work', userId: 'user-2' });

      const list = service.listGeofences('user-1');

      expect(list).toHaveLength(1);
      expect(list[0]!.userId).toBe('user-1');
    });

    it('returns empty array when no geofences exist', () => {
      const list = service.listGeofences();

      expect(list).toEqual([]);
    });
  });

  describe('getGeofenceEvents', () => {
    it('returns events for a geofence', () => {
      const geofence = service.createGeofence(defaultInput);

      service.checkLocation({ lat: 37.7749, lng: -122.4194, userId: 'user-1' });

      const events = service.getGeofenceEvents(geofence.id);

      expect(events.length).toBeGreaterThan(0);
      expect(events[0]!.fenceId).toBe(geofence.id);
      expect(events[0]!.timestamp).toBeInstanceOf(Date);
    });

    it('returns empty array when no events recorded', () => {
      const geofence = service.createGeofence(defaultInput);

      const events = service.getGeofenceEvents(geofence.id);

      expect(events).toEqual([]);
    });

    it('throws for non-existent geofence', () => {
      expect(() => service.getGeofenceEvents('non-existent-id')).toThrow('Geofence not found');
    });
  });

  describe('setGeofenceAlert', () => {
    it('sets alert configuration for a geofence', () => {
      const geofence = service.createGeofence(defaultInput);

      expect(() =>
        service.setGeofenceAlert({
          fenceId: geofence.id,
          alertConfig: {
            email: 'user@example.com',
            pushEnabled: true,
            webhookUrl: 'https://hooks.example.com/notify',
            cooldownSeconds: 600,
          },
        }),
      ).not.toThrow();
    });

    it('throws for non-existent geofence', () => {
      expect(() =>
        service.setGeofenceAlert({
          fenceId: 'non-existent-id',
          alertConfig: {
            pushEnabled: true,
            cooldownSeconds: 300,
          },
        }),
      ).toThrow('Geofence not found');
    });
  });
});
