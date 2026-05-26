import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { createAppError } from '@quant/server-core';

export type TravelMode = 'driving' | 'walking' | 'cycling' | 'transit';

export interface RouteStep {
  instruction: string;
  distance: number;
  duration: number;
  startLocation: { lat: number; lng: number };
  endLocation: { lat: number; lng: number };
  maneuver: string;
}

export interface Route {
  id: string;
  origin: { lat: number; lng: number };
  destination: { lat: number; lng: number };
  mode: TravelMode;
  distance: number;
  duration: number;
  steps: RouteStep[];
  polyline: string;
  summary: string;
  createdAt: Date;
}

export interface OptimizedRoute {
  id: string;
  waypoints: Array<{ lat: number; lng: number }>;
  optimizedOrder: number[];
  totalDistance: number;
  totalDuration: number;
  routes: Route[];
}

export interface ETAResult {
  origin: { lat: number; lng: number };
  destination: { lat: number; lng: number };
  estimatedArrival: Date;
  duration: number;
  trafficDelay: number;
}

export interface TrafficSegment {
  startLocation: { lat: number; lng: number };
  endLocation: { lat: number; lng: number };
  speed: number;
  freeFlowSpeed: number;
  congestionLevel: 'free' | 'light' | 'moderate' | 'heavy' | 'standstill';
}

export interface TrafficData {
  bounds: { north: number; south: number; east: number; west: number };
  segments: TrafficSegment[];
  updatedAt: Date;
}

export interface NavigationStep {
  index: number;
  instruction: string;
  distance: number;
  duration: number;
  direction: string;
  roadName: string;
  maneuver: string;
}

const CoordinateSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

export const RouteSchema = z.object({
  origin: CoordinateSchema,
  destination: CoordinateSchema,
  mode: z.enum(['driving', 'walking', 'cycling', 'transit']),
});

export const WaypointsSchema = z.object({
  waypoints: z.array(CoordinateSchema).min(2).max(25),
  mode: z.enum(['driving', 'walking', 'cycling', 'transit']).optional().default('driving'),
});

export const ETASchema = z.object({
  origin: CoordinateSchema,
  destination: CoordinateSchema,
  mode: z.enum(['driving', 'walking', 'cycling', 'transit']).optional().default('driving'),
});

export const TrafficSchema = z.object({
  north: z.number().min(-90).max(90),
  south: z.number().min(-90).max(90),
  east: z.number().min(-180).max(180),
  west: z.number().min(-180).max(180),
});

export type RouteInput = z.infer<typeof RouteSchema>;
export type WaypointsInput = z.infer<typeof WaypointsSchema>;
export type ETAInput = z.infer<typeof ETASchema>;
export type TrafficInput = z.infer<typeof TrafficSchema>;

export class DirectionsService {
  private readonly routes = new Map<string, Route>();

  getRoute(input: RouteInput): Route {
    const parsed = RouteSchema.parse(input);

    const distance = this.calculateDistance(parsed.origin, parsed.destination);
    const duration = this.calculateDuration(distance, parsed.mode);

    const route: Route = {
      id: randomUUID(),
      origin: parsed.origin,
      destination: parsed.destination,
      mode: parsed.mode,
      distance,
      duration,
      steps: this.generateSteps(parsed.origin, parsed.destination, distance, duration),
      polyline: this.encodePolyline(parsed.origin, parsed.destination),
      summary: `${parsed.mode} route via main roads`,
      createdAt: new Date(),
    };

    this.routes.set(route.id, route);
    return route;
  }

  getAlternativeRoutes(input: RouteInput): Route[] {
    const parsed = RouteSchema.parse(input);

    const routes: Route[] = [];
    const baseDistance = this.calculateDistance(parsed.origin, parsed.destination);

    for (let i = 0; i < 3; i++) {
      const factor = 1 + i * 0.15;
      const distance = baseDistance * factor;
      const duration = this.calculateDuration(distance, parsed.mode);

      routes.push({
        id: randomUUID(),
        origin: parsed.origin,
        destination: parsed.destination,
        mode: parsed.mode,
        distance,
        duration,
        steps: this.generateSteps(parsed.origin, parsed.destination, distance, duration),
        polyline: this.encodePolyline(parsed.origin, parsed.destination),
        summary: `Alternative route ${i + 1}`,
        createdAt: new Date(),
      });
    }

    return routes;
  }

  optimizeWaypoints(input: WaypointsInput): OptimizedRoute {
    const parsed = WaypointsSchema.parse(input);

    if (parsed.waypoints.length < 2) {
      throw createAppError('At least 2 waypoints required', 400, 'INSUFFICIENT_WAYPOINTS');
    }

    const optimizedOrder = this.nearestNeighborOrder(parsed.waypoints);
    const routes: Route[] = [];
    let totalDistance = 0;
    let totalDuration = 0;

    for (let i = 0; i < optimizedOrder.length - 1; i++) {
      const originIdx = optimizedOrder[i]!;
      const destIdx = optimizedOrder[i + 1]!;
      const origin = parsed.waypoints[originIdx]!;
      const dest = parsed.waypoints[destIdx]!;

      const route = this.getRoute({ origin, destination: dest, mode: parsed.mode });
      routes.push(route);
      totalDistance += route.distance;
      totalDuration += route.duration;
    }

    return {
      id: randomUUID(),
      waypoints: parsed.waypoints,
      optimizedOrder,
      totalDistance,
      totalDuration,
      routes,
    };
  }

  getETA(input: ETAInput): ETAResult {
    const parsed = ETASchema.parse(input);

    const distance = this.calculateDistance(parsed.origin, parsed.destination);
    const duration = this.calculateDuration(distance, parsed.mode);
    const trafficDelay = Math.floor(Math.random() * 300);

    return {
      origin: parsed.origin,
      destination: parsed.destination,
      estimatedArrival: new Date(Date.now() + (duration + trafficDelay) * 1000),
      duration: duration + trafficDelay,
      trafficDelay,
    };
  }

  getTrafficConditions(input: TrafficInput): TrafficData {
    const parsed = TrafficSchema.parse(input);

    if (parsed.north < parsed.south) {
      throw createAppError('North must be greater than south', 400, 'INVALID_BOUNDS');
    }

    const segments: TrafficSegment[] = [];
    const congestionLevels: Array<TrafficSegment['congestionLevel']> = [
      'free',
      'light',
      'moderate',
      'heavy',
      'standstill',
    ];

    for (let i = 0; i < 5; i++) {
      const freeFlowSpeed = 60 + Math.floor(Math.random() * 40);
      const congestionLevel =
        congestionLevels[Math.floor(Math.random() * congestionLevels.length)]!;
      const speedFactor =
        congestionLevel === 'free'
          ? 1
          : congestionLevel === 'light'
            ? 0.8
            : congestionLevel === 'moderate'
              ? 0.6
              : congestionLevel === 'heavy'
                ? 0.3
                : 0.1;

      segments.push({
        startLocation: {
          lat: parsed.south + (parsed.north - parsed.south) * (i / 5),
          lng: parsed.west + (parsed.east - parsed.west) * (i / 5),
        },
        endLocation: {
          lat: parsed.south + (parsed.north - parsed.south) * ((i + 1) / 5),
          lng: parsed.west + (parsed.east - parsed.west) * ((i + 1) / 5),
        },
        speed: Math.floor(freeFlowSpeed * speedFactor),
        freeFlowSpeed,
        congestionLevel,
      });
    }

    return {
      bounds: parsed,
      segments,
      updatedAt: new Date(),
    };
  }

  getNavigationInstructions(routeId: string): NavigationStep[] {
    const route = this.routes.get(routeId);
    if (!route) {
      throw createAppError('Route not found', 404, 'ROUTE_NOT_FOUND');
    }

    return route.steps.map((step, index) => ({
      index,
      instruction: step.instruction,
      distance: step.distance,
      duration: step.duration,
      direction: this.getDirection(step.startLocation, step.endLocation),
      roadName: `Road ${index + 1}`,
      maneuver: step.maneuver,
    }));
  }

  private calculateDistance(
    origin: { lat: number; lng: number },
    destination: { lat: number; lng: number },
  ): number {
    const R = 6371000;
    const dLat = ((destination.lat - origin.lat) * Math.PI) / 180;
    const dLng = ((destination.lng - origin.lng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((origin.lat * Math.PI) / 180) *
        Math.cos((destination.lat * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private calculateDuration(distance: number, mode: TravelMode): number {
    const speeds: Record<TravelMode, number> = {
      driving: 13.9,
      walking: 1.4,
      cycling: 5.6,
      transit: 11.1,
    };
    return Math.ceil(distance / speeds[mode]);
  }

  private generateSteps(
    origin: { lat: number; lng: number },
    destination: { lat: number; lng: number },
    totalDistance: number,
    totalDuration: number,
  ): RouteStep[] {
    const stepCount = Math.max(2, Math.min(5, Math.ceil(totalDistance / 1000)));
    const steps: RouteStep[] = [];

    for (let i = 0; i < stepCount; i++) {
      const fraction = i / stepCount;
      const nextFraction = (i + 1) / stepCount;

      steps.push({
        instruction:
          i === 0
            ? 'Head north'
            : i === stepCount - 1
              ? 'Arrive at destination'
              : `Continue on road`,
        distance: totalDistance / stepCount,
        duration: totalDuration / stepCount,
        startLocation: {
          lat: origin.lat + (destination.lat - origin.lat) * fraction,
          lng: origin.lng + (destination.lng - origin.lng) * fraction,
        },
        endLocation: {
          lat: origin.lat + (destination.lat - origin.lat) * nextFraction,
          lng: origin.lng + (destination.lng - origin.lng) * nextFraction,
        },
        maneuver: i === 0 ? 'depart' : i === stepCount - 1 ? 'arrive' : 'straight',
      });
    }

    return steps;
  }

  private encodePolyline(
    origin: { lat: number; lng: number },
    destination: { lat: number; lng: number },
  ): string {
    return `encoded_${origin.lat.toFixed(4)}_${origin.lng.toFixed(4)}_${destination.lat.toFixed(4)}_${destination.lng.toFixed(4)}`;
  }

  private nearestNeighborOrder(waypoints: Array<{ lat: number; lng: number }>): number[] {
    const visited = new Set<number>();
    const order: number[] = [0];
    visited.add(0);

    while (visited.size < waypoints.length) {
      const current = order[order.length - 1]!;
      let nearest = -1;
      let nearestDist = Infinity;

      for (let i = 0; i < waypoints.length; i++) {
        if (visited.has(i)) continue;
        const dist = this.calculateDistance(waypoints[current]!, waypoints[i]!);
        if (dist < nearestDist) {
          nearestDist = dist;
          nearest = i;
        }
      }

      if (nearest >= 0) {
        order.push(nearest);
        visited.add(nearest);
      }
    }

    return order;
  }

  private getDirection(
    start: { lat: number; lng: number },
    end: { lat: number; lng: number },
  ): string {
    const dLat = end.lat - start.lat;
    const dLng = end.lng - start.lng;

    if (Math.abs(dLat) > Math.abs(dLng)) {
      return dLat > 0 ? 'north' : 'south';
    }
    return dLng > 0 ? 'east' : 'west';
  }
}
