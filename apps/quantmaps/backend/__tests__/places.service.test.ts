import { describe, it, expect, beforeEach } from 'vitest';
import { PlacesService } from '../services/places.service';

describe('PlacesService', () => {
  let service: PlacesService;

  beforeEach(() => {
    service = new PlacesService();
  });

  describe('searchPlaces', () => {
    it('finds places matching a query', () => {
      const results = service.searchPlaces({ query: 'Coffee' });

      expect(results.length).toBeGreaterThan(0);
      expect(results[0]!.name).toContain('Coffee');
    });

    it('filters by location and radius', () => {
      const results = service.searchPlaces({
        query: 'Coffee',
        location: { lat: 37.7749, lng: -122.4194 },
        radius: 5000,
      });

      expect(results.length).toBeGreaterThan(0);
    });

    it('returns empty array for no matches', () => {
      const results = service.searchPlaces({ query: 'nonexistent_xyz_place' });

      expect(results).toEqual([]);
    });

    it('matches by category', () => {
      const results = service.searchPlaces({ query: 'cafe' });

      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('getPlaceDetails', () => {
    it('returns full details for a valid place', () => {
      const places = service.searchPlaces({ query: 'Coffee' });
      const placeId = places[0]!.id;

      const details = service.getPlaceDetails(placeId);

      expect(details.id).toBe(placeId);
      expect(details.phone).toBeDefined();
      expect(details.website).toBeDefined();
      expect(details.hours).toBeDefined();
      expect(details.description).toBeDefined();
      expect(details.amenities).toBeDefined();
    });

    it('throws for non-existent place', () => {
      expect(() => service.getPlaceDetails('non-existent-id')).toThrow('Place not found');
    });
  });

  describe('addReview', () => {
    it('adds a review to a place', () => {
      const places = service.searchPlaces({ query: 'Coffee' });
      const placeId = places[0]!.id;

      const review = service.addReview({
        placeId,
        userId: 'user-1',
        rating: 5,
        text: 'Excellent coffee!',
      });

      expect(review.id).toBeDefined();
      expect(review.placeId).toBe(placeId);
      expect(review.userId).toBe('user-1');
      expect(review.rating).toBe(5);
      expect(review.text).toBe('Excellent coffee!');
      expect(review.createdAt).toBeInstanceOf(Date);
    });

    it('updates place rating after adding review', () => {
      const places = service.searchPlaces({ query: 'Coffee' });
      const placeId = places[0]!.id;

      service.addReview({ placeId, userId: 'user-1', rating: 5, text: 'Great!' });
      service.addReview({ placeId, userId: 'user-2', rating: 3, text: 'OK' });

      const details = service.getPlaceDetails(placeId);
      expect(details.reviewCount).toBe(2);
    });

    it('throws for non-existent place', () => {
      expect(() =>
        service.addReview({
          placeId: 'fake-id',
          userId: 'user-1',
          rating: 5,
          text: 'Great!',
        }),
      ).toThrow('Place not found');
    });
  });

  describe('getReviews', () => {
    it('returns reviews for a place', () => {
      const places = service.searchPlaces({ query: 'Coffee' });
      const placeId = places[0]!.id;

      service.addReview({ placeId, userId: 'user-1', rating: 4, text: 'Good coffee' });
      service.addReview({ placeId, userId: 'user-2', rating: 5, text: 'Amazing!' });

      const reviews = service.getReviews(placeId);

      expect(reviews).toHaveLength(2);
      expect(reviews[0]!.userId).toBe('user-1');
      expect(reviews[1]!.userId).toBe('user-2');
    });

    it('returns empty array for place with no reviews', () => {
      const places = service.searchPlaces({ query: 'Park' });
      const placeId = places[0]!.id;

      const reviews = service.getReviews(placeId);

      expect(reviews).toEqual([]);
    });
  });

  describe('getNearbyPlaces', () => {
    it('finds places within radius', () => {
      const results = service.getNearbyPlaces({
        lat: 37.7749,
        lng: -122.4194,
        radius: 5000,
      });

      expect(results.length).toBeGreaterThan(0);
    });

    it('filters by category', () => {
      const results = service.getNearbyPlaces({
        lat: 37.7749,
        lng: -122.4194,
        radius: 50000,
        category: 'cafe',
      });

      for (const place of results) {
        expect(place.category).toBe('cafe');
      }
    });

    it('returns empty for very small radius', () => {
      const results = service.getNearbyPlaces({
        lat: 0,
        lng: 0,
        radius: 100,
      });

      expect(results).toEqual([]);
    });
  });

  describe('claimBusiness', () => {
    it('creates a pending business claim', () => {
      const places = service.searchPlaces({ query: 'Coffee' });
      const placeId = places[0]!.id;

      const claim = service.claimBusiness({ placeId, ownerId: 'owner-1' });

      expect(claim.id).toBeDefined();
      expect(claim.placeId).toBe(placeId);
      expect(claim.ownerId).toBe('owner-1');
      expect(claim.status).toBe('pending');
      expect(claim.claimedAt).toBeInstanceOf(Date);
    });

    it('throws for non-existent place', () => {
      expect(() => service.claimBusiness({ placeId: 'fake-id', ownerId: 'owner-1' })).toThrow(
        'Place not found',
      );
    });
  });

  describe('updateBusinessInfo', () => {
    it('throws when business is not claimed', () => {
      const places = service.searchPlaces({ query: 'Coffee' });
      const placeId = places[0]!.id;

      expect(() =>
        service.updateBusinessInfo({
          placeId,
          info: { name: 'New Name' },
        }),
      ).toThrow('Business not claimed or claim not approved');
    });
  });
});
