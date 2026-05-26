import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { createAppError } from '@quant/server-core';
import { ComputeService, CreateVMSchema, ResizeVMSchema } from '../services/compute.service';

const idParamSchema = z.object({
  id: z.string().min(1),
});

export default async function computeRoutes(fastify: FastifyInstance) {
  const service = new ComputeService();

  fastify.post('/vms', async (request, reply) => {
    const parseResult = CreateVMSchema.safeParse(request.body);
    if (!parseResult.success) {
      throw createAppError('Invalid VM configuration', 400, 'VALIDATION_ERROR');
    }
    const vm = service.createVM(parseResult.data);
    return reply.status(201).send({ success: true, data: vm });
  });

  fastify.get('/vms', async (request, reply) => {
    const query = request.query as Record<string, string | undefined>;
    const vms = service.listVMs({ region: query['region'], status: query['status'] });
    return reply.send({ success: true, data: vms });
  });

  fastify.get<{ Params: { id: string } }>('/vms/:id/metrics', async (request, reply) => {
    const paramResult = idParamSchema.safeParse(request.params);
    if (!paramResult.success) {
      throw createAppError('Invalid VM ID', 400, 'VALIDATION_ERROR');
    }
    const metrics = service.getVMMetrics(paramResult.data.id);
    return reply.send({ success: true, data: metrics });
  });

  fastify.post<{ Params: { id: string } }>('/vms/:id/start', async (request, reply) => {
    const paramResult = idParamSchema.safeParse(request.params);
    if (!paramResult.success) {
      throw createAppError('Invalid VM ID', 400, 'VALIDATION_ERROR');
    }
    const vm = service.startVM(paramResult.data.id);
    return reply.send({ success: true, data: vm });
  });

  fastify.post<{ Params: { id: string } }>('/vms/:id/stop', async (request, reply) => {
    const paramResult = idParamSchema.safeParse(request.params);
    if (!paramResult.success) {
      throw createAppError('Invalid VM ID', 400, 'VALIDATION_ERROR');
    }
    const vm = service.stopVM(paramResult.data.id);
    return reply.send({ success: true, data: vm });
  });

  fastify.patch<{ Params: { id: string } }>('/vms/:id/resize', async (request, reply) => {
    const paramResult = idParamSchema.safeParse(request.params);
    if (!paramResult.success) {
      throw createAppError('Invalid VM ID', 400, 'VALIDATION_ERROR');
    }
    const bodyResult = ResizeVMSchema.safeParse(request.body);
    if (!bodyResult.success) {
      throw createAppError('Invalid resize configuration', 400, 'VALIDATION_ERROR');
    }
    const vm = service.resizeVM(paramResult.data.id, bodyResult.data);
    return reply.send({ success: true, data: vm });
  });

  fastify.post<{ Params: { id: string } }>('/vms/:id/snapshots', async (request, reply) => {
    const paramResult = idParamSchema.safeParse(request.params);
    if (!paramResult.success) {
      throw createAppError('Invalid VM ID', 400, 'VALIDATION_ERROR');
    }
    const body = request.body as { name?: string };
    const name = body?.name ?? `snapshot-${Date.now()}`;
    const snapshot = service.createSnapshot(paramResult.data.id, name);
    return reply.status(201).send({ success: true, data: snapshot });
  });

  fastify.delete<{ Params: { id: string } }>('/vms/:id', async (request, reply) => {
    const paramResult = idParamSchema.safeParse(request.params);
    if (!paramResult.success) {
      throw createAppError('Invalid VM ID', 400, 'VALIDATION_ERROR');
    }
    service.deleteVM(paramResult.data.id);
    return reply.send({ success: true, data: null });
  });
}
