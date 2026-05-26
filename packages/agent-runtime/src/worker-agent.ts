import { PermissionLevel } from './permissions.js';
import { AgentState, AgentStateMachine } from './state-machine.js';
import { TrustScore } from './trust-score.js';
import { AuditTrail, AuditEntry } from './audit-trail.js';
import { KillSwitch } from './kill-switch.js';

export interface AgentStatus {
  id: string;
  name: string;
  state: AgentState;
  permissionLevel: PermissionLevel;
  trustScore: number;
}

export interface AgentTask {
  id: string;
  description: string;
  params?: Record<string, unknown>;
}

export abstract class WorkerAgent {
  readonly id: string;
  readonly name: string;
  readonly icon: string;
  readonly defaultPermission: PermissionLevel;
  readonly stateMachine: AgentStateMachine;
  readonly trustScore: TrustScore;
  readonly auditTrail: AuditTrail;

  constructor(config: {
    id: string;
    name: string;
    icon: string;
    defaultPermission: PermissionLevel;
  }) {
    this.id = config.id;
    this.name = config.name;
    this.icon = config.icon;
    this.defaultPermission = config.defaultPermission;
    this.stateMachine = new AgentStateMachine();
    this.trustScore = new TrustScore();
    this.auditTrail = new AuditTrail();
  }

  abstract run(task: AgentTask): Promise<void>;

  start(): void {
    const killSwitch = KillSwitch.getInstance();
    killSwitch.register(this.id, async () => {
      await this.stop();
    });
    this.stateMachine.transition(AgentState.PLANNING);
  }

  pause(): void {
    if (this.stateMachine.getState() === AgentState.EXECUTING) {
      this.stateMachine.transition(AgentState.WAITING_APPROVAL);
    }
  }

  async stop(): Promise<void> {
    const current = this.stateMachine.getState();
    if (current === AgentState.EXECUTING || current === AgentState.WAITING_APPROVAL) {
      this.stateMachine.transition(AgentState.IDLE);
    } else if (current === AgentState.PLANNING) {
      this.stateMachine.transition(AgentState.FAILED);
      this.stateMachine.transition(AgentState.IDLE);
    } else if (current === AgentState.DONE || current === AgentState.FAILED) {
      this.stateMachine.transition(AgentState.IDLE);
    }
    const killSwitch = KillSwitch.getInstance();
    killSwitch.deregister(this.id);
  }

  getStatus(): AgentStatus {
    return {
      id: this.id,
      name: this.name,
      state: this.stateMachine.getState(),
      permissionLevel: this.trustScore.getPermissionLevel(),
      trustScore: this.trustScore.getScore(),
    };
  }

  protected logAction(
    action: string,
    result: AuditEntry['result'],
    reversible: boolean = false,
  ): void {
    this.auditTrail.log({
      id: `${this.id}-${Date.now()}`,
      agentId: this.id,
      action,
      timestamp: Date.now(),
      result,
      reversible,
    });
  }
}
