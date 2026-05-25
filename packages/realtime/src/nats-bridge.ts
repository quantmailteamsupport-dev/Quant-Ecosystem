// ============================================================================
// Realtime - NATS JetStream Integration
// ============================================================================

import {
  connect,
  type NatsConnection,
  type JetStreamClient,
  type JetStreamManager,
  type Subscription,
  StringCodec,
} from 'nats';
/** NATS bridge configuration */
export interface NatsBridgeConfig {
  url: string;
  token?: string;
  maxReconnectAttempts: number;
  reconnectTimeWaitMs: number;
}

/** Subscription handler */
export type NatsHandler = (subject: string, data: unknown) => void | Promise<void>;

const DEFAULT_NATS_CONFIG: NatsBridgeConfig = {
  url: 'nats://localhost:4222',
  maxReconnectAttempts: 10,
  reconnectTimeWaitMs: 2000,
};

/**
 * NatsBridge
 *
 * Provides integration with NATS JetStream for durable event delivery.
 * Falls back to no-op mode when NATS is not configured or unavailable.
 */
export class NatsBridge {
  private config: NatsBridgeConfig;
  private connection: NatsConnection | null = null;
  private jetstream: JetStreamClient | null = null;
  private jetstreamManager: JetStreamManager | null = null;
  private subscriptions: Map<string, Subscription> = new Map();
  private codec = StringCodec();
  private connected = false;
  private enabled: boolean;

  constructor(config?: Partial<NatsBridgeConfig>) {
    this.config = { ...DEFAULT_NATS_CONFIG, ...config };
    this.enabled = !!config;
  }

  /**
   * Connect to the NATS server.
   * Returns false if NATS is not configured (no-op mode).
   */
  async connect(): Promise<boolean> {
    if (!this.enabled) {
      return false;
    }

    try {
      this.connection = await connect({
        servers: this.config.url,
        token: this.config.token,
        maxReconnectAttempts: this.config.maxReconnectAttempts,
        reconnectTimeWait: this.config.reconnectTimeWaitMs,
      });
      this.jetstream = this.connection.jetstream();
      this.jetstreamManager = await this.connection.jetstreamManager();
      this.connected = true;
      return true;
    } catch {
      this.connected = false;
      return false;
    }
  }

  /**
   * Publish a message to a NATS subject.
   */
  async publish(subject: string, data: unknown): Promise<void> {
    if (!this.connected || !this.jetstream) return;

    const payload = this.codec.encode(JSON.stringify(data));
    try {
      await this.jetstream.publish(subject, payload);
    } catch {
      // Silently fail - message delivery is best-effort via NATS
    }
  }

  /**
   * Subscribe to a NATS subject.
   */
  async subscribe(subject: string, handler: NatsHandler): Promise<void> {
    if (!this.connected || !this.connection) return;

    const sub = this.connection.subscribe(subject);
    this.subscriptions.set(subject, sub);

    // Process messages asynchronously
    (async () => {
      for await (const msg of sub) {
        try {
          const data = JSON.parse(this.codec.decode(msg.data));
          await handler(msg.subject, data);
        } catch {
          // Skip malformed messages
        }
      }
    })();
  }

  /**
   * Create a JetStream stream for a category of events.
   */
  async createStream(name: string, subjects: string[]): Promise<boolean> {
    if (!this.connected || !this.jetstreamManager) return false;

    try {
      await this.jetstreamManager.streams.add({
        name,
        subjects,
      });
      return true;
    } catch {
      // Stream may already exist
      return false;
    }
  }

  /**
   * Check if connected to NATS.
   */
  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Gracefully disconnect from NATS.
   */
  async disconnect(): Promise<void> {
    if (!this.connection) return;

    // Unsubscribe all
    for (const sub of this.subscriptions.values()) {
      sub.unsubscribe();
    }
    this.subscriptions.clear();

    try {
      await this.connection.drain();
    } catch {
      // Force close if drain fails
      await this.connection.close();
    }

    this.connection = null;
    this.jetstream = null;
    this.jetstreamManager = null;
    this.connected = false;
  }
}
