// ============================================================================
// Admin & Operations Package - Incident Manager
// ============================================================================

import type {
  Incident,
  IncidentSeverity,
  IncidentStatus,
  StatusUpdate,
  Responder,
  ResponderRole,
  PostMortem,
  PostMortemSection,
} from '../types';

/** Incident metrics */
interface IncidentMetrics {
  totalIncidents: number;
  mttrMinutes: number;
  mttdMinutes: number;
  incidentsPerWeek: number;
  bySeverity: Record<IncidentSeverity, number>;
  avgDurationMinutes: number;
}

/** Stakeholder notification */
interface StakeholderNotification {
  incidentId: string;
  channel: 'status_page' | 'slack' | 'email';
  message: string;
  severity: IncidentSeverity;
  timestamp: number;
}

/**
 * IncidentManager - Full incident lifecycle management
 * Supports severity-based incident declaration (P0-P4), responder assignment,
 * timeline updates, stakeholder notifications, resolution tracking,
 * and automated post-mortem generation.
 */
export class IncidentManager {
  private incidents: Map<string, Incident> = new Map();
  private notifications: StakeholderNotification[] = [];
  private incidentCounter: number = 0;

  /**
   * Declare a new incident with severity classification
   * P0: Critical, all-hands | P1: Major | P2: Minor | P3: Low | P4: Cosmetic
   */
  public declareIncident(
    title: string,
    description: string,
    severity: IncidentSeverity,
    declaredBy: string,
    affectedServices: string[],
    impactDescription: string,
    customerImpact: number = 0
  ): Incident {
    this.incidentCounter++;
    const id = `inc_${Date.now()}_${this.incidentCounter}`;

    const incident: Incident = {
      id,
      title,
      description,
      severity,
      status: 'declared',
      declaredBy,
      declaredAt: Date.now(),
      updates: [],
      responders: [],
      affectedServices,
      impactDescription,
      customerImpact,
    };

    // Auto-add initial update
    const initialUpdate: StatusUpdate = {
      id: `upd_${Date.now()}_1`,
      incidentId: id,
      status: 'declared',
      message: `Incident declared: ${title}`,
      author: declaredBy,
      timestamp: Date.now(),
      actionsTaken: ['Incident declared', 'Initial assessment started'],
    };
    incident.updates.push(initialUpdate);

    this.incidents.set(id, incident);

    // Auto-notify for P0 and P1
    if (severity === 'P0' || severity === 'P1') {
      this.notifyStakeholders(id, `[${severity}] Incident declared: ${title}`, ['status_page', 'slack', 'email']);
    } else if (severity === 'P2') {
      this.notifyStakeholders(id, `[${severity}] Incident declared: ${title}`, ['slack']);
    }

    return incident;
  }

  /**
   * Assign a responder to an incident
   */
  public assignResponder(
    incidentId: string,
    responderId: string,
    name: string,
    role: ResponderRole
  ): Responder {
    const incident = this.incidents.get(incidentId);
    if (!incident) {
      throw new Error(`Incident '${incidentId}' not found`);
    }

    // Check for duplicate assignment
    const existing = incident.responders.find(r => r.id === responderId);
    if (existing) {
      throw new Error(`Responder '${responderId}' already assigned to incident`);
    }

    const responder: Responder = {
      id: responderId,
      name,
      role,
      assignedAt: Date.now(),
      acknowledged: false,
    };

    incident.responders.push(responder);
    this.incidents.set(incidentId, incident);

    return responder;
  }

  /**
   * Acknowledge assignment
   */
  public acknowledgeAssignment(incidentId: string, responderId: string): void {
    const incident = this.incidents.get(incidentId);
    if (!incident) {
      throw new Error(`Incident '${incidentId}' not found`);
    }

    const responder = incident.responders.find(r => r.id === responderId);
    if (!responder) {
      throw new Error(`Responder '${responderId}' not assigned to incident`);
    }

    responder.acknowledged = true;
    this.incidents.set(incidentId, incident);
  }

  /**
   * Add a timeline update with status change and actions taken
   */
  public addUpdate(
    incidentId: string,
    message: string,
    author: string,
    actionsTaken: string[] = []
  ): StatusUpdate {
    const incident = this.incidents.get(incidentId);
    if (!incident) {
      throw new Error(`Incident '${incidentId}' not found`);
    }

    const update: StatusUpdate = {
      id: `upd_${Date.now()}_${incident.updates.length + 1}`,
      incidentId,
      status: incident.status,
      message,
      author,
      timestamp: Date.now(),
      actionsTaken,
    };

    incident.updates.push(update);
    this.incidents.set(incidentId, incident);

    return update;
  }

  /**
   * Update incident status: investigating -> identified -> monitoring -> resolved
   */
  public updateStatus(
    incidentId: string,
    newStatus: IncidentStatus,
    message: string,
    author: string
  ): Incident {
    const incident = this.incidents.get(incidentId);
    if (!incident) {
      throw new Error(`Incident '${incidentId}' not found`);
    }

    // Validate status transitions
    const validTransitions: Record<IncidentStatus, IncidentStatus[]> = {
      declared: ['investigating'],
      investigating: ['identified', 'resolved'],
      identified: ['monitoring', 'resolved'],
      monitoring: ['resolved', 'investigating'],
      resolved: ['post_mortem'],
      post_mortem: [],
    };

    if (!validTransitions[incident.status]?.includes(newStatus)) {
      throw new Error(`Cannot transition from '${incident.status}' to '${newStatus}'`);
    }

    incident.status = newStatus;

    const update: StatusUpdate = {
      id: `upd_${Date.now()}_${incident.updates.length + 1}`,
      incidentId,
      status: newStatus,
      message,
      author,
      timestamp: Date.now(),
      actionsTaken: [`Status changed to ${newStatus}`],
    };
    incident.updates.push(update);

    // Notify on status changes
    this.notifyStakeholders(
      incidentId,
      `[${incident.severity}] Status update: ${newStatus} - ${message}`,
      incident.severity === 'P0' ? ['status_page', 'slack', 'email'] : ['slack']
    );

    this.incidents.set(incidentId, incident);
    return incident;
  }

  /**
   * Send notifications to stakeholders via configured channels
   */
  public notifyStakeholders(
    incidentId: string,
    message: string,
    channels: Array<'status_page' | 'slack' | 'email'>
  ): StakeholderNotification[] {
    const incident = this.incidents.get(incidentId);
    if (!incident) return [];

    const notifications: StakeholderNotification[] = [];

    for (const channel of channels) {
      const notification: StakeholderNotification = {
        incidentId,
        channel,
        message,
        severity: incident.severity,
        timestamp: Date.now(),
      };
      notifications.push(notification);
      this.notifications.push(notification);
    }

    return notifications;
  }

  /**
   * Resolve an incident with resolution summary
   */
  public resolve(
    incidentId: string,
    resolutionSummary: string,
    resolvedBy: string
  ): Incident {
    const incident = this.incidents.get(incidentId);
    if (!incident) {
      throw new Error(`Incident '${incidentId}' not found`);
    }

    if (incident.status === 'resolved' || incident.status === 'post_mortem') {
      throw new Error(`Incident '${incidentId}' is already resolved`);
    }

    incident.status = 'resolved';
    incident.resolvedAt = Date.now();
    incident.duration = incident.resolvedAt - incident.declaredAt;

    const update: StatusUpdate = {
      id: `upd_${Date.now()}_${incident.updates.length + 1}`,
      incidentId,
      status: 'resolved',
      message: resolutionSummary,
      author: resolvedBy,
      timestamp: Date.now(),
      actionsTaken: ['Incident resolved', `Duration: ${Math.round(incident.duration / 60000)} minutes`],
    };
    incident.updates.push(update);

    // Final notification
    this.notifyStakeholders(
      incidentId,
      `[RESOLVED] ${incident.title} - ${resolutionSummary}`,
      ['status_page', 'slack', 'email']
    );

    this.incidents.set(incidentId, incident);
    return incident;
  }

  /**
   * Generate a post-mortem template with timeline, root cause, impact, action items
   */
  public generatePostMortem(incidentId: string, author: string): PostMortem {
    const incident = this.incidents.get(incidentId);
    if (!incident) {
      throw new Error(`Incident '${incidentId}' not found`);
    }

    // Build timeline content from updates
    const timelineContent = incident.updates.map(u => {
      const time = new Date(u.timestamp).toISOString();
      return `[${time}] ${u.status}: ${u.message}${u.actionsTaken.length > 0 ? '\n  Actions: ' + u.actionsTaken.join(', ') : ''}`;
    }).join('\n');

    // Build responders section
    const respondersContent = incident.responders.map(r =>
      `- ${r.name} (${r.role}) - Assigned: ${new Date(r.assignedAt).toISOString()}, Acknowledged: ${r.acknowledged}`
    ).join('\n');

    const durationMinutes = incident.duration ? Math.round(incident.duration / 60000) : 0;

    const sections: PostMortemSection[] = [
      {
        title: 'Summary',
        content: `Severity: ${incident.severity}\nDuration: ${durationMinutes} minutes\nAffected Services: ${incident.affectedServices.join(', ')}\nCustomer Impact: ${incident.customerImpact} users affected\n\n${incident.description}`,
        order: 1,
      },
      {
        title: 'Timeline',
        content: timelineContent,
        order: 2,
      },
      {
        title: 'Root Cause',
        content: '[TO BE FILLED] Describe the root cause of the incident here.',
        order: 3,
      },
      {
        title: 'Impact',
        content: `${incident.impactDescription}\n\nCustomers affected: ${incident.customerImpact}\nServices affected: ${incident.affectedServices.join(', ')}`,
        order: 4,
      },
      {
        title: 'Responders',
        content: respondersContent || 'No responders assigned.',
        order: 5,
      },
      {
        title: 'Mitigation',
        content: '[TO BE FILLED] What immediate actions were taken to mitigate the impact?',
        order: 6,
      },
      {
        title: 'Prevention',
        content: '[TO BE FILLED] What changes will prevent this from happening again?',
        order: 7,
      },
      {
        title: 'Action Items',
        content: '- [ ] [TO BE FILLED] Add specific action items with owners and deadlines',
        order: 8,
      },
    ];

    const postMortem: PostMortem = {
      incidentId,
      title: `Post-Mortem: ${incident.title}`,
      sections,
      createdAt: Date.now(),
      author,
      status: 'draft',
    };

    // Update incident status
    incident.status = 'post_mortem';
    this.incidents.set(incidentId, incident);

    return postMortem;
  }

  /**
   * Get all active (unresolved) incidents sorted by severity
   */
  public getActiveIncidents(): Incident[] {
    const severityOrder: Record<IncidentSeverity, number> = {
      P0: 0, P1: 1, P2: 2, P3: 3, P4: 4,
    };

    return Array.from(this.incidents.values())
      .filter(i => i.status !== 'resolved' && i.status !== 'post_mortem')
      .sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
  }

  /**
   * Get incident metrics: MTTR, MTTD, incidents per week, trend
   */
  public getMetrics(windowMs: number = 2592000000): IncidentMetrics {
    const windowStart = Date.now() - windowMs;
    const windowIncidents = Array.from(this.incidents.values())
      .filter(i => i.declaredAt >= windowStart);

    const resolvedIncidents = windowIncidents.filter(i => i.resolvedAt);

    // MTTR - Mean Time To Resolve (in minutes)
    const mttrMinutes = resolvedIncidents.length > 0
      ? resolvedIncidents.reduce((sum, i) => sum + (i.duration || 0), 0) / resolvedIncidents.length / 60000
      : 0;

    // MTTD - Mean Time To Detect (time from first impact to declaration)
    // Approximation: time to first "investigating" status
    const mttdMinutes = resolvedIncidents.length > 0
      ? resolvedIncidents.reduce((sum, i) => {
          const investigatingUpdate = i.updates.find(u => u.status === 'investigating');
          if (investigatingUpdate) {
            return sum + (investigatingUpdate.timestamp - i.declaredAt);
          }
          return sum;
        }, 0) / resolvedIncidents.length / 60000
      : 0;

    // Incidents per week
    const weeks = windowMs / (7 * 86400000);
    const incidentsPerWeek = windowIncidents.length / weeks;

    // By severity
    const bySeverity: Record<IncidentSeverity, number> = { P0: 0, P1: 0, P2: 0, P3: 0, P4: 0 };
    for (const incident of windowIncidents) {
      bySeverity[incident.severity]++;
    }

    // Average duration
    const avgDurationMinutes = resolvedIncidents.length > 0
      ? resolvedIncidents.reduce((sum, i) => sum + (i.duration || 0), 0) / resolvedIncidents.length / 60000
      : 0;

    return {
      totalIncidents: windowIncidents.length,
      mttrMinutes: Math.round(mttrMinutes * 10) / 10,
      mttdMinutes: Math.round(mttdMinutes * 10) / 10,
      incidentsPerWeek: Math.round(incidentsPerWeek * 10) / 10,
      bySeverity,
      avgDurationMinutes: Math.round(avgDurationMinutes * 10) / 10,
    };
  }

  /**
   * Get a single incident by ID
   */
  public getIncident(incidentId: string): Incident | null {
    return this.incidents.get(incidentId) || null;
  }
}
