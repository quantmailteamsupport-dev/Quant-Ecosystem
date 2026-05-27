export interface Workflow {
  id: string;
  name: string;
  description: string;
  steps: WorkflowStep[];
  triggers: WorkflowTrigger[];
  status: WorkflowStatus;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  enabled: boolean;
  version: number;
}

export type WorkflowStatus = 'draft' | 'active' | 'paused' | 'completed' | 'failed' | 'archived';

export interface WorkflowStep {
  id: string;
  name: string;
  type: 'action' | 'condition' | 'delay' | 'loop' | 'parallel';
  appId: string;
  action: WorkflowAction;
  condition?: WorkflowCondition;
  nextStepId: string | null;
  onError: 'stop' | 'skip' | 'retry';
  maxRetries: number;
  timeoutMs: number;
}

export interface WorkflowTrigger {
  id: string;
  type: 'event' | 'schedule' | 'webhook' | 'manual';
  appId: string;
  event?: string;
  schedule?: string;
  webhookUrl?: string;
  enabled: boolean;
}

export interface WorkflowAction {
  id: string;
  type: string;
  appId: string;
  operation: string;
  parameters: Record<string, unknown>;
}

export interface WorkflowCondition {
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'lt' | 'contains' | 'not_contains' | 'exists' | 'not_exists';
  value: unknown;
  nextIfTrue: string | null;
  nextIfFalse: string | null;
}

export interface CrossAppContext {
  workflowId: string;
  executionId: string;
  sourceApp: string;
  targetApp: string;
  data: Record<string, unknown>;
  metadata: Record<string, string>;
}

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  startedAt: Date;
  completedAt: Date | null;
  currentStepId: string | null;
  stepResults: StepResult[];
  error: string | null;
  context: CrossAppContext;
}

export interface StepResult {
  stepId: string;
  status: 'success' | 'failed' | 'skipped';
  output: unknown;
  startedAt: Date;
  completedAt: Date;
  error: string | null;
}
