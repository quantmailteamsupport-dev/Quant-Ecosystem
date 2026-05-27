export type ServiceStatusLevel =
  | 'operational'
  | 'degraded'
  | 'partial_outage'
  | 'major_outage'
  | 'maintenance';

export interface ServiceStatus {
  serviceId: string;
  name: string;
  status: ServiceStatusLevel;
  lastChecked: Date;
  responseTime?: number;
  uptime: number;
}

export type IncidentSeverity = 'minor' | 'major' | 'critical';
export type IncidentStatus = 'investigating' | 'identified' | 'monitoring' | 'resolved';

export interface IncidentUpdate {
  id: string;
  status: IncidentStatus;
  message: string;
  timestamp: Date;
  author: string;
}

export interface Incident {
  id: string;
  title: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  affectedServices: string[];
  updates: IncidentUpdate[];
  createdAt: Date;
  resolvedAt?: Date;
}

export interface UptimeMetric {
  serviceId: string;
  date: string;
  uptimePercentage: number;
  totalChecks: number;
  successfulChecks: number;
  averageResponseTime: number;
}

export interface ServiceHealth {
  service: ServiceStatus;
  recentMetrics: UptimeMetric[];
  activeIncidents: Incident[];
}

export interface StatusPage {
  overallStatus: ServiceStatusLevel;
  services: ServiceStatus[];
  activeIncidents: Incident[];
  recentIncidents: Incident[];
  lastUpdated: Date;
  uptimePercentage: number;
}

export interface WebhookConfig {
  id: string;
  url: string;
  events: WebhookEvent[];
  active: boolean;
  secret?: string;
}

export type WebhookEvent =
  | 'incident.created'
  | 'incident.updated'
  | 'incident.resolved'
  | 'service.degraded'
  | 'service.outage'
  | 'service.restored';
