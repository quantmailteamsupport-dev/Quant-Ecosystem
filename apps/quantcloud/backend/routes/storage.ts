import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { createAppError } from '@quant/server-core';
import {
  ObjectStorageService,
  CreateBucketSchema,
  PutObjectSchema,
} from '../services/object-storage.service';

const bucketParamSchema = z.object({
  bucket: z.string().min(1),
});

export default async function storageRoutes(fastify: FastifyInstance) {
  const service = new ObjectStorageService();

  fastify.post('/buckets', async (request, reply) => {
    const parseResult = CreateBucketSchema.safeParse(request.body);
    if (!parseResult.success) {
      throw createAppError('Invalid bucket configuration', 400, 'VALIDATION_ERROR');
    }
    const bucket = service.createBucket(parseResult.data);
    return reply.status(201).send({ success: true, data: bucket });
  });

  fastify.delete<{ Params: { bucket: string } }>('/buckets/:bucket', async (request, reply) => {
    const paramResult = bucketParamSchema.safeParse(request.params);
    if (!paramResult.success) {
      throw createAppError('Invalid bucket name', 400, 'VALIDATION_ERROR');
    }
    service.deleteBucket(paramResult.data.bucket);
    return reply.send({ success: true, data: null });
  });

  fastify.get<{ Params: { bucket: string } }>(
    '/buckets/:bucket/objects',
    async (request, reply) => {
      const paramResult = bucketParamSchema.safeParse(request.params);
      if (!paramResult.success) {
        throw createAppError('Invalid bucket name', 400, 'VALIDATION_ERROR');
      }
      const query = request.query as Record<string, string | undefined>;
      const objects = service.listObjects(paramResult.data.bucket, query['prefix']);
      return reply.send({ success: true, data: objects });
    },
  );

  fastify.put('/objects', async (request, reply) => {
    const parseResult = PutObjectSchema.safeParse(request.body);
    if (!parseResult.success) {
      throw createAppError('Invalid object data', 400, 'VALIDATION_ERROR');
    }
    const obj = service.putObject(parseResult.data);
    return reply.status(201).send({ success: true, data: obj });
  });

  fastify.get<{ Params: { bucket: string; key: string } }>(
    '/buckets/:bucket/objects/:key',
    async (request, reply) => {
      const params = request.params as { bucket: string; key: string };
      const obj = service.getObject(params.bucket, params.key);
      return reply.send({ success: true, data: obj });
    },
  );

  fastify.delete<{ Params: { bucket: string; key: string } }>(
    '/buckets/:bucket/objects/:key',
    async (request, reply) => {
      const params = request.params as { bucket: string; key: string };
      service.deleteObject(params.bucket, params.key);
      return reply.send({ success: true, data: null });
    },
  );

  fastify.post<{ Params: { bucket: string; key: string } }>(
    '/buckets/:bucket/objects/:key/presigned',
    async (request, reply) => {
      const params = request.params as { bucket: string; key: string };
      const body = request.body as { expiresIn?: number };
      const url = service.generatePresignedUrl(params.bucket, params.key, body?.expiresIn ?? 3600);
      return reply.send({ success: true, data: { url } });
    },
  );

  fastify.get<{ Params: { bucket: string } }>(
    '/buckets/:bucket/metrics',
    async (request, reply) => {
      const paramResult = bucketParamSchema.safeParse(request.params);
      if (!paramResult.success) {
        throw createAppError('Invalid bucket name', 400, 'VALIDATION_ERROR');
      }
      const metrics = service.getStorageMetrics(paramResult.data.bucket);
      return reply.send({ success: true, data: metrics });
    },
  );
}
