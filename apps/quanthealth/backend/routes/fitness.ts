import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { createAppError } from '@quant/server-core';
import {
  ActivityTrackerService,
  LogActivitySchema,
  EndWorkoutSchema,
  GetWorkoutsFilterSchema,
} from '../services/activity-tracker.service';
import {
  SleepAnalysisService,
  LogSleepSchema,
  SetSleepGoalSchema,
} from '../services/sleep-analysis.service';
import { WearableIntegrationService, PairDeviceSchema } from '../services/wearable.service';

const userIdParamSchema = z.object({
  userId: z.string().min(1),
});

const idParamSchema = z.object({
  id: z.string().min(1),
});

export default async function fitnessRoutes(fastify: FastifyInstance) {
  const activityService = new ActivityTrackerService();
  const sleepService = new SleepAnalysisService();
  const wearableService = new WearableIntegrationService();

  // Activity routes
  fastify.post<{ Params: { userId: string } }>('/activity/:userId', async (request, reply) => {
    const paramResult = userIdParamSchema.safeParse(request.params);
    if (!paramResult.success) {
      throw createAppError('Invalid user ID', 400, 'VALIDATION_ERROR');
    }

    const bodyResult = LogActivitySchema.safeParse(request.body);
    if (!bodyResult.success) {
      throw createAppError('Invalid activity data', 400, 'VALIDATION_ERROR');
    }

    const activity = activityService.logActivity(
      paramResult.data.userId,
      bodyResult.data.type,
      bodyResult.data.duration,
      bodyResult.data.calories,
    );
    return reply.status(201).send({ success: true, data: activity });
  });

  fastify.get<{ Params: { userId: string }; Querystring: { date?: string } }>(
    '/steps/:userId',
    async (request, reply) => {
      const paramResult = userIdParamSchema.safeParse(request.params);
      if (!paramResult.success) {
        throw createAppError('Invalid user ID', 400, 'VALIDATION_ERROR');
      }

      const date =
        (request.query as { date?: string }).date ?? new Date().toISOString().split('T')[0] ?? '';
      const steps = activityService.getSteps(paramResult.data.userId, date);
      return reply.send({ success: true, data: steps });
    },
  );

  fastify.post<{ Params: { userId: string } }>(
    '/workouts/:userId/start',
    async (request, reply) => {
      const paramResult = userIdParamSchema.safeParse(request.params);
      if (!paramResult.success) {
        throw createAppError('Invalid user ID', 400, 'VALIDATION_ERROR');
      }

      const body = request.body as { type?: string };
      if (!body.type) {
        throw createAppError('Workout type is required', 400, 'VALIDATION_ERROR');
      }

      const workout = activityService.startWorkout(paramResult.data.userId, body.type);
      return reply.status(201).send({ success: true, data: workout });
    },
  );

  fastify.post<{ Params: { id: string } }>('/workouts/:id/end', async (request, reply) => {
    const paramResult = idParamSchema.safeParse(request.params);
    if (!paramResult.success) {
      throw createAppError('Invalid workout ID', 400, 'VALIDATION_ERROR');
    }

    const bodyResult = EndWorkoutSchema.safeParse(request.body);
    if (!bodyResult.success) {
      throw createAppError('Invalid workout metrics', 400, 'VALIDATION_ERROR');
    }

    const workout = activityService.endWorkout(paramResult.data.id, bodyResult.data);
    return reply.send({ success: true, data: workout });
  });

  fastify.get<{ Params: { userId: string } }>('/workouts/:userId', async (request, reply) => {
    const paramResult = userIdParamSchema.safeParse(request.params);
    if (!paramResult.success) {
      throw createAppError('Invalid user ID', 400, 'VALIDATION_ERROR');
    }

    const filters = GetWorkoutsFilterSchema.safeParse(request.query);
    const workouts = activityService.getWorkouts(
      paramResult.data.userId,
      filters.success ? filters.data : undefined,
    );
    return reply.send({ success: true, data: workouts });
  });

  fastify.get<{ Params: { userId: string }; Querystring: { date?: string } }>(
    '/calories/:userId',
    async (request, reply) => {
      const paramResult = userIdParamSchema.safeParse(request.params);
      if (!paramResult.success) {
        throw createAppError('Invalid user ID', 400, 'VALIDATION_ERROR');
      }

      const date =
        (request.query as { date?: string }).date ?? new Date().toISOString().split('T')[0] ?? '';
      const calories = activityService.getCaloriesBurned(paramResult.data.userId, date);
      return reply.send({ success: true, data: { calories } });
    },
  );

  // Sleep routes
  fastify.post<{ Params: { userId: string } }>('/sleep/:userId', async (request, reply) => {
    const paramResult = userIdParamSchema.safeParse(request.params);
    if (!paramResult.success) {
      throw createAppError('Invalid user ID', 400, 'VALIDATION_ERROR');
    }

    const bodyResult = LogSleepSchema.safeParse(request.body);
    if (!bodyResult.success) {
      throw createAppError('Invalid sleep data', 400, 'VALIDATION_ERROR');
    }

    const record = sleepService.logSleep(
      paramResult.data.userId,
      bodyResult.data.startTime,
      bodyResult.data.endTime,
      bodyResult.data.quality,
    );
    return reply.status(201).send({ success: true, data: record });
  });

  fastify.get<{ Params: { userId: string } }>('/sleep/:userId/score', async (request, reply) => {
    const paramResult = userIdParamSchema.safeParse(request.params);
    if (!paramResult.success) {
      throw createAppError('Invalid user ID', 400, 'VALIDATION_ERROR');
    }

    const score = sleepService.getSleepScore(paramResult.data.userId);
    return reply.send({ success: true, data: score });
  });

  fastify.get<{ Params: { id: string } }>('/sleep/records/:id/stages', async (request, reply) => {
    const paramResult = idParamSchema.safeParse(request.params);
    if (!paramResult.success) {
      throw createAppError('Invalid record ID', 400, 'VALIDATION_ERROR');
    }

    const stages = sleepService.getSleepStages(paramResult.data.id);
    return reply.send({ success: true, data: stages });
  });

  fastify.post<{ Params: { userId: string } }>('/sleep/:userId/goal', async (request, reply) => {
    const paramResult = userIdParamSchema.safeParse(request.params);
    if (!paramResult.success) {
      throw createAppError('Invalid user ID', 400, 'VALIDATION_ERROR');
    }

    const bodyResult = SetSleepGoalSchema.safeParse(request.body);
    if (!bodyResult.success) {
      throw createAppError('Invalid sleep goal', 400, 'VALIDATION_ERROR');
    }

    const goal = sleepService.setSleepGoal(paramResult.data.userId, bodyResult.data.targetHours);
    return reply.status(201).send({ success: true, data: goal });
  });

  // Wearable routes
  fastify.post<{ Params: { userId: string } }>('/devices/:userId/pair', async (request, reply) => {
    const paramResult = userIdParamSchema.safeParse(request.params);
    if (!paramResult.success) {
      throw createAppError('Invalid user ID', 400, 'VALIDATION_ERROR');
    }

    const bodyResult = PairDeviceSchema.safeParse(request.body);
    if (!bodyResult.success) {
      throw createAppError('Invalid device data', 400, 'VALIDATION_ERROR');
    }

    const device = wearableService.pairDevice(
      paramResult.data.userId,
      bodyResult.data.deviceType,
      bodyResult.data.serialNumber,
    );
    return reply.status(201).send({ success: true, data: device });
  });

  fastify.post<{ Params: { id: string } }>('/devices/:id/sync', async (request, reply) => {
    const paramResult = idParamSchema.safeParse(request.params);
    if (!paramResult.success) {
      throw createAppError('Invalid device ID', 400, 'VALIDATION_ERROR');
    }

    const result = wearableService.syncData(paramResult.data.id);
    return reply.send({ success: true, data: result });
  });

  fastify.get<{ Params: { userId: string } }>('/devices/:userId', async (request, reply) => {
    const paramResult = userIdParamSchema.safeParse(request.params);
    if (!paramResult.success) {
      throw createAppError('Invalid user ID', 400, 'VALIDATION_ERROR');
    }

    const devices = wearableService.listDevices(paramResult.data.userId);
    return reply.send({ success: true, data: devices });
  });

  fastify.get<{ Params: { userId: string } }>(
    '/vitals/:userId/heart-rate',
    async (request, reply) => {
      const paramResult = userIdParamSchema.safeParse(request.params);
      if (!paramResult.success) {
        throw createAppError('Invalid user ID', 400, 'VALIDATION_ERROR');
      }

      const data = wearableService.getHeartRate(paramResult.data.userId);
      return reply.send({ success: true, data });
    },
  );

  fastify.get<{ Params: { userId: string } }>('/vitals/:userId/spo2', async (request, reply) => {
    const paramResult = userIdParamSchema.safeParse(request.params);
    if (!paramResult.success) {
      throw createAppError('Invalid user ID', 400, 'VALIDATION_ERROR');
    }

    const data = wearableService.getSpO2(paramResult.data.userId);
    return reply.send({ success: true, data });
  });

  fastify.get<{ Params: { userId: string } }>(
    '/vitals/:userId/temperature',
    async (request, reply) => {
      const paramResult = userIdParamSchema.safeParse(request.params);
      if (!paramResult.success) {
        throw createAppError('Invalid user ID', 400, 'VALIDATION_ERROR');
      }

      const data = wearableService.getBodyTemperature(paramResult.data.userId);
      return reply.send({ success: true, data });
    },
  );
}
