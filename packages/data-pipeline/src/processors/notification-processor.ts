import type { StreamEvent, ProcessorHandler } from '../types.js';

export interface NotificationMessage {
  userId: string;
  channel: string;
  title: string;
  body: string;
  priority: 'low' | 'normal' | 'high';
}

export interface UserPreferences {
  channels: string[];
  quietHoursStart?: number;
  quietHoursEnd?: number;
  disabled?: boolean;
}

export interface NotificationProcessorOptions {
  batchSize: number;
  getPreferences: (userId: string) => Promise<UserPreferences | null>;
  deliver: (notifications: NotificationMessage[]) => Promise<void>;
}

export class NotificationProcessor {
  private readonly batchSize: number;
  private readonly getPreferences: (userId: string) => Promise<UserPreferences | null>;
  private readonly deliver: (notifications: NotificationMessage[]) => Promise<void>;
  private buffer: NotificationMessage[] = [];

  constructor(options: NotificationProcessorOptions) {
    this.batchSize = options.batchSize;
    this.getPreferences = options.getPreferences;
    this.deliver = options.deliver;
  }

  get handler(): ProcessorHandler {
    return this.process.bind(this);
  }

  async process(events: StreamEvent[]): Promise<void> {
    for (const event of events) {
      if (event.type !== 'notification') continue;

      const userId = event.data['userId'] as string | undefined;
      const channel = event.data['channel'] as string | undefined;
      const title = event.data['title'] as string | undefined;
      const body = event.data['body'] as string | undefined;
      const priority = (event.data['priority'] as string | undefined) ?? 'normal';

      if (!userId || !title || !body) continue;

      const prefs = await this.getPreferences(userId);

      if (prefs?.disabled) continue;
      if (channel && prefs?.channels && !prefs.channels.includes(channel)) continue;

      this.buffer.push({
        userId,
        channel: channel ?? 'default',
        title,
        body,
        priority: priority as 'low' | 'normal' | 'high',
      });
    }

    if (this.buffer.length >= this.batchSize) {
      await this.flush();
    }
  }

  async flush(): Promise<void> {
    if (this.buffer.length === 0) return;
    const batch = this.buffer.splice(0, this.batchSize);
    await this.deliver(batch);
  }

  getBufferSize(): number {
    return this.buffer.length;
  }
}
