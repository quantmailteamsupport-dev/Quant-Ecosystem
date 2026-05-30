export { EventStream, type EventStreamOptions } from './event-stream.js';
export { DeadLetterQueue, type DeadLetterStats } from './dead-letter.js';
export {
  AnalyticsProcessor,
  type AnalyticsBucket,
  type AnalyticsProcessorOptions,
} from './processors/analytics-processor.js';
export {
  NotificationProcessor,
  type NotificationMessage,
  type UserPreferences,
  type NotificationProcessorOptions,
} from './processors/notification-processor.js';
export {
  IndexingProcessor,
  type IndexOperation,
  type IndexingProcessorOptions,
} from './processors/indexing-processor.js';
export {
  StreamEventSchema,
  type StreamEvent,
  type ConsumerGroup,
  type ProcessorConfig,
  type ProcessorHandler,
  type DeadLetterEntry,
} from './types.js';
