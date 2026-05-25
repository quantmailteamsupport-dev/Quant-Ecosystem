// ============================================================================
// Admin & Operations Package - Support Ticket System
// ============================================================================

import type {
  SupportTicket,
  TicketStatus,
  TicketPriority,
  TicketCategory,
  TicketSLA,
  TicketResponse,
  EscalationRule,
  EscalationCondition,
  CSATScore,
} from '../types';

/** Agent metrics */
interface AgentMetrics {
  agentId: string;
  ticketsResolved: number;
  avgResolutionTimeMs: number;
  csatAverage: number;
  currentLoad: number;
  specialties: TicketCategory[];
}

/** Queue metrics */
interface QueueMetrics {
  totalOpen: number;
  byPriority: Record<TicketPriority, number>;
  avgAge: number;
  breachRisk: number;
  oldestTicketAge: number;
}

/** Response template */
interface ResponseTemplate {
  id: string;
  name: string;
  category: TicketCategory;
  content: string;
  variables: string[];
}

/**
 * SupportTicketSystem - Full-featured customer support management
 * Provides ticket creation, assignment, responses with templates,
 * escalation rules, SLA tracking, agent metrics, and CSAT scoring.
 */
export class SupportTicketSystem {
  private tickets: Map<string, SupportTicket> = new Map();
  private agents: Map<string, AgentMetrics> = new Map();
  private escalationRules: EscalationRule[] = [];
  private csatScores: CSATScore[] = [];
  private templates: ResponseTemplate[] = [];
  private ticketCounter: number = 0;

  /**
   * Register a support agent
   */
  public registerAgent(agentId: string, specialties: TicketCategory[]): void {
    this.agents.set(agentId, {
      agentId,
      ticketsResolved: 0,
      avgResolutionTimeMs: 0,
      csatAverage: 0,
      currentLoad: 0,
      specialties,
    });
  }

  /**
   * Add a response template
   */
  public addTemplate(name: string, category: TicketCategory, content: string, variables: string[] = []): ResponseTemplate {
    const template: ResponseTemplate = {
      id: `tmpl_${Date.now()}_${this.templates.length + 1}`,
      name,
      category,
      content,
      variables,
    };
    this.templates.push(template);
    return template;
  }

  /**
   * Create a ticket from user report or internal escalation
   */
  public createTicket(
    userId: string,
    subject: string,
    description: string,
    category: TicketCategory,
    priority?: TicketPriority,
    tags: string[] = []
  ): SupportTicket {
    this.ticketCounter++;
    const id = `ticket_${Date.now()}_${this.ticketCounter}`;

    // Auto-assign priority if not specified
    const assignedPriority = priority || this.autoPrioritize(category, description);

    // Calculate SLA targets based on priority
    const sla = this.calculateSLA(assignedPriority);

    const ticket: SupportTicket = {
      id,
      userId,
      subject,
      description,
      status: 'open',
      priority: assignedPriority,
      category,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      responses: [],
      tags,
      sla,
    };

    this.tickets.set(id, ticket);

    // Auto-route to appropriate team
    const agent = this.autoRoute(ticket);
    if (agent) {
      ticket.assignedTo = agent;
      ticket.status = 'assigned';
    }

    return ticket;
  }

  /**
   * Assign ticket to agent based on specialty, workload, availability
   */
  public assignTicket(ticketId: string, agentId: string): SupportTicket {
    const ticket = this.tickets.get(ticketId);
    if (!ticket) {
      throw new Error(`Ticket '${ticketId}' not found`);
    }

    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent '${agentId}' not found`);
    }

    ticket.assignedTo = agentId;
    ticket.status = 'assigned';
    ticket.updatedAt = Date.now();
    agent.currentLoad++;

    this.tickets.set(ticketId, ticket);
    this.agents.set(agentId, agent);
    return ticket;
  }

  /**
   * Agent responds to ticket with optional template support
   */
  public respond(
    ticketId: string,
    author: string,
    content: string,
    options?: { internal?: boolean; templateId?: string; templateVars?: Record<string, string> }
  ): TicketResponse {
    const ticket = this.tickets.get(ticketId);
    if (!ticket) {
      throw new Error(`Ticket '${ticketId}' not found`);
    }

    // Apply template if specified
    let responseContent = content;
    if (options?.templateId) {
      const template = this.templates.find(t => t.id === options.templateId);
      if (template) {
        responseContent = template.content;
        if (options.templateVars) {
          for (const [key, value] of Object.entries(options.templateVars)) {
            responseContent = responseContent.replace(`{{${key}}}`, value);
          }
        }
      }
    }

    const response: TicketResponse = {
      id: `resp_${Date.now()}_${ticket.responses.length + 1}`,
      ticketId,
      author,
      authorType: this.agents.has(author) ? 'agent' : 'customer',
      content: responseContent,
      internal: options?.internal || false,
      timestamp: Date.now(),
      attachments: [],
    };

    ticket.responses.push(response);
    ticket.updatedAt = Date.now();

    // Track first response time
    if (!ticket.firstResponseAt && response.authorType === 'agent' && !response.internal) {
      ticket.firstResponseAt = Date.now();
      ticket.sla.firstResponseMet = (Date.now() - ticket.createdAt) <= ticket.sla.firstResponseTarget;
    }

    // Update status
    if (response.authorType === 'agent' && !response.internal) {
      ticket.status = 'waiting_customer';
    } else if (response.authorType === 'customer') {
      ticket.status = 'in_progress';
    }

    this.tickets.set(ticketId, ticket);
    return response;
  }

  /**
   * Escalate ticket to higher tier
   */
  public escalate(ticketId: string, reason: string, escalatedBy: string): SupportTicket {
    const ticket = this.tickets.get(ticketId);
    if (!ticket) {
      throw new Error(`Ticket '${ticketId}' not found`);
    }

    // Increase priority
    const priorityLevels: TicketPriority[] = ['low', 'medium', 'high', 'urgent'];
    const currentIdx = priorityLevels.indexOf(ticket.priority);
    if (currentIdx < priorityLevels.length - 1) {
      ticket.priority = priorityLevels[currentIdx + 1];
    }

    ticket.status = 'escalated';
    ticket.updatedAt = Date.now();

    // Add system response noting escalation
    const systemResponse: TicketResponse = {
      id: `resp_${Date.now()}_sys`,
      ticketId,
      author: 'system',
      authorType: 'system',
      content: `Ticket escalated by ${escalatedBy}. Reason: ${reason}`,
      internal: true,
      timestamp: Date.now(),
      attachments: [],
    };
    ticket.responses.push(systemResponse);

    // Release from current agent
    if (ticket.assignedTo) {
      const agent = this.agents.get(ticket.assignedTo);
      if (agent && agent.currentLoad > 0) {
        agent.currentLoad--;
        this.agents.set(ticket.assignedTo, agent);
      }
      ticket.assignedTo = undefined;
    }

    this.tickets.set(ticketId, ticket);
    return ticket;
  }

  /**
   * Resolve a ticket and ask for CSAT
   */
  public resolveTicket(ticketId: string, resolvedBy: string, resolution: string): SupportTicket {
    const ticket = this.tickets.get(ticketId);
    if (!ticket) {
      throw new Error(`Ticket '${ticketId}' not found`);
    }

    ticket.status = 'resolved';
    ticket.resolvedAt = Date.now();
    ticket.updatedAt = Date.now();
    ticket.sla.resolutionMet = (Date.now() - ticket.createdAt) <= ticket.sla.resolutionTarget;

    // Add resolution response
    const resolutionResponse: TicketResponse = {
      id: `resp_${Date.now()}_resolve`,
      ticketId,
      author: resolvedBy,
      authorType: 'agent',
      content: resolution,
      internal: false,
      timestamp: Date.now(),
      attachments: [],
    };
    ticket.responses.push(resolutionResponse);

    // Update agent metrics
    if (ticket.assignedTo) {
      const agent = this.agents.get(ticket.assignedTo);
      if (agent) {
        agent.ticketsResolved++;
        agent.currentLoad = Math.max(0, agent.currentLoad - 1);
        const resolutionTime = ticket.resolvedAt - ticket.createdAt;
        agent.avgResolutionTimeMs = agent.ticketsResolved > 1
          ? (agent.avgResolutionTimeMs * (agent.ticketsResolved - 1) + resolutionTime) / agent.ticketsResolved
          : resolutionTime;
        this.agents.set(ticket.assignedTo, agent);
      }
    }

    this.tickets.set(ticketId, ticket);
    return ticket;
  }

  /**
   * Submit CSAT score for a ticket
   */
  public submitCSAT(ticketId: string, score: number, feedback?: string): CSATScore {
    const ticket = this.tickets.get(ticketId);
    if (!ticket) {
      throw new Error(`Ticket '${ticketId}' not found`);
    }

    const csatScore: CSATScore = {
      ticketId,
      score: Math.min(5, Math.max(1, score)),
      feedback,
      submittedAt: Date.now(),
    };

    this.csatScores.push(csatScore);

    // Update agent CSAT
    if (ticket.assignedTo) {
      const agent = this.agents.get(ticket.assignedTo);
      if (agent) {
        const agentScores = this.csatScores.filter(c => {
          const t = this.tickets.get(c.ticketId);
          return t && t.assignedTo === ticket.assignedTo;
        });
        agent.csatAverage = agentScores.reduce((sum, c) => sum + c.score, 0) / agentScores.length;
        this.agents.set(ticket.assignedTo, agent);
      }
    }

    return csatScore;
  }

  /**
   * Get SLA status for all open tickets
   */
  public getSLAStatus(): Array<{ ticketId: string; priority: TicketPriority; sla: TicketSLA; timeRemaining: number }> {
    const now = Date.now();
    const results: Array<{ ticketId: string; priority: TicketPriority; sla: TicketSLA; timeRemaining: number }> = [];

    for (const [, ticket] of this.tickets) {
      if (ticket.status === 'resolved' || ticket.status === 'closed') continue;

      const elapsed = now - ticket.createdAt;
      const timeRemaining = ticket.sla.resolutionTarget - elapsed;
      ticket.sla.breachRisk = timeRemaining < ticket.sla.resolutionTarget * 0.2;

      results.push({
        ticketId: ticket.id,
        priority: ticket.priority,
        sla: ticket.sla,
        timeRemaining: Math.max(0, timeRemaining),
      });
    }

    return results.sort((a, b) => a.timeRemaining - b.timeRemaining);
  }

  /**
   * Get agent performance metrics
   */
  public getAgentMetrics(agentId?: string): AgentMetrics[] {
    if (agentId) {
      const agent = this.agents.get(agentId);
      return agent ? [agent] : [];
    }
    return Array.from(this.agents.values());
  }

  /**
   * Get queue metrics: open tickets by priority, age distribution, breach risk
   */
  public getQueueMetrics(): QueueMetrics {
    const now = Date.now();
    const openTickets = Array.from(this.tickets.values())
      .filter(t => t.status !== 'resolved' && t.status !== 'closed');

    const byPriority: Record<TicketPriority, number> = {
      urgent: 0,
      high: 0,
      medium: 0,
      low: 0,
    };

    let totalAge = 0;
    let oldestAge = 0;
    let breachRiskCount = 0;

    for (const ticket of openTickets) {
      byPriority[ticket.priority]++;
      const age = now - ticket.createdAt;
      totalAge += age;
      if (age > oldestAge) oldestAge = age;

      const timeRemaining = ticket.sla.resolutionTarget - age;
      if (timeRemaining < ticket.sla.resolutionTarget * 0.2) {
        breachRiskCount++;
      }
    }

    return {
      totalOpen: openTickets.length,
      byPriority,
      avgAge: openTickets.length > 0 ? totalAge / openTickets.length : 0,
      breachRisk: breachRiskCount,
      oldestTicketAge: oldestAge,
    };
  }

  /**
   * Add an escalation rule
   */
  public addEscalationRule(rule: EscalationRule): void {
    this.escalationRules.push(rule);
  }

  /**
   * Auto-route ticket based on keywords to appropriate team
   */
  public autoRoute(ticket: SupportTicket): string | null {
    // Find available agents with matching specialty
    const candidates = Array.from(this.agents.values())
      .filter(a => a.specialties.includes(ticket.category))
      .sort((a, b) => a.currentLoad - b.currentLoad);

    if (candidates.length > 0) {
      return candidates[0].agentId;
    }

    // Fallback: any agent with lowest load
    const allAgents = Array.from(this.agents.values())
      .sort((a, b) => a.currentLoad - b.currentLoad);

    return allAgents.length > 0 ? allAgents[0].agentId : null;
  }

  /**
   * Auto-prioritize based on category and content
   */
  private autoPrioritize(category: TicketCategory, description: string): TicketPriority {
    const lowerDesc = description.toLowerCase();

    // Urgent keywords
    if (lowerDesc.includes('cannot access') || lowerDesc.includes('data loss') ||
        lowerDesc.includes('security') || lowerDesc.includes('urgent')) {
      return 'urgent';
    }

    // High priority for billing issues
    if (category === 'billing' && (lowerDesc.includes('charged') || lowerDesc.includes('overcharged'))) {
      return 'high';
    }

    // Category-based defaults
    switch (category) {
      case 'billing': return 'high';
      case 'bug_report': return 'medium';
      case 'technical': return 'medium';
      case 'account': return 'medium';
      case 'feature_request': return 'low';
      case 'general': return 'low';
      default: return 'medium';
    }
  }

  /**
   * Calculate SLA targets based on priority
   */
  private calculateSLA(priority: TicketPriority): TicketSLA {
    const slaTargets: Record<TicketPriority, { firstResponse: number; resolution: number }> = {
      urgent: { firstResponse: 900000, resolution: 14400000 },       // 15min / 4h
      high: { firstResponse: 3600000, resolution: 28800000 },        // 1h / 8h
      medium: { firstResponse: 14400000, resolution: 172800000 },    // 4h / 48h
      low: { firstResponse: 86400000, resolution: 604800000 },       // 24h / 7d
    };

    const targets = slaTargets[priority];
    return {
      firstResponseTarget: targets.firstResponse,
      resolutionTarget: targets.resolution,
      breachRisk: false,
    };
  }
}
