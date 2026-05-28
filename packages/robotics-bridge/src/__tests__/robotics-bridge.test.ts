import { RobotRegistry } from '../registry/robot-registry.js';
import { RobotSafety } from '../safety/robot-safety.js';
import { CommandDispatcher } from '../commands/command-dispatcher.js';
import { MatterAdapter } from '../protocols/matter-adapter.js';
import { CommandQueue } from '../queue/command-queue.js';
import { DeviceDiscovery } from '../discovery/device-discovery.js';
import type { Robot } from '../types.js';

const bot = (o: Partial<Robot> = {}): Robot => ({
  id: 'r1',
  name: 'B',
  type: 'vacuum',
  status: 'idle',
  capabilities: ['clean'],
  ...o,
});

describe('RobotRegistry', () => {
  it('register, query, unregister, filter by capability', () => {
    const r = new RobotRegistry();
    r.register(bot());
    expect(r.getStatus('r1')).toBe('idle');
    expect(r.unregister('r1')).toBe(true);
    expect(r.unregister('r1')).toBe(false);
    r.register(bot({ id: 'a' }));
    r.register(bot({ id: 'b', capabilities: ['patrol'] }));
    expect(r.listByCapability('clean')).toHaveLength(1);
    expect(r.listByCapability('deliver')).toHaveLength(0);
  });
});

describe('RobotSafety', () => {
  it('validates, blocks stopped, killAll, audit', () => {
    const reg = new RobotRegistry();
    reg.register(bot({ status: 'active', capabilities: ['speak'] }));
    const s = new RobotSafety(reg);
    expect(s.validateCommand({ robotId: 'r1', action: 'speak', params: {}, timestamp: 1 })).toBe(
      true,
    );
    reg.register(bot({ id: 'r2', status: 'stopped' }));
    expect(s.validateCommand({ robotId: 'r2', action: 'x', params: {}, timestamp: 2 })).toBe(false);
    s.killAll();
    expect(reg.getStatus('r1')).toBe('stopped');
    expect(s.getAuditLog().some((e) => e.result === 'killed')).toBe(true);
  });

  it('assesses risk level using rules', () => {
    const reg = new RobotRegistry();
    reg.register(bot({ status: 'active' }));
    const s = new RobotSafety(reg);
    s.addRule({
      id: 'no-night',
      description: 'No vacuum after 10pm',
      condition: (cmd) => cmd.action === 'clean-night',
      riskLevel: 'high',
    });
    const cmd = { robotId: 'r1', action: 'clean-night', params: {}, timestamp: 1 };
    expect(s.assessRisk(cmd)).toBe('high');
    expect(s.validateCommand(cmd)).toBe(false);
  });

  it('geofencing checks robot position', () => {
    const reg = new RobotRegistry();
    reg.register(bot({ status: 'active' }));
    const s = new RobotSafety(reg);
    s.addZone({ id: 'z1', bounds: { minX: 0, maxX: 10, minY: 0, maxY: 10 } });
    s.assignZone('r1', 'z1');
    expect(s.checkGeofence('r1', { x: 5, y: 5 })).toBe(true);
    expect(s.checkGeofence('r1', { x: 15, y: 5 })).toBe(false);
    expect(s.checkGeofence('r1', { x: -1, y: 5 })).toBe(false);
  });

  it('override with audit logs the action', () => {
    const reg = new RobotRegistry();
    reg.register(bot({ status: 'active' }));
    const s = new RobotSafety(reg);
    s.overrideWithAudit({ robotId: 'r1', action: 'deploy', params: {}, timestamp: 1 }, 'admin');
    expect(s.getAuditLog().some((e) => e.action.includes('OVERRIDE'))).toBe(true);
  });

  it('removes rules by id', () => {
    const reg = new RobotRegistry();
    const s = new RobotSafety(reg);
    s.addRule({ id: 'r1', description: 'test', condition: () => true, riskLevel: 'low' });
    expect(s.getRules()).toHaveLength(1);
    expect(s.removeRule('r1')).toBe(true);
    expect(s.getRules()).toHaveLength(0);
    expect(s.removeRule('x')).toBe(false);
  });
});

describe('CommandDispatcher', () => {
  it('dispatches valid, rejects invalid, killSwitch', () => {
    const reg = new RobotRegistry();
    reg.register(bot({ status: 'active', capabilities: ['patrol'] }));
    const d = new CommandDispatcher(reg, new RobotSafety(reg));
    expect(d.dispatch({ robotId: 'r1', action: 'patrol', params: {}, timestamp: 1 })).toBe(true);
    expect(d.getHistory('r1')).toHaveLength(1);
    expect(d.dispatch({ robotId: 'x', action: 'y', params: {}, timestamp: 2 })).toBe(false);
    d.killSwitch();
    expect(reg.getStatus('r1')).toBe('stopped');
  });

  it('batch dispatch returns counts', () => {
    const reg = new RobotRegistry();
    reg.register(bot({ status: 'active' }));
    const d = new CommandDispatcher(reg, new RobotSafety(reg));
    const result = d.dispatchBatch([
      { robotId: 'r1', action: 'a', params: {}, timestamp: 1 },
      { robotId: 'r1', action: 'b', params: {}, timestamp: 2 },
      { robotId: 'bad', action: 'c', params: {}, timestamp: 3 },
    ]);
    expect(result.dispatched).toBe(2);
    expect(result.failed).toBe(1);
  });

  it('undo removes last command for robot', () => {
    const reg = new RobotRegistry();
    reg.register(bot({ status: 'active' }));
    const d = new CommandDispatcher(reg, new RobotSafety(reg));
    d.dispatch({ robotId: 'r1', action: 'go', params: {}, timestamp: 1 });
    d.dispatch({ robotId: 'r1', action: 'stop', params: {}, timestamp: 2 });
    const undone = d.undoLast('r1');
    expect(undone?.action).toBe('stop');
    expect(d.getHistory('r1')).toHaveLength(1);
  });

  it('killSwitch also drains attached queue', () => {
    const reg = new RobotRegistry();
    reg.register(bot({ status: 'active' }));
    const safety = new RobotSafety(reg);
    const d = new CommandDispatcher(reg, safety);
    const q = new CommandQueue();
    d.setQueue(q);
    q.enqueue({ robotId: 'r1', action: 'x', params: {}, timestamp: 1 });
    d.killSwitch();
    expect(q.size()).toBe(0);
  });
});

describe('MatterAdapter', () => {
  it('pairs and unpairs devices', () => {
    const m = new MatterAdapter();
    const dev = m.pair('d1', 'Light');
    expect(dev.pairingState).toBe('paired');
    expect(m.getPairingState('d1')).toBe('paired');
    expect(m.unpair('d1')).toBe(true);
    expect(m.getPairingState('d1')).toBeNull();
  });

  it('translates commands for paired devices', () => {
    const m = new MatterAdapter();
    m.pair('d1', 'Light');
    const result = m.translateCommand({
      robotId: 'd1',
      action: 'on',
      params: { brightness: 80 },
      timestamp: 1,
    });
    expect(result?.protocol).toBe('matter');
    expect(result?.payload).toContain('on');
  });

  it('rejects commands for unpaired devices', () => {
    const m = new MatterAdapter();
    expect(m.translateCommand({ robotId: 'x', action: 'on', params: {}, timestamp: 1 })).toBeNull();
  });

  it('tracks connection health and degrades', () => {
    const m = new MatterAdapter();
    m.pair('d1', 'Sensor');
    expect(m.getConnectionHealth('d1')).toBe(100);
    m.degradeHealth('d1', 60);
    expect(m.getConnectionHealth('d1')).toBe(40);
    expect(m.poll('d1')?.healthy).toBe(false);
    m.degradeHealth('d1', 50);
    expect(m.getPairingState('d1')).toBe('error');
  });
});

describe('CommandQueue', () => {
  it('enqueues and dequeues by priority', () => {
    const q = new CommandQueue();
    q.enqueue({ robotId: 'r1', action: 'low', params: {}, timestamp: 1, priority: 1 });
    q.enqueue({ robotId: 'r1', action: 'high', params: {}, timestamp: 2, priority: 10 });
    const entry = q.dequeue();
    expect(entry?.command.action).toBe('high');
  });

  it('deduplicates identical pending commands', () => {
    const q = new CommandQueue();
    q.enqueue({ robotId: 'r1', action: 'go', params: { x: 1 }, timestamp: 1 });
    const dup = q.enqueue({ robotId: 'r1', action: 'go', params: { x: 1 }, timestamp: 2 });
    expect(dup).toBeNull();
    expect(q.size()).toBe(1);
  });

  it('retries failed commands up to maxRetries', () => {
    const q = new CommandQueue({ maxRetries: 2 });
    q.enqueue({ robotId: 'r1', action: 'x', params: {}, timestamp: 1 });
    const entry = q.dequeue()!;
    expect(q.fail(entry.id)).toBe('retrying');
    q.dequeue();
    expect(q.fail(entry.id)).toBe('failed');
  });

  it('drain cancels all pending on kill-switch', () => {
    const q = new CommandQueue();
    q.enqueue({ robotId: 'r1', action: 'a', params: {}, timestamp: 1 });
    q.enqueue({ robotId: 'r1', action: 'b', params: {}, timestamp: 2 });
    const drained = q.drain();
    expect(drained).toBe(2);
    expect(q.size()).toBe(0);
  });

  it('rate limits per robot', () => {
    const q = new CommandQueue({ rateLimit: 2, ratePeriodMs: 60_000 });
    q.enqueue({ robotId: 'r1', action: 'a', params: {}, timestamp: 1 });
    q.enqueue({ robotId: 'r1', action: 'b', params: {}, timestamp: 2 });
    const third = q.enqueue({ robotId: 'r1', action: 'c', params: {}, timestamp: 3 });
    expect(third).toBeNull();
  });
});

describe('DeviceDiscovery', () => {
  it('scans and filters by protocol', () => {
    const dd = new DeviceDiscovery();
    dd.addDevice({
      deviceId: 'd1',
      name: 'Light',
      protocol: 'matter',
      capabilities: ['on-off'],
      lastSeen: Date.now(),
      connected: true,
    });
    dd.addDevice({
      deviceId: 'd2',
      name: 'Lock',
      protocol: 'zigbee',
      capabilities: ['lock'],
      lastSeen: Date.now(),
      connected: true,
    });
    expect(dd.scan()).toHaveLength(2);
    expect(dd.scanByProtocol('matter')).toHaveLength(1);
  });

  it('heartbeat updates lastSeen', () => {
    const dd = new DeviceDiscovery();
    const old = Date.now() - 100_000;
    dd.addDevice({
      deviceId: 'd1',
      name: 'X',
      protocol: 'wifi',
      capabilities: [],
      lastSeen: old,
      connected: true,
    });
    expect(dd.checkHealth('d1')).toBe(false);
    dd.heartbeat('d1');
    expect(dd.checkHealth('d1')).toBe(true);
  });

  it('disconnect and reconnect', () => {
    const dd = new DeviceDiscovery();
    dd.addDevice({
      deviceId: 'd1',
      name: 'X',
      protocol: 'bluetooth',
      capabilities: [],
      lastSeen: Date.now(),
      connected: true,
    });
    dd.disconnect('d1');
    expect(dd.getDevice('d1')?.connected).toBe(false);
    dd.reconnect('d1');
    expect(dd.getDevice('d1')?.connected).toBe(true);
  });

  it('reports capabilities for devices', () => {
    const dd = new DeviceDiscovery();
    dd.addDevice({
      deviceId: 'd1',
      name: 'Cam',
      protocol: 'wifi',
      capabilities: ['stream', 'pan'],
      lastSeen: Date.now(),
      connected: true,
    });
    expect(dd.getCapabilities('d1')).toEqual(['stream', 'pan']);
    expect(dd.getCapabilities('x')).toEqual([]);
  });
});
