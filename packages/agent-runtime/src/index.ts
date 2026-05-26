// ============================================================================
// @quant/agent-runtime - Core Agent Runtime Framework
// ============================================================================

// Permissions
export {
  PermissionLevel,
  PermissionLevelSchema,
  canAct,
  canExecuteHighRisk,
  isFullAuto,
  PermissionGuard,
} from './permissions.js';
export type { ActionRequest } from './permissions.js';

// State Machine
export { AgentState, AgentStateMachine } from './state-machine.js';

// Audit Trail
export { AuditTrail, AuditEntrySchema } from './audit-trail.js';
export type { AuditEntry } from './audit-trail.js';

// Undo Engine
export { UndoEngine } from './undo-engine.js';
export type { UndoAction } from './undo-engine.js';

// Trust Score
export { TrustScore, scoreToPermissionLevel } from './trust-score.js';

// Spending Limit
export { SpendingLimit, SpendingLimitConfigSchema } from './spending-limit.js';
export type { SpendingLimitConfig, SpendingPeriod } from './spending-limit.js';

// Kill Switch
export { KillSwitch } from './kill-switch.js';

// Approval Queue
export { ApprovalQueue, ApprovalRequestSchema } from './approval-queue.js';
export type { ApprovalRequest, ApprovalStatus, QueuedRequest } from './approval-queue.js';

// Conflict Resolver
export { ConflictResolver } from './conflict-resolver.js';
export type { ResourceLock, ConflictResult } from './conflict-resolver.js';

// Sandbox
export { AgentSandbox } from './sandbox.js';
export type { SandboxAction } from './sandbox.js';

// Task Decomposer
export { TaskDecomposer, SubTaskSchema } from './task-decomposer.js';
export type { SubTask, AIInferenceAdapter } from './task-decomposer.js';

// Worker Agent
export { WorkerAgent } from './worker-agent.js';
export type { AgentStatus, AgentTask } from './worker-agent.js';

// Orchestrator
export { Orchestrator } from './orchestrator.js';
export type { OrchestratorTask, TaskStatus } from './orchestrator.js';
