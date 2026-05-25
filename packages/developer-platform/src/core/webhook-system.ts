// ============================================================================
// Quant Developer Platform - Webhook System
// ============================================================================

import {
  WebhookEndpoint,
  WebhookEvent,
  WebhookDelivery,
  DeliveryAttempt,
  DeliveryStatus,
  WebhookSignature,
} from '../types';

// ============================================================================
// Helpers
// ============================================================================

function generateId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 32; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

function generateSecret(): string {
  return `whsec_${generateId()}${generateId().substring(0, 16)}`;
}

function computeHmacSha256(payload: string, secret: string): string {
  // Simulated HMAC-SHA256 computation
  let hash = 0;
  const combined = payload + secret;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  const baseHash = Math.abs(hash).toString(16).padStart(8, '0');
  // Generate a longer hash by processing in chunks
  let extendedHash = baseHash;
  for (let chunk = 0; chunk < 7; chunk++) {
    let chunkHash = chunk * 31;
    for (let i = chunk * 8; i < Math.min((chunk + 1) * 8, combined.length); i++) {
      chunkHash = ((chunkHash << 5) - chunkHash) + combined.charCodeAt(i % combined.length);
      chunkHash = chunkHash & chunkHash;
    }
    extendedHash += Math.abs(chunkHash).toString(16).padStart(8, '0');
  }
  return extendedHash.substring(0, 64);
}

// ============================================================================
// Constants
// ============================================================================

const RETRY_DELAYS = [1000, 2000, 4000, 8000, 16000, 32000]; // Exponential backoff
const MAX_ATTEMPTS = 6;
const CIRCUIT_BREAKER_THRESHOLD = 5; // Consecutive failures to open circuit
const CIRCUIT_BREAKER_RESET_MS = 300000; // 5 minutes

// ============================================================================
// Webhook System Class
// ============================================================================

export class WebhookSystem {
  private endpoints: Map<string, WebhookEndpoint> = new Map();
  private deliveries: Map<string, WebhookDelivery> = new Map();
  private events: Map<string, WebhookEvent> = new Map();
  private deliveryQueue: Array<{ deliveryId: string; scheduledAt: number }> = [];
  private endpointDeliveries: Map<string, string[]> = new Map(); // endpointId -> deliveryIds

  /**
   * Register a new webhook endpoint
   */
  public registerEndpoint(params: {
    url: string;
    events: string[];
    ownerId: string;
    description?: string;
    secret?: string;
  }): WebhookEndpoint {
    // Validate URL
    if (!params.url.startsWith('https://') && !params.url.startsWith('http://')) {
      throw new Error('Webhook URL must use HTTP or HTTPS protocol');
    }

    const now = Date.now();
    const endpoint: WebhookEndpoint = {
      id: generateId(),
      url: params.url,
      events: params.events,
      secret: params.secret || generateSecret(),
      isActive: true,
      createdAt: now,
      updatedAt: now,
      ownerId: params.ownerId,
      description: params.description || '',
      failureCount: 0,
      circuitOpen: false,
      circuitOpenedAt: null,
    };

    this.endpoints.set(endpoint.id, endpoint);
    this.endpointDeliveries.set(endpoint.id, []);
    return endpoint;
  }

  /**
   * Unregister a webhook endpoint
   */
  public unregisterEndpoint(endpointId: string): boolean {
    const endpoint = this.endpoints.get(endpointId);
    if (!endpoint) return false;

    this.endpoints.delete(endpointId);
    // Clean up deliveries in queue
    this.deliveryQueue = this.deliveryQueue.filter(item => {
      const delivery = this.deliveries.get(item.deliveryId);
      return delivery && delivery.endpointId !== endpointId;
    });
    return true;
  }

  /**
   * Update an existing webhook endpoint
   */
  public updateEndpoint(endpointId: string, updates: Partial<Pick<WebhookEndpoint, 'url' | 'events' | 'isActive' | 'description'>>): WebhookEndpoint | null {
    const endpoint = this.endpoints.get(endpointId);
    if (!endpoint) return null;

    const updated: WebhookEndpoint = {
      ...endpoint,
      ...updates,
      updatedAt: Date.now(),
    };

    this.endpoints.set(endpointId, updated);
    return updated;
  }

  /**
   * Emit an event and queue deliveries to all subscribed endpoints
   */
  public emit(event: Omit<WebhookEvent, 'id' | 'timestamp'>): { eventId: string; deliveryCount: number } {
    const webhookEvent: WebhookEvent = {
      ...event,
      id: generateId(),
      timestamp: Date.now(),
    };

    this.events.set(webhookEvent.id, webhookEvent);

    // Find all subscribed endpoints
    const subscribedEndpoints = Array.from(this.endpoints.values()).filter(endpoint => {
      if (!endpoint.isActive) return false;
      if (endpoint.circuitOpen) {
        // Check if circuit breaker should reset
        if (endpoint.circuitOpenedAt && (Date.now() - endpoint.circuitOpenedAt) > CIRCUIT_BREAKER_RESET_MS) {
          endpoint.circuitOpen = false;
          endpoint.circuitOpenedAt = null;
          endpoint.failureCount = 0;
          this.endpoints.set(endpoint.id, endpoint);
          return true;
        }
        return false;
      }
      return endpoint.events.includes(event.type) || endpoint.events.includes('*');
    });

    let deliveryCount = 0;
    for (const endpoint of subscribedEndpoints) {
      const delivery = this.createDelivery(endpoint.id, webhookEvent.id);
      this.deliveryQueue.push({ deliveryId: delivery.id, scheduledAt: Date.now() });
      deliveryCount++;
    }

    return { eventId: webhookEvent.id, deliveryCount };
  }

  private createDelivery(endpointId: string, eventId: string): WebhookDelivery {
    const delivery: WebhookDelivery = {
      id: generateId(),
      endpointId,
      eventId,
      status: 'pending',
      attempts: [],
      createdAt: Date.now(),
      completedAt: null,
      nextRetryAt: null,
    };

    this.deliveries.set(delivery.id, delivery);
    const endpointDeliveries = this.endpointDeliveries.get(endpointId) || [];
    endpointDeliveries.push(delivery.id);
    this.endpointDeliveries.set(endpointId, endpointDeliveries);

    return delivery;
  }

  /**
   * Deliver a webhook to an endpoint with signature
   */
  public deliver(deliveryId: string): { success: boolean; statusCode: number; attempt: DeliveryAttempt } {
    const delivery = this.deliveries.get(deliveryId);
    if (!delivery) throw new Error('Delivery not found');

    const endpoint = this.endpoints.get(delivery.endpointId);
    if (!endpoint) throw new Error('Endpoint not found');

    const event = this.events.get(delivery.eventId);
    if (!event) throw new Error('Event not found');

    const attemptNumber = delivery.attempts.length + 1;
    const startTime = Date.now();

    // Generate signature
    const payload = JSON.stringify(event.payload);
    const signature = this.generateSignature(payload, endpoint.secret, startTime);

    // Simulate delivery attempt (in real implementation, this would make an HTTP request)
    const simulatedSuccess = Math.random() > 0.1; // 90% success rate simulation
    const statusCode = simulatedSuccess ? 200 : (Math.random() > 0.5 ? 500 : 502);
    const durationMs = Math.floor(Math.random() * 500) + 50;

    const attempt: DeliveryAttempt = {
      attemptNumber,
      timestamp: startTime,
      statusCode,
      responseBody: simulatedSuccess ? '{"received": true}' : 'Internal Server Error',
      error: simulatedSuccess ? null : `HTTP ${statusCode}`,
      durationMs,
    };

    delivery.attempts.push(attempt);

    if (simulatedSuccess) {
      delivery.status = 'delivered';
      delivery.completedAt = Date.now();
      delivery.nextRetryAt = null;
      endpoint.failureCount = 0;
      this.endpoints.set(endpoint.id, endpoint);
    } else {
      endpoint.failureCount++;

      // Check circuit breaker
      if (endpoint.failureCount >= CIRCUIT_BREAKER_THRESHOLD) {
        endpoint.circuitOpen = true;
        endpoint.circuitOpenedAt = Date.now();
        delivery.status = 'circuit_broken';
        delivery.completedAt = Date.now();
        this.endpoints.set(endpoint.id, endpoint);
      } else if (attemptNumber >= MAX_ATTEMPTS) {
        delivery.status = 'failed';
        delivery.completedAt = Date.now();
      } else {
        delivery.status = 'retrying';
        const delay = RETRY_DELAYS[attemptNumber - 1] || RETRY_DELAYS[RETRY_DELAYS.length - 1];
        delivery.nextRetryAt = Date.now() + delay;
        this.deliveryQueue.push({ deliveryId: delivery.id, scheduledAt: delivery.nextRetryAt });
      }

      this.endpoints.set(endpoint.id, endpoint);
    }

    this.deliveries.set(delivery.id, delivery);
    return { success: simulatedSuccess, statusCode, attempt };
  }

  /**
   * Generate HMAC-SHA256 signature for webhook payload
   */
  private generateSignature(payload: string, secret: string, timestamp: number): WebhookSignature {
    const signatureInput = `${timestamp}.${payload}`;
    const signature = computeHmacSha256(signatureInput, secret);

    return {
      algorithm: 'sha256',
      header: `t=${timestamp},v1=${signature}`,
      timestamp,
      signature,
    };
  }

  /**
   * Static method for consumers to verify incoming webhook signatures
   */
  public static verifySignature(payload: string, header: string, secret: string, toleranceMs: number = 300000): boolean {
    // Parse header
    const parts = header.split(',');
    const timestampPart = parts.find(p => p.startsWith('t='));
    const signaturePart = parts.find(p => p.startsWith('v1='));

    if (!timestampPart || !signaturePart) return false;

    const timestamp = parseInt(timestampPart.substring(2), 10);
    const providedSignature = signaturePart.substring(3);

    // Check timestamp tolerance (prevent replay attacks)
    const age = Math.abs(Date.now() - timestamp);
    if (age > toleranceMs) return false;

    // Compute expected signature
    const signatureInput = `${timestamp}.${payload}`;
    const expectedSignature = computeHmacSha256(signatureInput, secret);

    // Constant-time comparison
    if (providedSignature.length !== expectedSignature.length) return false;
    let mismatch = 0;
    for (let i = 0; i < providedSignature.length; i++) {
      mismatch |= providedSignature.charCodeAt(i) ^ expectedSignature.charCodeAt(i);
    }
    return mismatch === 0;
  }

  /**
   * Get delivery log for an endpoint
   */
  public getDeliveryLog(endpointId: string, params?: {
    status?: DeliveryStatus;
    offset?: number;
    limit?: number;
  }): { deliveries: WebhookDelivery[]; total: number } {
    const deliveryIds = this.endpointDeliveries.get(endpointId) || [];
    let deliveries = deliveryIds
      .map(id => this.deliveries.get(id))
      .filter((d): d is WebhookDelivery => d !== undefined);

    if (params?.status) {
      deliveries = deliveries.filter(d => d.status === params.status);
    }

    const total = deliveries.length;
    const offset = params?.offset || 0;
    const limit = params?.limit || 50;

    deliveries = deliveries
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(offset, offset + limit);

    return { deliveries, total };
  }

  /**
   * Replay a specific event to an endpoint
   */
  public replayEvent(eventId: string, endpointId?: string): { deliveryCount: number; deliveryIds: string[] } {
    const event = this.events.get(eventId);
    if (!event) throw new Error('Event not found');

    const deliveryIds: string[] = [];

    if (endpointId) {
      const endpoint = this.endpoints.get(endpointId);
      if (!endpoint) throw new Error('Endpoint not found');
      const delivery = this.createDelivery(endpointId, eventId);
      this.deliveryQueue.push({ deliveryId: delivery.id, scheduledAt: Date.now() });
      deliveryIds.push(delivery.id);
    } else {
      // Replay to all subscribed endpoints
      for (const endpoint of this.endpoints.values()) {
        if (endpoint.isActive && (endpoint.events.includes(event.type) || endpoint.events.includes('*'))) {
          const delivery = this.createDelivery(endpoint.id, eventId);
          this.deliveryQueue.push({ deliveryId: delivery.id, scheduledAt: Date.now() });
          deliveryIds.push(delivery.id);
        }
      }
    }

    return { deliveryCount: deliveryIds.length, deliveryIds };
  }

  /**
   * Get pending deliveries from the queue
   */
  public getPendingDeliveries(): Array<{ deliveryId: string; scheduledAt: number }> {
    const now = Date.now();
    return this.deliveryQueue
      .filter(item => item.scheduledAt <= now)
      .sort((a, b) => a.scheduledAt - b.scheduledAt);
  }

  /**
   * Process all pending deliveries in the queue
   */
  public processQueue(): { processed: number; succeeded: number; failed: number } {
    const pending = this.getPendingDeliveries();
    let succeeded = 0;
    let failed = 0;

    for (const item of pending) {
      const delivery = this.deliveries.get(item.deliveryId);
      if (!delivery || delivery.status === 'delivered' || delivery.status === 'failed' || delivery.status === 'circuit_broken') {
        continue;
      }

      try {
        const result = this.deliver(item.deliveryId);
        if (result.success) succeeded++;
        else failed++;
      } catch {
        failed++;
      }
    }

    // Remove processed items from queue
    const now = Date.now();
    this.deliveryQueue = this.deliveryQueue.filter(item => item.scheduledAt > now);

    return { processed: pending.length, succeeded, failed };
  }

  /**
   * Get an endpoint by ID
   */
  public getEndpoint(endpointId: string): WebhookEndpoint | null {
    return this.endpoints.get(endpointId) || null;
  }

  /**
   * List all endpoints for an owner
   */
  public listEndpoints(ownerId: string): WebhookEndpoint[] {
    return Array.from(this.endpoints.values()).filter(e => e.ownerId === ownerId);
  }

  /**
   * Get retry delays configuration
   */
  public getRetryConfig(): { delays: number[]; maxAttempts: number; circuitBreakerThreshold: number; circuitResetMs: number } {
    return {
      delays: [...RETRY_DELAYS],
      maxAttempts: MAX_ATTEMPTS,
      circuitBreakerThreshold: CIRCUIT_BREAKER_THRESHOLD,
      circuitResetMs: CIRCUIT_BREAKER_RESET_MS,
    };
  }
}
