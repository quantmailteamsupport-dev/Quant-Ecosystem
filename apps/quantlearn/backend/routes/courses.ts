import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { createAppError } from '@quant/server-core';
import { CourseService, CreateCourseSchema, UpdateCourseSchema } from '../services/course.service';

const idParamSchema = z.object({ id: z.string().min(1) });

export default async function coursesRoutes(fastify: FastifyInstance) {
  const courseService = new CourseService();

  fastify.post('/', async (request, reply) => {
    const parseResult = CreateCourseSchema.safeParse(request.body);
    if (!parseResult.success) {
      throw createAppError('Invalid course data', 400, 'VALIDATION_ERROR');
    }

    const { instructorId, title, description, category } = parseResult.data;
    const course = courseService.createCourse(instructorId, title, description, category);
    return reply.status(201).send({ success: true, data: course });
  });

  fastify.put<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const paramResult = idParamSchema.safeParse(request.params);
    if (!paramResult.success) {
      throw createAppError('Invalid course ID', 400, 'VALIDATION_ERROR');
    }

    const bodyResult = UpdateCourseSchema.safeParse(request.body);
    if (!bodyResult.success) {
      throw createAppError('Invalid update data', 400, 'VALIDATION_ERROR');
    }

    const course = courseService.updateCourse(paramResult.data.id, bodyResult.data);
    return reply.send({ success: true, data: course });
  });

  fastify.post<{ Params: { id: string } }>('/:id/publish', async (request, reply) => {
    const paramResult = idParamSchema.safeParse(request.params);
    if (!paramResult.success) {
      throw createAppError('Invalid course ID', 400, 'VALIDATION_ERROR');
    }

    const course = courseService.publishCourse(paramResult.data.id);
    return reply.send({ success: true, data: course });
  });

  fastify.post<{ Params: { id: string } }>('/:id/enroll', async (request, reply) => {
    const paramResult = idParamSchema.safeParse(request.params);
    if (!paramResult.success) {
      throw createAppError('Invalid course ID', 400, 'VALIDATION_ERROR');
    }

    const bodySchema = z.object({ studentId: z.string().min(1) });
    const bodyResult = bodySchema.safeParse(request.body);
    if (!bodyResult.success) {
      throw createAppError('Invalid enrollment data', 400, 'VALIDATION_ERROR');
    }

    const enrollment = courseService.enrollStudent(paramResult.data.id, bodyResult.data.studentId);
    return reply.status(201).send({ success: true, data: enrollment });
  });

  fastify.get<{ Params: { id: string }; Querystring: { studentId: string } }>(
    '/:id/progress',
    async (request, reply) => {
      const paramResult = idParamSchema.safeParse(request.params);
      if (!paramResult.success) {
        throw createAppError('Invalid course ID', 400, 'VALIDATION_ERROR');
      }

      const query = request.query as { studentId?: string };
      if (!query.studentId) {
        throw createAppError('Student ID is required', 400, 'VALIDATION_ERROR');
      }

      const progress = courseService.getProgress(paramResult.data.id, query.studentId);
      return reply.send({ success: true, data: progress });
    },
  );

  fastify.get('/', async (request, reply) => {
    const query = request.query as { category?: string; status?: string };
    const courses = courseService.listCourses(query);
    return reply.send({ success: true, data: courses });
  });

  fastify.get('/search', async (request, reply) => {
    const query = request.query as { q?: string };
    if (!query.q) {
      throw createAppError('Search query is required', 400, 'VALIDATION_ERROR');
    }

    const courses = courseService.searchCourses(query.q);
    return reply.send({ success: true, data: courses });
  });
}
