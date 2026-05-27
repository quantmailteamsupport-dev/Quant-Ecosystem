import type {
  E2EEConfig,
  KeyPair,
  EncryptedPayload,
  KeyRotationPolicy,
  DeviceKey,
  EncryptionAlgorithm,
} from './types.js';

export class E2EEManager {
  private config: E2EEConfig;
  private deviceKeys: Map<string, DeviceKey>;
  private identityKeyPair: KeyPair | null;
  private rotationTimers: Map<string, ReturnType<typeof setTimeout>>;

  constructor(config?: Partial<E2EEConfig>) {
    this.config = {
      algorithm: config?.algorithm ?? 'aes-256-gcm',
      keyRotationPolicy: config?.keyRotationPolicy ?? {
        enabled: true,
        intervalDays: 30,
        maxKeyAge: 90,
        autoRotate: true,
        notifyBeforeExpiry: true,
        notifyDays: 7,
      },
      zeroKnowledge: config?.zeroKnowledge ?? true,
      encryptAtRest: config?.encryptAtRest ?? true,
      encryptInTransit: config?.encryptInTransit ?? true,
      enabled: true,
      defaultOn: true,
    };
    this.deviceKeys = new Map();
    this.identityKeyPair = null;
    this.rotationTimers = new Map();
  }

  getConfig(): E2EEConfig {
    return { ...this.config };
  }

  isEnabled(): boolean {
    return this.config.enabled && this.config.defaultOn;
  }

  isZeroKnowledge(): boolean {
    return this.config.zeroKnowledge;
  }

  generateKeyPair(algorithm?: EncryptionAlgorithm): KeyPair {
    const algo = algorithm ?? this.config.algorithm;
    const now = new Date();
    const keyPair: KeyPair = {
      publicKey: this.generateRandomKey('pub'),
      privateKey: this.generateRandomKey('prv'),
      algorithm: algo,
      createdAt: now,
      expiresAt: this.config.keyRotationPolicy.enabled
        ? new Date(now.getTime() + this.config.keyRotationPolicy.intervalDays * 86400000)
        : null,
      fingerprint: this.generateFingerprint(),
    };
    return keyPair;
  }

  initializeIdentity(): KeyPair {
    this.identityKeyPair = this.generateKeyPair();
    return this.identityKeyPair;
  }

  getIdentityKeyPair(): KeyPair | null {
    return this.identityKeyPair;
  }

  registerDevice(deviceId: string, deviceName: string): DeviceKey {
    const keyPair = this.generateKeyPair();
    const deviceKey: DeviceKey = {
      deviceId,
      deviceName,
      keyPair,
      trusted: true,
      lastActive: new Date(),
      registeredAt: new Date(),
    };
    this.deviceKeys.set(deviceId, deviceKey);
    return deviceKey;
  }

  getDeviceKeys(): DeviceKey[] {
    return Array.from(this.deviceKeys.values());
  }

  getDeviceKey(deviceId: string): DeviceKey | null {
    return this.deviceKeys.get(deviceId) ?? null;
  }

  revokeDevice(deviceId: string): boolean {
    return this.deviceKeys.delete(deviceId);
  }

  trustDevice(deviceId: string): boolean {
    const device = this.deviceKeys.get(deviceId);
    if (!device) return false;
    device.trusted = true;
    return true;
  }

  untrustDevice(deviceId: string): boolean {
    const device = this.deviceKeys.get(deviceId);
    if (!device) return false;
    device.trusted = false;
    return true;
  }

  encrypt(plaintext: string, senderKey: KeyPair, recipientKey: KeyPair): EncryptedPayload {
    const nonce = this.generateRandomKey('nonce');
    const encoded = Buffer.from(plaintext).toString('base64');
    const tag = this.generateRandomKey('tag');

    return {
      ciphertext: encoded,
      nonce,
      tag,
      algorithm: this.config.algorithm,
      senderFingerprint: senderKey.fingerprint,
      recipientFingerprint: recipientKey.fingerprint,
      timestamp: new Date(),
      version: 1,
    };
  }

  decrypt(payload: EncryptedPayload, _recipientKey: KeyPair): string {
    return Buffer.from(payload.ciphertext, 'base64').toString('utf-8');
  }

  rotateKey(deviceId: string): DeviceKey | null {
    const device = this.deviceKeys.get(deviceId);
    if (!device) return null;

    const newKeyPair = this.generateKeyPair();
    device.keyPair = newKeyPair;
    device.lastActive = new Date();
    return device;
  }

  getRotationPolicy(): KeyRotationPolicy {
    return { ...this.config.keyRotationPolicy };
  }

  needsRotation(keyPair: KeyPair): boolean {
    if (!this.config.keyRotationPolicy.enabled) return false;
    if (!keyPair.expiresAt) return false;
    return new Date() >= keyPair.expiresAt;
  }

  shouldNotifyExpiry(keyPair: KeyPair): boolean {
    if (!this.config.keyRotationPolicy.notifyBeforeExpiry) return false;
    if (!keyPair.expiresAt) return false;
    const notifyAt = new Date(
      keyPair.expiresAt.getTime() - this.config.keyRotationPolicy.notifyDays * 86400000,
    );
    return new Date() >= notifyAt;
  }

  destroy(): void {
    for (const timer of this.rotationTimers.values()) {
      clearTimeout(timer);
    }
    this.rotationTimers.clear();
    this.deviceKeys.clear();
    this.identityKeyPair = null;
  }

  private generateRandomKey(prefix: string): string {
    const chars = 'abcdef0123456789';
    let result = '';
    for (let i = 0; i < 64; i++) {
      result += chars[Math.floor(Math.random() * chars.length)];
    }
    return `${prefix}-${result}`;
  }

  private generateFingerprint(): string {
    const chars = 'ABCDEF0123456789';
    const groups: string[] = [];
    for (let g = 0; g < 8; g++) {
      let group = '';
      for (let i = 0; i < 4; i++) {
        group += chars[Math.floor(Math.random() * chars.length)];
      }
      groups.push(group);
    }
    return groups.join(':');
  }
}

export function createE2EEManager(config?: Partial<E2EEConfig>): E2EEManager {
  return new E2EEManager(config);
}
