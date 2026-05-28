import { randomUUID } from 'node:crypto';
import type {
  Automation,
  AutomationEngine,
  RunResult,
  StepRunResult,
  ToolExecutor,
} from './types.js';
import { StepExecutor } from './executor.js';
import { TriggerEvaluator } from './triggers.js';
import { CronScheduler } from './scheduler.js';
import { DurableStateManager } from './state.js';

function generateId(prefix: string): string {
  return `${prefix}_${randomUUID()}`;
}

/** Maximum number of run history entries retained per automation. */
const MAX_HISTORY_SIZE = 100;

export class AutomationEngineImpl implements AutomationEngine {
  private automations = new Map<string, Automation>();
  private runHistory = new Map<string, RunResult[]>();
  private stepExecutor: StepExecutor;
  private triggerEvaluator: TriggerEvaluator;
  private scheduler: CronScheduler;
  private stateManager: DurableStateManager;

  constructor(toolExecutor: ToolExecutor) {
    this.stepExecutor = new StepExecutor(toolExecutor);
    this.triggerEvaluator = new TriggerEvaluator();
    this.scheduler = new CronScheduler();
    this.stateManager = new DurableStateManager();
  }

  create(config: Omit<Automation, 'id' | 'createdAt' | 'updatedAt'>): Automation {
    const now = Date.now();
    const automation: Automation = {
      ...config,
      id: generateId('auto'),
      createdAt: now,
      updatedAt: now,
    };

    this.automations.set(automation.id, automation);

    // Register schedule if applicable
    if (automation.trigger.type === 'schedule' && automation.status === 'active') {
      this.scheduler.schedule(automation.id, automation.trigger.cron);
    }

    return automation;
  }

  async execute(automationId: string): Promise<RunResult> {
    const automation = this.automations.get(automationId);
    if (!automation) {
      const runId = generateId('run');
      return {
        automationId,
        runId,
        status: 'failed',
        startedAt: Date.now(),
        completedAt: Date.now(),
        stepResults: [],
        error: `Automation not found: ${automationId}`,
      };
    }

    if (automation.status === 'paused') {
      const runId = generateId('run');
      return {
        automationId,
        runId,
        status: 'failed',
        startedAt: Date.now(),
        completedAt: Date.now(),
        stepResults: [],
        error: 'Automation is paused',
      };
    }

    // Resume from an incomplete checkpoint if one exists
    const lastCheckpoint = this.stateManager.getLatestCheckpoint(automationId);
    const resuming = lastCheckpoint != null && lastCheckpoint.status === 'running';
    const startFromIndex = resuming ? lastCheckpoint.currentStepIndex : 0;
    const priorResults: StepRunResult[] = resuming ? lastCheckpoint.stepResults : [];

    const runId = resuming ? lastCheckpoint.runId : generateId('run');
    const startedAt = resuming ? lastCheckpoint.createdAt : Date.now();

    // Create initial checkpoint
    this.stateManager.checkpoint(runId, automationId, startFromIndex, priorResults, 'running');

    // Execute steps (optionally starting from a resumed index)
    let stepResults: StepRunResult[];
    try {
      stepResults = await this.stepExecutor.executeSteps(automation.steps, startFromIndex);
      // Prepend results from prior checkpoint when resuming
      if (priorResults.length > 0) {
        stepResults = [...priorResults, ...stepResults];
      }
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      const result: RunResult = {
        automationId,
        runId,
        status: 'failed',
        startedAt,
        completedAt: Date.now(),
        stepResults: priorResults,
        error,
      };
      this.addToHistory(automationId, result);
      this.stateManager.checkpoint(runId, automationId, startFromIndex, priorResults, 'failed');
      return result;
    }

    // Determine overall status
    const hasFailed = stepResults.some((r) => r.status === 'failed');
    const status = hasFailed ? 'failed' : 'completed';

    // Final checkpoint
    this.stateManager.checkpoint(runId, automationId, automation.steps.length, stepResults, status);

    const result: RunResult = {
      automationId,
      runId,
      status,
      startedAt,
      completedAt: Date.now(),
      stepResults,
      error: hasFailed ? stepResults.find((r) => r.status === 'failed')?.error : undefined,
    };

    this.addToHistory(automationId, result);

    // Advance schedule if applicable
    if (automation.trigger.type === 'schedule') {
      this.scheduler.advanceSchedule(automationId);
    }

    return result;
  }

  pause(automationId: string): void {
    const automation = this.automations.get(automationId);
    if (!automation) return;

    automation.status = 'paused';
    automation.updatedAt = Date.now();

    if (automation.trigger.type === 'schedule') {
      this.scheduler.disable(automationId);
    }
  }

  resume(automationId: string): void {
    const automation = this.automations.get(automationId);
    if (!automation) return;

    automation.status = 'active';
    automation.updatedAt = Date.now();

    if (automation.trigger.type === 'schedule') {
      this.scheduler.enable(automationId);
    }
  }

  getHistory(automationId: string): RunResult[] {
    return this.runHistory.get(automationId) ?? [];
  }

  get(automationId: string): Automation | undefined {
    return this.automations.get(automationId);
  }

  list(): Automation[] {
    return [...this.automations.values()];
  }

  getTriggerEvaluator(): TriggerEvaluator {
    return this.triggerEvaluator;
  }

  getScheduler(): CronScheduler {
    return this.scheduler;
  }

  getStateManager(): DurableStateManager {
    return this.stateManager;
  }

  private addToHistory(automationId: string, result: RunResult): void {
    const history = this.runHistory.get(automationId) ?? [];
    history.push(result);
    // Evict oldest entries to prevent unbounded growth
    if (history.length > MAX_HISTORY_SIZE) {
      history.splice(0, history.length - MAX_HISTORY_SIZE);
    }
    this.runHistory.set(automationId, history);
  }
}
