import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { createAppError } from '@quant/server-core';
import { HealthDashboardService, SetHealthGoalSchema } from '../services/health-dashboard.service';

const userIdParamSchema = z.object({
  userId: z.string().min(1),
});

export default async function healthRoutes(fastify: FastifyInstance) {
  const healthService = new HealthDashboardService();

  fastify.get<{ Params: { userId: string } }>('/:userId/dashboard', async (request, reply) => {
    const paramResult = userIdParamSchema.safeParse(request.params);
    if (!paramResult.success) {
      throw createAppError('Invalid user ID', 400, 'VALIDATION_ERROR');
    }

    const dashboard = healthService.getDashboard(paramResult.data.userId);
    return reply.send({ success: true, data: dashboard });
  });

  fastify.get<{ Params: { userId: string } }>('/:userId/score', async (request, reply) => {
    const paramResult = userIdParamSchema.safeParse(request.params);
    if (!paramResult.success) {
      throw createAppError('Invalid user ID', 400, 'VALIDATION_ERROR');
    }

    const score = healthService.getHealthScore(paramResult.data.userId);
    return reply.send({ success: true, data: score });
  });

  fastify.get<{ Params: { userId: string } }>('/:userId/insights', async (request, reply) => {
    const paramResult = userIdParamSchema.safeParse(request.params);
    if (!paramResult.success) {
      throw createAppError('Invalid user ID', 400, 'VALIDATION_ERROR');
    }

    const insights = healthService.getInsights(paramResult.data.userId);
    return reply.send({ success: true, data: insights });
  });

  fastify.get<{ Params: { userId: string }; Querystring: { period?: string } }>(
    '/:userId/trends',
    async (request, reply) => {
      const paramResult = userIdParamSchema.safeParse(request.params);
      if (!paramResult.success) {
        throw createAppError('Invalid user ID', 400, 'VALIDATION_ERROR');
      }

      const period = (request.query as { period?: string }).period ?? 'week';
      const trends = healthService.getHealthTrends(paramResult.data.userId, period);
      return reply.send({ success: true, data: trends });
    },
  );

  fastify.post<{ Params: { userId: string } }>('/:userId/goals', async (request, reply) => {
    const paramResult = userIdParamSchema.safeParse(request.params);
    if (!paramResult.success) {
      throw createAppError('Invalid user ID', 400, 'VALIDATION_ERROR');
    }

    const bodyResult = SetHealthGoalSchema.safeParse(request.body);
    if (!bodyResult.success) {
      throw createAppError('Invalid goal data', 400, 'VALIDATION_ERROR');
    }

    const goal = healthService.setHealthGoal(paramResult.data.userId, bodyResult.data);
    return reply.status(201).send({ success: true, data: goal });
  });

  fastify.get<{ Params: { userId: string } }>('/:userId/goals/progress', async (request, reply) => {
    const paramResult = userIdParamSchema.safeParse(request.params);
    if (!paramResult.success) {
      throw createAppError('Invalid user ID', 400, 'VALIDATION_ERROR');
    }

    const progress = healthService.getGoalProgress(paramResult.data.userId);
    return reply.send({ success: true, data: progress });
  });

  fastify.post<{ Params: { userId: string }; Querystring: { period?: string } }>(
    '/:userId/report',
    async (request, reply) => {
      const paramResult = userIdParamSchema.safeParse(request.params);
      if (!paramResult.success) {
        throw createAppError('Invalid user ID', 400, 'VALIDATION_ERROR');
      }

      const period = (request.query as { period?: string }).period ?? 'month';
      const report = healthService.generateReport(paramResult.data.userId, period);
      return reply.status(201).send({ success: true, data: report });
    },
  );
}
