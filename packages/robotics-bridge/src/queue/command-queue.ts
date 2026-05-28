import type { CommandQueueEntry, RobotCommand } from '../types.js';

export class CommandQueue {
  private queue: CommandQueueEntry[] = [];
  private rateWindows = new Map<string, number[]>();
  private rateLimit: number;
  private ratePeriodMs: number;
  private maxRetries: number;
  private drained = false;

  constructor(opts: { rateLimit?: number; ratePeriodMs?: number; maxRetries?: number } = {}) {
    this.rateLimit = opts.rateLimit ?? 10;
    this.ratePeriodMs = opts.ratePeriodMs ?? 60_000;
    this.maxRetries = opts.maxRetries ?? 3;
  }

  enqueue(command: RobotCommand): CommandQueueEntry | null {
    if (this.drained) return null;
    if (this.isDuplicate(command)) return null;
    if (!this.checkRateLimit(command.robotId)) return null;

    const entry: CommandQueueEntry = {
      id: crypto.randomUUID(),
      command,
      priority: command.priority ?? 0,
      retries: 0,
      maxRetries: this.maxRetries,
      status: 'pending',
    };
    this.queue.push(entry);
    this.queue.sort((a, b) => b.priority - a.priority);
    this.recordRate(command.robotId);
    return entry;
  }

  dequeue(): CommandQueueEntry | null {
    const idx = this.queue.findIndex((e) => e.status === 'pending');
    if (idx === -1) return null;
    const entry = this.queue[idx]!;
    entry.status = 'executing';
    return entry;
  }

  complete(id: string): boolean {
    const entry = this.queue.find((e) => e.id === id);
    if (!entry || entry.status !== 'executing') return false;
    entry.status = 'done';
    return true;
  }

  fail(id: string): 'retrying' | 'failed' | null {
    const entry = this.queue.find((e) => e.id === id);
    if (!entry) return null;
    entry.retries++;
    if (entry.retries >= entry.maxRetries) {
      entry.status = 'failed';
      return 'failed';
    }
    entry.status = 'pending';
    return 'retrying';
  }

  drain(): number {
    this.drained = true;
    let count = 0;
    for (const entry of this.queue) {
      if (entry.status === 'pending') {
        entry.status = 'failed';
        count++;
      }
    }
    return count;
  }

  size(): number {
    return this.queue.filter((e) => e.status === 'pending').length;
  }

  getAll(): CommandQueueEntry[] {
    return [...this.queue];
  }

  private isDuplicate(cmd: RobotCommand): boolean {
    return this.queue.some(
      (e) =>
        e.status === 'pending' &&
        e.command.robotId === cmd.robotId &&
        e.command.action === cmd.action &&
        JSON.stringify(e.command.params) === JSON.stringify(cmd.params),
    );
  }

  private checkRateLimit(robotId: string, now = Date.now()): boolean {
    const window = this.rateWindows.get(robotId) ?? [];
    const active = window.filter((t) => now - t < this.ratePeriodMs);
    this.rateWindows.set(robotId, active);
    return active.length < this.rateLimit;
  }

  private recordRate(robotId: string): void {
    const window = this.rateWindows.get(robotId) ?? [];
    window.push(Date.now());
    this.rateWindows.set(robotId, window);
  }
}
