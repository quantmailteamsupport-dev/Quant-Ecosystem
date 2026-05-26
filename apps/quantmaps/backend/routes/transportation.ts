import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { createAppError } from '@quant/server-core';
import {
  TransportationService,
  RideEstimateSchema,
  RequestRideSchema,
  PublicTransitSchema,
  TransitScheduleSchema,
} from '../services/transportation.service';

const rideIdParamSchema = z.object({
  id: z.string().min(1),
});

const trackingIdParamSchema = z.object({
  trackingId: z.string().min(1),
});

export default async function transportationRoutes(fastify: FastifyInstance) {
  const transportationService = new TransportationService();

  fastify.post('/rides/estimate', async (request, reply) => {
    const parseResult = RideEstimateSchema.safeParse(request.body);
    if (!parseResult.success) {
      throw createAppError('Invalid ride estimate input', 400, 'VALIDATION_ERROR');
    }
    const estimate = transportationService.getRideEstimate(parseResult.data);
    return reply.send({ success: true, data: estimate });
  });

  fastify.post('/rides', async (request, reply) => {
    const parseResult = RequestRideSchema.safeParse(request.body);
    if (!parseResult.success) {
      throw createAppError('Invalid ride request input', 400, 'VALIDATION_ERROR');
    }
    const ride = transportationService.requestRide(parseResult.data);
    return reply.status(201).send({ success: true, data: ride });
  });

  fastify.delete<{ Params: { id: string } }>('/rides/:id', async (request, reply) => {
    const paramResult = rideIdParamSchema.safeParse(request.params);
    if (!paramResult.success) {
      throw createAppError('Invalid ride ID', 400, 'VALIDATION_ERROR');
    }
    transportationService.cancelRide(paramResult.data.id);
    return reply.send({ success: true, data: null });
  });

  fastify.get<{ Params: { trackingId: string } }>(
    '/deliveries/:trackingId',
    async (request, reply) => {
      const paramResult = trackingIdParamSchema.safeParse(request.params);
      if (!paramResult.success) {
        throw createAppError('Invalid tracking ID', 400, 'VALIDATION_ERROR');
      }
      const status = transportationService.trackDelivery(paramResult.data.trackingId);
      return reply.send({ success: true, data: status });
    },
  );

  fastify.post('/transit/routes', async (request, reply) => {
    const parseResult = PublicTransitSchema.safeParse(request.body);
    if (!parseResult.success) {
      throw createAppError('Invalid transit input', 400, 'VALIDATION_ERROR');
    }
    const routes = transportationService.getPublicTransit(parseResult.data);
    return reply.send({ success: true, data: routes });
  });

  fastify.post('/transit/schedule', async (request, reply) => {
    const parseResult = TransitScheduleSchema.safeParse(request.body);
    if (!parseResult.success) {
      throw createAppError('Invalid schedule input', 400, 'VALIDATION_ERROR');
    }
    const schedule = transportationService.getTransitSchedule(parseResult.data);
    return reply.send({ success: true, data: schedule });
  });
}
