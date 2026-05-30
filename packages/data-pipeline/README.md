# @quant/data-pipeline

Real-time event streaming infrastructure built on Redis Streams. Provides a publish/subscribe model for event-driven architectures with consumer groups, dead letter queues, and specialized processors for analytics, notifications, and indexing.

## Installation

```bash
pnpm add @quant/data-pipeline
```

## Core Concepts

- **EventStream**: Manages Redis Streams with consumer groups, acknowledgment, and backpressure
- **DeadLetterQueue**: Captures failed events for retry or manual inspection
- **Processors**: Specialized event handlers for common patterns (analytics, notifications, indexing)

## Usage

### Publishing Events

```typescript
import { EventStream } from '@quant/data-pipeline';

const stream = new EventStream({
  redis: { host: 'localhost', port: 6379 },
  streamKey: 'events:platform',
  consumerGroup: 'my-service',
});

await stream.publish({
  type: 'user.created',
  payload: { userId: 'u_123', email: 'user@example.com' },
  timestamp: Date.now(),
});
```

### Subscribing to Events

```typescript
import { EventStream } from '@quant/data-pipeline';

const stream = new EventStream({
  redis: { host: 'localhost', port: 6379 },
  streamKey: 'events:platform',
  consumerGroup: 'notification-service',
  consumerId: 'worker-1',
});

await stream.subscribe(async (event) => {
  console.log(`Received: ${event.type}`, event.payload);
  // Process event...
  // Automatically acknowledged on success
});
```

### Analytics Processor

Aggregates events into time-bucketed analytics:

```typescript
import { AnalyticsProcessor } from '@quant/data-pipeline';

const analytics = new AnalyticsProcessor({
  redis: { host: 'localhost', port: 6379 },
  bucketDurationMs: 60_000, // 1-minute buckets
  retentionMs: 86_400_000, // 24-hour retention
});

// Process incoming events into analytics buckets
await analytics.process({
  type: 'page.view',
  payload: { path: '/dashboard', userId: 'u_123' },
});

// Query aggregated data
const buckets = await analytics.query('page.view', { last: '1h' });
```

### Notification Processor

Routes events to user notification channels:

```typescript
import { NotificationProcessor } from '@quant/data-pipeline';

const notifications = new NotificationProcessor({
  redis: { host: 'localhost', port: 6379 },
});

await notifications.process({
  type: 'message.received',
  payload: { recipientId: 'u_456', body: 'Hello!' },
});
```

### Indexing Processor

Feeds events into the search indexing pipeline:

```typescript
import { IndexingProcessor } from '@quant/data-pipeline';

const indexer = new IndexingProcessor({
  redis: { host: 'localhost', port: 6379 },
  batchSize: 50,
  flushIntervalMs: 5000,
});

await indexer.process({
  type: 'email.created',
  payload: { id: 'e_789', subject: 'Meeting tomorrow', body: '...' },
});
```

### Dead Letter Queue

Handle failed events:

```typescript
import { DeadLetterQueue } from '@quant/data-pipeline';

const dlq = new DeadLetterQueue({
  redis: { host: 'localhost', port: 6379 },
  streamKey: 'dlq:events',
});

// Get stats
const stats = await dlq.getStats();
// { total: 15, oldest: '2024-01-01T...', byType: { 'email.send': 10, ... } }

// Retry failed events
await dlq.retry({ type: 'email.send', limit: 10 });
```

## Configuration

| Option          | Type   | Default        | Description                   |
| --------------- | ------ | -------------- | ----------------------------- |
| `redis.host`    | string | `'localhost'`  | Redis host                    |
| `redis.port`    | number | `6379`         | Redis port                    |
| `streamKey`     | string | required       | Redis Stream key name         |
| `consumerGroup` | string | required       | Consumer group name           |
| `consumerId`    | string | auto-generated | Unique consumer ID            |
| `maxRetries`    | number | `3`            | Max retry attempts before DLQ |
| `blockTimeMs`   | number | `5000`         | XREADGROUP block timeout      |

## Dependencies

- `ioredis` - Redis client
- `zod` - Schema validation
- `pino` - Structured logging
- `@quant/common` - Shared types and utilities
