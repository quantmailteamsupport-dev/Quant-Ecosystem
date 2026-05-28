import { Automation, AutomationAction, AutomationEngine } from '../index.js';

describe('AutomationEngine', () => {
  let engine: AutomationEngine;
  let firedActions: AutomationAction[];

  const automation: Automation = {
    id: 'auto-1',
    name: 'Night Mode',
    enabled: true,
    triggers: [{ type: 'time', config: { hour: 22 } }],
    conditions: [{ type: 'time_range', config: { start: 20, end: 24, current: 22 } }],
    actions: [{ type: 'control_device', config: { deviceId: 'light-1', command: 'dim' } }],
  };

  beforeEach(() => {
    firedActions = [];
    engine = new AutomationEngine((action) => firedActions.push(action));
  });

  it('adds and retrieves an automation', () => {
    engine.addAutomation(automation);
    expect(engine.getAutomation('auto-1')).toEqual(automation);
  });

  it('removes an automation', () => {
    engine.addAutomation(automation);
    expect(engine.removeAutomation('auto-1')).toBe(true);
    expect(engine.getAutomation('auto-1')).toBeUndefined();
  });

  it('enables and disables an automation', () => {
    engine.addAutomation({ ...automation, enabled: false });
    engine.enableAutomation('auto-1');
    expect(engine.getAutomation('auto-1')!.enabled).toBe(true);
    engine.disableAutomation('auto-1');
    expect(engine.getAutomation('auto-1')!.enabled).toBe(false);
  });

  it('evaluateTrigger fires matching automations', () => {
    engine.addAutomation(automation);
    const fired = engine.evaluateTrigger({ type: 'time', config: { hour: 22 } });
    expect(fired).toEqual(['auto-1']);
    expect(firedActions).toHaveLength(1);
    expect(firedActions[0]!.type).toBe('control_device');
  });

  it('does not fire disabled automations', () => {
    engine.addAutomation({ ...automation, enabled: false });
    const fired = engine.evaluateTrigger({ type: 'time', config: {} });
    expect(fired).toHaveLength(0);
    expect(firedActions).toHaveLength(0);
  });

  it('does not fire when conditions are not met', () => {
    engine.addAutomation({
      ...automation,
      conditions: [{ type: 'time_range', config: { start: 8, end: 10, current: 22 } }],
    });
    const fired = engine.evaluateTrigger({ type: 'time', config: {} });
    expect(fired).toHaveLength(0);
  });

  it('does not fire when trigger type does not match', () => {
    engine.addAutomation(automation);
    const fired = engine.evaluateTrigger({ type: 'sensor', config: {} });
    expect(fired).toHaveLength(0);
  });

  it('lists all automations', () => {
    engine.addAutomation(automation);
    expect(engine.listAutomations()).toHaveLength(1);
  });
});
