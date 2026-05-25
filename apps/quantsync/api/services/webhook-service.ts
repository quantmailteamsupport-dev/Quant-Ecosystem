// ============================================================================
// QuantSync - Webhook Service
// Developer API: webhook registration, events, delivery with retry, rate limiting
// ============================================================================

import * as crypto from 'crypto';

type WebhookEvent = 'post.created' | 'post.deleted' | 'post.liked' | 'user.followed' | 'user.unfollowed' | 'mention' | 'reply' | 'dm.received' | 'space.started' | 'space.ended';

interface WebhookRegistration {
  id: string;
  appId: string;
  appName: string;
  url: string;
  secret: string;
  events: WebhookEvent[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  failureCount: number;
  lastDeliveryAt?: string;
  lastDeliveryStatus?: number;
}

interface WebhookDelivery {
  id: string;
  webhookId: string;
  event: WebhookEvent;
  payload: Record<string, any>;
  status: 'pending' | 'delivered' | 'failed' | 'retrying';
  statusCode?: number;
  responseBody?: string;
  attempts: number;
  maxAttempts: number;
  nextRetryAt?: string;
  createdAt: string;
  deliveredAt?: string;
}

interface RateLimitEntry {
  appId: string;
  windowStart: number;
  requestCount: number;
  limit: number;
}

interface WebhookStore {
  registrations: Map<string, WebhookRegistration>;
  deliveries: Map<string, WebhookDelivery>;
  rateLimits: Map<string, RateLimitEntry>;
}

const store: WebhookStore = {
  registrations: new Map(),
  deliveries: new Map(),
  rateLimits: new Map(),
};

const RATE_LIMIT_WINDOW = 60000;
const DEFAULT_RATE_LIMIT = 100;
const MAX_RETRY_ATTEMPTS = 5;
const RETRY_DELAYS = [1000, 5000, 30000, 120000, 600000];

function generateId(): string {
  return `whk_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

function generateSecret(): string {
  return crypto.randomBytes(32).toString('hex');
}

function signPayload(payload: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

function verifySignature(payload: string, signature: string, secret: string): boolean {
  const expected = signPayload(payload, secret);
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

export class WebhookService {
  async registerWebhook(appId: string, appName: string, data: { url: string; events: WebhookEvent[] }): Promise<WebhookRegistration> {
    if (!data.url || !data.url.startsWith('https://')) {
      throw new Error('Webhook URL must use HTTPS');
    }
    if (!data.events || data.events.length === 0) {
      throw new Error('At least one event must be subscribed');
    }

    const existing = Array.from(store.registrations.values()).filter(r => r.appId === appId);
    if (existing.length >= 10) throw new Error('Maximum 10 webhooks per app');

    const registration: WebhookRegistration = {
      id: generateId(),
      appId,
      appName,
      url: data.url,
      secret: generateSecret(),
      events: data.events,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      failureCount: 0,
    };

    store.registrations.set(registration.id, registration);
    return registration;
  }

  async updateWebhook(webhookId: string, appId: string, data: { url?: string; events?: WebhookEvent[]; isActive?: boolean }): Promise<WebhookRegistration> {
    const webhook = store.registrations.get(webhookId);
    if (!webhook || webhook.appId !== appId) throw new Error('Webhook not found');

    if (data.url !== undefined) {
      if (!data.url.startsWith('https://')) throw new Error('URL must use HTTPS');
      webhook.url = data.url;
    }
    if (data.events !== undefined) webhook.events = data.events;
    if (data.isActive !== undefined) webhook.isActive = data.isActive;
    webhook.updatedAt = new Date().toISOString();

    return webhook;
  }

  async deleteWebhook(webhookId: string, appId: string): Promise<void> {
    const webhook = store.registrations.get(webhookId);
    if (!webhook || webhook.appId !== appId) throw new Error('Webhook not found');
    store.registrations.delete(webhookId);
  }

  async getWebhooks(appId: string): Promise<WebhookRegistration[]> {
    return Array.from(store.registrations.values()).filter(r => r.appId === appId);
  }

  async dispatchEvent(event: WebhookEvent, payload: Record<string, any>): Promise<void> {
    const webhooks = Array.from(store.registrations.values())
      .filter(w => w.isActive && w.events.includes(event));

    for (const webhook of webhooks) {
      if (!this.checkRateLimit(webhook.appId)) continue;

      const delivery: WebhookDelivery = {
        id: generateId(),
        webhookId: webhook.id,
        event,
        payload,
        status: 'pending',
        attempts: 0,
        maxAttempts: MAX_RETRY_ATTEMPTS,
        createdAt: new Date().toISOString(),
      };

      store.deliveries.set(delivery.id, delivery);
      this.processDelivery(delivery, webhook);
    }
  }

  private async processDelivery(delivery: WebhookDelivery, webhook: WebhookRegistration): Promise<void> {
    delivery.attempts++;
    const body = JSON.stringify({
      id: delivery.id,
      event: delivery.event,
      payload: delivery.payload,
      timestamp: new Date().toISOString(),
    });

    const signature = signPayload(body, webhook.secret);

    try {
      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Id': delivery.id,
          'X-Webhook-Event': delivery.event,
          'X-Webhook-Signature': `sha256=${signature}`,
          'X-Webhook-Timestamp': new Date().toISOString(),
        },
        body,
        signal: AbortSignal.timeout(10000),
      });

      delivery.statusCode = response.status;
      if (response.ok) {
        delivery.status = 'delivered';
        delivery.deliveredAt = new Date().toISOString();
        webhook.lastDeliveryAt = new Date().toISOString();
        webhook.lastDeliveryStatus = response.status;
        webhook.failureCount = 0;
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (err: any) {
      delivery.status = delivery.attempts >= delivery.maxAttempts ? 'failed' : 'retrying';
      webhook.failureCount++;

      if (webhook.failureCount >= 50) {
        webhook.isActive = false;
      }

      if (delivery.status === 'retrying') {
        const delay = RETRY_DELAYS[Math.min(delivery.attempts - 1, RETRY_DELAYS.length - 1)];
        delivery.nextRetryAt = new Date(Date.now() + delay).toISOString();
        setTimeout(() => this.processDelivery(delivery, webhook), delay);
      }
    }
  }

  private checkRateLimit(appId: string): boolean {
    const now = Date.now();
    let entry = store.rateLimits.get(appId);

    if (!entry || (now - entry.windowStart) > RATE_LIMIT_WINDOW) {
      entry = { appId, windowStart: now, requestCount: 0, limit: DEFAULT_RATE_LIMIT };
      store.rateLimits.set(appId, entry);
    }

    if (entry.requestCount >= entry.limit) return false;
    entry.requestCount++;
    return true;
  }

  async getDeliveries(webhookId: string, options: { limit?: number; status?: string } = {}): Promise<WebhookDelivery[]> {
    const { limit = 50, status } = options;
    let deliveries = Array.from(store.deliveries.values()).filter(d => d.webhookId === webhookId);
    if (status) deliveries = deliveries.filter(d => d.status === status);
    return deliveries.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, limit);
  }

  async retryDelivery(deliveryId: string, appId: string): Promise<void> {
    const delivery = store.deliveries.get(deliveryId);
    if (!delivery) throw new Error('Delivery not found');
    const webhook = store.registrations.get(delivery.webhookId);
    if (!webhook || webhook.appId !== appId) throw new Error('Unauthorized');
    delivery.status = 'retrying';
    delivery.attempts = 0;
    this.processDelivery(delivery, webhook);
  }

  async rotateSecret(webhookId: string, appId: string): Promise<{ secret: string }> {
    const webhook = store.registrations.get(webhookId);
    if (!webhook || webhook.appId !== appId) throw new Error('Webhook not found');
    webhook.secret = generateSecret();
    webhook.updatedAt = new Date().toISOString();
    return { secret: webhook.secret };
  }

  verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
    return verifySignature(payload, signature.replace('sha256=', ''), secret);
  }

  async getRateLimitStatus(appId: string): Promise<{ remaining: number; limit: number; resetAt: string }> {
    const entry = store.rateLimits.get(appId);
    if (!entry) return { remaining: DEFAULT_RATE_LIMIT, limit: DEFAULT_RATE_LIMIT, resetAt: new Date(Date.now() + RATE_LIMIT_WINDOW).toISOString() };
    return {
      remaining: Math.max(0, entry.limit - entry.requestCount),
      limit: entry.limit,
      resetAt: new Date(entry.windowStart + RATE_LIMIT_WINDOW).toISOString(),
    };
  }
}

export const webhookService = new WebhookService();
