import { z } from 'zod';

export const StreamEventSchema = z.object({
  id: z.string(),
  type: z.string(),
  source: z.string(),
  timestamp: z.number(),
  data: z.record(z.unknown()),
  metadata: z.record(z.string()).optional(),
});

export type StreamEvent = z.infer<typeof StreamEventSchema>;

export interface ConsumerGroup {
  name: string;
  stream: string;
  consumers: string[];
  pending: number;
  lastDeliveredId: string;
}

export interface ProcessorConfig {
  name: string;
  stream: string;
  group: string;
  consumer: string;
  batchSize: number;
  blockTimeMs: number;
  maxRetries: number;
}

export type ProcessorHandler = (events: StreamEvent[]) => Promise<void>;

export interface DeadLetterEntry {
  id: string;
  stream: string;
  group: string;
  event: StreamEvent;
  error: string;
  attempts: number;
  firstFailedAt: number;
  lastFailedAt: number;
  replayedAt?: number;
}
