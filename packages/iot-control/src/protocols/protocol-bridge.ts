import { DeviceCategory, DeviceStatus, IoTDevice, IoTProtocol } from '../types.js';

export interface IProtocolBridge {
  discover(): Promise<IoTDevice[]>;
  control(deviceId: string, command: string, params?: Record<string, unknown>): Promise<boolean>;
  getState(deviceId: string): Promise<Record<string, unknown>>;
}

export class MockBridge implements IProtocolBridge {
  constructor(private protocol: IoTProtocol) {}

  async discover(): Promise<IoTDevice[]> {
    return [
      {
        id: `mock-${this.protocol}-1`,
        name: `Mock ${this.protocol} device`,
        protocol: this.protocol,
        category: DeviceCategory.light,
        roomId: null,
        status: DeviceStatus.online,
        properties: { brightness: 100 },
        lastSeen: Date.now(),
      },
    ];
  }

  async control(
    _deviceId: string,
    _command: string,
    _params?: Record<string, unknown>,
  ): Promise<boolean> {
    return true;
  }

  async getState(_deviceId: string): Promise<Record<string, unknown>> {
    return { power: true, brightness: 80 };
  }
}

export class ProtocolBridgeManager {
  private bridges = new Map<IoTProtocol, IProtocolBridge>();

  registerBridge(protocol: IoTProtocol, bridge: IProtocolBridge): void {
    this.bridges.set(protocol, bridge);
  }

  getBridge(protocol: IoTProtocol): IProtocolBridge | undefined {
    return this.bridges.get(protocol);
  }

  async discoverAll(): Promise<IoTDevice[]> {
    const results: IoTDevice[] = [];
    for (const bridge of this.bridges.values()) {
      const devices = await bridge.discover();
      results.push(...devices);
    }
    return results;
  }

  async controlDevice(
    protocol: IoTProtocol,
    deviceId: string,
    command: string,
    params?: Record<string, unknown>,
  ): Promise<boolean> {
    const bridge = this.bridges.get(protocol);
    if (!bridge) return false;
    return bridge.control(deviceId, command, params);
  }
}
