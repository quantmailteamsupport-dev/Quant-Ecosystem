import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { createAppError } from '@quant/server-core';

export interface Place {
  id: string;
  name: string;
  category: string;
  location: { lat: number; lng: number };
  address: string;
  rating: number;
  reviewCount: number;
  openNow: boolean;
  priceLevel: number;
  photos: string[];
  createdAt: Date;
}

export interface PlaceDetails extends Place {
  phone: string;
  website: string;
  hours: Record<string, string>;
  description: string;
  amenities: string[];
}

export interface Review {
  id: string;
  placeId: string;
  userId: string;
  rating: number;
  text: string;
  createdAt: Date;
}

export interface BusinessClaim {
  id: string;
  placeId: string;
  ownerId: string;
  status: 'pending' | 'approved' | 'rejected';
  claimedAt: Date;
}

const CoordinateSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

export const SearchPlacesSchema = z.object({
  query: z.string().min(1).max(200),
  location: CoordinateSchema.optional(),
  radius: z.number().min(100).max(50000).optional().default(5000),
  category: z.string().optional(),
});

export const NearbyPlacesSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  radius: z.number().min(100).max(50000),
  category: z.string().optional(),
});

export const AddReviewSchema = z.object({
  placeId: z.string().min(1),
  userId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  text: z.string().min(1).max(2000),
});

export const ClaimBusinessSchema = z.object({
  placeId: z.string().min(1),
  ownerId: z.string().min(1),
});

export const UpdateBusinessSchema = z.object({
  placeId: z.string().min(1),
  info: z.object({
    name: z.string().min(1).max(200).optional(),
    phone: z.string().optional(),
    website: z.string().url().optional(),
    description: z.string().max(2000).optional(),
    hours: z.record(z.string()).optional(),
  }),
});

export type SearchPlacesInput = z.input<typeof SearchPlacesSchema>;
export type NearbyPlacesInput = z.infer<typeof NearbyPlacesSchema>;
export type AddReviewInput = z.infer<typeof AddReviewSchema>;
export type ClaimBusinessInput = z.infer<typeof ClaimBusinessSchema>;
export type UpdateBusinessInput = z.infer<typeof UpdateBusinessSchema>;

export class PlacesService {
  private readonly places = new Map<string, PlaceDetails>();
  private readonly reviews = new Map<string, Review[]>();
  private readonly claims = new Map<string, BusinessClaim>();

  constructor() {
    this.seedPlaces();
  }

  searchPlaces(input: SearchPlacesInput): Place[] {
    const parsed = SearchPlacesSchema.parse(input);

    const results: Place[] = [];
    for (const place of this.places.values()) {
      const nameMatch = place.name.toLowerCase().includes(parsed.query.toLowerCase());
      const categoryMatch = place.category.toLowerCase().includes(parsed.query.toLowerCase());

      if (nameMatch || categoryMatch) {
        if (parsed.location) {
          const dist = this.calculateDistance(parsed.location, place.location);
          if (dist <= parsed.radius) {
            results.push(this.toPlace(place));
          }
        } else {
          results.push(this.toPlace(place));
        }
      }
    }

    return results;
  }

  getPlaceDetails(placeId: string): PlaceDetails {
    const place = this.places.get(placeId);
    if (!place) {
      throw createAppError('Place not found', 404, 'PLACE_NOT_FOUND');
    }
    return place;
  }

  addReview(input: AddReviewInput): Review {
    const parsed = AddReviewSchema.parse(input);

    const place = this.places.get(parsed.placeId);
    if (!place) {
      throw createAppError('Place not found', 404, 'PLACE_NOT_FOUND');
    }

    const review: Review = {
      id: randomUUID(),
      placeId: parsed.placeId,
      userId: parsed.userId,
      rating: parsed.rating,
      text: parsed.text,
      createdAt: new Date(),
    };

    const placeReviews = this.reviews.get(parsed.placeId) ?? [];
    placeReviews.push(review);
    this.reviews.set(parsed.placeId, placeReviews);

    const allReviews = placeReviews;
    place.rating = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;
    place.reviewCount = allReviews.length;

    return review;
  }

  getReviews(placeId: string): Review[] {
    const place = this.places.get(placeId);
    if (!place) {
      throw createAppError('Place not found', 404, 'PLACE_NOT_FOUND');
    }
    return this.reviews.get(placeId) ?? [];
  }

  getNearbyPlaces(input: NearbyPlacesInput): Place[] {
    const parsed = NearbyPlacesSchema.parse(input);

    const results: Place[] = [];
    for (const place of this.places.values()) {
      const dist = this.calculateDistance({ lat: parsed.lat, lng: parsed.lng }, place.location);
      if (dist <= parsed.radius) {
        if (!parsed.category || place.category === parsed.category) {
          results.push(this.toPlace(place));
        }
      }
    }

    return results;
  }

  claimBusiness(input: ClaimBusinessInput): BusinessClaim {
    const parsed = ClaimBusinessSchema.parse(input);

    const place = this.places.get(parsed.placeId);
    if (!place) {
      throw createAppError('Place not found', 404, 'PLACE_NOT_FOUND');
    }

    const existingClaim = this.claims.get(parsed.placeId);
    if (existingClaim && existingClaim.status === 'approved') {
      throw createAppError('Business already claimed', 409, 'ALREADY_CLAIMED');
    }

    const claim: BusinessClaim = {
      id: randomUUID(),
      placeId: parsed.placeId,
      ownerId: parsed.ownerId,
      status: 'pending',
      claimedAt: new Date(),
    };

    this.claims.set(parsed.placeId, claim);
    return claim;
  }

  updateBusinessInfo(input: UpdateBusinessInput): Place {
    const parsed = UpdateBusinessSchema.parse(input);

    const place = this.places.get(parsed.placeId);
    if (!place) {
      throw createAppError('Place not found', 404, 'PLACE_NOT_FOUND');
    }

    const claim = this.claims.get(parsed.placeId);
    if (!claim || claim.status !== 'approved') {
      throw createAppError('Business not claimed or claim not approved', 403, 'NOT_AUTHORIZED');
    }

    if (parsed.info.name) place.name = parsed.info.name;
    if (parsed.info.phone) place.phone = parsed.info.phone;
    if (parsed.info.website) place.website = parsed.info.website;
    if (parsed.info.description) place.description = parsed.info.description;
    if (parsed.info.hours) place.hours = parsed.info.hours;

    return this.toPlace(place);
  }

  private toPlace(details: PlaceDetails): Place {
    return {
      id: details.id,
      name: details.name,
      category: details.category,
      location: details.location,
      address: details.address,
      rating: details.rating,
      reviewCount: details.reviewCount,
      openNow: details.openNow,
      priceLevel: details.priceLevel,
      photos: details.photos,
      createdAt: details.createdAt,
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

  private seedPlaces(): void {
    const samplePlaces: Array<{ name: string; category: string; lat: number; lng: number }> = [
      { name: 'Coffee House', category: 'cafe', lat: 37.7749, lng: -122.4194 },
      { name: 'City Park', category: 'park', lat: 37.7694, lng: -122.4862 },
      { name: 'Tech Museum', category: 'museum', lat: 37.7786, lng: -122.4137 },
      { name: 'Main Library', category: 'library', lat: 37.7785, lng: -122.4156 },
      { name: 'Italian Restaurant', category: 'restaurant', lat: 37.785, lng: -122.409 },
    ];

    for (const sp of samplePlaces) {
      const id = randomUUID();
      this.places.set(id, {
        id,
        name: sp.name,
        category: sp.category,
        location: { lat: sp.lat, lng: sp.lng },
        address: `${Math.floor(sp.lat * 100)} Market St, San Francisco, CA`,
        rating: 4.0 + Math.random(),
        reviewCount: Math.floor(Math.random() * 100),
        openNow: true,
        priceLevel: Math.floor(Math.random() * 3) + 1,
        photos: [`https://photos.quantmaps.io/${id}/1.jpg`],
        createdAt: new Date(),
        phone: '+1-555-0100',
        website: `https://${sp.name.toLowerCase().replace(/\s/g, '')}.example.com`,
        hours: { monday: '9:00-17:00', tuesday: '9:00-17:00' },
        description: `A wonderful ${sp.category} in the heart of the city`,
        amenities: ['wifi', 'accessible'],
      });
    }
  }
}
