import type Redis from 'ioredis';
import pino from 'pino';
import type { StreamEvent, ProcessorConfig, ProcessorHandler } from './types.js';
import type { DeadLetterQueue } from './dead-letter.js';

export interface EventStreamOptions {
  redis: Redis;
  maxLen?: number;
  deadLetterQueue?: DeadLetterQueue;
  logger?: pino.Logger;
}

export class EventStream {
  private readonly redis: Redis;
  private readonly maxLen: number;
  private readonly dlq: DeadLetterQueue | undefined;
  private readonly logger: pino.Logger;
  private running = false;

  constructor(options: EventStreamOptions) {
    this.redis = options.redis;
    this.maxLen = options.maxLen ?? 10000;
    this.dlq = options.deadLetterQueue;
    this.logger = options.logger ?? pino({ level: 'info' });
  }

  async publish(stream: string, event: StreamEvent): Promise<string> {
    const fields = [
      'id',
      event.id,
      'type',
      event.type,
      'source',
      event.source,
      'timestamp',
      String(event.timestamp),
      'data',
      JSON.stringify(event.data),
    ];

    if (event.metadata) {
      fields.push('metadata', JSON.stringify(event.metadata));
    }

    const entryId = await this.redis.xadd(
      stream,
      'MAXLEN',
      '~',
      String(this.maxLen),
      '*',
      ...fields,
    );

    return entryId as string;
  }

  async createGroup(stream: string, group: string): Promise<void> {
    try {
      await this.redis.xgroup('CREATE', stream, group, '0', 'MKSTREAM');
    } catch (err: unknown) {
      const error = err as Error;
      if (!error.message?.includes('BUSYGROUP')) {
        throw err;
      }
    }
  }

  async subscribe(config: ProcessorConfig, handler: ProcessorHandler): Promise<void> {
    await this.createGroup(config.stream, config.group);
    this.running = true;

    while (this.running) {
      const results = (await this.redis.xreadgroup(
        'GROUP',
        config.group,
        config.consumer,
        'COUNT',
        String(config.batchSize),
        'BLOCK',
        String(config.blockTimeMs),
        'STREAMS',
        config.stream,
        '>',
      )) as Array<[string, Array<[string, string[]]>]> | null;

      if (!results || results.length === 0) continue;

      for (const [, entries] of results) {
        const events: StreamEvent[] = [];
        const entryIds: string[] = [];

        for (const [entryId, fields] of entries) {
          const parsed = this.parseFields(fields);
          if (parsed) {
            events.push(parsed);
            entryIds.push(entryId);
          }
        }

        if (events.length > 0) {
          await this.processWithRetry(config, events, entryIds, handler);
        }
      }
    }
  }

  private async processWithRetry(
    config: ProcessorConfig,
    events: StreamEvent[],
    entryIds: string[],
    handler: ProcessorHandler,
  ): Promise<void> {
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= config.maxRetries; attempt++) {
      try {
        await handler(events);
        await this.acknowledge(config.stream, config.group, entryIds);
        return;
      } catch (err: unknown) {
        lastError = err instanceof Error ? err : new Error(String(err));
        this.logger.error(
          { err: lastError, attempt, maxRetries: config.maxRetries, stream: config.stream },
          'Handler failed, retrying',
        );

        if (attempt < config.maxRetries) {
          const backoffMs = Math.min(1000 * 2 ** (attempt - 1), 30000);
          await this.sleep(backoffMs);
        }
      }
    }

    // All retries exhausted - send to DLQ if available
    this.logger.error(
      { stream: config.stream, group: config.group, eventCount: events.length },
      'All retries exhausted, routing to dead letter queue',
    );

    if (this.dlq) {
      for (const event of events) {
        this.dlq.enqueue({
          stream: config.stream,
          group: config.group,
          event,
          error: lastError?.message ?? 'Unknown error',
          attempts: config.maxRetries,
        });
      }
    }

    // Acknowledge so events don't block the PEL indefinitely
    await this.acknowledge(config.stream, config.group, entryIds);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async acknowledge(stream: string, group: string, ids: string[]): Promise<number> {
    if (ids.length === 0) return 0;
    const result = await this.redis.xack(stream, group, ...ids);
    return result;
  }

  stop(): void {
    this.running = false;
  }

  private parseFields(fields: string[]): StreamEvent | null {
    const map: Record<string, string> = {};
    for (let i = 0; i < fields.length; i += 2) {
      const key = fields[i];
      const val = fields[i + 1];
      if (key !== undefined && val !== undefined) {
        map[key] = val;
      }
    }

    if (!map['id'] || !map['type'] || !map['source'] || !map['timestamp'] || !map['data']) {
      return null;
    }

    return {
      id: map['id'],
      type: map['type'],
      source: map['source'],
      timestamp: Number(map['timestamp']),
      data: JSON.parse(map['data']) as Record<string, unknown>,
      metadata: map['metadata']
        ? (JSON.parse(map['metadata']) as Record<string, string>)
        : undefined,
    };
  }
}
