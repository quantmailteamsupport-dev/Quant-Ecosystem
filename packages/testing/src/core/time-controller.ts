// ============================================================================
// Quant Ecosystem - Testing Framework: Time Controller
// Time freeze/advance/travel, setTimeout/setInterval mocking, flush
// ============================================================================

import type { TimeState, MockTimer, MockInterval } from '../types';

/**
 * TimeController - Mocks and controls time for deterministic testing
 */
export class TimeController {
  private state: TimeState;
  private timerIdCounter: number = 0;
  private originalSetTimeout: typeof setTimeout | null = null;
  private originalSetInterval: typeof setInterval | null = null;
  private originalClearTimeout: typeof clearTimeout | null = null;
  private originalClearInterval: typeof clearInterval | null = null;
  private originalDateNow: (() => number) | null = null;
  private installed: boolean = false;

  constructor() {
    this.state = {
      frozen: false,
      currentTime: Date.now(),
      timers: [],
      intervals: [],
      originalDate: Date,
    };
  }

  /**
   * Freezes time at the specified date/timestamp
   */
  freeze(dateOrTimestamp?: Date | number): void {
    if (dateOrTimestamp !== undefined) {
      this.state.currentTime = dateOrTimestamp instanceof Date
        ? dateOrTimestamp.getTime()
        : dateOrTimestamp;
    }
    this.state.frozen = true;
    this.install();
  }

  /**
   * Advances time by the specified milliseconds, executing any pending timers
   */
  advance(ms: number): void {
    const targetTime = this.state.currentTime + ms;
    this.advanceTo(targetTime);
  }

  /**
   * Advances time to a specific target, executing timers along the way
   */
  private advanceTo(targetTime: number): void {
    while (true) {
      // Find next timer that should fire
      const nextTimer = this.getNextPendingTimer(targetTime);
      if (!nextTimer) break;

      // Advance time to when this timer fires
      this.state.currentTime = nextTimer.scheduledAt + nextTimer.delay;

      if (!nextTimer.cancelled) {
        nextTimer.callback();
      }

      // Remove one-shot timers
      const timerIndex = this.state.timers.indexOf(nextTimer as MockTimer);
      if (timerIndex !== -1) {
        this.state.timers.splice(timerIndex, 1);
      }
    }

    // Process intervals
    for (const interval of this.state.intervals) {
      if (interval.cancelled) continue;

      while (interval.lastRun + interval.interval <= targetTime) {
        interval.lastRun += interval.interval;
        this.state.currentTime = interval.lastRun;
        interval.callback();
      }
    }

    this.state.currentTime = targetTime;
  }

  /**
   * Gets the next timer that should fire before targetTime
   */
  private getNextPendingTimer(targetTime: number): MockTimer | null {
    let earliest: MockTimer | null = null;
    let earliestTime = Infinity;

    for (const timer of this.state.timers) {
      if (timer.cancelled) continue;
      const fireTime = timer.scheduledAt + timer.delay;
      if (fireTime <= targetTime && fireTime < earliestTime) {
        earliest = timer;
        earliestTime = fireTime;
      }
    }

    return earliest;
  }

  /**
   * Travels to a specific date without executing timers
   */
  travel(dateOrTimestamp: Date | number): void {
    this.state.currentTime = dateOrTimestamp instanceof Date
      ? dateOrTimestamp.getTime()
      : dateOrTimestamp;
    this.state.frozen = true;
    this.install();
  }

  /**
   * Gets the current mocked time
   */
  now(): number {
    return this.state.currentTime;
  }

  /**
   * Gets the current time as a Date object
   */
  getDate(): Date {
    return new Date(this.state.currentTime);
  }

  /**
   * Mocks setTimeout and returns the timer ID
   */
  mockSetTimeout(callback: Function, delay: number = 0): number {
    const id = ++this.timerIdCounter;
    const timer: MockTimer = {
      id,
      callback,
      delay,
      scheduledAt: this.state.currentTime,
      cancelled: false,
    };
    this.state.timers.push(timer);
    return id;
  }

  /**
   * Mocks setInterval and returns the interval ID
   */
  mockSetInterval(callback: Function, interval: number): number {
    const id = ++this.timerIdCounter;
    const mockInterval: MockInterval = {
      id,
      callback,
      interval,
      lastRun: this.state.currentTime,
      cancelled: false,
    };
    this.state.intervals.push(mockInterval);
    return id;
  }

  /**
   * Cancels a mocked setTimeout
   */
  mockClearTimeout(id: number): void {
    const timer = this.state.timers.find(t => t.id === id);
    if (timer) {
      timer.cancelled = true;
    }
  }

  /**
   * Cancels a mocked setInterval
   */
  mockClearInterval(id: number): void {
    const interval = this.state.intervals.find(i => i.id === id);
    if (interval) {
      interval.cancelled = true;
    }
  }

  /**
   * Flushes all pending timers (executes them immediately)
   */
  flush(): void {
    const maxIterations = 1000;
    let iterations = 0;

    while (this.state.timers.length > 0 && iterations < maxIterations) {
      iterations++;
      const timer = this.state.timers.shift()!;
      if (!timer.cancelled) {
        this.state.currentTime = timer.scheduledAt + timer.delay;
        timer.callback();
      }
    }

    if (iterations >= maxIterations) {
      throw new Error('Flush exceeded maximum iterations - possible infinite timer loop');
    }
  }

  /**
   * Runs only the next pending timer
   */
  tick(): boolean {
    // Find the earliest timer
    let earliest: MockTimer | null = null;
    let earliestTime = Infinity;

    for (const timer of this.state.timers) {
      if (timer.cancelled) continue;
      const fireTime = timer.scheduledAt + timer.delay;
      if (fireTime < earliestTime) {
        earliest = timer;
        earliestTime = fireTime;
      }
    }

    if (!earliest) {
      // Check intervals
      let earliestInterval: MockInterval | null = null;
      for (const interval of this.state.intervals) {
        if (interval.cancelled) continue;
        const nextFire = interval.lastRun + interval.interval;
        if (nextFire < earliestTime) {
          earliestInterval = interval;
          earliestTime = nextFire;
        }
      }

      if (earliestInterval) {
        this.state.currentTime = earliestInterval.lastRun + earliestInterval.interval;
        earliestInterval.lastRun = this.state.currentTime;
        earliestInterval.callback();
        return true;
      }

      return false;
    }

    this.state.currentTime = earliest.scheduledAt + earliest.delay;
    earliest.callback();
    const index = this.state.timers.indexOf(earliest);
    if (index !== -1) this.state.timers.splice(index, 1);
    return true;
  }

  /**
   * Gets the number of pending timers
   */
  getPendingTimerCount(): number {
    return this.state.timers.filter(t => !t.cancelled).length;
  }

  /**
   * Gets the number of active intervals
   */
  getActiveIntervalCount(): number {
    return this.state.intervals.filter(i => !i.cancelled).length;
  }

  /**
   * Installs the time mock (overrides global functions)
   */
  install(): void {
    if (this.installed) return;

    this.originalDateNow = Date.now;
    this.originalSetTimeout = globalThis.setTimeout;
    this.originalSetInterval = globalThis.setInterval;
    this.originalClearTimeout = globalThis.clearTimeout;
    this.originalClearInterval = globalThis.clearInterval;

    const self = this;

    // Override Date.now
    Date.now = () => self.state.currentTime;

    // Override setTimeout
    (globalThis as any).setTimeout = (cb: Function, delay?: number) => {
      return self.mockSetTimeout(cb, delay ?? 0);
    };

    // Override setInterval
    (globalThis as any).setInterval = (cb: Function, interval: number) => {
      return self.mockSetInterval(cb, interval);
    };

    // Override clearTimeout
    (globalThis as any).clearTimeout = (id: number) => {
      self.mockClearTimeout(id);
    };

    // Override clearInterval
    (globalThis as any).clearInterval = (id: number) => {
      self.mockClearInterval(id);
    };

    this.installed = true;
  }

  /**
   * Restores all original timer functions
   */
  restore(): void {
    if (!this.installed) return;

    if (this.originalDateNow) Date.now = this.originalDateNow;
    if (this.originalSetTimeout) (globalThis as any).setTimeout = this.originalSetTimeout;
    if (this.originalSetInterval) (globalThis as any).setInterval = this.originalSetInterval;
    if (this.originalClearTimeout) (globalThis as any).clearTimeout = this.originalClearTimeout;
    if (this.originalClearInterval) (globalThis as any).clearInterval = this.originalClearInterval;

    this.installed = false;
    this.state.frozen = false;
  }

  /**
   * Resets the controller state
   */
  reset(): void {
    this.restore();
    this.state = {
      frozen: false,
      currentTime: Date.now(),
      timers: [],
      intervals: [],
      originalDate: Date,
    };
    this.timerIdCounter = 0;
  }

  /**
   * Gets the full time state (for debugging)
   */
  getState(): TimeState {
    return { ...this.state };
  }
}
