// ============================================================================
// Analytics - Event Pipeline
// High-throughput event ingestion with batching, sessionization, deduplication,
// watermarks, reservoir sampling, and replay
// ============================================================================

import type {
  PipelineEvent,
  PipelineEventBatch,
  EventSchema,
  SessionConfig,
  Session,
  WatermarkConfig,
  SamplingConfig,
  PipelineMetrics,
  EnrichmentFunction,
  SchemaField,
  ValidationRule,
} from '../types';

/** Default session configuration */
const DEFAULT_SESSION_CONFIG: SessionConfig = {
  timeoutMs: 30 * 60 * 1000, // 30 minutes
  maxDurationMs: 24 * 60 * 60 * 1000, // 24 hours
  extendOnActivity: true,
};

/** Default watermark configuration */
const DEFAULT_WATERMARK_CONFIG: WatermarkConfig = {
  maxLatenessMs: 5 * 60 * 1000, // 5 minutes
  checkIntervalMs: 10 * 1000, // 10 seconds
  advanceOnIdle: true,
};

/** Default sampling configuration */
const DEFAULT_SAMPLING_CONFIG: SamplingConfig = {
  strategy: 'reservoir',
  sampleSize: 1000,
};

/**
 * EventPipeline - High-throughput event processing engine
 *
 * Provides comprehensive event pipeline capabilities:
 * - Configurable batch size and flush interval for ingestion
 * - Event schema validation (required fields, type checking)
 * - Event enrichment (computed fields, reference resolution)
 * - Sessionization using 30-min inactivity timeout
 * - Deduplication via idempotency keys (keep first seen)
 * - Late-arriving event handling with watermark window
 * - Reservoir sampling for high-volume downsampling
 * - Event replay from persistent store with filters
 * - Backpressure: drop oldest events when buffer full
 */
export class EventPipeline {
  private sessionConfig: SessionConfig;
  private watermarkConfig: WatermarkConfig;
  private samplingConfig: SamplingConfig;

  private buffer: PipelineEvent[] = [];
  private maxBufferSize: number;
  private batchSize: number;
  private flushIntervalMs: number;

  private sessions: Map<string, Session> = new Map();
  private seenIdempotencyKeys: Set<string> = new Set();
  private idempotencyKeyTTL: Map<string, number> = new Map();
  private persistentStore: PipelineEvent[] = [];
  private processedBatches: PipelineEventBatch[] = [];

  private schemas: Map<string, EventSchema> = new Map();
  private enrichments: EnrichmentFunction[] = [];

  private currentWatermark: number = 0;
  private reservoir: PipelineEvent[] = [];
  private reservoirCount: number = 0;

  private metrics: PipelineMetrics = {
    eventsReceived: 0,
    eventsProcessed: 0,
    eventsDropped: 0,
    eventsDeduplicated: 0,
    eventsLateArrival: 0,
    batchesProcessed: 0,
    averageLatencyMs: 0,
    currentWatermark: 0,
  };

  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private totalLatency: number = 0;

  constructor(
    options: {
      batchSize?: number;
      flushIntervalMs?: number;
      maxBufferSize?: number;
      sessionConfig?: Partial<SessionConfig>;
      watermarkConfig?: Partial<WatermarkConfig>;
      samplingConfig?: Partial<SamplingConfig>;
    } = {},
  ) {
    this.batchSize = options.batchSize ?? 100;
    this.flushIntervalMs = options.flushIntervalMs ?? 5000;
    this.maxBufferSize = options.maxBufferSize ?? 10000;
    this.sessionConfig = { ...DEFAULT_SESSION_CONFIG, ...options.sessionConfig };
    this.watermarkConfig = { ...DEFAULT_WATERMARK_CONFIG, ...options.watermarkConfig };
    this.samplingConfig = { ...DEFAULT_SAMPLING_CONFIG, ...options.samplingConfig };
  }

  /**
   * Register an event schema for validation
   */
  registerSchema(schema: EventSchema): void {
    this.schemas.set(schema.name, schema);
  }

  /**
   * Add an enrichment function to the pipeline
   */
  addEnrichment(fn: EnrichmentFunction): void {
    this.enrichments.push(fn);
  }

  /**
   * Ingest a single event into the pipeline
   */
  ingest(event: PipelineEvent): boolean {
    this.metrics.eventsReceived++;

    // Deduplication check using idempotency key
    if (this.seenIdempotencyKeys.has(event.idempotencyKey)) {
      this.metrics.eventsDeduplicated++;
      return false;
    }

    // Schema validation
    if (!this.validateEvent(event)) {
      this.metrics.eventsDropped++;
      return false;
    }

    // Late arrival check against watermark
    if (event.timestamp < this.currentWatermark - this.watermarkConfig.maxLatenessMs) {
      this.metrics.eventsLateArrival++;
      this.metrics.eventsDropped++;
      return false;
    }

    // Within watermark window - process late event
    if (event.timestamp < this.currentWatermark) {
      this.metrics.eventsLateArrival++;
    }

    // Mark idempotency key as seen
    this.seenIdempotencyKeys.add(event.idempotencyKey);
    this.idempotencyKeyTTL.set(event.idempotencyKey, Date.now() + 3600000); // 1 hour TTL

    // Apply enrichments
    let enrichedEvent = event;
    for (const enrichFn of this.enrichments) {
      enrichedEvent = enrichFn(enrichedEvent);
    }

    // Backpressure: drop oldest events when buffer full
    if (this.buffer.length >= this.maxBufferSize) {
      this.buffer.shift();
      this.metrics.eventsDropped++;
    }

    this.buffer.push(enrichedEvent);

    // Sessionize the event
    this.sessionizeEvent(enrichedEvent);

    // Update reservoir sample
    this.reservoirSample(enrichedEvent);

    // Advance watermark
    this.advanceWatermark(enrichedEvent.timestamp);

    // Auto-flush if batch size reached
    if (this.buffer.length >= this.batchSize) {
      this.flush();
    }

    return true;
  }

  /**
   * Ingest a batch of events
   */
  ingestBatch(events: PipelineEvent[]): { accepted: number; rejected: number } {
    let accepted = 0;
    let rejected = 0;

    for (const event of events) {
      if (this.ingest(event)) {
        accepted++;
      } else {
        rejected++;
      }
    }

    return { accepted, rejected };
  }

  /**
   * Flush the current buffer as a batch
   */
  flush(): PipelineEventBatch | null {
    if (this.buffer.length === 0) return null;

    const events = this.buffer.splice(0, this.batchSize);
    const batch: PipelineEventBatch = {
      id: `batch_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      events,
      createdAt: Date.now(),
      processedAt: Date.now(),
      size: events.length,
    };

    // Persist events
    for (const event of events) {
      this.persistentStore.push(event);
      this.metrics.eventsProcessed++;
      this.totalLatency += Date.now() - event.timestamp;
    }

    this.processedBatches.push(batch);
    this.metrics.batchesProcessed++;
    this.metrics.averageLatencyMs =
      this.metrics.eventsProcessed > 0 ? this.totalLatency / this.metrics.eventsProcessed : 0;

    return batch;
  }

  /**
   * Start automatic flushing on interval
   */
  startAutoFlush(): void {
    if (this.flushTimer) return;
    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.flushIntervalMs);
  }

  /**
   * Stop automatic flushing
   */
  stopAutoFlush(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
  }

  /**
   * Validate an event against its registered schema
   */
  validateEvent(event: PipelineEvent): boolean {
    const schema = this.schemas.get(event.name);
    if (!schema) return true; // No schema = no validation

    // Check required fields
    for (const field of schema.requiredFields) {
      if (!this.hasField(event, field)) return false;
      if (!this.checkFieldType(event, field)) return false;
    }

    // Check validation rules
    for (const rule of schema.validationRules) {
      if (!this.checkValidationRule(event, rule)) return false;
    }

    return true;
  }

  /**
   * Sessionize events using timeout-based session boundaries
   * Groups events into sessions with 30-min inactivity timeout
   */
  private sessionizeEvent(event: PipelineEvent): void {
    const sessionKey = `${event.userId}`;
    const existingSession = this.sessions.get(sessionKey);

    if (existingSession) {
      const timeSinceLastActivity = event.timestamp - existingSession.lastActivityAt;
      const sessionDuration = event.timestamp - existingSession.startedAt;

      // Check if session has timed out or exceeded max duration
      if (
        timeSinceLastActivity > this.sessionConfig.timeoutMs ||
        sessionDuration > this.sessionConfig.maxDurationMs
      ) {
        // End current session and start new one
        existingSession.isActive = false;
        const newSession: Session = {
          id: `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
          userId: event.userId,
          startedAt: event.timestamp,
          lastActivityAt: event.timestamp,
          events: [event],
          isActive: true,
        };
        this.sessions.set(sessionKey, newSession);
      } else {
        // Extend current session
        if (this.sessionConfig.extendOnActivity) {
          existingSession.lastActivityAt = event.timestamp;
        }
        existingSession.events.push(event);
      }
    } else {
      // Create new session
      const newSession: Session = {
        id: `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        userId: event.userId,
        startedAt: event.timestamp,
        lastActivityAt: event.timestamp,
        events: [event],
        isActive: true,
      };
      this.sessions.set(sessionKey, newSession);
    }
  }

  /**
   * Reservoir sampling: maintain k samples with equal probability
   * Algorithm R: for each new item with index n > k, replace item at
   * random index j in [0, n) with probability k/n
   */
  private reservoirSample(event: PipelineEvent): void {
    this.reservoirCount++;
    const k = this.samplingConfig.sampleSize;

    if (this.reservoir.length < k) {
      this.reservoir.push(event);
    } else {
      // Replace with probability k/n
      const j = Math.floor(Math.random() * this.reservoirCount);
      if (j < k) {
        this.reservoir[j] = event;
      }
    }
  }

  /**
   * Advance the watermark based on event timestamps
   */
  private advanceWatermark(eventTimestamp: number): void {
    const proposedWatermark = eventTimestamp - this.watermarkConfig.maxLatenessMs;
    if (proposedWatermark > this.currentWatermark) {
      this.currentWatermark = proposedWatermark;
      this.metrics.currentWatermark = this.currentWatermark;
    }
  }

  /**
   * Replay events from persistent store within a time range
   */
  replay(
    startTimestamp: number,
    endTimestamp: number,
    filter?: { userId?: string; eventName?: string },
  ): PipelineEvent[] {
    let events = this.persistentStore.filter(
      (e) => e.timestamp >= startTimestamp && e.timestamp <= endTimestamp,
    );

    if (filter?.userId) {
      events = events.filter((e) => e.userId === filter.userId);
    }
    if (filter?.eventName) {
      events = events.filter((e) => e.name === filter.eventName);
    }

    return events.sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * Get current reservoir sample
   */
  getReservoirSample(): PipelineEvent[] {
    return [...this.reservoir];
  }

  /**
   * Get active sessions
   */
  getActiveSessions(): Session[] {
    return Array.from(this.sessions.values()).filter((s) => s.isActive);
  }

  /**
   * Get session for a user
   */
  getUserSession(userId: string): Session | undefined {
    return this.sessions.get(userId);
  }

  /**
   * Get pipeline metrics
   */
  getMetrics(): PipelineMetrics {
    return { ...this.metrics };
  }

  /**
   * Get current watermark
   */
  getWatermark(): number {
    return this.currentWatermark;
  }

  /**
   * Clean up expired idempotency keys
   */
  cleanupIdempotencyKeys(): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, expiry] of this.idempotencyKeyTTL) {
      if (now > expiry) {
        this.seenIdempotencyKeys.delete(key);
        this.idempotencyKeyTTL.delete(key);
        cleaned++;
      }
    }

    return cleaned;
  }

  /**
   * Reset the pipeline state
   */
  reset(): void {
    this.buffer = [];
    this.sessions.clear();
    this.seenIdempotencyKeys.clear();
    this.idempotencyKeyTTL.clear();
    this.persistentStore = [];
    this.processedBatches = [];
    this.reservoir = [];
    this.reservoirCount = 0;
    this.currentWatermark = 0;
    this.totalLatency = 0;
    this.metrics = {
      eventsReceived: 0,
      eventsProcessed: 0,
      eventsDropped: 0,
      eventsDeduplicated: 0,
      eventsLateArrival: 0,
      batchesProcessed: 0,
      averageLatencyMs: 0,
      currentWatermark: 0,
    };
    this.stopAutoFlush();
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  private hasField(event: PipelineEvent, field: SchemaField): boolean {
    const value = event.properties[field.name];
    return value !== undefined && value !== null;
  }

  private checkFieldType(event: PipelineEvent, field: SchemaField): boolean {
    const value = event.properties[field.name];
    if (value === undefined || value === null) return false;

    switch (field.type) {
      case 'string':
        return typeof value === 'string';
      case 'number':
        return typeof value === 'number';
      case 'boolean':
        return typeof value === 'boolean';
      case 'object':
        return typeof value === 'object' && !Array.isArray(value);
      case 'array':
        return Array.isArray(value);
      default:
        return true;
    }
  }

  private checkValidationRule(event: PipelineEvent, rule: ValidationRule): boolean {
    const value = event.properties[rule.field];

    switch (rule.rule) {
      case 'required':
        return value !== undefined && value !== null;
      case 'type': {
        const expectedType = rule.params?.['type'] as string | undefined;
        return expectedType ? typeof value === expectedType : true;
      }
      case 'range': {
        if (typeof value !== 'number') return false;
        const min = rule.params?.['min'] as number | undefined;
        const max = rule.params?.['max'] as number | undefined;
        if (min !== undefined && value < min) return false;
        if (max !== undefined && value > max) return false;
        return true;
      }
      case 'pattern': {
        if (typeof value !== 'string') return false;
        const pattern = rule.params?.['pattern'] as string | undefined;
        return pattern ? new RegExp(pattern).test(value) : true;
      }
      case 'enum': {
        const allowed = rule.params?.['values'] as unknown[] | undefined;
        return allowed ? allowed.includes(value) : true;
      }
      default:
        return true;
    }
  }
}
