import type {
  Workflow,
  WorkflowStep,
  WorkflowTrigger,
  WorkflowCondition,
  WorkflowExecution,
  StepResult,
  CrossAppContext,
  WorkflowStatus,
} from './types.js';

export class WorkflowEngine {
  private workflows: Map<string, Workflow>;
  private executions: Map<string, WorkflowExecution>;
  private executionHistory: WorkflowExecution[];

  constructor() {
    this.workflows = new Map();
    this.executions = new Map();
    this.executionHistory = [];
  }

  createWorkflow(params: { name: string; description: string; createdBy: string }): Workflow {
    const workflow: Workflow = {
      id: `wf-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: params.name,
      description: params.description,
      steps: [],
      triggers: [],
      status: 'draft',
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: params.createdBy,
      enabled: false,
      version: 1,
    };
    this.workflows.set(workflow.id, workflow);
    return workflow;
  }

  getWorkflow(workflowId: string): Workflow | null {
    return this.workflows.get(workflowId) ?? null;
  }

  getAllWorkflows(): Workflow[] {
    return Array.from(this.workflows.values());
  }

  deleteWorkflow(workflowId: string): boolean {
    return this.workflows.delete(workflowId);
  }

  updateStatus(workflowId: string, status: WorkflowStatus): boolean {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) return false;
    workflow.status = status;
    workflow.updatedAt = new Date();
    workflow.enabled = status === 'active';
    return true;
  }

  addStep(workflowId: string, step: Omit<WorkflowStep, 'id'>): WorkflowStep | null {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) return null;

    const fullStep: WorkflowStep = {
      ...step,
      id: `step-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    };

    workflow.steps.push(fullStep);
    workflow.updatedAt = new Date();
    return fullStep;
  }

  removeStep(workflowId: string, stepId: string): boolean {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) return false;

    const idx = workflow.steps.findIndex((s) => s.id === stepId);
    if (idx === -1) return false;

    workflow.steps.splice(idx, 1);
    workflow.updatedAt = new Date();
    return true;
  }

  addTrigger(workflowId: string, trigger: Omit<WorkflowTrigger, 'id'>): WorkflowTrigger | null {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) return null;

    const fullTrigger: WorkflowTrigger = {
      ...trigger,
      id: `trigger-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    };

    workflow.triggers.push(fullTrigger);
    workflow.updatedAt = new Date();
    return fullTrigger;
  }

  removeTrigger(workflowId: string, triggerId: string): boolean {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) return false;

    const idx = workflow.triggers.findIndex((t) => t.id === triggerId);
    if (idx === -1) return false;

    workflow.triggers.splice(idx, 1);
    workflow.updatedAt = new Date();
    return true;
  }

  async execute(
    workflowId: string,
    inputData?: Record<string, unknown>,
  ): Promise<WorkflowExecution> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) throw new Error(`Workflow ${workflowId} not found`);
    if (workflow.steps.length === 0) throw new Error('Workflow has no steps');

    const executionId = `exec-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const context: CrossAppContext = {
      workflowId,
      executionId,
      sourceApp: workflow.steps[0]!.appId,
      targetApp: workflow.steps[workflow.steps.length - 1]!.appId,
      data: inputData ?? {},
      metadata: { createdBy: workflow.createdBy },
    };

    const execution: WorkflowExecution = {
      id: executionId,
      workflowId,
      status: 'running',
      startedAt: new Date(),
      completedAt: null,
      currentStepId: workflow.steps[0]!.id,
      stepResults: [],
      error: null,
      context,
    };

    this.executions.set(executionId, execution);

    for (const step of workflow.steps) {
      execution.currentStepId = step.id;

      if (step.condition) {
        const conditionMet = this.evaluateCondition(step.condition, context.data);
        if (!conditionMet) {
          execution.stepResults.push({
            stepId: step.id,
            status: 'skipped',
            output: null,
            startedAt: new Date(),
            completedAt: new Date(),
            error: null,
          });
          continue;
        }
      }

      const result: StepResult = {
        stepId: step.id,
        status: 'success',
        output: { executed: step.action.operation },
        startedAt: new Date(),
        completedAt: new Date(),
        error: null,
      };

      execution.stepResults.push(result);
    }

    execution.status = 'completed';
    execution.completedAt = new Date();
    execution.currentStepId = null;
    this.executionHistory.push(execution);

    return execution;
  }

  cancelExecution(executionId: string): boolean {
    const execution = this.executions.get(executionId);
    if (!execution || execution.status !== 'running') return false;

    execution.status = 'cancelled';
    execution.completedAt = new Date();
    return true;
  }

  getExecution(executionId: string): WorkflowExecution | null {
    return this.executions.get(executionId) ?? null;
  }

  getExecutionHistory(workflowId?: string): WorkflowExecution[] {
    if (workflowId) {
      return this.executionHistory.filter((e) => e.workflowId === workflowId);
    }
    return [...this.executionHistory];
  }

  evaluateCondition(condition: WorkflowCondition, data: Record<string, unknown>): boolean {
    const fieldValue = data[condition.field];

    switch (condition.operator) {
      case 'eq':
        return fieldValue === condition.value;
      case 'neq':
        return fieldValue !== condition.value;
      case 'gt':
        return typeof fieldValue === 'number' && typeof condition.value === 'number'
          ? fieldValue > condition.value
          : false;
      case 'lt':
        return typeof fieldValue === 'number' && typeof condition.value === 'number'
          ? fieldValue < condition.value
          : false;
      case 'contains':
        return typeof fieldValue === 'string' && typeof condition.value === 'string'
          ? fieldValue.includes(condition.value)
          : false;
      case 'not_contains':
        return typeof fieldValue === 'string' && typeof condition.value === 'string'
          ? !fieldValue.includes(condition.value)
          : true;
      case 'exists':
        return fieldValue !== undefined && fieldValue !== null;
      case 'not_exists':
        return fieldValue === undefined || fieldValue === null;
      default:
        return false;
    }
  }
}

export function createWorkflowEngine(): WorkflowEngine {
  return new WorkflowEngine();
}
