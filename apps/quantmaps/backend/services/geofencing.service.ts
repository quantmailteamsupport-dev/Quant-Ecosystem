import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { createAppError } from '@quant/server-core';

export interface Geofence {
  id: string;
  name: string;
  userId: string;
  center: { lat: number; lng: number };
  radius: number;
  config: GeofenceConfig;
  active: boolean;
  createdAt: Date;
}

export interface GeofenceConfig {
  triggerOnEnter: boolean;
  triggerOnExit: boolean;
  notifyEmail: boolean;
  notifyPush: boolean;
  schedule?: { startTime: string; endTime: string };
}

export interface GeofenceEvent {
  id: string;
  fenceId: string;
  type: 'enter' | 'exit';
  location: { lat: number; lng: number };
  timestamp: Date;
}

export interface AlertConfig {
  email?: string;
  pushEnabled: boolean;
  webhookUrl?: string;
  cooldownSeconds: number;
}

const CoordinateSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

export const CreateGeofenceSchema = z.object({
  name: z.string().min(1).max(200),
  userId: z.string().min(1),
  center: CoordinateSchema,
  radius: z.number().min(50).max(100000),
  config: z.object({
    triggerOnEnter: z.boolean().optional().default(true),
    triggerOnExit: z.boolean().optional().default(true),
    notifyEmail: z.boolean().optional().default(false),
    notifyPush: z.boolean().optional().default(true),
    schedule: z
      .object({
        startTime: z.string(),
        endTime: z.string(),
      })
      .optional(),
  }),
});

export const CheckLocationSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  userId: z.string().min(1).optional(),
});

export const SetAlertSchema = z.object({
  fenceId: z.string().min(1),
  alertConfig: z.object({
    email: z.string().email().optional(),
    pushEnabled: z.boolean(),
    webhookUrl: z.string().url().optional(),
    cooldownSeconds: z.number().int().min(0).max(86400).optional().default(300),
  }),
});

export type CreateGeofenceInput = z.infer<typeof CreateGeofenceSchema>;
export type CheckLocationInput = z.infer<typeof CheckLocationSchema>;
export type SetAlertInput = z.infer<typeof SetAlertSchema>;

export class GeofencingService {
  private readonly geofences = new Map<string, Geofence>();
  private readonly events = new Map<string, GeofenceEvent[]>();
  private readonly alerts = new Map<string, AlertConfig>();

  createGeofence(input: CreateGeofenceInput): Geofence {
    const parsed = CreateGeofenceSchema.parse(input);

    const geofence: Geofence = {
      id: randomUUID(),
      name: parsed.name,
      userId: parsed.userId,
      center: parsed.center,
      radius: parsed.radius,
      config: {
        triggerOnEnter: parsed.config.triggerOnEnter,
        triggerOnExit: parsed.config.triggerOnExit,
        notifyEmail: parsed.config.notifyEmail,
        notifyPush: parsed.config.notifyPush,
        schedule: parsed.config.schedule,
      },
      active: true,
      createdAt: new Date(),
    };

    this.geofences.set(geofence.id, geofence);
    this.events.set(geofence.id, []);
    return geofence;
  }

  deleteGeofence(fenceId: string): void {
    const geofence = this.geofences.get(fenceId);
    if (!geofence) {
      throw createAppError('Geofence not found', 404, 'GEOFENCE_NOT_FOUND');
    }
    this.geofences.delete(fenceId);
    this.events.delete(fenceId);
    this.alerts.delete(fenceId);
  }

  checkLocation(input: CheckLocationInput): GeofenceEvent[] {
    const parsed = CheckLocationSchema.parse(input);

    const triggeredEvents: GeofenceEvent[] = [];

    for (const geofence of this.geofences.values()) {
      if (!geofence.active) continue;
      if (parsed.userId && geofence.userId !== parsed.userId) continue;

      const distance = this.calculateDistance(
        { lat: parsed.lat, lng: parsed.lng },
        geofence.center,
      );

      const isInside = distance <= geofence.radius;

      if (isInside && geofence.config.triggerOnEnter) {
        const event: GeofenceEvent = {
          id: randomUUID(),
          fenceId: geofence.id,
          type: 'enter',
          location: { lat: parsed.lat, lng: parsed.lng },
          timestamp: new Date(),
        };
        const fenceEvents = this.events.get(geofence.id) ?? [];
        fenceEvents.push(event);
        this.events.set(geofence.id, fenceEvents);
        triggeredEvents.push(event);
      } else if (!isInside && geofence.config.triggerOnExit) {
        const event: GeofenceEvent = {
          id: randomUUID(),
          fenceId: geofence.id,
          type: 'exit',
          location: { lat: parsed.lat, lng: parsed.lng },
          timestamp: new Date(),
        };
        const fenceEvents = this.events.get(geofence.id) ?? [];
        fenceEvents.push(event);
        this.events.set(geofence.id, fenceEvents);
        triggeredEvents.push(event);
      }
    }

    return triggeredEvents;
  }

  listGeofences(userId?: string): Geofence[] {
    const all = Array.from(this.geofences.values());
    if (userId) {
      return all.filter((g) => g.userId === userId);
    }
    return all;
  }

  getGeofenceEvents(fenceId: string): GeofenceEvent[] {
    const geofence = this.geofences.get(fenceId);
    if (!geofence) {
      throw createAppError('Geofence not found', 404, 'GEOFENCE_NOT_FOUND');
    }
    return this.events.get(fenceId) ?? [];
  }

  setGeofenceAlert(input: SetAlertInput): void {
    const parsed = SetAlertSchema.parse(input);

    const geofence = this.geofences.get(parsed.fenceId);
    if (!geofence) {
      throw createAppError('Geofence not found', 404, 'GEOFENCE_NOT_FOUND');
    }

    this.alerts.set(parsed.fenceId, {
      email: parsed.alertConfig.email,
      pushEnabled: parsed.alertConfig.pushEnabled,
      webhookUrl: parsed.alertConfig.webhookUrl,
      cooldownSeconds: parsed.alertConfig.cooldownSeconds,
    });
  }

  private calculateDistance(
    a: { lat: number; lng: number },
    b: { lat: number; lng: number },
  ): number {
    const R = 6371000;
    const dLat = ((b.lat - a.lat) * Math.PI) / 180;
    const dLng = ((b.lng - a.lng) * Math.PI) / 180;
    const x =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((a.lat * Math.PI) / 180) *
        Math.cos((b.lat * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
    return R * c;
  }
}
