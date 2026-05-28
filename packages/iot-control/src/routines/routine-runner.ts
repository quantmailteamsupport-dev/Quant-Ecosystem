import { Routine, RoutineStep } from '../types.js';

export class RoutineRunner {
  private routines = new Map<string, Routine>();
  private status = new Map<string, 'idle' | 'running' | 'completed' | 'error'>();

  constructor(private stepExecutor: (step: RoutineStep) => Promise<void>) {}

  addRoutine(routine: Routine): void {
    this.routines.set(routine.id, routine);
    this.status.set(routine.id, 'idle');
  }

  removeRoutine(id: string): boolean {
    this.status.delete(id);
    return this.routines.delete(id);
  }

  async executeRoutine(routineId: string): Promise<boolean> {
    const routine = this.routines.get(routineId);
    if (!routine) return false;
    this.status.set(routineId, 'running');
    try {
      for (const step of routine.steps) {
        if (step.delayMs > 0) {
          await new Promise((resolve) => setTimeout(resolve, step.delayMs));
        }
        await this.stepExecutor(step);
      }
    } catch {
      this.status.set(routineId, 'error');
      return false;
    }
    this.status.set(routineId, 'completed');
    return true;
  }

  getRoutine(id: string): Routine | undefined {
    return this.routines.get(id);
  }

  getStatus(routineId: string): string {
    return this.status.get(routineId) ?? 'unknown';
  }

  listRoutines(): Routine[] {
    return [...this.routines.values()];
  }
}
