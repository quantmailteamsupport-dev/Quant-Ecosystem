import type { RobotCommand } from '../types.js';
import type { RobotRegistry } from '../registry/robot-registry.js';
import type { RobotSafety } from '../safety/robot-safety.js';
import type { CommandQueue } from '../queue/command-queue.js';

export class CommandDispatcher {
  private history: RobotCommand[] = [];
  private queue: CommandQueue | null = null;
  private timeoutMs = 30_000;

  constructor(
    private registry: RobotRegistry,
    private safety: RobotSafety,
  ) {}

  setQueue(queue: CommandQueue): void {
    this.queue = queue;
  }

  setTimeout(ms: number): void {
    this.timeoutMs = ms;
  }

  getTimeout(): number {
    return this.timeoutMs;
  }

  dispatch(cmd: RobotCommand): boolean {
    if (this.registry.getStatus(cmd.robotId) === null) return false;
    if (!this.safety.validateCommand(cmd)) return false;
    this.history.push(cmd);
    return true;
  }

  dispatchBatch(commands: RobotCommand[]): { dispatched: number; failed: number } {
    let dispatched = 0;
    let failed = 0;
    for (const cmd of commands) {
      if (this.dispatch(cmd)) {
        dispatched++;
      } else {
        failed++;
      }
    }
    return { dispatched, failed };
  }

  undoLast(robotId: string): RobotCommand | null {
    let idx = -1;
    for (let i = this.history.length - 1; i >= 0; i--) {
      if (this.history[i]?.robotId === robotId) {
        idx = i;
        break;
      }
    }
    if (idx === -1) return null;
    const removed = this.history.splice(idx, 1);
    return removed[0] ?? null;
  }

  getHistory(robotId: string): RobotCommand[] {
    return this.history.filter((c) => c.robotId === robotId);
  }

  killSwitch(): void {
    this.safety.killAll();
    if (this.queue) {
      this.queue.drain();
    }
  }
}
