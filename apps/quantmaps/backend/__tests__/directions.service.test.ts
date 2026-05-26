import { describe, it, expect, beforeEach } from 'vitest';
import { DirectionsService } from '../services/directions.service';
import type {
  RouteInput,
  WaypointsInput,
  ETAInput,
  TrafficInput,
} from '../services/directions.service';

describe('DirectionsService', () => {
  let service: DirectionsService;

  beforeEach(() => {
    service = new DirectionsService();
  });

  describe('getRoute', () => {
    it('computes a route between two points', () => {
      const input: RouteInput = {
        origin: { lat: 37.7749, lng: -122.4194 },
        destination: { lat: 37.8044, lng: -122.2712 },
        mode: 'driving',
      };

      const route = service.getRoute(input);

      expect(route.id).toBeDefined();
      expect(route.origin).toEqual(input.origin);
      expect(route.destination).toEqual(input.destination);
      expect(route.mode).toBe('driving');
      expect(route.distance).toBeGreaterThan(0);
      expect(route.duration).toBeGreaterThan(0);
      expect(route.steps.length).toBeGreaterThanOrEqual(2);
      expect(route.polyline).toBeDefined();
    });

    it('calculates different durations for different travel modes', () => {
      const origin = { lat: 37.7749, lng: -122.4194 };
      const destination = { lat: 37.8044, lng: -122.2712 };

      const driving = service.getRoute({ origin, destination, mode: 'driving' });
      const walking = service.getRoute({ origin, destination, mode: 'walking' });

      expect(walking.duration).toBeGreaterThan(driving.duration);
    });

    it('returns route steps with start and end locations', () => {
      const input: RouteInput = {
        origin: { lat: 37.7749, lng: -122.4194 },
        destination: { lat: 37.8044, lng: -122.2712 },
        mode: 'cycling',
      };

      const route = service.getRoute(input);

      for (const step of route.steps) {
        expect(step.instruction).toBeDefined();
        expect(step.distance).toBeGreaterThan(0);
        expect(step.duration).toBeGreaterThan(0);
        expect(step.startLocation.lat).toBeDefined();
        expect(step.endLocation.lng).toBeDefined();
      }
    });
  });

  describe('getAlternativeRoutes', () => {
    it('returns multiple alternative routes', () => {
      const input: RouteInput = {
        origin: { lat: 37.7749, lng: -122.4194 },
        destination: { lat: 37.8044, lng: -122.2712 },
        mode: 'driving',
      };

      const routes = service.getAlternativeRoutes(input);

      expect(routes.length).toBe(3);
      for (const route of routes) {
        expect(route.id).toBeDefined();
        expect(route.distance).toBeGreaterThan(0);
      }
    });

    it('returns routes with increasing distances', () => {
      const input: RouteInput = {
        origin: { lat: 37.7749, lng: -122.4194 },
        destination: { lat: 37.8044, lng: -122.2712 },
        mode: 'driving',
      };

      const routes = service.getAlternativeRoutes(input);

      for (let i = 1; i < routes.length; i++) {
        expect(routes[i]!.distance).toBeGreaterThanOrEqual(routes[i - 1]!.distance);
      }
    });
  });

  describe('optimizeWaypoints', () => {
    it('optimizes waypoint order for shortest path', () => {
      const input: WaypointsInput = {
        waypoints: [
          { lat: 37.7749, lng: -122.4194 },
          { lat: 37.8044, lng: -122.2712 },
          { lat: 37.7849, lng: -122.4094 },
        ],
        mode: 'driving',
      };

      const result = service.optimizeWaypoints(input);

      expect(result.id).toBeDefined();
      expect(result.optimizedOrder).toHaveLength(3);
      expect(result.totalDistance).toBeGreaterThan(0);
      expect(result.totalDuration).toBeGreaterThan(0);
      expect(result.routes.length).toBe(2);
    });

    it('returns routes between consecutive optimized waypoints', () => {
      const input: WaypointsInput = {
        waypoints: [
          { lat: 37.7749, lng: -122.4194 },
          { lat: 37.8044, lng: -122.2712 },
          { lat: 37.7849, lng: -122.4094 },
          { lat: 37.7649, lng: -122.4294 },
        ],
        mode: 'walking',
      };

      const result = service.optimizeWaypoints(input);

      expect(result.routes.length).toBe(3);
      for (const route of result.routes) {
        expect(route.distance).toBeGreaterThan(0);
      }
    });
  });

  describe('getETA', () => {
    it('returns estimated time of arrival', () => {
      const input: ETAInput = {
        origin: { lat: 37.7749, lng: -122.4194 },
        destination: { lat: 37.8044, lng: -122.2712 },
        mode: 'driving',
      };

      const result = service.getETA(input);

      expect(result.estimatedArrival).toBeInstanceOf(Date);
      expect(result.duration).toBeGreaterThan(0);
      expect(result.trafficDelay).toBeGreaterThanOrEqual(0);
    });

    it('includes traffic delay in total duration', () => {
      const input: ETAInput = {
        origin: { lat: 37.7749, lng: -122.4194 },
        destination: { lat: 37.8044, lng: -122.2712 },
        mode: 'driving',
      };

      const result = service.getETA(input);

      expect(result.duration).toBeGreaterThanOrEqual(result.trafficDelay);
    });
  });

  describe('getTrafficConditions', () => {
    it('returns traffic data for a bounded area', () => {
      const input: TrafficInput = {
        north: 37.81,
        south: 37.77,
        east: -122.38,
        west: -122.45,
      };

      const result = service.getTrafficConditions(input);

      expect(result.segments.length).toBeGreaterThan(0);
      expect(result.updatedAt).toBeInstanceOf(Date);
      expect(result.bounds).toEqual(input);
    });

    it('returns segments with valid congestion levels', () => {
      const input: TrafficInput = {
        north: 37.81,
        south: 37.77,
        east: -122.38,
        west: -122.45,
      };

      const result = service.getTrafficConditions(input);
      const validLevels = ['free', 'light', 'moderate', 'heavy', 'standstill'];

      for (const segment of result.segments) {
        expect(validLevels).toContain(segment.congestionLevel);
        expect(segment.speed).toBeLessThanOrEqual(segment.freeFlowSpeed);
      }
    });

    it('throws for invalid bounds where north is less than south', () => {
      const input: TrafficInput = {
        north: 37.0,
        south: 38.0,
        east: -122.38,
        west: -122.45,
      };

      expect(() => service.getTrafficConditions(input)).toThrow('North must be greater than south');
    });
  });

  describe('getNavigationInstructions', () => {
    it('returns navigation steps for a computed route', () => {
      const route = service.getRoute({
        origin: { lat: 37.7749, lng: -122.4194 },
        destination: { lat: 37.8044, lng: -122.2712 },
        mode: 'driving',
      });

      const steps = service.getNavigationInstructions(route.id);

      expect(steps.length).toBeGreaterThan(0);
      for (const step of steps) {
        expect(step.instruction).toBeDefined();
        expect(step.distance).toBeGreaterThan(0);
        expect(step.direction).toBeDefined();
        expect(step.maneuver).toBeDefined();
      }
    });

    it('throws for non-existent route', () => {
      expect(() => service.getNavigationInstructions('non-existent-id')).toThrow('Route not found');
    });
  });
});
