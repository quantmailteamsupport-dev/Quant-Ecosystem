import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { createAppError } from '@quant/server-core';
import {
  DirectionsService,
  RouteSchema,
  WaypointsSchema,
  ETASchema,
  TrafficSchema,
} from '../services/directions.service';

const routeIdParamSchema = z.object({
  id: z.string().min(1),
});

export default async function directionsRoutes(fastify: FastifyInstance) {
  const directionsService = new DirectionsService();

  fastify.post('/route', async (request, reply) => {
    const parseResult = RouteSchema.safeParse(request.body);
    if (!parseResult.success) {
      throw createAppError('Invalid route input', 400, 'VALIDATION_ERROR');
    }
    const route = directionsService.getRoute(parseResult.data);
    return reply.send({ success: true, data: route });
  });

  fastify.post('/alternatives', async (request, reply) => {
    const parseResult = RouteSchema.safeParse(request.body);
    if (!parseResult.success) {
      throw createAppError('Invalid route input', 400, 'VALIDATION_ERROR');
    }
    const routes = directionsService.getAlternativeRoutes(parseResult.data);
    return reply.send({ success: true, data: routes });
  });

  fastify.post('/optimize', async (request, reply) => {
    const parseResult = WaypointsSchema.safeParse(request.body);
    if (!parseResult.success) {
      throw createAppError('Invalid waypoints input', 400, 'VALIDATION_ERROR');
    }
    const optimized = directionsService.optimizeWaypoints(parseResult.data);
    return reply.send({ success: true, data: optimized });
  });

  fastify.post('/eta', async (request, reply) => {
    const parseResult = ETASchema.safeParse(request.body);
    if (!parseResult.success) {
      throw createAppError('Invalid ETA input', 400, 'VALIDATION_ERROR');
    }
    const eta = directionsService.getETA(parseResult.data);
    return reply.send({ success: true, data: eta });
  });

  fastify.post('/traffic', async (request, reply) => {
    const parseResult = TrafficSchema.safeParse(request.body);
    if (!parseResult.success) {
      throw createAppError('Invalid traffic input', 400, 'VALIDATION_ERROR');
    }
    const traffic = directionsService.getTrafficConditions(parseResult.data);
    return reply.send({ success: true, data: traffic });
  });

  fastify.get<{ Params: { id: string } }>('/:id/navigation', async (request, reply) => {
    const paramResult = routeIdParamSchema.safeParse(request.params);
    if (!paramResult.success) {
      throw createAppError('Invalid route ID', 400, 'VALIDATION_ERROR');
    }
    const instructions = directionsService.getNavigationInstructions(paramResult.data.id);
    return reply.send({ success: true, data: instructions });
  });
}
