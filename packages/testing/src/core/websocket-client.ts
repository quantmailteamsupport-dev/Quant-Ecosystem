// ============================================================================
// Quant Ecosystem - Testing Framework: WebSocket Test Client
// Connection simulation, message sending, event subscription, reconnection
// ============================================================================

import type { WSMessage, WSConnection, WSTestConfig } from '../types';

/**
 * WSTestClient - Simulates WebSocket connections for testing
 */
export class WSTestClient {
  private config: WSTestConfig;
  private connection: WSConnection;
  private eventHandlers: Map<string, Function[]> = new Map();
  private messageQueue: WSMessage[] = [];
  private responseHandlers: Map<string, (msg: WSMessage) => void> = new Map();
  private reconnectAttempts: number = 0;
  private messageCounter: number = 0;
  private serverSimulator: ((msg: WSMessage) => WSMessage | null) | null = null;
  private connectionHistory: { event: string; timestamp: number }[] = [];

  constructor(config: Partial<WSTestConfig> = {}) {
    this.config = {
      url: config.url ?? 'ws://localhost:8080',
      protocols: config.protocols ?? [],
      autoReconnect: config.autoReconnect ?? true,
      reconnectDelay: config.reconnectDelay ?? 1000,
      maxReconnectAttempts: config.maxReconnectAttempts ?? 5,
      latencyMs: config.latencyMs ?? 0,
    };

    this.connection = {
      id: this.generateId(),
      state: 'closed',
      messages: [],
      latency: this.config.latencyMs,
    };
  }

  /**
   * Simulates WebSocket connection establishment
   */
  async connect(): Promise<void> {
    this.connection.state = 'connecting';
    this.connectionHistory.push({ event: 'connecting', timestamp: Date.now() });
    this.emit('connecting', { url: this.config.url });

    // Simulate connection latency
    if (this.config.latencyMs > 0) {
      await this.delay(this.config.latencyMs);
    }

    this.connection.state = 'open';
    this.reconnectAttempts = 0;
    this.connectionHistory.push({ event: 'open', timestamp: Date.now() });
    this.emit('open', { connectionId: this.connection.id });
  }

  /**
   * Simulates WebSocket disconnection
   */
  async disconnect(code: number = 1000, reason: string = 'Normal closure'): Promise<void> {
    this.connection.state = 'closing';
    this.connectionHistory.push({ event: 'closing', timestamp: Date.now() });
    this.emit('closing', { code, reason });

    if (this.config.latencyMs > 0) {
      await this.delay(this.config.latencyMs / 2);
    }

    this.connection.state = 'closed';
    this.connectionHistory.push({ event: 'closed', timestamp: Date.now() });
    this.emit('close', { code, reason });
  }

  /**
   * Sends a message and optionally waits for a response
   */
  async send(type: string, payload: unknown): Promise<WSMessage> {
    if (this.connection.state !== 'open') {
      throw new Error(`Cannot send message: connection is ${this.connection.state}`);
    }

    const message: WSMessage = {
      type,
      payload,
      timestamp: Date.now(),
      id: this.generateMessageId(),
    };

    // Simulate send latency
    if (this.config.latencyMs > 0) {
      await this.delay(this.config.latencyMs);
    }

    this.connection.messages.push(message);
    this.messageQueue.push(message);
    this.emit('message:sent', message);

    // If server simulator is set, generate a response
    if (this.serverSimulator) {
      const response = this.serverSimulator(message);
      if (response) {
        if (this.config.latencyMs > 0) {
          await this.delay(this.config.latencyMs);
        }
        this.receiveMessage(response);
      }
    }

    return message;
  }

  /**
   * Sends a message and waits for a specific response type
   */
  async sendAndWait(type: string, payload: unknown, responseType: string, timeout: number = 5000): Promise<WSMessage> {
    const responsePromise = this.waitForMessage(responseType, timeout);
    await this.send(type, payload);
    return responsePromise;
  }

  /**
   * Waits for a message of specific type
   */
  async waitForMessage(type: string, timeout: number = 5000): Promise<WSMessage> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.responseHandlers.delete(type);
        reject(new Error(`Timeout waiting for message of type "${type}" after ${timeout}ms`));
      }, timeout);

      this.responseHandlers.set(type, (msg) => {
        clearTimeout(timer);
        this.responseHandlers.delete(type);
        resolve(msg);
      });
    });
  }

  /**
   * Simulates receiving a message from the server
   */
  receiveMessage(message: WSMessage): void {
    this.connection.messages.push(message);
    this.emit('message', message);
    this.emit(`message:${message.type}`, message);

    // Check if anyone is waiting for this message type
    const handler = this.responseHandlers.get(message.type);
    if (handler) {
      handler(message);
    }
  }

  /**
   * Simulates server pushing a message
   */
  simulateServerMessage(type: string, payload: unknown): void {
    const message: WSMessage = {
      type,
      payload,
      timestamp: Date.now(),
      id: this.generateMessageId(),
    };
    this.receiveMessage(message);
  }

  /**
   * Simulates connection drop and reconnection
   */
  async simulateDisconnect(reconnect: boolean = true): Promise<void> {
    this.connection.state = 'closed';
    this.connectionHistory.push({ event: 'disconnected_unexpectedly', timestamp: Date.now() });
    this.emit('close', { code: 1006, reason: 'Connection lost' });

    if (reconnect && this.config.autoReconnect) {
      await this.reconnect();
    }
  }

  /**
   * Attempts reconnection with exponential backoff
   */
  private async reconnect(): Promise<void> {
    while (this.reconnectAttempts < this.config.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.config.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

      this.emit('reconnecting', { attempt: this.reconnectAttempts, delay });
      await this.delay(Math.min(delay, 100)); // Cap for testing

      try {
        await this.connect();
        this.emit('reconnected', { attempts: this.reconnectAttempts });
        return;
      } catch (err) {
        this.emit('reconnect_failed', { attempt: this.reconnectAttempts, error: err });
      }
    }

    this.emit('reconnect_exhausted', { attempts: this.reconnectAttempts });
  }

  /**
   * Sends binary data
   */
  async sendBinary(data: Uint8Array): Promise<WSMessage> {
    if (this.connection.state !== 'open') {
      throw new Error(`Cannot send binary data: connection is ${this.connection.state}`);
    }

    const message: WSMessage = {
      type: 'binary',
      payload: data,
      timestamp: Date.now(),
      id: this.generateMessageId(),
    };

    if (this.config.latencyMs > 0) {
      await this.delay(this.config.latencyMs);
    }

    this.connection.messages.push(message);
    this.emit('message:sent', message);
    return message;
  }

  /**
   * Sets a server response simulator
   */
  setServerSimulator(handler: (msg: WSMessage) => WSMessage | null): void {
    this.serverSimulator = handler;
  }

  /**
   * Subscribes to an event
   */
  on(event: string, handler: Function): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)!.push(handler);
  }

  /**
   * Removes an event subscription
   */
  off(event: string, handler: Function): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index !== -1) handlers.splice(index, 1);
    }
  }

  /**
   * Emits an event to registered handlers
   */
  private emit(event: string, data?: unknown): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      for (const handler of handlers) {
        handler(data);
      }
    }
  }

  // --- Assertion helpers ---

  /**
   * Gets connection state
   */
  getState(): string {
    return this.connection.state;
  }

  /**
   * Gets all messages sent and received
   */
  getMessages(): WSMessage[] {
    return [...this.connection.messages];
  }

  /**
   * Gets messages of a specific type
   */
  getMessagesByType(type: string): WSMessage[] {
    return this.connection.messages.filter(m => m.type === type);
  }

  /**
   * Gets connection history (all state changes)
   */
  getConnectionHistory(): { event: string; timestamp: number }[] {
    return [...this.connectionHistory];
  }

  /**
   * Gets the number of reconnection attempts
   */
  getReconnectAttempts(): number {
    return this.reconnectAttempts;
  }

  /**
   * Resets client state
   */
  reset(): void {
    this.connection = {
      id: this.generateId(),
      state: 'closed',
      messages: [],
      latency: this.config.latencyMs,
    };
    this.eventHandlers.clear();
    this.messageQueue = [];
    this.responseHandlers.clear();
    this.reconnectAttempts = 0;
    this.messageCounter = 0;
    this.serverSimulator = null;
    this.connectionHistory = [];
  }

  // --- Helpers ---

  private generateId(): string {
    return `ws-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }

  private generateMessageId(): string {
    return `msg-${++this.messageCounter}-${Date.now()}`;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
