import { describe, it, expect, beforeEach } from 'vitest';
import { StatusEngine } from '../status-engine.js';
import type { UptimeMetric } from '../types.js';

describe('StatusEngine', () => {
  let engine: StatusEngine;

  beforeEach(() => {
    engine = new StatusEngine();
  });

  describe('service management', () => {
    it('should initialize with all Quant services', () => {
      const services = engine.getServices();
      expect(services.length).toBeGreaterThanOrEqual(13);
      expect(services.every((s) => s.status === 'operational')).toBe(true);
    });

    it('should get a specific service', () => {
      const service = engine.getService('quant-mail');
      expect(service).toBeDefined();
      expect(service!.name).toBe('Quant Mail');
      expect(service!.status).toBe('operational');
    });

    it('should return undefined for unknown service', () => {
      const service = engine.getService('unknown-service');
      expect(service).toBeUndefined();
    });

    it('should update service status', () => {
      engine.updateServiceStatus('quant-mail', 'degraded', 500);
      const service = engine.getService('quant-mail');
      expect(service!.status).toBe('degraded');
      expect(service!.responseTime).toBe(500);
    });
  });

  describe('incident management', () => {
    it('should create an incident', () => {
      const incident = engine.createIncident(
        'Email delivery delays',
        'major',
        ['quant-mail'],
        'We are investigating email delivery delays.',
        'ops-team',
      );

      expect(incident.id).toBeDefined();
      expect(incident.title).toBe('Email delivery delays');
      expect(incident.severity).toBe('major');
      expect(incident.status).toBe('investigating');
      expect(incident.affectedServices).toContain('quant-mail');
      expect(incident.updates).toHaveLength(1);
    });

    it('should update affected service status on incident creation', () => {
      engine.createIncident(
        'Service outage',
        'critical',
        ['quant-drive'],
        'Investigating service outage.',
        'ops-team',
      );

      const service = engine.getService('quant-drive');
      expect(service!.status).toBe('major_outage');
    });

    it('should update an incident', () => {
      const incident = engine.createIncident(
        'Test incident',
        'minor',
        ['quant-chat'],
        'Initial report.',
        'ops-team',
      );

      const updated = engine.updateIncident(
        incident.id,
        'identified',
        'Root cause identified.',
        'ops-team',
      );

      expect(updated!.status).toBe('identified');
      expect(updated!.updates).toHaveLength(2);
    });

    it('should resolve an incident and restore services', () => {
      const incident = engine.createIncident(
        'Resolved test',
        'major',
        ['quant-tasks'],
        'Outage detected.',
        'ops-team',
      );

      engine.updateIncident(incident.id, 'resolved', 'Issue resolved.', 'ops-team');

      const resolved = engine.getIncident(incident.id);
      expect(resolved!.status).toBe('resolved');
      expect(resolved!.resolvedAt).toBeDefined();

      const service = engine.getService('quant-tasks');
      expect(service!.status).toBe('operational');
    });

    it('should list active incidents', () => {
      engine.createIncident('Active 1', 'minor', ['quant-mail'], 'Test', 'ops');
      const inc2 = engine.createIncident('Active 2', 'major', ['quant-drive'], 'Test', 'ops');
      engine.updateIncident(inc2.id, 'resolved', 'Fixed', 'ops');

      const active = engine.getActiveIncidents();
      expect(active).toHaveLength(1);
      expect(active[0]!.title).toBe('Active 1');
    });

    it('should return undefined for unknown incident update', () => {
      const result = engine.updateIncident('nonexistent', 'resolved', 'test', 'ops');
      expect(result).toBeUndefined();
    });
  });

  describe('uptime calculation', () => {
    it('should calculate overall uptime', () => {
      const uptime = engine.calculateOverallUptime();
      expect(uptime).toBe(100);
    });

    it('should record metrics and update uptime', () => {
      const metric: UptimeMetric = {
        serviceId: 'quant-mail',
        date: '2024-01-15',
        uptimePercentage: 99.5,
        totalChecks: 1440,
        successfulChecks: 1433,
        averageResponseTime: 150,
      };

      engine.recordMetric('quant-mail', metric);

      const health = engine.getServiceHealth('quant-mail');
      expect(health!.recentMetrics).toHaveLength(1);
      expect(health!.service.uptime).toBe(99.5);
    });
  });

  describe('overall status', () => {
    it('should return operational when all services are up', () => {
      expect(engine.getOverallStatus()).toBe('operational');
    });

    it('should return major_outage when any service has major outage', () => {
      engine.updateServiceStatus('quant-mail', 'major_outage');
      expect(engine.getOverallStatus()).toBe('major_outage');
    });

    it('should return degraded when any service is degraded', () => {
      engine.updateServiceStatus('quant-chat', 'degraded');
      expect(engine.getOverallStatus()).toBe('degraded');
    });
  });

  describe('status page', () => {
    it('should generate complete status page data', () => {
      const page = engine.getStatusPage();
      expect(page.overallStatus).toBe('operational');
      expect(page.services.length).toBeGreaterThanOrEqual(13);
      expect(page.activeIncidents).toHaveLength(0);
      expect(page.lastUpdated).toBeDefined();
      expect(page.uptimePercentage).toBe(100);
    });
  });

  describe('webhook management', () => {
    it('should register a webhook', () => {
      const webhook = engine.registerWebhook(
        'https://hooks.example.com/status',
        ['incident.created', 'incident.resolved'],
        'secret123',
      );

      expect(webhook.id).toBeDefined();
      expect(webhook.url).toBe('https://hooks.example.com/status');
      expect(webhook.events).toHaveLength(2);
      expect(webhook.active).toBe(true);
    });

    it('should list webhooks', () => {
      engine.registerWebhook('https://a.example.com', ['incident.created']);
      engine.registerWebhook('https://b.example.com', ['service.outage']);

      const webhooks = engine.getWebhooks();
      expect(webhooks).toHaveLength(2);
    });

    it('should remove a webhook', () => {
      const webhook = engine.registerWebhook('https://remove.example.com', ['incident.created']);
      const removed = engine.removeWebhook(webhook.id);
      expect(removed).toBe(true);
      expect(engine.getWebhooks()).toHaveLength(0);
    });
  });

  describe('service health', () => {
    it('should return undefined for unknown service', () => {
      const health = engine.getServiceHealth('unknown');
      expect(health).toBeUndefined();
    });

    it('should include active incidents for a service', () => {
      engine.createIncident('Mail issue', 'minor', ['quant-mail'], 'Test', 'ops');

      const health = engine.getServiceHealth('quant-mail');
      expect(health!.activeIncidents).toHaveLength(1);
    });
  });
});
