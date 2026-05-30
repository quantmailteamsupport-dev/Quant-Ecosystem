import type Redis from 'ioredis';
import type { StreamEvent, ProcessorConfig, ProcessorHandler } from './types.js';

export interface EventStreamOptions {
  redis: Redis;
  maxLen?: number;
}

export class EventStream {
  private readonly redis: Redis;
  private readonly maxLen: number;
  private running = false;

  constructor(options: EventStreamOptions) {
    this.redis = options.redis;
    this.maxLen = options.maxLen ?? 10000;
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
          await handler(events);
          await this.acknowledge(config.stream, config.group, entryIds);
        }
      }
    }
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
