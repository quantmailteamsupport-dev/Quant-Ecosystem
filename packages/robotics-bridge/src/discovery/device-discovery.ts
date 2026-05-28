import type { DeviceProtocol, DiscoveryResult } from '../types.js';

export class DeviceDiscovery {
  private devices = new Map<string, DiscoveryResult>();
  private heartbeatIntervalMs = 30_000;

  addDevice(device: DiscoveryResult): void {
    this.devices.set(device.deviceId, device);
  }

  scan(): DiscoveryResult[] {
    return [...this.devices.values()];
  }

  scanByProtocol(protocol: DeviceProtocol): DiscoveryResult[] {
    return [...this.devices.values()].filter((d) => d.protocol === protocol);
  }

  getDevice(deviceId: string): DiscoveryResult | null {
    return this.devices.get(deviceId) ?? null;
  }

  heartbeat(deviceId: string, now = Date.now()): boolean {
    const device = this.devices.get(deviceId);
    if (!device) return false;
    device.lastSeen = now;
    device.connected = true;
    return true;
  }

  checkHealth(deviceId: string, now = Date.now()): boolean {
    const device = this.devices.get(deviceId);
    if (!device) return false;
    return now - device.lastSeen < this.heartbeatIntervalMs;
  }

  getStaleDevices(now = Date.now()): DiscoveryResult[] {
    return [...this.devices.values()].filter((d) => now - d.lastSeen >= this.heartbeatIntervalMs);
  }

  disconnect(deviceId: string): boolean {
    const device = this.devices.get(deviceId);
    if (!device) return false;
    device.connected = false;
    return true;
  }

  reconnect(deviceId: string): boolean {
    const device = this.devices.get(deviceId);
    if (!device) return false;
    device.connected = true;
    device.lastSeen = Date.now();
    return true;
  }

  removeDevice(deviceId: string): boolean {
    return this.devices.delete(deviceId);
  }

  getCapabilities(deviceId: string): string[] {
    return this.devices.get(deviceId)?.capabilities ?? [];
  }
}
