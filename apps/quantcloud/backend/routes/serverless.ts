import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { createAppError } from '@quant/server-core';
import {
  ServerlessService,
  DeployFunctionSchema,
  SetTriggerSchema,
} from '../services/serverless.service';

const idParamSchema = z.object({
  id: z.string().min(1),
});

export default async function serverlessRoutes(fastify: FastifyInstance) {
  const service = new ServerlessService();

  fastify.post('/functions', async (request, reply) => {
    const parseResult = DeployFunctionSchema.safeParse(request.body);
    if (!parseResult.success) {
      throw createAppError('Invalid function configuration', 400, 'VALIDATION_ERROR');
    }
    const fn = service.deployFunction(parseResult.data);
    return reply.status(201).send({ success: true, data: fn });
  });

  fastify.get('/functions', async (_request, reply) => {
    const functions = service.listFunctions();
    return reply.send({ success: true, data: functions });
  });

  fastify.delete<{ Params: { id: string } }>('/functions/:id', async (request, reply) => {
    const paramResult = idParamSchema.safeParse(request.params);
    if (!paramResult.success) {
      throw createAppError('Invalid function ID', 400, 'VALIDATION_ERROR');
    }
    service.deleteFunction(paramResult.data.id);
    return reply.send({ success: true, data: null });
  });

  fastify.post<{ Params: { id: string } }>('/functions/:id/invoke', async (request, reply) => {
    const paramResult = idParamSchema.safeParse(request.params);
    if (!paramResult.success) {
      throw createAppError('Invalid function ID', 400, 'VALIDATION_ERROR');
    }
    const result = service.invokeFunction(paramResult.data.id, request.body);
    return reply.send({ success: true, data: result });
  });

  fastify.get<{ Params: { id: string } }>('/functions/:id/logs', async (request, reply) => {
    const paramResult = idParamSchema.safeParse(request.params);
    if (!paramResult.success) {
      throw createAppError('Invalid function ID', 400, 'VALIDATION_ERROR');
    }
    const logs = service.getFunctionLogs(paramResult.data.id);
    return reply.send({ success: true, data: logs });
  });

  fastify.post<{ Params: { id: string } }>('/functions/:id/triggers', async (request, reply) => {
    const paramResult = idParamSchema.safeParse(request.params);
    if (!paramResult.success) {
      throw createAppError('Invalid function ID', 400, 'VALIDATION_ERROR');
    }
    const bodyResult = SetTriggerSchema.safeParse(request.body);
    if (!bodyResult.success) {
      throw createAppError('Invalid trigger configuration', 400, 'VALIDATION_ERROR');
    }
    const trigger = service.setTrigger(paramResult.data.id, bodyResult.data);
    return reply.status(201).send({ success: true, data: trigger });
  });

  fastify.get<{ Params: { id: string } }>('/functions/:id/metrics', async (request, reply) => {
    const paramResult = idParamSchema.safeParse(request.params);
    if (!paramResult.success) {
      throw createAppError('Invalid function ID', 400, 'VALIDATION_ERROR');
    }
    const metrics = service.getInvocationMetrics(paramResult.data.id);
    return reply.send({ success: true, data: metrics });
  });
}
