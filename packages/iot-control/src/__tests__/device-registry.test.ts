import { DeviceCategory, DeviceRegistry, DeviceStatus, IoTDevice, IoTProtocol } from '../index.js';

function makeDevice(overrides: Partial<IoTDevice> = {}): IoTDevice {
  return {
    id: 'dev-1',
    name: 'Test Light',
    protocol: IoTProtocol.mqtt,
    category: DeviceCategory.light,
    roomId: null,
    status: DeviceStatus.online,
    properties: {},
    lastSeen: Date.now(),
    ...overrides,
  };
}

describe('DeviceRegistry', () => {
  let registry: DeviceRegistry;

  beforeEach(() => {
    registry = new DeviceRegistry();
  });

  it('registers and retrieves a device', () => {
    const device = makeDevice();
    registry.registerDevice(device);
    expect(registry.getDevice('dev-1')).toBe(device);
  });

  it('removes a device', () => {
    registry.registerDevice(makeDevice());
    expect(registry.removeDevice('dev-1')).toBe(true);
    expect(registry.getDevice('dev-1')).toBeUndefined();
  });

  it('returns false when removing non-existent device', () => {
    expect(registry.removeDevice('no-such')).toBe(false);
  });

  it('discovers mock devices for a protocol', () => {
    const discovered = registry.discoverDevices(IoTProtocol.matter);
    expect(discovered).toHaveLength(1);
    expect(discovered[0]!.protocol).toBe(IoTProtocol.matter);
  });

  it('gets devices by room', () => {
    registry.registerDevice(makeDevice({ id: 'a', roomId: 'room-1' }));
    registry.registerDevice(makeDevice({ id: 'b', roomId: 'room-2' }));
    registry.registerDevice(makeDevice({ id: 'c', roomId: 'room-1' }));
    const result = registry.getDevicesByRoom('room-1');
    expect(result).toHaveLength(2);
    expect(result.map((d) => d.id).sort()).toEqual(['a', 'c']);
  });

  it('sets device status', () => {
    registry.registerDevice(makeDevice());
    registry.setDeviceStatus('dev-1', DeviceStatus.offline);
    expect(registry.getDevice('dev-1')!.status).toBe(DeviceStatus.offline);
  });

  it('updates device properties', () => {
    registry.registerDevice(makeDevice({ properties: { brightness: 50 } }));
    registry.updateDeviceProperties('dev-1', { color: 'red' });
    expect(registry.getDevice('dev-1')!.properties).toEqual({ brightness: 50, color: 'red' });
  });

  it('getAllDevices returns all registered devices', () => {
    registry.registerDevice(makeDevice({ id: 'x' }));
    registry.registerDevice(makeDevice({ id: 'y' }));
    expect(registry.getAllDevices()).toHaveLength(2);
  });
});
