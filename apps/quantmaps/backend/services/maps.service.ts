import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { createAppError } from '@quant/server-core';

export interface GeoLocation {
  lat: number;
  lng: number;
  formattedAddress: string;
  placeId: string;
}

export interface Address {
  street: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  formattedAddress: string;
}

export interface MapTile {
  id: string;
  zoom: number;
  x: number;
  y: number;
  url: string;
  format: 'png' | 'webp';
  size: number;
}

export interface StaticMapResult {
  id: string;
  url: string;
  width: number;
  height: number;
  center: { lat: number; lng: number };
  zoom: number;
}

export interface ElevationResult {
  lat: number;
  lng: number;
  elevation: number;
  resolution: number;
}

export interface Building3D {
  id: string;
  name: string;
  coordinates: { lat: number; lng: number };
  height: number;
  floors: number;
  footprint: Array<{ lat: number; lng: number }>;
}

export interface StreetViewResult {
  id: string;
  lat: number;
  lng: number;
  heading: number;
  pitch: number;
  imageUrl: string;
  date: Date;
}

export const GeocodeSchema = z.object({
  address: z.string().min(1).max(500),
});

export const ReverseGeocodeSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

export const TileSchema = z.object({
  zoom: z.number().int().min(0).max(22),
  x: z.number().int().min(0),
  y: z.number().int().min(0),
});

export const StaticMapSchema = z.object({
  center: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
  }),
  zoom: z.number().int().min(0).max(22),
  size: z.object({
    width: z.number().int().min(1).max(2048),
    height: z.number().int().min(1).max(2048),
  }),
});

export const ElevationSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

export const BoundsSchema = z.object({
  north: z.number().min(-90).max(90),
  south: z.number().min(-90).max(90),
  east: z.number().min(-180).max(180),
  west: z.number().min(-180).max(180),
});

export const StreetViewSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  heading: z.number().min(0).max(360),
});

export type GeocodeInput = z.infer<typeof GeocodeSchema>;
export type ReverseGeocodeInput = z.infer<typeof ReverseGeocodeSchema>;
export type TileInput = z.infer<typeof TileSchema>;
export type StaticMapInput = z.infer<typeof StaticMapSchema>;
export type ElevationInput = z.infer<typeof ElevationSchema>;
export type BoundsInput = z.infer<typeof BoundsSchema>;
export type StreetViewInput = z.infer<typeof StreetViewSchema>;

export class MapsService {
  private readonly geocodeCache = new Map<string, GeoLocation>();
  private readonly tiles = new Map<string, MapTile>();

  geocode(input: GeocodeInput): GeoLocation {
    const parsed = GeocodeSchema.parse(input);

    const cached = this.geocodeCache.get(parsed.address.toLowerCase());
    if (cached) {
      return cached;
    }

    const location: GeoLocation = {
      lat: 37.7749 + Math.random() * 0.01,
      lng: -122.4194 + Math.random() * 0.01,
      formattedAddress: parsed.address,
      placeId: randomUUID(),
    };

    this.geocodeCache.set(parsed.address.toLowerCase(), location);
    return location;
  }

  reverseGeocode(input: ReverseGeocodeInput): Address {
    const parsed = ReverseGeocodeSchema.parse(input);

    return {
      street: `${Math.floor(parsed.lat * 100)} Main St`,
      city: 'San Francisco',
      state: 'CA',
      country: 'US',
      postalCode: '94102',
      formattedAddress: `${Math.floor(parsed.lat * 100)} Main St, San Francisco, CA 94102`,
    };
  }

  getTile(input: TileInput): MapTile {
    const parsed = TileSchema.parse(input);
    const key = `${parsed.zoom}/${parsed.x}/${parsed.y}`;

    const existing = this.tiles.get(key);
    if (existing) {
      return existing;
    }

    const tile: MapTile = {
      id: randomUUID(),
      zoom: parsed.zoom,
      x: parsed.x,
      y: parsed.y,
      url: `https://tiles.quantmaps.io/${key}.png`,
      format: 'png',
      size: 32768,
    };

    this.tiles.set(key, tile);
    return tile;
  }

  getStaticMap(input: StaticMapInput): StaticMapResult {
    const parsed = StaticMapSchema.parse(input);

    return {
      id: randomUUID(),
      url: `https://static.quantmaps.io/${parsed.center.lat},${parsed.center.lng},${parsed.zoom}/${parsed.size.width}x${parsed.size.height}.png`,
      width: parsed.size.width,
      height: parsed.size.height,
      center: parsed.center,
      zoom: parsed.zoom,
    };
  }

  getElevation(input: ElevationInput): ElevationResult {
    const parsed = ElevationSchema.parse(input);

    return {
      lat: parsed.lat,
      lng: parsed.lng,
      elevation: Math.abs(parsed.lat * 10 + parsed.lng * 5),
      resolution: 30,
    };
  }

  get3DBuildings(input: BoundsInput): Building3D[] {
    const parsed = BoundsSchema.parse(input);

    if (parsed.north < parsed.south) {
      throw createAppError('North must be greater than south', 400, 'INVALID_BOUNDS');
    }

    const buildings: Building3D[] = [];
    const count = Math.min(5, Math.floor(Math.abs(parsed.north - parsed.south) * 100));

    for (let i = 0; i < count; i++) {
      buildings.push({
        id: randomUUID(),
        name: `Building ${i + 1}`,
        coordinates: {
          lat: parsed.south + (parsed.north - parsed.south) * (i / Math.max(count - 1, 1)),
          lng: parsed.west + (parsed.east - parsed.west) * (i / Math.max(count - 1, 1)),
        },
        height: 20 + Math.floor(Math.random() * 200),
        floors: 3 + Math.floor(Math.random() * 50),
        footprint: [
          { lat: parsed.south + i * 0.001, lng: parsed.west + i * 0.001 },
          { lat: parsed.south + i * 0.001 + 0.0005, lng: parsed.west + i * 0.001 },
          { lat: parsed.south + i * 0.001 + 0.0005, lng: parsed.west + i * 0.001 + 0.0005 },
          { lat: parsed.south + i * 0.001, lng: parsed.west + i * 0.001 + 0.0005 },
        ],
      });
    }

    return buildings;
  }

  getStreetView(input: StreetViewInput): StreetViewResult {
    const parsed = StreetViewSchema.parse(input);

    return {
      id: randomUUID(),
      lat: parsed.lat,
      lng: parsed.lng,
      heading: parsed.heading,
      pitch: 0,
      imageUrl: `https://streetview.quantmaps.io/${parsed.lat},${parsed.lng}/${parsed.heading}.jpg`,
      date: new Date(),
    };
  }
}
