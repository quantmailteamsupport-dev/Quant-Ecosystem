import { TaskDecomposer, SubTask, AIInferenceAdapter } from './task-decomposer.js';
import { WorkerAgent, AgentTask } from './worker-agent.js';
import { PermissionLevel, canAct } from './permissions.js';

export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface OrchestratorTask {
  id: string;
  description: string;
  status: TaskStatus;
  subtasks: SubTask[];
  startedAt: number;
  completedAt?: number;
}

export class Orchestrator {
  private readonly decomposer: TaskDecomposer;
  private workers: Map<string, WorkerAgent> = new Map();
  private tasks: Map<string, OrchestratorTask> = new Map();

  constructor(ai: AIInferenceAdapter) {
    this.decomposer = new TaskDecomposer(ai);
  }

  registerWorker(worker: WorkerAgent): void {
    this.workers.set(worker.id, worker);
  }

  deregisterWorker(workerId: string): void {
    this.workers.delete(workerId);
  }

  async executeTask(taskDescription: string): Promise<OrchestratorTask> {
    const subtasks = await this.decomposer.decompose(taskDescription);
    const prioritized = this.decomposer.prioritize(subtasks);

    const taskId = `task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const orchestratorTask: OrchestratorTask = {
      id: taskId,
      description: taskDescription,
      status: 'running',
      subtasks: prioritized,
      startedAt: Date.now(),
    };
    this.tasks.set(taskId, orchestratorTask);

    try {
      // Group subtasks by dependency level for parallel execution
      const groups = this.groupByDependencyLevel(prioritized);

      for (const group of groups) {
        await Promise.all(group.map((subtask) => this.dispatchSubtask(subtask)));
      }

      orchestratorTask.status = 'completed';
      orchestratorTask.completedAt = Date.now();
    } catch (error) {
      orchestratorTask.status = 'failed';
      orchestratorTask.completedAt = Date.now();
      throw error;
    }

    return orchestratorTask;
  }

  getRunningAgents(): WorkerAgent[] {
    return Array.from(this.workers.values());
  }

  getTaskStatus(taskId: string): OrchestratorTask | undefined {
    return this.tasks.get(taskId);
  }

  private async dispatchSubtask(subtask: SubTask): Promise<void> {
    const worker = this.findSuitableWorker(subtask.requiredPermission);
    if (!worker) {
      throw new Error(
        `No suitable worker found for permission level: ${subtask.requiredPermission}`,
      );
    }

    const agentTask: AgentTask = {
      id: subtask.id,
      description: subtask.description,
    };

    // Reset state machine if worker finished a previous task
    worker.stateMachine.reset();
    worker.start();
    await worker.run(agentTask);
    await worker.stop();
  }

  private findSuitableWorker(requiredPermission: PermissionLevel): WorkerAgent | undefined {
    for (const worker of this.workers.values()) {
      if (canAct(worker.trustScore.getPermissionLevel(), requiredPermission)) {
        return worker;
      }
    }
    return undefined;
  }

  private groupByDependencyLevel(subtasks: SubTask[]): SubTask[][] {
    const groups: SubTask[][] = [];
    const completed = new Set<string>();

    let remaining = [...subtasks];
    while (remaining.length > 0) {
      const currentGroup: SubTask[] = [];
      const nextRemaining: SubTask[] = [];

      for (const task of remaining) {
        const depsComplete = task.dependencies.every((d) => completed.has(d));
        if (depsComplete) {
          currentGroup.push(task);
        } else {
          nextRemaining.push(task);
        }
      }

      if (currentGroup.length === 0) {
        // Circular dependency or missing deps - just add remaining
        groups.push(nextRemaining);
        break;
      }

      groups.push(currentGroup);
      for (const task of currentGroup) {
        completed.add(task.id);
      }
      remaining = nextRemaining;
    }

    return groups;
  }
}
