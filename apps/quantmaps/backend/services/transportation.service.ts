import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { createAppError } from '@quant/server-core';

export type RideType = 'standard' | 'premium' | 'shared' | 'xl';
export type RideStatus =
  | 'requested'
  | 'accepted'
  | 'arriving'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export interface RideEstimate {
  id: string;
  origin: { lat: number; lng: number };
  destination: { lat: number; lng: number };
  type: RideType;
  estimatedPrice: number;
  estimatedDuration: number;
  estimatedDistance: number;
  surgeMultiplier: number;
}

export interface Ride {
  id: string;
  userId: string;
  origin: { lat: number; lng: number };
  destination: { lat: number; lng: number };
  type: RideType;
  status: RideStatus;
  driverId?: string;
  price: number;
  createdAt: Date;
  estimatedArrival: Date;
}

export interface DeliveryStatus {
  trackingId: string;
  status: 'picked_up' | 'in_transit' | 'out_for_delivery' | 'delivered';
  currentLocation: { lat: number; lng: number };
  estimatedDelivery: Date;
  updates: Array<{ status: string; timestamp: Date; location: { lat: number; lng: number } }>;
}

export interface TransitRoute {
  id: string;
  origin: { lat: number; lng: number };
  destination: { lat: number; lng: number };
  segments: TransitSegment[];
  totalDuration: number;
  totalFare: number;
  departureTime: Date;
  arrivalTime: Date;
}

export interface TransitSegment {
  type: 'walk' | 'bus' | 'train' | 'subway' | 'tram';
  lineName?: string;
  departureStop?: string;
  arrivalStop?: string;
  duration: number;
  distance: number;
}

export interface Schedule {
  stationId: string;
  stationName: string;
  arrivals: Array<{ lineId: string; lineName: string; arrivalTime: Date; destination: string }>;
}

const CoordinateSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

export const RideEstimateSchema = z.object({
  origin: CoordinateSchema,
  destination: CoordinateSchema,
  type: z.enum(['standard', 'premium', 'shared', 'xl']).optional().default('standard'),
});

export const RequestRideSchema = z.object({
  userId: z.string().min(1),
  origin: CoordinateSchema,
  destination: CoordinateSchema,
  type: z.enum(['standard', 'premium', 'shared', 'xl']).optional().default('standard'),
});

export const PublicTransitSchema = z.object({
  origin: CoordinateSchema,
  destination: CoordinateSchema,
  departureTime: z.string().datetime().optional(),
});

export const TransitScheduleSchema = z.object({
  stationId: z.string().min(1),
});

export type RideEstimateInput = z.infer<typeof RideEstimateSchema>;
export type RequestRideInput = z.infer<typeof RequestRideSchema>;
export type PublicTransitInput = z.infer<typeof PublicTransitSchema>;
export type TransitScheduleInput = z.infer<typeof TransitScheduleSchema>;

export class TransportationService {
  private readonly rides = new Map<string, Ride>();
  private readonly deliveries = new Map<string, DeliveryStatus>();

  getRideEstimate(input: RideEstimateInput): RideEstimate {
    const parsed = RideEstimateSchema.parse(input);

    const distance = this.calculateDistance(parsed.origin, parsed.destination);
    const duration = Math.ceil(distance / 13.9);
    const basePrice = 2.5 + distance * 0.001 + duration * 0.02;
    const surgeMultiplier = 1 + Math.random() * 0.5;

    const priceMultipliers: Record<RideType, number> = {
      standard: 1,
      premium: 1.8,
      shared: 0.7,
      xl: 1.5,
    };

    return {
      id: randomUUID(),
      origin: parsed.origin,
      destination: parsed.destination,
      type: parsed.type,
      estimatedPrice:
        Math.round(basePrice * priceMultipliers[parsed.type] * surgeMultiplier * 100) / 100,
      estimatedDuration: duration,
      estimatedDistance: distance,
      surgeMultiplier: Math.round(surgeMultiplier * 100) / 100,
    };
  }

  requestRide(input: RequestRideInput): Ride {
    const parsed = RequestRideSchema.parse(input);

    const estimate = this.getRideEstimate({
      origin: parsed.origin,
      destination: parsed.destination,
      type: parsed.type,
    });

    const ride: Ride = {
      id: randomUUID(),
      userId: parsed.userId,
      origin: parsed.origin,
      destination: parsed.destination,
      type: parsed.type,
      status: 'requested',
      price: estimate.estimatedPrice,
      createdAt: new Date(),
      estimatedArrival: new Date(Date.now() + estimate.estimatedDuration * 1000),
    };

    this.rides.set(ride.id, ride);
    return ride;
  }

  cancelRide(rideId: string): void {
    const ride = this.rides.get(rideId);
    if (!ride) {
      throw createAppError('Ride not found', 404, 'RIDE_NOT_FOUND');
    }
    if (ride.status === 'completed' || ride.status === 'cancelled') {
      throw createAppError('Ride cannot be cancelled', 400, 'RIDE_NOT_CANCELLABLE');
    }
    ride.status = 'cancelled';
  }

  trackDelivery(trackingId: string): DeliveryStatus {
    const delivery = this.deliveries.get(trackingId);
    if (!delivery) {
      const status: DeliveryStatus = {
        trackingId,
        status: 'in_transit',
        currentLocation: { lat: 37.7749, lng: -122.4194 },
        estimatedDelivery: new Date(Date.now() + 3600000),
        updates: [
          {
            status: 'picked_up',
            timestamp: new Date(Date.now() - 7200000),
            location: { lat: 37.7849, lng: -122.4094 },
          },
          {
            status: 'in_transit',
            timestamp: new Date(Date.now() - 3600000),
            location: { lat: 37.7799, lng: -122.4144 },
          },
        ],
      };
      this.deliveries.set(trackingId, status);
      return status;
    }
    return delivery;
  }

  getPublicTransit(input: PublicTransitInput): TransitRoute[] {
    const parsed = PublicTransitSchema.parse(input);

    const routes: TransitRoute[] = [];
    const baseDistance = this.calculateDistance(parsed.origin, parsed.destination);

    for (let i = 0; i < 3; i++) {
      const walkDuration = 300 + i * 60;
      const transitDuration = Math.ceil(baseDistance / 11.1) + i * 120;
      const totalDuration = walkDuration + transitDuration;

      const segments: TransitSegment[] = [
        {
          type: 'walk',
          duration: 180,
          distance: 250,
        },
        {
          type: i === 0 ? 'subway' : i === 1 ? 'bus' : 'train',
          lineName: `Line ${i + 1}`,
          departureStop: `Station A${i}`,
          arrivalStop: `Station B${i}`,
          duration: transitDuration,
          distance: baseDistance * 0.9,
        },
        {
          type: 'walk',
          duration: 120,
          distance: 150,
        },
      ];

      const departureTime = parsed.departureTime ? new Date(parsed.departureTime) : new Date();

      routes.push({
        id: randomUUID(),
        origin: parsed.origin,
        destination: parsed.destination,
        segments,
        totalDuration,
        totalFare: 2.5 + i * 0.5,
        departureTime,
        arrivalTime: new Date(departureTime.getTime() + totalDuration * 1000),
      });
    }

    return routes;
  }

  getTransitSchedule(input: TransitScheduleInput): Schedule {
    const parsed = TransitScheduleSchema.parse(input);

    const arrivals = [];
    const now = new Date();

    for (let i = 0; i < 5; i++) {
      arrivals.push({
        lineId: `line-${i + 1}`,
        lineName: `Line ${i + 1}`,
        arrivalTime: new Date(now.getTime() + (i + 1) * 600000),
        destination: `Terminal ${String.fromCharCode(65 + i)}`,
      });
    }

    return {
      stationId: parsed.stationId,
      stationName: `Station ${parsed.stationId}`,
      arrivals,
    };
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
