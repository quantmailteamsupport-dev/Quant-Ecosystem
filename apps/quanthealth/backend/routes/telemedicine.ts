import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { createAppError } from '@quant/server-core';
import {
  TelemedicineService,
  BookAppointmentSchema,
  UploadHealthRecordSchema,
} from '../services/telemedicine.service';

const userIdParamSchema = z.object({
  userId: z.string().min(1),
});

const idParamSchema = z.object({
  id: z.string().min(1),
});

export default async function telemedicineRoutes(fastify: FastifyInstance) {
  const telemedicineService = new TelemedicineService();

  fastify.post<{ Params: { userId: string } }>('/:userId/appointments', async (request, reply) => {
    const paramResult = userIdParamSchema.safeParse(request.params);
    if (!paramResult.success) {
      throw createAppError('Invalid user ID', 400, 'VALIDATION_ERROR');
    }

    const bodyResult = BookAppointmentSchema.safeParse(request.body);
    if (!bodyResult.success) {
      throw createAppError('Invalid appointment data', 400, 'VALIDATION_ERROR');
    }

    const appointment = telemedicineService.bookAppointment(
      paramResult.data.userId,
      bodyResult.data.providerId,
      bodyResult.data.dateTime,
    );
    return reply.status(201).send({ success: true, data: appointment });
  });

  fastify.delete<{ Params: { id: string } }>('/appointments/:id', async (request, reply) => {
    const paramResult = idParamSchema.safeParse(request.params);
    if (!paramResult.success) {
      throw createAppError('Invalid appointment ID', 400, 'VALIDATION_ERROR');
    }

    telemedicineService.cancelAppointment(paramResult.data.id);
    return reply.send({ success: true, data: null });
  });

  fastify.get<{ Params: { userId: string } }>('/:userId/appointments', async (request, reply) => {
    const paramResult = userIdParamSchema.safeParse(request.params);
    if (!paramResult.success) {
      throw createAppError('Invalid user ID', 400, 'VALIDATION_ERROR');
    }

    const appointments = telemedicineService.getAppointments(paramResult.data.userId);
    return reply.send({ success: true, data: appointments });
  });

  fastify.post<{ Params: { id: string } }>('/appointments/:id/join', async (request, reply) => {
    const paramResult = idParamSchema.safeParse(request.params);
    if (!paramResult.success) {
      throw createAppError('Invalid appointment ID', 400, 'VALIDATION_ERROR');
    }

    const session = telemedicineService.joinConsultation(paramResult.data.id);
    return reply.send({ success: true, data: session });
  });

  fastify.get<{ Params: { userId: string } }>('/:userId/prescriptions', async (request, reply) => {
    const paramResult = userIdParamSchema.safeParse(request.params);
    if (!paramResult.success) {
      throw createAppError('Invalid user ID', 400, 'VALIDATION_ERROR');
    }

    const prescriptions = telemedicineService.getPrescriptions(paramResult.data.userId);
    return reply.send({ success: true, data: prescriptions });
  });

  fastify.post<{ Params: { userId: string } }>('/:userId/records', async (request, reply) => {
    const paramResult = userIdParamSchema.safeParse(request.params);
    if (!paramResult.success) {
      throw createAppError('Invalid user ID', 400, 'VALIDATION_ERROR');
    }

    const bodyResult = UploadHealthRecordSchema.safeParse(request.body);
    if (!bodyResult.success) {
      throw createAppError('Invalid health record data', 400, 'VALIDATION_ERROR');
    }

    const record = telemedicineService.uploadHealthRecord(paramResult.data.userId, bodyResult.data);
    return reply.status(201).send({ success: true, data: record });
  });

  fastify.get('/providers', async (request, reply) => {
    const query = request.query as { specialty?: string; location?: string };
    const providers = telemedicineService.getProviders(query.specialty, query.location);
    return reply.send({ success: true, data: providers });
  });

  fastify.get<{ Params: { id: string } }>('/appointments/:id/notes', async (request, reply) => {
    const paramResult = idParamSchema.safeParse(request.params);
    if (!paramResult.success) {
      throw createAppError('Invalid appointment ID', 400, 'VALIDATION_ERROR');
    }

    const notes = telemedicineService.getConsultationNotes(paramResult.data.id);
    return reply.send({ success: true, data: notes });
  });
}
