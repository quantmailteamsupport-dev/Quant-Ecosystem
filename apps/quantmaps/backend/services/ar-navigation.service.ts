import { randomUUID } from 'node:crypto';
import { z } from 'zod';

export interface AROverlay {
  id: string;
  type: 'direction' | 'poi' | 'transit' | 'info';
  position: { lat: number; lng: number; altitude: number };
  label: string;
  icon: string;
  distance: number;
  bearing: number;
}

export interface IndoorMap {
  id: string;
  buildingId: string;
  floor: number;
  rooms: Array<{ id: string; name: string; bounds: Array<{ x: number; y: number }> }>;
  paths: Array<{ from: string; to: string; distance: number }>;
  amenities: Array<{ id: string; type: string; location: { x: number; y: number } }>;
}

export interface Path3D {
  id: string;
  origin: { lat: number; lng: number; altitude: number };
  destination: { lat: number; lng: number; altitude: number };
  waypoints: Array<{ lat: number; lng: number; altitude: number }>;
  totalDistance: number;
  estimatedDuration: number;
}

export interface ARLandmark {
  id: string;
  name: string;
  category: string;
  location: { lat: number; lng: number };
  distance: number;
  imageUrl: string;
  description: string;
}

export interface POI {
  id: string;
  name: string;
  category: string;
  location: { lat: number; lng: number };
  distance: number;
  rating: number;
}

const CoordinateSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

export const AROverlaySchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  heading: z.number().min(0).max(360),
});

export const IndoorMapSchema = z.object({
  buildingId: z.string().min(1),
  floor: z.number().int().min(-10).max(200),
});

export const Path3DSchema = z.object({
  origin: CoordinateSchema.extend({ altitude: z.number().min(0).max(10000) }),
  destination: CoordinateSchema.extend({ altitude: z.number().min(0).max(10000) }),
});

export const ARLandmarkSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  radius: z.number().min(100).max(50000),
});

export const POISchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  categories: z.array(z.string()).min(1).max(10),
  radius: z.number().min(100).max(50000).optional().default(1000),
});

export type AROverlayInput = z.infer<typeof AROverlaySchema>;
export type IndoorMapInput = z.infer<typeof IndoorMapSchema>;
export type Path3DInput = z.infer<typeof Path3DSchema>;
export type ARLandmarkInput = z.infer<typeof ARLandmarkSchema>;
export type POIInput = z.infer<typeof POISchema>;

export class ARNavigationService {
  private readonly indoorMaps = new Map<string, IndoorMap>();

  getAROverlays(input: AROverlayInput): AROverlay[] {
    const parsed = AROverlaySchema.parse(input);

    const overlays: AROverlay[] = [];
    const types: AROverlay['type'][] = ['direction', 'poi', 'transit', 'info'];

    for (let i = 0; i < 4; i++) {
      const bearing = (parsed.heading + i * 45) % 360;
      overlays.push({
        id: randomUUID(),
        type: types[i]!,
        position: {
          lat: parsed.lat + Math.cos((bearing * Math.PI) / 180) * 0.001,
          lng: parsed.lng + Math.sin((bearing * Math.PI) / 180) * 0.001,
          altitude: 5 + i * 3,
        },
        label: `${types[i]!} marker ${i + 1}`,
        icon: `icon_${types[i]!}`,
        distance: 50 + i * 100,
        bearing,
      });
    }

    return overlays;
  }

  getIndoorMap(input: IndoorMapInput): IndoorMap {
    const parsed = IndoorMapSchema.parse(input);

    const key = `${parsed.buildingId}:${parsed.floor}`;
    const existing = this.indoorMaps.get(key);
    if (existing) {
      return existing;
    }

    const rooms = [];
    for (let i = 0; i < 5; i++) {
      rooms.push({
        id: randomUUID(),
        name: `Room ${parsed.floor}${String.fromCharCode(65 + i)}`,
        bounds: [
          { x: i * 10, y: 0 },
          { x: (i + 1) * 10, y: 0 },
          { x: (i + 1) * 10, y: 8 },
          { x: i * 10, y: 8 },
        ],
      });
    }

    const paths = [];
    for (let i = 0; i < rooms.length - 1; i++) {
      paths.push({
        from: rooms[i]!.id,
        to: rooms[i + 1]!.id,
        distance: 10,
      });
    }

    const map: IndoorMap = {
      id: randomUUID(),
      buildingId: parsed.buildingId,
      floor: parsed.floor,
      rooms,
      paths,
      amenities: [
        { id: randomUUID(), type: 'elevator', location: { x: 25, y: 4 } },
        { id: randomUUID(), type: 'restroom', location: { x: 45, y: 4 } },
      ],
    };

    this.indoorMaps.set(key, map);
    return map;
  }

  calculate3DPath(input: Path3DInput): Path3D {
    const parsed = Path3DSchema.parse(input);

    const distance = this.calculateDistance3D(parsed.origin, parsed.destination);
    const waypointCount = Math.max(2, Math.min(5, Math.ceil(distance / 500)));
    const waypoints: Array<{ lat: number; lng: number; altitude: number }> = [];

    for (let i = 1; i <= waypointCount; i++) {
      const fraction = i / (waypointCount + 1);
      waypoints.push({
        lat: parsed.origin.lat + (parsed.destination.lat - parsed.origin.lat) * fraction,
        lng: parsed.origin.lng + (parsed.destination.lng - parsed.origin.lng) * fraction,
        altitude:
          parsed.origin.altitude +
          (parsed.destination.altitude - parsed.origin.altitude) * fraction,
      });
    }

    return {
      id: randomUUID(),
      origin: parsed.origin,
      destination: parsed.destination,
      waypoints,
      totalDistance: distance,
      estimatedDuration: Math.ceil(distance / 1.4),
    };
  }

  getARLandmarks(input: ARLandmarkInput): ARLandmark[] {
    const parsed = ARLandmarkSchema.parse(input);

    const landmarks: ARLandmark[] = [];
    const categories = ['historic', 'natural', 'architectural', 'cultural'];

    for (let i = 0; i < 4; i++) {
      const angle = (i * 90 * Math.PI) / 180;
      const dist = (parsed.radius * 0.3 * (i + 1)) / 4;

      landmarks.push({
        id: randomUUID(),
        name: `Landmark ${i + 1}`,
        category: categories[i]!,
        location: {
          lat: parsed.lat + (dist / 111000) * Math.cos(angle),
          lng: parsed.lng + (dist / 111000) * Math.sin(angle),
        },
        distance: dist,
        imageUrl: `https://landmarks.quantmaps.io/${i + 1}.jpg`,
        description: `A notable ${categories[i]!} landmark`,
      });
    }

    return landmarks;
  }

  getPointsOfInterest(input: POIInput): POI[] {
    const parsed = POISchema.parse(input);

    const pois: POI[] = [];

    for (const category of parsed.categories) {
      for (let i = 0; i < 3; i++) {
        const angle = Math.random() * 2 * Math.PI;
        const dist = Math.random() * parsed.radius;

        pois.push({
          id: randomUUID(),
          name: `${category} ${i + 1}`,
          category,
          location: {
            lat: parsed.lat + (dist / 111000) * Math.cos(angle),
            lng: parsed.lng + (dist / 111000) * Math.sin(angle),
          },
          distance: dist,
          rating: 3.5 + Math.random() * 1.5,
        });
      }
    }

    return pois;
  }

  private calculateDistance3D(
    a: { lat: number; lng: number; altitude: number },
    b: { lat: number; lng: number; altitude: number },
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
    const horizontalDist = R * c;
    const verticalDist = Math.abs(b.altitude - a.altitude);
    return Math.sqrt(horizontalDist * horizontalDist + verticalDist * verticalDist);
  }
}
