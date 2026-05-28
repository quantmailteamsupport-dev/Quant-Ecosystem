import { NLQueryEngine } from '../query/nl-query.js';
import { DataExporter } from '../export/data-exporter.js';
import { DataResidencyManager } from '../residency/data-residency.js';
import { TimeSeriesStore } from '../storage/time-series-store.js';
import { DataInspector } from '../inspector/data-inspector.js';
import type { TimeSeriesPoint } from '../types.js';

describe('NLQueryEngine', () => {
  it('parses count intent', () => {
    const e = new NLQueryEngine();
    const q = e.parse('How many meetings this month?');
    expect(q.parsed).not.toBeNull();
    expect(q.parsed!.intent).toBe('count');
    expect(q.parsed!.metric).toBe('meetings');
  });

  it('parses sum intent', () => {
    const e = new NLQueryEngine();
    const q = e.parse('sum total amount of tasks this week');
    expect(q.parsed!.intent).toBe('sum');
  });

  it('parses average intent', () => {
    const e = new NLQueryEngine();
    const q = e.parse('average emails per day');
    expect(q.parsed!.intent).toBe('avg');
  });

  it('parses max intent', () => {
    const e = new NLQueryEngine();
    const q = e.parse('maximum messages this year');
    expect(q.parsed!.intent).toBe('max');
  });

  it('parses min intent', () => {
    const e = new NLQueryEngine();
    const q = e.parse('minimum files this quarter');
    expect(q.parsed!.intent).toBe('min');
  });

  it('returns null parsed for unrecognized query', () => {
    const e = new NLQueryEngine();
    const q = e.parse('gibberish nonsense');
    expect(q.parsed).toBeNull();
  });

  it('parses filters - from app', () => {
    const e = new NLQueryEngine();
    const q = e.parse('count emails from slack');
    expect(q.parsed!.filters).toHaveLength(1);
    expect(q.parsed!.filters[0]!.field).toBe('app');
    expect(q.parsed!.filters[0]!.value).toBe('slack');
  });

  it('executes count query against store', () => {
    const e = new NLQueryEngine();
    const now = Date.now();
    e.setStore([
      { timestamp: now, app: 'outlook', action: 'emails', value: 1 },
      { timestamp: now, app: 'outlook', action: 'emails', value: 1 },
      { timestamp: now, app: 'zoom', action: 'meetings', value: 1 },
    ]);
    const q = e.parse('How many emails?');
    const result = e.execute(q);
    expect(result.data[0]).toEqual({ count: 2 });
  });

  it('executes sum query', () => {
    const e = new NLQueryEngine();
    e.setStore([
      { timestamp: Date.now(), app: 'jira', action: 'tasks', value: 3 },
      { timestamp: Date.now(), app: 'jira', action: 'tasks', value: 7 },
    ]);
    const q = e.parse('sum total amount of tasks');
    const result = e.execute(q);
    expect(result.data[0]).toEqual({ sum: 10 });
  });

  it('returns supported metrics and periods', () => {
    const e = new NLQueryEngine();
    expect(e.getSupportedMetrics()).toContain('emails');
    expect(e.getSupportedPeriods()).toContain('today');
  });
});

describe('TimeSeriesStore', () => {
  const makePoint = (ts: number, app: string, action: string, value: number): TimeSeriesPoint => ({
    timestamp: ts,
    app,
    action,
    value,
  });

  it('appends and retrieves points', () => {
    const store = new TimeSeriesStore();
    store.append(makePoint(1000, 'app1', 'click', 1));
    store.append(makePoint(2000, 'app2', 'view', 2));
    expect(store.getAll()).toHaveLength(2);
  });

  it('queries by time range', () => {
    const store = new TimeSeriesStore();
    store.append(makePoint(100, 'a', 'x', 1));
    store.append(makePoint(200, 'a', 'x', 2));
    store.append(makePoint(300, 'a', 'x', 3));
    expect(store.queryByTimeRange(150, 250)).toHaveLength(1);
  });

  it('queries by app', () => {
    const store = new TimeSeriesStore();
    store.append(makePoint(100, 'slack', 'msg', 1));
    store.append(makePoint(200, 'zoom', 'call', 1));
    store.append(makePoint(300, 'slack', 'msg', 1));
    expect(store.queryByApp('slack')).toHaveLength(2);
  });

  it('queries by action', () => {
    const store = new TimeSeriesStore();
    store.append(makePoint(100, 'a', 'click', 1));
    store.append(makePoint(200, 'b', 'view', 1));
    store.append(makePoint(300, 'c', 'click', 1));
    expect(store.queryByAction('click')).toHaveLength(2);
  });

  it('computes aggregations - count, sum, avg', () => {
    const store = new TimeSeriesStore();
    store.appendBatch([
      makePoint(100, 'app', 'action', 10),
      makePoint(200, 'app', 'action', 20),
      makePoint(300, 'app', 'action', 30),
    ]);
    expect(store.count()).toBe(3);
    expect(store.sum()).toBe(60);
    expect(store.avg()).toBe(20);
  });

  it('computes count per day', () => {
    const store = new TimeSeriesStore();
    const day1 = new Date('2024-01-01').getTime();
    const day2 = new Date('2024-01-02').getTime();
    store.append(makePoint(day1, 'a', 'x', 1));
    store.append(makePoint(day1 + 1000, 'a', 'x', 1));
    store.append(makePoint(day2, 'a', 'x', 1));
    const perDay = store.countPerDay();
    expect(perDay.get('2024-01-01')).toBe(2);
    expect(perDay.get('2024-01-02')).toBe(1);
  });

  it('downsamples data', () => {
    const store = new TimeSeriesStore();
    for (let i = 0; i < 100; i++) {
      store.append(makePoint(i * 1000, 'app', 'action', i));
    }
    const downsampled = store.downsample(10000);
    expect(downsampled.length).toBeLessThan(100);
    expect(downsampled.length).toBeGreaterThan(0);
  });
});

describe('DataExporter', () => {
  it('creates export and marks ready', () => {
    const ex = new DataExporter();
    const exp = ex.exportApp('app1', 'json');
    expect(exp.status).toBe('pending');
    ex.markReady(exp.id, 1024);
    expect(ex.getExport(exp.id)?.status).toBe('ready');
    expect(ex.getExport(exp.id)?.sizeBytes).toBe(1024);
  });

  it('tracks export progress', () => {
    const ex = new DataExporter();
    const exp = ex.exportApp('app1', 'csv');
    expect(ex.getProgress(exp.id)).toBe(0);
    ex.setProgress(exp.id, 50);
    expect(ex.getProgress(exp.id)).toBe(50);
    ex.markReady(exp.id, 2048);
    expect(ex.getProgress(exp.id)).toBe(100);
  });

  it('exports to CSV with proper escaping', () => {
    const ex = new DataExporter();
    const data: TimeSeriesPoint[] = [
      { timestamp: 1000, app: 'my,app', action: 'click', value: 5 },
      { timestamp: 2000, app: 'normal', action: 'view', value: 10 },
    ];
    const csv = ex.exportToCsv(data);
    expect(csv).toContain('timestamp,app,action,value');
    expect(csv).toContain('"my,app"');
    expect(csv).toContain('normal');
  });

  it('exports to JSON', () => {
    const ex = new DataExporter();
    const data: TimeSeriesPoint[] = [{ timestamp: 1000, app: 'app', action: 'x', value: 1 }];
    const json = ex.exportToJson(data);
    const parsed = JSON.parse(json);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].app).toBe('app');
  });

  it('streams JSON in chunks', () => {
    const ex = new DataExporter();
    const data: TimeSeriesPoint[] = Array.from({ length: 10 }, (_, i) => ({
      timestamp: i * 1000,
      app: 'a',
      action: 'b',
      value: i,
    }));
    const chunks = ex.exportToJsonStream(data, 3);
    expect(chunks).toHaveLength(4); // ceil(10/3)
  });

  it('schedules exports', () => {
    const ex = new DataExporter();
    ex.scheduleExport('json', 3600000);
    expect(ex.getSchedules()).toHaveLength(1);
    expect(ex.getDueSchedules()).toHaveLength(1);
  });

  it('supports RTBF', () => {
    const ex = new DataExporter();
    const exp = ex.exportApp('app1', 'json');
    ex.markReady(exp.id, 1024);
    ex.supportRTBF('app1');
    expect(ex.getExport(exp.id)?.status).toBe('expired');
  });
});

describe('DataResidencyManager', () => {
  it('tracks and retrieves residency', () => {
    const rm = new DataResidencyManager();
    rm.track('r1', 'eu-west', 's1', true);
    expect(rm.getResidency('r1')?.region).toBe('eu-west');
  });

  it('moves data to new region', () => {
    const rm = new DataResidencyManager();
    rm.track('r1', 'eu-west', 's1', true);
    rm.moveToRegion('r1', 'eu-central');
    expect(rm.getResidency('r1')?.region).toBe('eu-central');
    expect(rm.getResidency('r1')?.movedAt).not.toBeNull();
  });

  it('enforces residency policy - blocks invalid moves', () => {
    const rm = new DataResidencyManager();
    rm.track('r1', 'eu-west', 's1', true);
    rm.addPolicy('eu-west', ['eu-west', 'eu-central'], true);
    const blocked = rm.moveToRegion('r1', 'us-east');
    expect(blocked).toBe(false);
    expect(rm.getResidency('r1')?.region).toBe('eu-west');
  });

  it('allows moves within policy', () => {
    const rm = new DataResidencyManager();
    rm.track('r1', 'eu-west', 's1', true);
    rm.addPolicy('eu-west', ['eu-west', 'eu-central'], true);
    const allowed = rm.moveToRegion('r1', 'eu-central');
    expect(allowed).toBe(true);
  });

  it('generates compliance report', () => {
    const rm = new DataResidencyManager();
    rm.track('r1', 'eu-west', 's1', true);
    rm.track('r2', 'eu-west', 's1', false);
    const report = rm.generateComplianceReport();
    expect(report.totalRecords).toBe(2);
    expect(report.violations.length).toBeGreaterThan(0); // unencrypted record
  });

  it('tracks locations distribution', () => {
    const rm = new DataResidencyManager();
    rm.track('r1', 'eu-west', 's1', true);
    rm.track('r2', 'eu-west', 's2', true);
    rm.track('r3', 'us-east', 's1', true);
    const locs = rm.getLocations();
    expect(locs.get('eu-west')).toBe(2);
    expect(locs.get('us-east')).toBe(1);
  });

  it('finds unencrypted records', () => {
    const rm = new DataResidencyManager();
    rm.track('r1', 'eu', 's1', false);
    rm.track('r2', 'eu', 's1', true);
    expect(rm.getUnencrypted()).toHaveLength(1);
    rm.encryptRecord('r1');
    expect(rm.getUnencrypted()).toHaveLength(0);
  });
});

describe('DataInspector', () => {
  it('inspects user data across locations', () => {
    const di = new DataInspector();
    di.addRecords([
      {
        id: '1',
        userId: 'u1',
        region: 'eu-west',
        shard: 's1',
        sizeBytes: 1024,
        encrypted: true,
        retentionDays: 30,
        createdAt: 1000,
        service: 'email',
      },
      {
        id: '2',
        userId: 'u1',
        region: 'us-east',
        shard: 's2',
        sizeBytes: 2048,
        encrypted: false,
        retentionDays: 90,
        createdAt: 2000,
        service: 'storage',
      },
    ]);
    const result = di.inspect('u1');
    expect(result.locations).toHaveLength(2);
    expect(result.totalSize).toBe(3072);
    expect(result.oldestRecord).toBe(1000);
    expect(result.newestRecord).toBe(2000);
  });

  it('returns empty result for unknown user', () => {
    const di = new DataInspector();
    const result = di.inspect('unknown');
    expect(result.locations).toHaveLength(0);
    expect(result.totalSize).toBe(0);
  });

  it('shows data flow map - which services have data in which regions', () => {
    const di = new DataInspector();
    di.addRecords([
      {
        id: '1',
        userId: 'u1',
        region: 'eu',
        shard: 's1',
        sizeBytes: 100,
        encrypted: true,
        retentionDays: 30,
        createdAt: 1000,
        service: 'email',
      },
      {
        id: '2',
        userId: 'u1',
        region: 'us',
        shard: 's2',
        sizeBytes: 200,
        encrypted: true,
        retentionDays: 30,
        createdAt: 2000,
        service: 'email',
      },
      {
        id: '3',
        userId: 'u1',
        region: 'eu',
        shard: 's1',
        sizeBytes: 300,
        encrypted: true,
        retentionDays: 30,
        createdAt: 3000,
        service: 'storage',
      },
    ]);
    const flow = di.getDataFlowMap('u1');
    expect(flow.get('email')).toEqual(expect.arrayContaining(['eu', 'us']));
    expect(flow.get('storage')).toEqual(['eu']);
  });

  it('lists services with user data copies', () => {
    const di = new DataInspector();
    di.addRecords([
      {
        id: '1',
        userId: 'u1',
        region: 'eu',
        shard: 's1',
        sizeBytes: 100,
        encrypted: true,
        retentionDays: 30,
        createdAt: 1000,
        service: 'email',
      },
      {
        id: '2',
        userId: 'u1',
        region: 'eu',
        shard: 's1',
        sizeBytes: 200,
        encrypted: true,
        retentionDays: 30,
        createdAt: 2000,
        service: 'calendar',
      },
    ]);
    const services = di.getServicesCopy('u1');
    expect(services).toContain('email');
    expect(services).toContain('calendar');
  });

  it('reports encryption status', () => {
    const di = new DataInspector();
    di.addRecords([
      {
        id: '1',
        userId: 'u1',
        region: 'eu',
        shard: 's1',
        sizeBytes: 100,
        encrypted: true,
        retentionDays: 30,
        createdAt: 1000,
        service: 'a',
      },
      {
        id: '2',
        userId: 'u1',
        region: 'eu',
        shard: 's1',
        sizeBytes: 100,
        encrypted: false,
        retentionDays: 30,
        createdAt: 2000,
        service: 'b',
      },
      {
        id: '3',
        userId: 'u2',
        region: 'us',
        shard: 's2',
        sizeBytes: 100,
        encrypted: true,
        retentionDays: 30,
        createdAt: 3000,
        service: 'c',
      },
    ]);
    const status = di.getEncryptionStatus();
    expect(status.encrypted).toBe(2);
    expect(status.unencrypted).toBe(1);
  });
});
