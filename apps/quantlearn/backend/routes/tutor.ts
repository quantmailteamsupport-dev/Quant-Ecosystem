import type { FastifyInstance } from 'fastify';
import { createAppError } from '@quant/server-core';
import {
  AITutorService,
  AskQuestionSchema,
  GenerateQuizSchema,
  GenerateExerciseSchema,
  ExplainConceptSchema,
} from '../services/ai-tutor.service';

export default async function tutorRoutes(fastify: FastifyInstance) {
  const tutorService = new AITutorService();

  fastify.post('/ask', async (request, reply) => {
    const parseResult = AskQuestionSchema.safeParse(request.body);
    if (!parseResult.success) {
      throw createAppError('Invalid question data', 400, 'VALIDATION_ERROR');
    }

    const { studentId, question, context } = parseResult.data;
    const response = tutorService.askQuestion(studentId, question, context);
    return reply.send({ success: true, data: response });
  });

  fastify.post('/quiz', async (request, reply) => {
    const parseResult = GenerateQuizSchema.safeParse(request.body);
    if (!parseResult.success) {
      throw createAppError('Invalid quiz parameters', 400, 'VALIDATION_ERROR');
    }

    const { topic, difficulty, count } = parseResult.data;
    const quiz = tutorService.generateQuiz(topic, difficulty, count);
    return reply.send({ success: true, data: quiz });
  });

  fastify.post('/evaluate', async (request, reply) => {
    const body = request.body as { questionId?: string; answer?: number };
    if (!body.questionId || body.answer === undefined) {
      throw createAppError('Question ID and answer are required', 400, 'VALIDATION_ERROR');
    }

    const evaluation = tutorService.evaluateAnswer(body.questionId, body.answer);
    return reply.send({ success: true, data: evaluation });
  });

  fastify.post('/path', async (request, reply) => {
    const body = request.body as { studentId?: string; goals?: string[] };
    if (!body.studentId || !body.goals) {
      throw createAppError('Student ID and goals are required', 400, 'VALIDATION_ERROR');
    }

    const path = tutorService.getPersonalizedPath(body.studentId, body.goals);
    return reply.send({ success: true, data: path });
  });

  fastify.post('/explain', async (request, reply) => {
    const parseResult = ExplainConceptSchema.safeParse(request.body);
    if (!parseResult.success) {
      throw createAppError('Invalid explanation request', 400, 'VALIDATION_ERROR');
    }

    const { concept, level } = parseResult.data;
    const explanation = tutorService.explainConcept(concept, level);
    return reply.send({ success: true, data: explanation });
  });

  fastify.post('/exercise', async (request, reply) => {
    const parseResult = GenerateExerciseSchema.safeParse(request.body);
    if (!parseResult.success) {
      throw createAppError('Invalid exercise parameters', 400, 'VALIDATION_ERROR');
    }

    const { topic, type, difficulty } = parseResult.data;
    const exercise = tutorService.generateExercise(topic, type, difficulty);
    return reply.send({ success: true, data: exercise });
  });
}
