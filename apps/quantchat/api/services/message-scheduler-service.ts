// ============================================================================
// QuantChat - Message Scheduler Service
// Schedule messages for future delivery, manage queue, timezone support
// ============================================================================

interface ScheduledMessage {
  id: string;
  userId: string;
  chatId: string;
  content: string;
  mediaUrl: string | null;
  messageType: 'text' | 'image' | 'video' | 'document';
  sendAt: Date;
  timezone: string;
  status: 'scheduled' | 'sent' | 'cancelled' | 'failed';
  retryCount: number;
  maxRetries: number;
  createdAt: Date;
  sentAt: Date | null;
  error: string | null;
  recurrence: RecurrenceRule | null;
}

interface RecurrenceRule {
  type: 'daily' | 'weekly' | 'monthly' | 'custom';
  interval: number;
  daysOfWeek?: number[];
  endDate?: Date;
  maxOccurrences?: number;
  occurrencesSent: number;
}

interface SchedulerStats {
  totalScheduled: number;
  pending: number;
  sent: number;
  failed: number;
  cancelled: number;
  nextDelivery: Date | null;
}

export class MessageScheduler {
  private messages: Map<string, ScheduledMessage> = new Map();
  private userMessageIndex: Map<string, string[]> = new Map();
  private chatMessageIndex: Map<string, string[]> = new Map();
  private userTimezones: Map<string, string> = new Map();

  async schedule(userId: string, config: {
    chatId: string;
    content: string;
    sendAt: Date;
    mediaUrl?: string;
    messageType?: 'text' | 'image' | 'video' | 'document';
    timezone?: string;
    recurrence?: Omit<RecurrenceRule, 'occurrencesSent'>;
  }): Promise<ScheduledMessage> {
    if (!config.content && !config.mediaUrl) {
      throw new Error('Content or media URL is required');
    }

    const sendAt = new Date(config.sendAt);
    if (sendAt <= new Date()) {
      throw new Error('Scheduled time must be in the future');
    }

    // Max 30 days in advance
    const maxDate = new Date(Date.now() + 30 * 86400000);
    if (sendAt > maxDate) {
      throw new Error('Cannot schedule more than 30 days in advance');
    }

    const userMessages = this.userMessageIndex.get(userId) || [];
    const pendingCount = userMessages.filter(id => {
      const m = this.messages.get(id);
      return m && m.status === 'scheduled';
    }).length;

    if (pendingCount >= 50) {
      throw new Error('Maximum 50 scheduled messages allowed');
    }

    const msgId = `sched_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const timezone = config.timezone || this.userTimezones.get(userId) || 'UTC';

    const scheduled: ScheduledMessage = {
      id: msgId,
      userId,
      chatId: config.chatId,
      content: config.content || '',
      mediaUrl: config.mediaUrl || null,
      messageType: config.messageType || 'text',
      sendAt,
      timezone,
      status: 'scheduled',
      retryCount: 0,
      maxRetries: 3,
      createdAt: new Date(),
      sentAt: null,
      error: null,
      recurrence: config.recurrence ? { ...config.recurrence, occurrencesSent: 0 } : null,
    };

    this.messages.set(msgId, scheduled);
    userMessages.push(msgId);
    this.userMessageIndex.set(userId, userMessages);

    const chatMessages = this.chatMessageIndex.get(config.chatId) || [];
    chatMessages.push(msgId);
    this.chatMessageIndex.set(config.chatId, chatMessages);

    return scheduled;
  }

  async cancel(scheduleId: string, userId: string): Promise<ScheduledMessage> {
    const message = this.messages.get(scheduleId);
    if (!message) throw new Error('Scheduled message not found');
    if (message.userId !== userId) throw new Error('Access denied');
    if (message.status !== 'scheduled') throw new Error('Message cannot be cancelled');

    message.status = 'cancelled';
    return message;
  }

  async edit(scheduleId: string, userId: string, updates: { content?: string; sendAt?: Date; mediaUrl?: string }): Promise<ScheduledMessage> {
    const message = this.messages.get(scheduleId);
    if (!message) throw new Error('Scheduled message not found');
    if (message.userId !== userId) throw new Error('Access denied');
    if (message.status !== 'scheduled') throw new Error('Can only edit scheduled messages');

    if (updates.content !== undefined) message.content = updates.content;
    if (updates.mediaUrl !== undefined) message.mediaUrl = updates.mediaUrl;
    if (updates.sendAt) {
      const newTime = new Date(updates.sendAt);
      if (newTime <= new Date()) throw new Error('New time must be in the future');
      message.sendAt = newTime;
    }

    return message;
  }

  async getScheduled(userId: string, options?: { chatId?: string; status?: string }): Promise<ScheduledMessage[]> {
    const messageIds = this.userMessageIndex.get(userId) || [];
    let messages = messageIds
      .map(id => this.messages.get(id))
      .filter((m): m is ScheduledMessage => m !== undefined);

    if (options?.chatId) messages = messages.filter(m => m.chatId === options.chatId);
    if (options?.status) messages = messages.filter(m => m.status === options.status);

    return messages.sort((a, b) => a.sendAt.getTime() - b.sendAt.getTime());
  }

  async processQueue(): Promise<{ processed: number; sent: number; failed: number }> {
    const now = new Date();
    let processed = 0;
    let sent = 0;
    let failed = 0;

    for (const message of this.messages.values()) {
      if (message.status !== 'scheduled') continue;
      if (message.sendAt > now) continue;

      processed++;

      try {
        // Simulate sending
        const success = Math.random() > 0.05; // 95% success rate
        if (success) {
          message.status = 'sent';
          message.sentAt = new Date();
          sent++;

          // Handle recurrence
          if (message.recurrence) {
            this.scheduleNextOccurrence(message);
          }
        } else {
          message.retryCount++;
          if (message.retryCount >= message.maxRetries) {
            message.status = 'failed';
            message.error = 'Max retries exceeded';
            failed++;
          } else {
            // Reschedule for retry in 5 minutes
            message.sendAt = new Date(now.getTime() + 5 * 60000);
          }
        }
      } catch (error) {
        message.status = 'failed';
        message.error = error instanceof Error ? error.message : 'Unknown error';
        failed++;
      }
    }

    return { processed, sent, failed };
  }

  async getHistory(userId: string, limit: number = 50): Promise<ScheduledMessage[]> {
    const messageIds = this.userMessageIndex.get(userId) || [];
    return messageIds
      .map(id => this.messages.get(id))
      .filter((m): m is ScheduledMessage => m !== undefined && m.status !== 'scheduled')
      .sort((a, b) => (b.sentAt || b.createdAt).getTime() - (a.sentAt || a.createdAt).getTime())
      .slice(0, limit);
  }

  async setTimezone(userId: string, timezone: string): Promise<void> {
    // Validate timezone format
    const validTimezones = ['UTC', 'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles', 'Europe/London', 'Europe/Paris', 'Asia/Tokyo', 'Asia/Kolkata', 'Australia/Sydney'];
    if (!validTimezones.includes(timezone) && !/^[A-Z][a-z]+\/[A-Z][a-z_]+$/.test(timezone)) {
      throw new Error('Invalid timezone');
    }
    this.userTimezones.set(userId, timezone);
  }

  async getStats(userId: string): Promise<SchedulerStats> {
    const messages = await this.getScheduled(userId);
    const all = (this.userMessageIndex.get(userId) || [])
      .map(id => this.messages.get(id))
      .filter((m): m is ScheduledMessage => m !== undefined);

    const pending = all.filter(m => m.status === 'scheduled');
    const nextDelivery = pending.length > 0
      ? pending.sort((a, b) => a.sendAt.getTime() - b.sendAt.getTime())[0].sendAt
      : null;

    return {
      totalScheduled: all.length,
      pending: pending.length,
      sent: all.filter(m => m.status === 'sent').length,
      failed: all.filter(m => m.status === 'failed').length,
      cancelled: all.filter(m => m.status === 'cancelled').length,
      nextDelivery,
    };
  }

  private scheduleNextOccurrence(message: ScheduledMessage): void {
    if (!message.recurrence) return;

    message.recurrence.occurrencesSent++;

    if (message.recurrence.maxOccurrences && message.recurrence.occurrencesSent >= message.recurrence.maxOccurrences) return;
    if (message.recurrence.endDate && new Date() > message.recurrence.endDate) return;

    let nextDate: Date;
    const interval = message.recurrence.interval;

    switch (message.recurrence.type) {
      case 'daily':
        nextDate = new Date(message.sendAt.getTime() + interval * 86400000);
        break;
      case 'weekly':
        nextDate = new Date(message.sendAt.getTime() + interval * 7 * 86400000);
        break;
      case 'monthly':
        nextDate = new Date(message.sendAt);
        nextDate.setMonth(nextDate.getMonth() + interval);
        break;
      default:
        nextDate = new Date(message.sendAt.getTime() + interval * 86400000);
    }

    // Create a new scheduled message for the next occurrence
    const newId = `sched_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const newMessage: ScheduledMessage = {
      ...message,
      id: newId,
      status: 'scheduled',
      sendAt: nextDate,
      sentAt: null,
      retryCount: 0,
      error: null,
      createdAt: new Date(),
    };

    this.messages.set(newId, newMessage);
    const userMessages = this.userMessageIndex.get(message.userId) || [];
    userMessages.push(newId);
    this.userMessageIndex.set(message.userId, userMessages);
  }
}

export const messageScheduler = new MessageScheduler();
