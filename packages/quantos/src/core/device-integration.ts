// ============================================================================
// QuantOS - Device Integration
// ============================================================================

import { randomUUID } from 'node:crypto';
import type {
  DeviceCapability,
  DeviceCapabilityType,
  CameraStream,
  MicrophoneStream,
  GeoLocation,
  BiometricResult,
} from '../types';

// ============================================================================
// DeviceIntegration Class
// ============================================================================

export class DeviceIntegration {
  private capabilities: Map<DeviceCapabilityType, DeviceCapability> = new Map();

  constructor() {
    // Initialize default capabilities
    const defaultCapabilities: DeviceCapabilityType[] = [
      'camera',
      'microphone',
      'location',
      'biometric',
      'bluetooth',
      'nfc',
      'accelerometer',
    ];

    for (const type of defaultCapabilities) {
      this.capabilities.set(type, {
        type,
        available: true,
        permissionGranted: false,
      });
    }
  }

  getCapabilities(): DeviceCapability[] {
    return Array.from(this.capabilities.values());
  }

  requestPermission(capabilityType: DeviceCapabilityType): boolean {
    const capability = this.capabilities.get(capabilityType);
    if (!capability) {
      throw new Error(`Unknown capability: ${capabilityType}`);
    }

    if (!capability.available) {
      return false;
    }

    capability.permissionGranted = true;
    return true;
  }

  getCameraStream(): CameraStream {
    this.requirePermission('camera');

    return {
      id: randomUUID(),
      active: true,
      resolution: { width: 1920, height: 1080 },
    };
  }

  getMicrophoneStream(): MicrophoneStream {
    this.requirePermission('microphone');

    return {
      id: randomUUID(),
      active: true,
      sampleRate: 48000,
    };
  }

  getLocation(): GeoLocation {
    this.requirePermission('location');

    return {
      latitude: 37.7749,
      longitude: -122.4194,
      accuracy: 10,
      timestamp: Date.now(),
    };
  }

  authenticateBiometric(): BiometricResult {
    this.requirePermission('biometric');

    return {
      status: 'success',
      method: 'fingerprint',
      timestamp: Date.now(),
    };
  }

  private requirePermission(type: DeviceCapabilityType): void {
    const capability = this.capabilities.get(type);
    if (!capability) {
      throw new Error(`Unknown capability: ${type}`);
    }
    if (!capability.available) {
      throw new Error(`Capability not available: ${type}`);
    }
    if (!capability.permissionGranted) {
      throw new Error(`Permission not granted for: ${type}`);
    }
  }
}
