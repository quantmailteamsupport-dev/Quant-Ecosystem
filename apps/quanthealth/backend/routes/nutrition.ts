import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { createAppError } from '@quant/server-core';
import {
  NutritionService,
  LogMealSchema,
  SetNutritionGoalsSchema,
} from '../services/nutrition.service';

const userIdParamSchema = z.object({
  userId: z.string().min(1),
});

export default async function nutritionRoutes(fastify: FastifyInstance) {
  const nutritionService = new NutritionService();

  fastify.post<{ Params: { userId: string } }>('/:userId/meals', async (request, reply) => {
    const paramResult = userIdParamSchema.safeParse(request.params);
    if (!paramResult.success) {
      throw createAppError('Invalid user ID', 400, 'VALIDATION_ERROR');
    }

    const bodyResult = LogMealSchema.safeParse(request.body);
    if (!bodyResult.success) {
      throw createAppError('Invalid meal data', 400, 'VALIDATION_ERROR');
    }

    const meal = nutritionService.logMeal(paramResult.data.userId, bodyResult.data);
    return reply.status(201).send({ success: true, data: meal });
  });

  fastify.get('/search', async (request, reply) => {
    const query = (request.query as { q?: string }).q;
    if (!query) {
      throw createAppError('Search query is required', 400, 'VALIDATION_ERROR');
    }

    const results = nutritionService.searchFood(query);
    return reply.send({ success: true, data: results });
  });

  fastify.get<{ Params: { userId: string }; Querystring: { date?: string } }>(
    '/:userId/macros',
    async (request, reply) => {
      const paramResult = userIdParamSchema.safeParse(request.params);
      if (!paramResult.success) {
        throw createAppError('Invalid user ID', 400, 'VALIDATION_ERROR');
      }

      const date =
        (request.query as { date?: string }).date ?? new Date().toISOString().split('T')[0] ?? '';
      const macros = nutritionService.getMacros(paramResult.data.userId, date);
      return reply.send({ success: true, data: macros });
    },
  );

  fastify.get<{ Params: { userId: string }; Querystring: { date?: string } }>(
    '/:userId/intake',
    async (request, reply) => {
      const paramResult = userIdParamSchema.safeParse(request.params);
      if (!paramResult.success) {
        throw createAppError('Invalid user ID', 400, 'VALIDATION_ERROR');
      }

      const date =
        (request.query as { date?: string }).date ?? new Date().toISOString().split('T')[0] ?? '';
      const intake = nutritionService.getDailyIntake(paramResult.data.userId, date);
      return reply.send({ success: true, data: intake });
    },
  );

  fastify.post<{ Params: { userId: string } }>('/:userId/meal-plan', async (request, reply) => {
    const paramResult = userIdParamSchema.safeParse(request.params);
    if (!paramResult.success) {
      throw createAppError('Invalid user ID', 400, 'VALIDATION_ERROR');
    }

    const preferences = (request.body as Record<string, unknown>) ?? {};
    const plan = nutritionService.createMealPlan(paramResult.data.userId, preferences);
    return reply.status(201).send({ success: true, data: plan });
  });

  fastify.post<{ Params: { userId: string } }>('/:userId/recipes', async (request, reply) => {
    const paramResult = userIdParamSchema.safeParse(request.params);
    if (!paramResult.success) {
      throw createAppError('Invalid user ID', 400, 'VALIDATION_ERROR');
    }

    const macroGoals = (request.body as Record<string, unknown>) ?? {};
    const recipes = nutritionService.getRecipeSuggestions(paramResult.data.userId, macroGoals);
    return reply.send({ success: true, data: recipes });
  });

  fastify.post<{ Params: { userId: string } }>('/:userId/goals', async (request, reply) => {
    const paramResult = userIdParamSchema.safeParse(request.params);
    if (!paramResult.success) {
      throw createAppError('Invalid user ID', 400, 'VALIDATION_ERROR');
    }

    const bodyResult = SetNutritionGoalsSchema.safeParse(request.body);
    if (!bodyResult.success) {
      throw createAppError('Invalid nutrition goals', 400, 'VALIDATION_ERROR');
    }

    const goals = nutritionService.setNutritionGoals(paramResult.data.userId, bodyResult.data);
    return reply.status(201).send({ success: true, data: goals });
  });

  fastify.get('/barcode/:barcode', async (request, reply) => {
    const barcode = (request.params as { barcode?: string }).barcode;
    if (!barcode) {
      throw createAppError('Barcode is required', 400, 'VALIDATION_ERROR');
    }

    const food = nutritionService.scanBarcode(barcode);
    return reply.send({ success: true, data: food });
  });
}
