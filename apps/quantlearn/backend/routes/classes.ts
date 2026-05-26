import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { createAppError } from '@quant/server-core';
import { LiveClassService, ScheduleClassSchema } from '../services/live-class.service';

const idParamSchema = z.object({ id: z.string().min(1) });

export default async function classesRoutes(fastify: FastifyInstance) {
  const classService = new LiveClassService();

  fastify.post('/', async (request, reply) => {
    const parseResult = ScheduleClassSchema.safeParse(request.body);
    if (!parseResult.success) {
      throw createAppError('Invalid class data', 400, 'VALIDATION_ERROR');
    }

    const { courseId, instructorId, startTime, duration } = parseResult.data;
    const liveClass = classService.scheduleClass(courseId, instructorId, startTime, duration);
    return reply.status(201).send({ success: true, data: liveClass });
  });

  fastify.post<{ Params: { id: string } }>('/:id/start', async (request, reply) => {
    const paramResult = idParamSchema.safeParse(request.params);
    if (!paramResult.success) {
      throw createAppError('Invalid class ID', 400, 'VALIDATION_ERROR');
    }

    const liveClass = classService.startClass(paramResult.data.id);
    return reply.send({ success: true, data: liveClass });
  });

  fastify.post<{ Params: { id: string } }>('/:id/end', async (request, reply) => {
    const paramResult = idParamSchema.safeParse(request.params);
    if (!paramResult.success) {
      throw createAppError('Invalid class ID', 400, 'VALIDATION_ERROR');
    }

    const liveClass = classService.endClass(paramResult.data.id);
    return reply.send({ success: true, data: liveClass });
  });

  fastify.post<{ Params: { id: string } }>('/:id/join', async (request, reply) => {
    const paramResult = idParamSchema.safeParse(request.params);
    if (!paramResult.success) {
      throw createAppError('Invalid class ID', 400, 'VALIDATION_ERROR');
    }

    const body = request.body as { studentId?: string };
    if (!body.studentId) {
      throw createAppError('Student ID is required', 400, 'VALIDATION_ERROR');
    }

    const participant = classService.joinClass(paramResult.data.id, body.studentId);
    return reply.send({ success: true, data: participant });
  });

  fastify.post<{ Params: { id: string } }>('/:id/record', async (request, reply) => {
    const paramResult = idParamSchema.safeParse(request.params);
    if (!paramResult.success) {
      throw createAppError('Invalid class ID', 400, 'VALIDATION_ERROR');
    }

    const recording = classService.recordClass(paramResult.data.id);
    return reply.send({ success: true, data: recording });
  });

  fastify.get<{ Params: { id: string } }>('/:id/attendance', async (request, reply) => {
    const paramResult = idParamSchema.safeParse(request.params);
    if (!paramResult.success) {
      throw createAppError('Invalid class ID', 400, 'VALIDATION_ERROR');
    }

    const attendance = classService.getAttendance(paramResult.data.id);
    return reply.send({ success: true, data: attendance });
  });

  fastify.get<{ Params: { id: string } }>('/:id/replay', async (request, reply) => {
    const paramResult = idParamSchema.safeParse(request.params);
    if (!paramResult.success) {
      throw createAppError('Invalid class ID', 400, 'VALIDATION_ERROR');
    }

    const recording = classService.getClassReplay(paramResult.data.id);
    return reply.send({ success: true, data: recording });
  });

  fastify.post<{ Params: { id: string } }>('/:id/whiteboard', async (request, reply) => {
    const paramResult = idParamSchema.safeParse(request.params);
    if (!paramResult.success) {
      throw createAppError('Invalid class ID', 400, 'VALIDATION_ERROR');
    }

    const whiteboard = classService.enableWhiteboard(paramResult.data.id);
    return reply.send({ success: true, data: whiteboard });
  });
}
