export interface IPCMessage {
  channel: string;
  payload: unknown;
}

export type IPCHandler = (payload: unknown) => void;

const MAX_MESSAGE_SIZE = 1024 * 1024; // 1MB
const MAX_MESSAGES_PER_SECOND = 100;

export class IPCBridge {
  private readonly handlers = new Map<string, IPCHandler[]>();
  private messageTimestamps: number[] = [];
  private destroyed = false;

  send(channel: string, payload: unknown): void {
    if (this.destroyed) {
      throw new Error('IPCBridge has been destroyed');
    }

    const serialized = JSON.stringify(payload);
    if (serialized.length > MAX_MESSAGE_SIZE) {
      throw new Error(`Message exceeds maximum size of ${MAX_MESSAGE_SIZE} bytes`);
    }

    this.enforceRateLimit();

    const handlers = this.handlers.get(channel);
    if (handlers) {
      for (const handler of handlers) {
        handler(payload);
      }
    }
  }

  on(channel: string, handler: IPCHandler): void {
    if (this.destroyed) {
      throw new Error('IPCBridge has been destroyed');
    }

    const existing = this.handlers.get(channel) ?? [];
    existing.push(handler);
    this.handlers.set(channel, existing);
  }

  destroy(): void {
    this.destroyed = true;
    this.handlers.clear();
    this.messageTimestamps = [];
  }

  private enforceRateLimit(): void {
    const now = Date.now();
    this.messageTimestamps.push(now);

    // Remove timestamps older than 1 second
    const oneSecondAgo = now - 1000;
    this.messageTimestamps = this.messageTimestamps.filter((t) => t > oneSecondAgo);

    if (this.messageTimestamps.length > MAX_MESSAGES_PER_SECOND) {
      throw new Error(
        `Rate limit exceeded: maximum ${MAX_MESSAGES_PER_SECOND} messages per second`,
      );
    }
  }
}
