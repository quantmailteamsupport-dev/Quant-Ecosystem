import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { createAppError } from '@quant/server-core';

export interface PairedDevice {
  id: string;
  userId: string;
  deviceType: string;
  serialNumber: string;
  status: 'connected' | 'disconnected';
  lastSyncAt: Date | null;
  pairedAt: Date;
}

export interface SyncResult {
  deviceId: string;
  syncedAt: Date;
  recordsImported: number;
  status: 'success' | 'partial' | 'failed';
}

export interface HeartRateData {
  userId: string;
  current: number;
  resting: number;
  max: number;
  min: number;
  history: { timestamp: Date; value: number }[];
}

export interface SpO2Data {
  userId: string;
  current: number;
  average: number;
  min: number;
  timestamp: Date;
}

export interface ECGReading {
  userId: string;
  rhythm: 'normal' | 'afib' | 'inconclusive';
  heartRate: number;
  timestamp: Date;
  waveform: number[];
}

export interface TemperatureData {
  userId: string;
  current: number;
  baseline: number;
  unit: 'celsius' | 'fahrenheit';
  timestamp: Date;
}

export const PairDeviceSchema = z.object({
  deviceType: z.string().min(1),
  serialNumber: z.string().min(1),
});

export type PairDeviceInput = z.infer<typeof PairDeviceSchema>;

export class WearableIntegrationService {
  private readonly devices = new Map<string, PairedDevice>();

  pairDevice(userId: string, deviceType: string, serialNumber: string): PairedDevice {
    PairDeviceSchema.parse({ deviceType, serialNumber });

    for (const device of this.devices.values()) {
      if (device.serialNumber === serialNumber && device.status === 'connected') {
        throw createAppError('Device already paired', 409, 'DEVICE_ALREADY_PAIRED');
      }
    }

    const device: PairedDevice = {
      id: randomUUID(),
      userId,
      deviceType,
      serialNumber,
      status: 'connected',
      lastSyncAt: null,
      pairedAt: new Date(),
    };

    this.devices.set(device.id, device);
    return device;
  }

  syncData(deviceId: string): SyncResult {
    const device = this.devices.get(deviceId);
    if (!device) {
      throw createAppError('Device not found', 404, 'DEVICE_NOT_FOUND');
    }

    if (device.status === 'disconnected') {
      throw createAppError('Device is disconnected', 400, 'DEVICE_DISCONNECTED');
    }

    device.lastSyncAt = new Date();

    return {
      deviceId,
      syncedAt: new Date(),
      recordsImported: Math.floor(Math.random() * 100) + 10,
      status: 'success',
    };
  }

  getHeartRate(userId: string): HeartRateData {
    return {
      userId,
      current: 72,
      resting: 62,
      max: 145,
      min: 55,
      history: [
        { timestamp: new Date(), value: 72 },
        { timestamp: new Date(Date.now() - 3600000), value: 68 },
        { timestamp: new Date(Date.now() - 7200000), value: 75 },
      ],
    };
  }

  getSpO2(userId: string): SpO2Data {
    return {
      userId,
      current: 98,
      average: 97,
      min: 95,
      timestamp: new Date(),
    };
  }

  getECG(userId: string): ECGReading {
    return {
      userId,
      rhythm: 'normal',
      heartRate: 72,
      timestamp: new Date(),
      waveform: Array.from({ length: 100 }, () => Math.random() * 2 - 1),
    };
  }

  getBodyTemperature(userId: string): TemperatureData {
    return {
      userId,
      current: 36.6,
      baseline: 36.5,
      unit: 'celsius',
      timestamp: new Date(),
    };
  }

  disconnectDevice(deviceId: string): void {
    const device = this.devices.get(deviceId);
    if (!device) {
      throw createAppError('Device not found', 404, 'DEVICE_NOT_FOUND');
    }

    device.status = 'disconnected';
  }

  listDevices(userId: string): PairedDevice[] {
    const results: PairedDevice[] = [];
    for (const device of this.devices.values()) {
      if (device.userId === userId) {
        results.push(device);
      }
    }
    return results;
  }
}
