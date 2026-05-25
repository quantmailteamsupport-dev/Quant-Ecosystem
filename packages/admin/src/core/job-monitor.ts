// ============================================================================
// Admin & Operations Package - Job Monitor
// ============================================================================

import type {
  BackgroundJob,
  JobStatus,
  JobQueue,
  QueueStats,
  JobRetry,
  JobHistory,
} from '../types';

/** Job performance metrics per queue */
interface QueuePerformanceMetrics {
  queueName: string;
  avgProcessingTimeMs: number;
  throughputPerMinute: number;
  errorRate: number;
  p95ProcessingTimeMs: number;
  jobsProcessedLast24h: number;
}

/**
 * JobMonitor - Background job monitoring and management
 * Provides queue registration, real-time stats, job details,
 * retry/kill operations, performance metrics, and queue control.
 */
export class JobMonitor {
  private queues: Map<string, JobQueue> = new Map();
  private jobs: Map<string, BackgroundJob> = new Map();
  private jobHistory: Map<string, JobHistory[]> = new Map();
  private jobCounter: number = 0;

  /**
   * Register a job queue for monitoring
   */
  public registerQueue(name: string, concurrency: number = 5, maxRetries: number = 3, retryDelay: number = 5000): JobQueue {
    const queue: JobQueue = {
      name,
      concurrency,
      maxRetries,
      retryDelay,
      paused: false,
      createdAt: Date.now(),
    };

    this.queues.set(name, queue);
    return queue;
  }

  /**
   * Add a job to a queue
   */
  public addJob(queueName: string, name: string, data: Record<string, unknown>): BackgroundJob {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue '${queueName}' not found`);
    }

    this.jobCounter++;
    const id = `job_${Date.now()}_${this.jobCounter}`;

    const job: BackgroundJob = {
      id,
      name,
      queue: queueName,
      data,
      status: queue.paused ? 'paused' : 'waiting',
      attempts: 0,
      maxAttempts: queue.maxRetries + 1,
      createdAt: Date.now(),
    };

    this.jobs.set(id, job);
    return job;
  }

  /**
   * Start processing a job (simulated)
   */
  public startJob(jobId: string): BackgroundJob {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Job '${jobId}' not found`);
    }

    job.status = 'active';
    job.startedAt = Date.now();
    job.attempts++;

    this.jobs.set(jobId, job);
    this.recordHistory(job, 'active');
    return job;
  }

  /**
   * Complete a job successfully
   */
  public completeJob(jobId: string, result?: unknown): BackgroundJob {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Job '${jobId}' not found`);
    }

    job.status = 'completed';
    job.completedAt = Date.now();
    job.duration = job.startedAt ? Date.now() - job.startedAt : 0;
    job.result = result;

    this.jobs.set(jobId, job);
    this.recordHistory(job, 'completed');
    return job;
  }

  /**
   * Fail a job
   */
  public failJob(jobId: string, error: string): BackgroundJob {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Job '${jobId}' not found`);
    }

    job.failedAt = Date.now();
    job.error = error;
    job.duration = job.startedAt ? Date.now() - job.startedAt : 0;

    // Check if should retry
    if (job.attempts < job.maxAttempts) {
      job.status = 'waiting';
    } else {
      job.status = 'dead';
    }

    this.jobs.set(jobId, job);
    this.recordHistory(job, job.status);
    return job;
  }

  /**
   * Get queue statistics: active, waiting, completed, failed, dead counts
   */
  public getQueueStats(queueName: string): QueueStats {
    const queueJobs = Array.from(this.jobs.values()).filter(j => j.queue === queueName);

    const active = queueJobs.filter(j => j.status === 'active').length;
    const waiting = queueJobs.filter(j => j.status === 'waiting').length;
    const completed = queueJobs.filter(j => j.status === 'completed').length;
    const failed = queueJobs.filter(j => j.status === 'failed').length;
    const dead = queueJobs.filter(j => j.status === 'dead').length;
    const delayed = queueJobs.filter(j => j.status === 'delayed').length;

    // Calculate throughput (completed jobs in last minute)
    const oneMinuteAgo = Date.now() - 60000;
    const recentCompleted = queueJobs.filter(
      j => j.status === 'completed' && j.completedAt && j.completedAt >= oneMinuteAgo
    ).length;

    // Average processing time
    const completedJobs = queueJobs.filter(j => j.status === 'completed' && j.duration);
    const avgProcessingTimeMs = completedJobs.length > 0
      ? completedJobs.reduce((sum, j) => sum + (j.duration || 0), 0) / completedJobs.length
      : 0;

    return {
      queueName,
      active,
      waiting,
      completed,
      failed,
      dead,
      delayed,
      throughputPerMinute: recentCompleted,
      avgProcessingTimeMs: Math.round(avgProcessingTimeMs),
    };
  }

  /**
   * Get specific job details
   */
  public getJobDetails(jobId: string): BackgroundJob | null {
    return this.jobs.get(jobId) || null;
  }

  /**
   * Retry a failed job - re-enqueue with reset attempt count
   */
  public retryJob(jobId: string): BackgroundJob {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Job '${jobId}' not found`);
    }

    if (job.status !== 'failed' && job.status !== 'dead') {
      throw new Error(`Can only retry failed or dead jobs, current status: ${job.status}`);
    }

    job.status = 'waiting';
    job.attempts = 0;
    job.error = undefined;
    job.failedAt = undefined;
    job.startedAt = undefined;
    job.completedAt = undefined;
    job.duration = undefined;

    this.jobs.set(jobId, job);
    this.recordHistory(job, 'waiting');
    return job;
  }

  /**
   * Kill a stuck job - terminate and move to dead
   */
  public killJob(jobId: string): BackgroundJob {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Job '${jobId}' not found`);
    }

    job.status = 'dead';
    job.error = 'Manually killed';
    job.failedAt = Date.now();
    job.duration = job.startedAt ? Date.now() - job.startedAt : 0;

    this.jobs.set(jobId, job);
    this.recordHistory(job, 'dead');
    return job;
  }

  /**
   * Remove completed jobs older than N days
   */
  public cleanQueue(queueName: string, olderThanDays: number): number {
    const cutoff = Date.now() - (olderThanDays * 86400000);
    let removed = 0;

    for (const [id, job] of this.jobs) {
      if (
        job.queue === queueName &&
        job.status === 'completed' &&
        job.completedAt &&
        job.completedAt < cutoff
      ) {
        this.jobs.delete(id);
        removed++;
      }
    }

    return removed;
  }

  /**
   * Get performance metrics per queue
   */
  public getPerformanceMetrics(queueName: string): QueuePerformanceMetrics {
    const queueJobs = Array.from(this.jobs.values()).filter(j => j.queue === queueName);
    const completedJobs = queueJobs.filter(j => j.status === 'completed' && j.duration);

    // Average processing time
    const avgProcessingTimeMs = completedJobs.length > 0
      ? completedJobs.reduce((sum, j) => sum + (j.duration || 0), 0) / completedJobs.length
      : 0;

    // p95 processing time
    const durations = completedJobs
      .map(j => j.duration || 0)
      .sort((a, b) => a - b);
    const p95ProcessingTimeMs = durations.length > 0
      ? durations[Math.floor(durations.length * 0.95)]
      : 0;

    // Throughput (last minute)
    const oneMinuteAgo = Date.now() - 60000;
    const throughputPerMinute = queueJobs.filter(
      j => j.completedAt && j.completedAt >= oneMinuteAgo
    ).length;

    // Error rate
    const totalProcessed = queueJobs.filter(j => j.status === 'completed' || j.status === 'failed' || j.status === 'dead').length;
    const failedCount = queueJobs.filter(j => j.status === 'failed' || j.status === 'dead').length;
    const errorRate = totalProcessed > 0 ? failedCount / totalProcessed : 0;

    // Last 24h
    const twentyFourHoursAgo = Date.now() - 86400000;
    const jobsProcessedLast24h = queueJobs.filter(
      j => j.completedAt && j.completedAt >= twentyFourHoursAgo
    ).length;

    return {
      queueName,
      avgProcessingTimeMs: Math.round(avgProcessingTimeMs),
      throughputPerMinute,
      errorRate: Math.round(errorRate * 10000) / 10000,
      p95ProcessingTimeMs,
      jobsProcessedLast24h,
    };
  }

  /**
   * Get recent job history
   */
  public getJobHistory(queueName: string, limit: number = 100): JobHistory[] {
    const allHistory: JobHistory[] = [];

    for (const [jobId, history] of this.jobHistory) {
      const job = this.jobs.get(jobId);
      if (job && job.queue === queueName) {
        allHistory.push(...history);
      }
    }

    return allHistory
      .sort((a, b) => b.startedAt - a.startedAt)
      .slice(0, limit);
  }

  /**
   * Pause a queue - no new jobs will be processed
   */
  public pauseQueue(queueName: string): void {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue '${queueName}' not found`);
    }
    queue.paused = true;
    this.queues.set(queueName, queue);
  }

  /**
   * Resume a paused queue
   */
  public resumeQueue(queueName: string): void {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue '${queueName}' not found`);
    }
    queue.paused = false;
    this.queues.set(queueName, queue);

    // Move paused jobs back to waiting
    for (const [id, job] of this.jobs) {
      if (job.queue === queueName && job.status === 'paused') {
        job.status = 'waiting';
        this.jobs.set(id, job);
      }
    }
  }

  /**
   * Record job history entry
   */
  private recordHistory(job: BackgroundJob, status: JobStatus): void {
    if (!this.jobHistory.has(job.id)) {
      this.jobHistory.set(job.id, []);
    }

    const history = this.jobHistory.get(job.id)!;
    history.push({
      jobId: job.id,
      attempt: job.attempts,
      status,
      startedAt: job.startedAt || Date.now(),
      completedAt: job.completedAt || Date.now(),
      duration: job.duration || 0,
      error: job.error,
    });
  }
}
