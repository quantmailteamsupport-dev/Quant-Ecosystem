import type { RobotCommand } from '../types.js';

type PairingState = 'unpaired' | 'pairing' | 'paired' | 'error';

interface MatterDevice {
  id: string;
  name: string;
  pairingState: PairingState;
  lastPollAt: number;
  healthScore: number;
}

export class MatterAdapter {
  private devices = new Map<string, MatterDevice>();

  pair(deviceId: string, name: string): MatterDevice {
    const device: MatterDevice = {
      id: deviceId,
      name,
      pairingState: 'pairing',
      lastPollAt: Date.now(),
      healthScore: 100,
    };
    this.devices.set(deviceId, device);
    device.pairingState = 'paired';
    return device;
  }

  unpair(deviceId: string): boolean {
    const device = this.devices.get(deviceId);
    if (!device) return false;
    device.pairingState = 'unpaired';
    this.devices.delete(deviceId);
    return true;
  }

  getPairingState(deviceId: string): PairingState | null {
    return this.devices.get(deviceId)?.pairingState ?? null;
  }

  translateCommand(cmd: RobotCommand): { protocol: 'matter'; payload: string } | null {
    const device = this.devices.get(cmd.robotId);
    if (!device || device.pairingState !== 'paired') return null;
    return {
      protocol: 'matter',
      payload: JSON.stringify({ action: cmd.action, params: cmd.params }),
    };
  }

  poll(deviceId: string): { healthy: boolean; score: number } | null {
    const device = this.devices.get(deviceId);
    if (!device) return null;
    device.lastPollAt = Date.now();
    return { healthy: device.healthScore > 50, score: device.healthScore };
  }

  degradeHealth(deviceId: string, amount: number): boolean {
    const device = this.devices.get(deviceId);
    if (!device) return false;
    device.healthScore = Math.max(0, device.healthScore - amount);
    if (device.healthScore <= 0) {
      device.pairingState = 'error';
    }
    return true;
  }

  getConnectionHealth(deviceId: string): number {
    return this.devices.get(deviceId)?.healthScore ?? 0;
  }

  getDevice(deviceId: string): MatterDevice | null {
    return this.devices.get(deviceId) ?? null;
  }
}
