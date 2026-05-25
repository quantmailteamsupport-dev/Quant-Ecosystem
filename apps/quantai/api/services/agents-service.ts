// ============================================================================
// QuantAI - Agents Service
// Autonomous agent creation, action execution, chaining, scheduling, constraints
// ============================================================================

interface Agent { id: string; name: string; userId: string; goals: string[]; state: AgentState; capabilities: string[]; constraints: AgentConstraint[]; memory: AgentMemory; createdAt: string; lastExecuted?: string; schedule?: AgentSchedule; status: 'idle' | 'running' | 'paused' | 'error' | 'completed'; }
interface AgentState { currentGoalIndex: number; progress: number; variables: Record<string, any>; history: AgentAction[]; errors: string[]; }
interface AgentAction { id: string; agentId: string; type: string; params: Record<string, any>; result: any; status: 'pending' | 'running' | 'completed' | 'failed'; startedAt: string; completedAt?: string; duration?: number; }
interface AgentConstraint { type: 'max_actions' | 'timeout' | 'budget' | 'permissions' | 'schedule'; value: any; }
interface AgentMemory { shortTerm: Record<string, any>[]; longTerm: Record<string, any>[]; context: string[]; maxShortTerm: number; }
interface AgentSchedule { type: 'once' | 'interval' | 'cron'; value: string; nextRun?: string; lastRun?: string; enabled: boolean; }
interface ActionChain { id: string; agentId: string; actions: AgentAction[]; status: 'pending' | 'running' | 'completed' | 'failed'; createdAt: string; }

class AgentsService {
  private agents: Map<string, Agent> = new Map();
  private actions: Map<string, AgentAction[]> = new Map();
  private chains: Map<string, ActionChain> = new Map();
  private counter: number = 0;

  private genId(prefix: string): string { return `${prefix}_${Date.now().toString(36)}_${(++this.counter).toString(36)}`; }

  async createAgent(config: { userId: string; name: string; goals: string[]; capabilities?: string[]; constraints?: AgentConstraint[] }): Promise<Agent> {
    if (!config.name || config.name.length < 2) throw new Error('Agent name must be at least 2 characters');
    if (!config.goals || config.goals.length === 0) throw new Error('Agent must have at least one goal');
    if (config.goals.length > 10) throw new Error('Maximum 10 goals per agent');

    const agent: Agent = {
      id: this.genId('agent'), name: config.name, userId: config.userId,
      goals: config.goals, capabilities: config.capabilities || ['search', 'summarize', 'plan', 'execute'],
      constraints: config.constraints || [{ type: 'max_actions', value: 100 }, { type: 'timeout', value: 300000 }],
      state: { currentGoalIndex: 0, progress: 0, variables: {}, history: [], errors: [] },
      memory: { shortTerm: [], longTerm: [], context: config.goals, maxShortTerm: 50 },
      createdAt: new Date().toISOString(), status: 'idle',
    };

    this.agents.set(agent.id, agent);
    return agent;
  }

  async executeAction(agentId: string, actionType: string, params: Record<string, any> = {}): Promise<AgentAction> {
    const agent = this.agents.get(agentId);
    if (!agent) throw new Error('Agent not found');
    if (agent.status === 'paused') throw new Error('Agent is paused');
    if (agent.status === 'error') throw new Error('Agent in error state');

    const maxActions = agent.constraints.find(c => c.type === 'max_actions')?.value || 100;
    if (agent.state.history.length >= maxActions) throw new Error('Maximum action limit reached');

    agent.status = 'running';
    const action: AgentAction = {
      id: this.genId('act'), agentId, type: actionType, params,
      result: null, status: 'running', startedAt: new Date().toISOString(),
    };

    // Simulate action execution based on type
    const result = await this.simulateAction(actionType, params, agent);
    action.result = result;
    action.status = 'completed';
    action.completedAt = new Date().toISOString();
    action.duration = Math.floor(50 + Math.random() * 2000);

    agent.state.history.push(action);
    agent.state.progress = Math.min(100, agent.state.progress + (100 / agent.goals.length / 5));
    agent.memory.shortTerm.push({ action: actionType, result, timestamp: Date.now() });
    if (agent.memory.shortTerm.length > agent.memory.maxShortTerm) agent.memory.shortTerm.shift();

    agent.lastExecuted = new Date().toISOString();
    if (agent.state.progress >= 100) agent.status = 'completed';
    else agent.status = 'idle';

    const agentActions = this.actions.get(agentId) || [];
    agentActions.push(action);
    this.actions.set(agentId, agentActions);

    return action;
  }

  private async simulateAction(type: string, params: Record<string, any>, agent: Agent): Promise<any> {
    switch (type) {
      case 'search': return { results: [`Result for: ${params.query || 'unknown'}`, `Related: ${agent.goals[0]}`], count: 2 + Math.floor(Math.random() * 8) };
      case 'summarize': return { summary: `Summary of ${params.content?.substring(0, 50) || 'content'}...`, length: 150, keyPoints: ['Point 1', 'Point 2', 'Point 3'] };
      case 'plan': return { steps: agent.goals.map((g, i) => ({ step: i + 1, action: g, estimated_time: '5m' })), totalSteps: agent.goals.length };
      case 'execute': return { executed: true, output: `Executed: ${params.command || 'task'}`, duration: Math.floor(Math.random() * 5000) };
      case 'analyze': return { analysis: 'Pattern detected', confidence: 0.85, insights: ['Insight 1', 'Insight 2'] };
      case 'decide': return { decision: params.options?.[0] || 'option_a', confidence: 0.75, reasoning: 'Based on available data' };
      default: return { executed: true, type, params };
    }
  }

  async chainActions(agentId: string, actionSequence: { type: string; params: Record<string, any> }[]): Promise<ActionChain> {
    const agent = this.agents.get(agentId);
    if (!agent) throw new Error('Agent not found');
    if (actionSequence.length > 20) throw new Error('Maximum 20 actions in a chain');

    const chain: ActionChain = { id: this.genId('chain'), agentId, actions: [], status: 'running', createdAt: new Date().toISOString() };

    for (const actionDef of actionSequence) {
      try {
        const action = await this.executeAction(agentId, actionDef.type, actionDef.params);
        chain.actions.push(action);
        if (action.status === 'failed') { chain.status = 'failed'; break; }
      } catch (err: any) {
        chain.status = 'failed';
        agent.state.errors.push(err.message);
        break;
      }
    }

    if (chain.status === 'running') chain.status = 'completed';
    this.chains.set(chain.id, chain);
    return chain;
  }

  async getAgentState(agentId: string): Promise<AgentState & { status: Agent['status'] }> {
    const agent = this.agents.get(agentId);
    if (!agent) throw new Error('Agent not found');
    return { ...agent.state, status: agent.status };
  }

  async pauseAgent(agentId: string): Promise<Agent> {
    const agent = this.agents.get(agentId);
    if (!agent) throw new Error('Agent not found');
    agent.status = 'paused';
    return agent;
  }

  async resumeAgent(agentId: string): Promise<Agent> {
    const agent = this.agents.get(agentId);
    if (!agent) throw new Error('Agent not found');
    if (agent.status !== 'paused') throw new Error('Agent is not paused');
    agent.status = 'idle';
    return agent;
  }

  async scheduleAgent(agentId: string, schedule: AgentSchedule): Promise<Agent> {
    const agent = this.agents.get(agentId);
    if (!agent) throw new Error('Agent not found');
    agent.schedule = { ...schedule, nextRun: new Date(Date.now() + 3600000).toISOString() };
    return agent;
  }

  async getAgentHistory(agentId: string, limit: number = 50): Promise<AgentAction[]> {
    return (this.actions.get(agentId) || []).slice(-limit);
  }

  async setConstraints(agentId: string, constraints: AgentConstraint[]): Promise<Agent> {
    const agent = this.agents.get(agentId);
    if (!agent) throw new Error('Agent not found');
    agent.constraints = constraints;
    return agent;
  }
}

export const agentsService = new AgentsService();
export { AgentsService };
