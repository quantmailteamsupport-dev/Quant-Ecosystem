import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventStream } from '../event-stream.js';
import type { StreamEvent, ProcessorConfig } from '../types.js';

function createMockRedis() {
  return {
    xadd: vi.fn().mockResolvedValue('1234567890-0'),
    xgroup: vi.fn().mockResolvedValue('OK'),
    xreadgroup: vi.fn().mockResolvedValue(null),
    xack: vi.fn().mockResolvedValue(1),
  } as any;
}

function createEvent(overrides: Partial<StreamEvent> = {}): StreamEvent {
  return {
    id: 'evt-1',
    type: 'page_view',
    source: 'web',
    timestamp: Date.now(),
    data: { url: '/home' },
    ...overrides,
  };
}

describe('EventStream', () => {
  let redis: ReturnType<typeof createMockRedis>;
  let stream: EventStream;

  beforeEach(() => {
    redis = createMockRedis();
    stream = new EventStream({ redis, maxLen: 5000 });
  });

  describe('publish', () => {
    it('should publish an event to the stream via XADD', async () => {
      const event = createEvent();
      const result = await stream.publish('events:analytics', event);

      expect(result).toBe('1234567890-0');
      expect(redis.xadd).toHaveBeenCalledWith(
        'events:analytics',
        'MAXLEN',
        '~',
        '5000',
        '*',
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
      );
    });

    it('should include metadata when present', async () => {
      const event = createEvent({ metadata: { region: 'us-east' } });
      await stream.publish('events:analytics', event);

      const call = redis.xadd.mock.calls[0];
      expect(call).toContain('metadata');
      expect(call).toContain(JSON.stringify({ region: 'us-east' }));
    });
  });

  describe('createGroup', () => {
    it('should create a consumer group', async () => {
      await stream.createGroup('my-stream', 'my-group');

      expect(redis.xgroup).toHaveBeenCalledWith('CREATE', 'my-stream', 'my-group', '0', 'MKSTREAM');
    });

    it('should ignore BUSYGROUP error (group already exists)', async () => {
      redis.xgroup.mockRejectedValue(new Error('BUSYGROUP Consumer Group name already exists'));

      await expect(stream.createGroup('my-stream', 'my-group')).resolves.toBeUndefined();
    });

    it('should throw non-BUSYGROUP errors', async () => {
      redis.xgroup.mockRejectedValue(new Error('ERR some other error'));

      await expect(stream.createGroup('my-stream', 'my-group')).rejects.toThrow(
        'ERR some other error',
      );
    });
  });

  describe('acknowledge', () => {
    it('should acknowledge entries via XACK', async () => {
      const result = await stream.acknowledge('my-stream', 'my-group', ['1-0', '2-0']);

      expect(result).toBe(1);
      expect(redis.xack).toHaveBeenCalledWith('my-stream', 'my-group', '1-0', '2-0');
    });

    it('should return 0 for empty ids', async () => {
      const result = await stream.acknowledge('my-stream', 'my-group', []);
      expect(result).toBe(0);
      expect(redis.xack).not.toHaveBeenCalled();
    });
  });

  describe('subscribe', () => {
    it('should create group and read messages', async () => {
      const config: ProcessorConfig = {
        name: 'test-processor',
        stream: 'events:test',
        group: 'test-group',
        consumer: 'consumer-1',
        batchSize: 10,
        blockTimeMs: 1000,
        maxRetries: 3,
      };

      const event = createEvent();
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

      let callCount = 0;
      redis.xreadgroup.mockImplementation(async () => {
        callCount++;
        if (callCount === 1) {
          return [['events:test', [['1-0', fields]]]];
        }
        stream.stop();
        return null;
      });

      const handler = vi.fn().mockResolvedValue(undefined);
      await stream.subscribe(config, handler);

      expect(redis.xgroup).toHaveBeenCalledWith(
        'CREATE',
        'events:test',
        'test-group',
        '0',
        'MKSTREAM',
      );
      expect(handler).toHaveBeenCalledWith([
        expect.objectContaining({ id: event.id, type: event.type }),
      ]);
      expect(redis.xack).toHaveBeenCalledWith('events:test', 'test-group', '1-0');
    });

    it('should stop when stop() is called', async () => {
      const config: ProcessorConfig = {
        name: 'test-processor',
        stream: 'events:test',
        group: 'test-group',
        consumer: 'consumer-1',
        batchSize: 10,
        blockTimeMs: 100,
        maxRetries: 3,
      };

      redis.xreadgroup.mockImplementation(async () => {
        stream.stop();
        return null;
      });

      const handler = vi.fn();
      await stream.subscribe(config, handler);

      expect(handler).not.toHaveBeenCalled();
    });
  });
});
