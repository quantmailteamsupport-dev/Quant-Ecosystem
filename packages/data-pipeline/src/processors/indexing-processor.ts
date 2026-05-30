import type { StreamEvent, ProcessorHandler } from '../types.js';

export interface IndexOperation {
  action: 'index' | 'update' | 'delete';
  collection: string;
  documentId: string;
  document?: Record<string, unknown>;
}

export interface IndexingProcessorOptions {
  bulkSize: number;
  flushIntervalMs: number;
  onBulkIndex: (operations: IndexOperation[]) => Promise<void>;
}

export class IndexingProcessor {
  private readonly bulkSize: number;
  private readonly onBulkIndex: (operations: IndexOperation[]) => Promise<void>;
  private buffer: IndexOperation[] = [];
  private lastFlush: number = Date.now();
  private readonly flushIntervalMs: number;

  constructor(options: IndexingProcessorOptions) {
    this.bulkSize = options.bulkSize;
    this.flushIntervalMs = options.flushIntervalMs;
    this.onBulkIndex = options.onBulkIndex;
  }

  get handler(): ProcessorHandler {
    return this.process.bind(this);
  }

  async process(events: StreamEvent[]): Promise<void> {
    for (const event of events) {
      const operation = this.toOperation(event);
      if (operation) {
        this.buffer.push(operation);
      }
    }

    if (this.shouldFlush()) {
      await this.flush();
    }
  }

  async flush(): Promise<void> {
    if (this.buffer.length === 0) return;
    const batch = this.buffer.splice(0, this.bulkSize);
    await this.onBulkIndex(batch);
    this.lastFlush = Date.now();
  }

  getBufferSize(): number {
    return this.buffer.length;
  }

  private toOperation(event: StreamEvent): IndexOperation | null {
    const action = event.data['action'] as string | undefined;
    const collection = event.data['collection'] as string | undefined;
    const documentId = event.data['documentId'] as string | undefined;

    if (!action || !collection || !documentId) return null;
    if (action !== 'index' && action !== 'update' && action !== 'delete') return null;

    const operation: IndexOperation = {
      action,
      collection,
      documentId,
    };

    if (action !== 'delete' && event.data['document']) {
      operation.document = event.data['document'] as Record<string, unknown>;
    }

    return operation;
  }

  private shouldFlush(): boolean {
    if (this.buffer.length >= this.bulkSize) return true;
    if (Date.now() - this.lastFlush > this.flushIntervalMs && this.buffer.length > 0) return true;
    return false;
  }
}
