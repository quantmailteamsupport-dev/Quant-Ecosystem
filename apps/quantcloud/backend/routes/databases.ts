import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { createAppError } from '@quant/server-core';
import {
  ManagedDatabaseService,
  ProvisionDatabaseSchema,
  ScaleDatabaseSchema,
} from '../services/managed-db.service';

const idParamSchema = z.object({
  id: z.string().min(1),
});

export default async function databasesRoutes(fastify: FastifyInstance) {
  const service = new ManagedDatabaseService();

  fastify.post('/', async (request, reply) => {
    const parseResult = ProvisionDatabaseSchema.safeParse(request.body);
    if (!parseResult.success) {
      throw createAppError('Invalid database configuration', 400, 'VALIDATION_ERROR');
    }
    const db = service.provisionDatabase(parseResult.data);
    return reply.status(201).send({ success: true, data: db });
  });

  fastify.get('/', async (_request, reply) => {
    const databases = service.listDatabases();
    return reply.send({ success: true, data: databases });
  });

  fastify.delete<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const paramResult = idParamSchema.safeParse(request.params);
    if (!paramResult.success) {
      throw createAppError('Invalid database ID', 400, 'VALIDATION_ERROR');
    }
    service.deleteDatabase(paramResult.data.id);
    return reply.send({ success: true, data: null });
  });

  fastify.patch<{ Params: { id: string } }>('/:id/scale', async (request, reply) => {
    const paramResult = idParamSchema.safeParse(request.params);
    if (!paramResult.success) {
      throw createAppError('Invalid database ID', 400, 'VALIDATION_ERROR');
    }
    const bodyResult = ScaleDatabaseSchema.safeParse(request.body);
    if (!bodyResult.success) {
      throw createAppError('Invalid scale configuration', 400, 'VALIDATION_ERROR');
    }
    const db = service.scaleDatabase(paramResult.data.id, bodyResult.data);
    return reply.send({ success: true, data: db });
  });

  fastify.post<{ Params: { id: string } }>('/:id/backups', async (request, reply) => {
    const paramResult = idParamSchema.safeParse(request.params);
    if (!paramResult.success) {
      throw createAppError('Invalid database ID', 400, 'VALIDATION_ERROR');
    }
    const body = request.body as { name?: string };
    const name = body?.name ?? `backup-${Date.now()}`;
    const backup = service.createBackup(paramResult.data.id, name);
    return reply.status(201).send({ success: true, data: backup });
  });

  fastify.post<{ Params: { id: string; backupId: string } }>(
    '/:id/backups/:backupId/restore',
    async (request, reply) => {
      const params = request.params as { id: string; backupId: string };
      const db = service.restoreBackup(params.id, params.backupId);
      return reply.send({ success: true, data: db });
    },
  );

  fastify.get<{ Params: { id: string } }>('/:id/connection-string', async (request, reply) => {
    const paramResult = idParamSchema.safeParse(request.params);
    if (!paramResult.success) {
      throw createAppError('Invalid database ID', 400, 'VALIDATION_ERROR');
    }
    const connectionString = service.getConnectionString(paramResult.data.id);
    return reply.send({ success: true, data: { connectionString } });
  });

  fastify.get<{ Params: { id: string } }>('/:id/metrics', async (request, reply) => {
    const paramResult = idParamSchema.safeParse(request.params);
    if (!paramResult.success) {
      throw createAppError('Invalid database ID', 400, 'VALIDATION_ERROR');
    }
    const metrics = service.getMetrics(paramResult.data.id);
    return reply.send({ success: true, data: metrics });
  });
}
