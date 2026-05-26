import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { createAppError } from '@quant/server-core';
import { CodeSandboxService, CreateSandboxSchema } from '../services/code-sandbox.service';

const idParamSchema = z.object({ id: z.string().min(1) });

export default async function sandboxRoutes(fastify: FastifyInstance) {
  const sandboxService = new CodeSandboxService();

  fastify.post('/', async (request, reply) => {
    const parseResult = CreateSandboxSchema.safeParse(request.body);
    if (!parseResult.success) {
      throw createAppError('Invalid sandbox data', 400, 'VALIDATION_ERROR');
    }

    const { userId, language } = parseResult.data;
    const sandbox = sandboxService.createSandbox(userId, language);
    return reply.status(201).send({ success: true, data: sandbox });
  });

  fastify.post<{ Params: { id: string } }>('/:id/execute', async (request, reply) => {
    const paramResult = idParamSchema.safeParse(request.params);
    if (!paramResult.success) {
      throw createAppError('Invalid sandbox ID', 400, 'VALIDATION_ERROR');
    }

    const body = request.body as { code?: string };
    if (!body.code) {
      throw createAppError('Code is required', 400, 'VALIDATION_ERROR');
    }

    const result = sandboxService.executeCode(paramResult.data.id, body.code);
    return reply.send({ success: true, data: result });
  });

  fastify.get<{ Params: { id: string } }>('/:id/output', async (request, reply) => {
    const paramResult = idParamSchema.safeParse(request.params);
    if (!paramResult.success) {
      throw createAppError('Invalid sandbox ID', 400, 'VALIDATION_ERROR');
    }

    const output = sandboxService.getOutput(paramResult.data.id);
    return reply.send({ success: true, data: output });
  });

  fastify.post<{ Params: { id: string } }>('/:id/reset', async (request, reply) => {
    const paramResult = idParamSchema.safeParse(request.params);
    if (!paramResult.success) {
      throw createAppError('Invalid sandbox ID', 400, 'VALIDATION_ERROR');
    }

    const sandbox = sandboxService.resetSandbox(paramResult.data.id);
    return reply.send({ success: true, data: sandbox });
  });

  fastify.post<{ Params: { id: string } }>('/:id/submit', async (request, reply) => {
    const paramResult = idParamSchema.safeParse(request.params);
    if (!paramResult.success) {
      throw createAppError('Invalid sandbox ID', 400, 'VALIDATION_ERROR');
    }

    const body = request.body as { exerciseId?: string };
    if (!body.exerciseId) {
      throw createAppError('Exercise ID is required', 400, 'VALIDATION_ERROR');
    }

    const result = sandboxService.submitSolution(paramResult.data.id, body.exerciseId);
    return reply.send({ success: true, data: result });
  });

  fastify.post<{ Params: { id: string } }>('/:id/test', async (request, reply) => {
    const paramResult = idParamSchema.safeParse(request.params);
    if (!paramResult.success) {
      throw createAppError('Invalid sandbox ID', 400, 'VALIDATION_ERROR');
    }

    const body = request.body as {
      testCases?: Array<{ name: string; input: string; expectedOutput: string }>;
    };
    if (!body.testCases || !Array.isArray(body.testCases)) {
      throw createAppError('Test cases are required', 400, 'VALIDATION_ERROR');
    }

    const results = sandboxService.runTests(paramResult.data.id, body.testCases);
    return reply.send({ success: true, data: results });
  });

  fastify.get('/languages', async (_request, reply) => {
    const languages = sandboxService.getLanguages();
    return reply.send({ success: true, data: languages });
  });

  fastify.delete<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const paramResult = idParamSchema.safeParse(request.params);
    if (!paramResult.success) {
      throw createAppError('Invalid sandbox ID', 400, 'VALIDATION_ERROR');
    }

    sandboxService.destroySandbox(paramResult.data.id);
    return reply.send({ success: true, data: null });
  });
}
