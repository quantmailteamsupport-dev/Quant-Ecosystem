import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { createAppError } from '@quant/server-core';
import {
  PlacesService,
  SearchPlacesSchema,
  NearbyPlacesSchema,
  AddReviewSchema,
  ClaimBusinessSchema,
  UpdateBusinessSchema,
} from '../services/places.service';

const placeIdParamSchema = z.object({
  id: z.string().min(1),
});

export default async function placesRoutes(fastify: FastifyInstance) {
  const placesService = new PlacesService();

  fastify.post('/search', async (request, reply) => {
    const parseResult = SearchPlacesSchema.safeParse(request.body);
    if (!parseResult.success) {
      throw createAppError('Invalid search input', 400, 'VALIDATION_ERROR');
    }
    const results = placesService.searchPlaces(parseResult.data);
    return reply.send({ success: true, data: results });
  });

  fastify.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const paramResult = placeIdParamSchema.safeParse(request.params);
    if (!paramResult.success) {
      throw createAppError('Invalid place ID', 400, 'VALIDATION_ERROR');
    }
    const place = placesService.getPlaceDetails(paramResult.data.id);
    return reply.send({ success: true, data: place });
  });

  fastify.post('/reviews', async (request, reply) => {
    const parseResult = AddReviewSchema.safeParse(request.body);
    if (!parseResult.success) {
      throw createAppError('Invalid review input', 400, 'VALIDATION_ERROR');
    }
    const review = placesService.addReview(parseResult.data);
    return reply.status(201).send({ success: true, data: review });
  });

  fastify.get<{ Params: { id: string } }>('/:id/reviews', async (request, reply) => {
    const paramResult = placeIdParamSchema.safeParse(request.params);
    if (!paramResult.success) {
      throw createAppError('Invalid place ID', 400, 'VALIDATION_ERROR');
    }
    const reviews = placesService.getReviews(paramResult.data.id);
    return reply.send({ success: true, data: reviews });
  });

  fastify.post('/nearby', async (request, reply) => {
    const parseResult = NearbyPlacesSchema.safeParse(request.body);
    if (!parseResult.success) {
      throw createAppError('Invalid nearby search input', 400, 'VALIDATION_ERROR');
    }
    const results = placesService.getNearbyPlaces(parseResult.data);
    return reply.send({ success: true, data: results });
  });

  fastify.post('/claim', async (request, reply) => {
    const parseResult = ClaimBusinessSchema.safeParse(request.body);
    if (!parseResult.success) {
      throw createAppError('Invalid claim input', 400, 'VALIDATION_ERROR');
    }
    const claim = placesService.claimBusiness(parseResult.data);
    return reply.status(201).send({ success: true, data: claim });
  });

  fastify.put('/business', async (request, reply) => {
    const parseResult = UpdateBusinessSchema.safeParse(request.body);
    if (!parseResult.success) {
      throw createAppError('Invalid business update input', 400, 'VALIDATION_ERROR');
    }
    const place = placesService.updateBusinessInfo(parseResult.data);
    return reply.send({ success: true, data: place });
  });
}
