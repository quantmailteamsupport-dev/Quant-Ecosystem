import type { FastifyInstance } from 'fastify';
import { createAppError } from '@quant/server-core';
import {
  MapsService,
  GeocodeSchema,
  ReverseGeocodeSchema,
  TileSchema,
  StaticMapSchema,
  ElevationSchema,
  BoundsSchema,
  StreetViewSchema,
} from '../services/maps.service';

export default async function mapsRoutes(fastify: FastifyInstance) {
  const mapsService = new MapsService();

  fastify.post('/geocode', async (request, reply) => {
    const parseResult = GeocodeSchema.safeParse(request.body);
    if (!parseResult.success) {
      throw createAppError('Invalid geocode input', 400, 'VALIDATION_ERROR');
    }
    const result = mapsService.geocode(parseResult.data);
    return reply.send({ success: true, data: result });
  });

  fastify.post('/reverse-geocode', async (request, reply) => {
    const parseResult = ReverseGeocodeSchema.safeParse(request.body);
    if (!parseResult.success) {
      throw createAppError('Invalid reverse geocode input', 400, 'VALIDATION_ERROR');
    }
    const result = mapsService.reverseGeocode(parseResult.data);
    return reply.send({ success: true, data: result });
  });

  fastify.get<{ Params: { zoom: string; x: string; y: string } }>(
    '/tiles/:zoom/:x/:y',
    async (request, reply) => {
      const parseResult = TileSchema.safeParse({
        zoom: Number(request.params.zoom),
        x: Number(request.params.x),
        y: Number(request.params.y),
      });
      if (!parseResult.success) {
        throw createAppError('Invalid tile parameters', 400, 'VALIDATION_ERROR');
      }
      const result = mapsService.getTile(parseResult.data);
      return reply.send({ success: true, data: result });
    },
  );

  fastify.post('/static', async (request, reply) => {
    const parseResult = StaticMapSchema.safeParse(request.body);
    if (!parseResult.success) {
      throw createAppError('Invalid static map input', 400, 'VALIDATION_ERROR');
    }
    const result = mapsService.getStaticMap(parseResult.data);
    return reply.send({ success: true, data: result });
  });

  fastify.post('/elevation', async (request, reply) => {
    const parseResult = ElevationSchema.safeParse(request.body);
    if (!parseResult.success) {
      throw createAppError('Invalid elevation input', 400, 'VALIDATION_ERROR');
    }
    const result = mapsService.getElevation(parseResult.data);
    return reply.send({ success: true, data: result });
  });

  fastify.post('/3d-buildings', async (request, reply) => {
    const parseResult = BoundsSchema.safeParse(request.body);
    if (!parseResult.success) {
      throw createAppError('Invalid bounds input', 400, 'VALIDATION_ERROR');
    }
    const result = mapsService.get3DBuildings(parseResult.data);
    return reply.send({ success: true, data: result });
  });

  fastify.post('/street-view', async (request, reply) => {
    const parseResult = StreetViewSchema.safeParse(request.body);
    if (!parseResult.success) {
      throw createAppError('Invalid street view input', 400, 'VALIDATION_ERROR');
    }
    const result = mapsService.getStreetView(parseResult.data);
    return reply.send({ success: true, data: result });
  });
}
