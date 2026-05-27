// ============================================================================
// Reindex API - Fastify routes for managing reindex jobs
// ============================================================================

import { z } from 'zod';
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { ReindexJobManager } from '@quant/search';

const StartReindexParamsSchema = z.object({
  indexName: z.string().min(1),
});

const JobIdParamsSchema = z.object({
  jobId: z.string().min(1),
});

/**
 * Register reindex routes on a Fastify instance.
 */
export function registerReindexRoutes(app: FastifyInstance, jobManager: ReindexJobManager): void {
  // POST /api/v1/reindex/:indexName - Start a new reindex job
  app.post(
    '/api/v1/reindex/:indexName',
    async (request: FastifyRequest<{ Params: { indexName: string } }>, reply: FastifyReply) => {
      const parsed = StartReindexParamsSchema.safeParse(request.params);
      if (!parsed.success) {
        return reply.status(400).send({ error: 'Invalid index name' });
      }
      const job = jobManager.startReindex(parsed.data.indexName);
      return reply.status(201).send(serializeJob(job));
    },
  );

  // GET /api/v1/reindex/jobs - List all reindex jobs
  app.get('/api/v1/reindex/jobs', async (_request: FastifyRequest, reply: FastifyReply) => {
    const jobs = jobManager.listJobs();
    return reply.status(200).send({ jobs: jobs.map(serializeJob) });
  });

  // GET /api/v1/reindex/jobs/:jobId - Get job status
  app.get(
    '/api/v1/reindex/jobs/:jobId',
    async (request: FastifyRequest<{ Params: { jobId: string } }>, reply: FastifyReply) => {
      const parsed = JobIdParamsSchema.safeParse(request.params);
      if (!parsed.success) {
        return reply.status(400).send({ error: 'Invalid job ID' });
      }
      const job = jobManager.getJobStatus(parsed.data.jobId);
      if (!job) {
        return reply.status(404).send({ error: 'Job not found' });
      }
      return reply.status(200).send(serializeJob(job));
    },
  );

  // DELETE /api/v1/reindex/jobs/:jobId - Cancel a job
  app.delete(
    '/api/v1/reindex/jobs/:jobId',
    async (request: FastifyRequest<{ Params: { jobId: string } }>, reply: FastifyReply) => {
      const parsed = JobIdParamsSchema.safeParse(request.params);
      if (!parsed.success) {
        return reply.status(400).send({ error: 'Invalid job ID' });
      }
      const job = jobManager.cancelJob(parsed.data.jobId);
      if (!job) {
        return reply.status(404).send({ error: 'Job not found' });
      }
      return reply.status(200).send(serializeJob(job));
    },
  );
}

function serializeJob(job: ReturnType<ReindexJobManager['startReindex']>) {
  return {
    id: job.id,
    indexName: job.indexName,
    state: job.state,
    progress: job.progress,
    createdAt: job.createdAt.toISOString(),
    startedAt: job.startedAt?.toISOString() ?? null,
    completedAt: job.completedAt?.toISOString() ?? null,
    error: job.error ?? null,
  };
}
