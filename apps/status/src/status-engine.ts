import type {
  ServiceStatus,
  ServiceStatusLevel,
  Incident,
  IncidentUpdate,
  IncidentSeverity,
  IncidentStatus,
  StatusPage,
  UptimeMetric,
  ServiceHealth,
  WebhookConfig,
  WebhookEvent,
} from './types.js';

const QUANT_SERVICES = [
  'quant-mail',
  'quant-drive',
  'quant-docs',
  'quant-calendar',
  'quant-meet',
  'quant-chat',
  'quant-tasks',
  'quant-code',
  'quant-sheets',
  'quant-slides',
  'quant-photos',
  'quant-notes',
  'quant-forms',
  'api-gateway',
  'auth-service',
  'sync-engine',
  'ai-service',
  'search-service',
  'cdn',
  'database',
];

export class StatusEngine {
  private services: Map<string, ServiceStatus> = new Map();
  private incidents: Map<string, Incident> = new Map();
  private metrics: Map<string, UptimeMetric[]> = new Map();
  private webhooks: Map<string, WebhookConfig> = new Map();

  constructor() {
    this.initializeServices();
  }

  private initializeServices(): void {
    for (const serviceId of QUANT_SERVICES) {
      const name = serviceId
        .split('-')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');

      this.services.set(serviceId, {
        serviceId,
        name,
        status: 'operational',
        lastChecked: new Date(),
        responseTime: 0,
        uptime: 100,
      });

      this.metrics.set(serviceId, []);
    }
  }

  getServices(): ServiceStatus[] {
    return Array.from(this.services.values());
  }

  getService(serviceId: string): ServiceStatus | undefined {
    return this.services.get(serviceId);
  }

  updateServiceStatus(serviceId: string, status: ServiceStatusLevel, responseTime?: number): void {
    const service = this.services.get(serviceId);
    if (!service) return;

    const previousStatus = service.status;
    service.status = status;
    service.lastChecked = new Date();
    if (responseTime !== undefined) {
      service.responseTime = responseTime;
    }

    this.services.set(serviceId, service);

    if (previousStatus === 'operational' && status !== 'operational') {
      this.notifyWebhooks(
        status === 'major_outage' || status === 'partial_outage'
          ? 'service.outage'
          : 'service.degraded',
      );
    } else if (previousStatus !== 'operational' && status === 'operational') {
      this.notifyWebhooks('service.restored');
    }
  }

  recordMetric(serviceId: string, metric: UptimeMetric): void {
    const serviceMetrics = this.metrics.get(serviceId);
    if (!serviceMetrics) return;

    serviceMetrics.push(metric);

    // Keep last 90 days of metrics
    if (serviceMetrics.length > 90) {
      serviceMetrics.shift();
    }

    this.metrics.set(serviceId, serviceMetrics);

    // Update service uptime based on recent metrics
    const service = this.services.get(serviceId);
    if (service && serviceMetrics.length > 0) {
      const totalUptime = serviceMetrics.reduce((sum, m) => sum + m.uptimePercentage, 0);
      service.uptime = totalUptime / serviceMetrics.length;
      this.services.set(serviceId, service);
    }
  }

  createIncident(
    title: string,
    severity: IncidentSeverity,
    affectedServices: string[],
    message: string,
    author: string,
  ): Incident {
    const id = `inc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const now = new Date();

    const incident: Incident = {
      id,
      title,
      severity,
      status: 'investigating',
      affectedServices,
      updates: [
        {
          id: `upd-${Date.now()}`,
          status: 'investigating',
          message,
          timestamp: now,
          author,
        },
      ],
      createdAt: now,
    };

    this.incidents.set(id, incident);

    // Update affected service statuses
    for (const serviceId of affectedServices) {
      const statusLevel: ServiceStatusLevel =
        severity === 'critical'
          ? 'major_outage'
          : severity === 'major'
            ? 'partial_outage'
            : 'degraded';
      this.updateServiceStatus(serviceId, statusLevel);
    }

    this.notifyWebhooks('incident.created');
    return incident;
  }

  updateIncident(
    incidentId: string,
    status: IncidentStatus,
    message: string,
    author: string,
  ): Incident | undefined {
    const incident = this.incidents.get(incidentId);
    if (!incident) return undefined;

    const update: IncidentUpdate = {
      id: `upd-${Date.now()}`,
      status,
      message,
      timestamp: new Date(),
      author,
    };

    incident.status = status;
    incident.updates.push(update);

    if (status === 'resolved') {
      incident.resolvedAt = new Date();
      // Restore affected services
      for (const serviceId of incident.affectedServices) {
        this.updateServiceStatus(serviceId, 'operational');
      }
      this.notifyWebhooks('incident.resolved');
    } else {
      this.notifyWebhooks('incident.updated');
    }

    this.incidents.set(incidentId, incident);
    return incident;
  }

  getIncident(incidentId: string): Incident | undefined {
    return this.incidents.get(incidentId);
  }

  getActiveIncidents(): Incident[] {
    return Array.from(this.incidents.values()).filter((i) => i.status !== 'resolved');
  }

  getRecentIncidents(days: number = 7): Incident[] {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    return Array.from(this.incidents.values())
      .filter((i) => i.createdAt >= cutoff)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  calculateOverallUptime(): number {
    const services = this.getServices();
    if (services.length === 0) return 100;

    const totalUptime = services.reduce((sum, s) => sum + s.uptime, 0);
    return totalUptime / services.length;
  }

  getOverallStatus(): ServiceStatusLevel {
    const services = this.getServices();

    if (services.some((s) => s.status === 'major_outage')) return 'major_outage';
    if (services.some((s) => s.status === 'partial_outage')) return 'partial_outage';
    if (services.some((s) => s.status === 'degraded')) return 'degraded';
    if (services.some((s) => s.status === 'maintenance')) return 'maintenance';
    return 'operational';
  }

  getServiceHealth(serviceId: string): ServiceHealth | undefined {
    const service = this.services.get(serviceId);
    if (!service) return undefined;

    const recentMetrics = this.metrics.get(serviceId) || [];
    const activeIncidents = this.getActiveIncidents().filter((i) =>
      i.affectedServices.includes(serviceId),
    );

    return {
      service,
      recentMetrics,
      activeIncidents,
    };
  }

  getStatusPage(): StatusPage {
    return {
      overallStatus: this.getOverallStatus(),
      services: this.getServices(),
      activeIncidents: this.getActiveIncidents(),
      recentIncidents: this.getRecentIncidents(),
      lastUpdated: new Date(),
      uptimePercentage: this.calculateOverallUptime(),
    };
  }

  // Webhook management
  registerWebhook(url: string, events: WebhookEvent[], secret?: string): WebhookConfig {
    const config: WebhookConfig = {
      id: `wh-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      url,
      events,
      active: true,
      secret,
    };
    this.webhooks.set(config.id, config);
    return config;
  }

  removeWebhook(webhookId: string): boolean {
    return this.webhooks.delete(webhookId);
  }

  getWebhooks(): WebhookConfig[] {
    return Array.from(this.webhooks.values());
  }

  private notifyWebhooks(_event: WebhookEvent): void {
    // In production, this would send HTTP requests to registered webhook URLs
    // For now, this is a no-op placeholder for the webhook notification system
    void Array.from(this.webhooks.values()).filter((w) => w.active && w.events.includes(_event));
    // Would send POST requests to each active webhook URL
  }
}
