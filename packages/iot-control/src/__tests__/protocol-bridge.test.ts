import { IoTProtocol, MockBridge, ProtocolBridgeManager } from '../index.js';

describe('MockBridge', () => {
  const bridge = new MockBridge(IoTProtocol.mqtt);

  it('discovers devices', async () => {
    const devices = await bridge.discover();
    expect(devices).toHaveLength(1);
    expect(devices[0]!.protocol).toBe(IoTProtocol.mqtt);
  });

  it('controls a device and returns true', async () => {
    const result = await bridge.control('dev-1', 'turnOn');
    expect(result).toBe(true);
  });

  it('returns device state', async () => {
    const state = await bridge.getState('dev-1');
    expect(state).toHaveProperty('power');
    expect(state).toHaveProperty('brightness');
  });
});

describe('ProtocolBridgeManager', () => {
  let manager: ProtocolBridgeManager;

  beforeEach(() => {
    manager = new ProtocolBridgeManager();
  });

  it('registers and retrieves a bridge', () => {
    const bridge = new MockBridge(IoTProtocol.homekit);
    manager.registerBridge(IoTProtocol.homekit, bridge);
    expect(manager.getBridge(IoTProtocol.homekit)).toBe(bridge);
  });

  it('discovers from all registered bridges', async () => {
    manager.registerBridge(IoTProtocol.mqtt, new MockBridge(IoTProtocol.mqtt));
    manager.registerBridge(IoTProtocol.wifi, new MockBridge(IoTProtocol.wifi));
    const devices = await manager.discoverAll();
    expect(devices).toHaveLength(2);
  });

  it('routes control to correct bridge', async () => {
    manager.registerBridge(IoTProtocol.matter, new MockBridge(IoTProtocol.matter));
    const result = await manager.controlDevice(IoTProtocol.matter, 'dev-1', 'off');
    expect(result).toBe(true);
  });

  it('returns false for unregistered protocol', async () => {
    const result = await manager.controlDevice(IoTProtocol.mi_home, 'dev-1', 'off');
    expect(result).toBe(false);
  });
});
