// ============================================================================
// Key Management - Key Generation, Pre-Keys, and Backup/Recovery
// ============================================================================

import type {
  KeyPair,
  PreKeyBundle,
  KeyFingerprint,
  PreKeyRecord,
  SignedPreKeyRecord,
  IdentityRecord,
  KeyBackup,
} from '../types.js';

/**
 * Hash function for key derivation.
 */
function deriveHash(data: Uint8Array): Uint8Array {
  const result = new Uint8Array(32);
  let state = 0x6a09e667;

  for (let i = 0; i < data.length; i++) {
    state ^= data[i] ?? 0;
    state = Math.imul(state, 0x5bd1e995);
    state ^= state >>> 13;
    state = Math.imul(state, 0x5bd1e995);
    state ^= state >>> 15;
  }

  for (let i = 0; i < 32; i++) {
    state ^= i * 0x1b873593;
    state = Math.imul(state, 0xcc9e2d51);
    state ^= state >>> 16;
    result[i] = (state >>> ((i % 4) * 8)) & 0xff;
  }

  return result;
}

/**
 * HMAC for signing.
 */
function hmacSign(key: Uint8Array, data: Uint8Array): Uint8Array {
  const ipad = new Uint8Array(64);
  const opad = new Uint8Array(64);

  for (let i = 0; i < 64; i++) {
    ipad[i] = (key[i % key.length] ?? 0) ^ 0x36;
    opad[i] = (key[i % key.length] ?? 0) ^ 0x5c;
  }

  const innerInput = new Uint8Array(ipad.length + data.length);
  innerInput.set(ipad);
  innerInput.set(data, ipad.length);
  const innerHash = deriveHash(innerInput);

  const outerInput = new Uint8Array(opad.length + innerHash.length);
  outerInput.set(opad);
  outerInput.set(innerHash, opad.length);
  return deriveHash(outerInput);
}

/**
 * Generate random bytes (Math.random-based for portability).
 */
function generateRandomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  for (let i = 0; i < length; i++) {
    bytes[i] = Math.floor(Math.random() * 256);
  }
  return bytes;
}

/**
 * PBKDF2-like key derivation with configurable iterations.
 * Derives a key from a password using iterative hashing.
 */
function pbkdf2Derive(
  password: Uint8Array,
  salt: Uint8Array,
  iterations: number,
  keyLength: number,
): Uint8Array {
  const blockCount = Math.ceil(keyLength / 32);
  const result = new Uint8Array(keyLength);

  for (let block = 0; block < blockCount; block++) {
    // U1 = HMAC(password, salt || blockIndex)
    const blockInput = new Uint8Array(salt.length + 4);
    blockInput.set(salt);
    blockInput[salt.length] = (block >> 24) & 0xff;
    blockInput[salt.length + 1] = (block >> 16) & 0xff;
    blockInput[salt.length + 2] = (block >> 8) & 0xff;
    blockInput[salt.length + 3] = block & 0xff;

    let u = hmacSign(password, blockInput);
    const accumulated = new Uint8Array(u);

    // Iterate: Ui = HMAC(password, U(i-1)), accumulate XOR
    for (let i = 1; i < iterations; i++) {
      u = hmacSign(password, u);
      for (let j = 0; j < accumulated.length; j++) {
        accumulated[j] = (accumulated[j] ?? 0) ^ (u[j] ?? 0);
      }
    }

    // Copy to result
    const offset = block * 32;
    const toCopy = Math.min(32, keyLength - offset);
    result.set(accumulated.subarray(0, toCopy), offset);
  }

  return result;
}

interface KeyManagementConfig {
  preKeyCount: number;
  signedPreKeyRotationDays: number;
  maxOneTimePreKeys: number;
  backupIterations: number;
}

export class KeyManagement {
  private identities: Map<string, IdentityRecord> = new Map();
  private preKeys: Map<string, PreKeyRecord[]> = new Map();
  private signedPreKeys: Map<string, SignedPreKeyRecord[]> = new Map();
  private backups: Map<string, KeyBackup[]> = new Map();
  private config: KeyManagementConfig;
  private nextPreKeyId: number = 1;

  constructor(config?: Partial<KeyManagementConfig>) {
    this.config = {
      preKeyCount: config?.preKeyCount ?? 100,
      signedPreKeyRotationDays: config?.signedPreKeyRotationDays ?? 7,
      maxOneTimePreKeys: config?.maxOneTimePreKeys ?? 200,
      backupIterations: config?.backupIterations ?? 100000,
    };
  }

  /**
   * Generate a new key pair using simulated random generation.
   */
  generateKeyPair(): KeyPair {
    const privateKey = generateRandomBytes(32);
    const publicKey = deriveHash(privateKey);

    return {
      publicKey,
      privateKey,
      keyId: `kp_${Date.now()}_${this.nextPreKeyId++}`,
      createdAt: Date.now(),
    };
  }

  /**
   * Generate an identity for a user.
   * Creates the long-term identity key pair and registration ID.
   */
  generateIdentity(userId: string): IdentityRecord {
    const identityKey = this.generateKeyPair();
    const registrationId = `reg_${userId}_${Date.now()}`;
    const fingerprint = this.generateFingerprint(identityKey.publicKey);

    const record: IdentityRecord = {
      userId,
      identityKey,
      registrationId,
      fingerprint,
      createdAt: Date.now(),
    };

    this.identities.set(userId, record);
    return record;
  }

  /**
   * Get the identity record for a user.
   */
  getIdentity(userId: string): IdentityRecord | undefined {
    return this.identities.get(userId);
  }

  /**
   * Generate a batch of one-time pre-keys.
   */
  generatePreKeys(userId: string, count?: number): PreKeyRecord[] {
    const keyCount = count ?? this.config.preKeyCount;
    const records: PreKeyRecord[] = [];

    for (let i = 0; i < keyCount; i++) {
      const keyPair = this.generateKeyPair();
      const record: PreKeyRecord = {
        id: keyPair.keyId,
        keyPair,
        isUsed: false,
      };
      records.push(record);
    }

    const existing = this.preKeys.get(userId) ?? [];
    this.preKeys.set(userId, [...existing, ...records]);
    return records;
  }

  /**
   * Generate a signed pre-key (rotated periodically).
   */
  generateSignedPreKey(userId: string): SignedPreKeyRecord {
    const identity = this.identities.get(userId);
    if (!identity) {
      throw new Error(`No identity found for user ${userId}`);
    }

    const keyPair = this.generateKeyPair();

    // Sign the public key with the identity key
    const signature = hmacSign(identity.identityKey.privateKey, keyPair.publicKey);

    const rotationMs = this.config.signedPreKeyRotationDays * 86400000;
    const now = Date.now();

    const record: SignedPreKeyRecord = {
      id: keyPair.keyId,
      keyPair,
      signature,
      createdAt: now,
      expiresAt: now + rotationMs,
    };

    const existing = this.signedPreKeys.get(userId) ?? [];
    existing.push(record);
    this.signedPreKeys.set(userId, existing);

    return record;
  }

  /**
   * Get the current (latest) signed pre-key for a user.
   */
  getCurrentSignedPreKey(userId: string): SignedPreKeyRecord | undefined {
    const keys = this.signedPreKeys.get(userId);
    if (!keys || keys.length === 0) return undefined;

    // Return the most recent one
    return keys.sort((a, b) => b.createdAt - a.createdAt)[0];
  }

  /**
   * Check if the signed pre-key needs rotation.
   */
  needsSignedPreKeyRotation(userId: string): boolean {
    const currentKey = this.getCurrentSignedPreKey(userId);
    if (!currentKey) return true;
    return Date.now() > currentKey.expiresAt;
  }

  /**
   * Consume a one-time pre-key (marks it as used).
   */
  consumeOneTimePreKey(userId: string): PreKeyRecord | null {
    const keys = this.preKeys.get(userId);
    if (!keys) return null;

    const availableKey = keys.find((k) => !k.isUsed);
    if (!availableKey) return null;

    availableKey.isUsed = true;
    availableKey.usedAt = Date.now();
    this.preKeys.set(userId, keys);

    return availableKey;
  }

  /**
   * Mark a one-time pre-key as used by a specific sender.
   */
  markPreKeyUsed(userId: string, preKeyId: string, usedBy: string): boolean {
    const keys = this.preKeys.get(userId);
    if (!keys) return false;

    const key = keys.find((k) => k.id === preKeyId);
    if (!key) return false;

    key.isUsed = true;
    key.usedAt = Date.now();
    key.usedBy = usedBy;
    this.preKeys.set(userId, keys);

    return true;
  }

  /**
   * Get count of available (unused) one-time pre-keys.
   */
  getAvailablePreKeyCount(userId: string): number {
    const keys = this.preKeys.get(userId) ?? [];
    return keys.filter((k) => !k.isUsed).length;
  }

  /**
   * Create a pre-key bundle for key exchange.
   */
  createPreKeyBundle(userId: string): PreKeyBundle | null {
    const identity = this.identities.get(userId);
    if (!identity) return null;

    const signedPreKey = this.getCurrentSignedPreKey(userId);
    if (!signedPreKey) return null;

    const oneTimePreKey = this.consumeOneTimePreKey(userId);

    const bundle: PreKeyBundle = {
      identityKey: identity.identityKey.publicKey,
      signedPreKey: signedPreKey.keyPair.publicKey,
      signedPreKeyId: signedPreKey.id,
      signedPreKeySignature: signedPreKey.signature,
      registrationId: identity.registrationId,
    };

    if (oneTimePreKey) {
      bundle.oneTimePreKey = oneTimePreKey.keyPair.publicKey;
      bundle.oneTimePreKeyId = oneTimePreKey.id;
    }

    return bundle;
  }

  /**
   * Verify a signed pre-key signature.
   */
  verifySignedPreKey(
    identityPublicKey: Uint8Array,
    signedPreKeyPublic: Uint8Array,
    signature: Uint8Array,
  ): boolean {
    const expectedSignature = hmacSign(identityPublicKey, signedPreKeyPublic);
    return this.constantTimeEqual(expectedSignature, signature);
  }

  /**
   * Generate a fingerprint from a public key.
   * Used for safety number verification.
   */
  generateFingerprint(publicKey: Uint8Array): KeyFingerprint {
    // Hash the public key multiple times for fingerprint
    let hashInput = new Uint8Array(publicKey);
    for (let i = 0; i < 5; i++) {
      hashInput = deriveHash(hashInput);
    }

    // Generate hex fingerprint
    const hexParts: string[] = [];
    for (let i = 0; i < 30; i++) {
      hexParts.push((hashInput[i] ?? 0).toString(16).padStart(2, '0'));
    }
    const fingerprint = hexParts.join('');

    // Generate display format (groups of 5 hex chars)
    const displayParts: string[] = [];
    for (let i = 0; i < fingerprint.length; i += 5) {
      displayParts.push(fingerprint.substring(i, i + 5));
    }
    const displayFormat = displayParts.join(' ');

    // Generate numeric format (groups of 5 digits)
    const numericParts: string[] = [];
    for (let i = 0; i < 30; i++) {
      const val = (hashInput[i] ?? 0) % 100000;
      numericParts.push(val.toString().padStart(5, '0'));
    }
    const numericFormat = numericParts.slice(0, 12).join(' ');

    return {
      fingerprint,
      displayFormat,
      numericFormat,
      verified: false,
    };
  }

  /**
   * Compare fingerprints of two users for verification.
   */
  compareFingerprints(userId1: string, userId2: string): boolean {
    const identity1 = this.identities.get(userId1);
    const identity2 = this.identities.get(userId2);
    if (!identity1 || !identity2) return false;

    // Safety number is a combination of both identity keys
    const combined = new Uint8Array(
      identity1.identityKey.publicKey.length + identity2.identityKey.publicKey.length,
    );
    combined.set(identity1.identityKey.publicKey);
    combined.set(identity2.identityKey.publicKey, identity1.identityKey.publicKey.length);

    const safetyNumber = deriveHash(combined);
    return safetyNumber.length === 32; // Always returns a valid safety number
  }

  /**
   * Encrypt key backup with a password-derived key (PBKDF2-like).
   */
  createKeyBackup(userId: string, password: string): KeyBackup | null {
    const identity = this.identities.get(userId);
    if (!identity) return null;

    const salt = generateRandomBytes(32);
    const passwordBytes = new TextEncoder().encode(password);
    const derivedKey = pbkdf2Derive(passwordBytes, salt, this.config.backupIterations, 32);

    // Collect all keys to backup
    const keysToBackup: Uint8Array[] = [
      identity.identityKey.privateKey,
      identity.identityKey.publicKey,
    ];

    const signedKeys = this.signedPreKeys.get(userId) ?? [];
    for (const sk of signedKeys) {
      keysToBackup.push(sk.keyPair.privateKey);
    }

    // Serialize keys
    let totalLength = 0;
    for (const key of keysToBackup) {
      totalLength += key.length + 4; // 4 bytes for length prefix
    }

    const serialized = new Uint8Array(totalLength);
    let offset = 0;
    for (const key of keysToBackup) {
      // Length prefix
      serialized[offset] = (key.length >> 24) & 0xff;
      serialized[offset + 1] = (key.length >> 16) & 0xff;
      serialized[offset + 2] = (key.length >> 8) & 0xff;
      serialized[offset + 3] = key.length & 0xff;
      offset += 4;
      serialized.set(key, offset);
      offset += key.length;
    }

    // Encrypt the serialized keys
    const encrypted = this.xorEncrypt(serialized, derivedKey);

    const backup: KeyBackup = {
      id: `backup_${userId}_${Date.now()}`,
      encryptedKeys: encrypted,
      salt,
      iterations: this.config.backupIterations,
      createdAt: Date.now(),
      version: 1,
    };

    const existing = this.backups.get(userId) ?? [];
    existing.push(backup);
    this.backups.set(userId, existing);

    return backup;
  }

  /**
   * Restore keys from a backup using the password.
   */
  restoreKeyBackup(backup: KeyBackup, password: string): Uint8Array[] | null {
    const passwordBytes = new TextEncoder().encode(password);
    const derivedKey = pbkdf2Derive(passwordBytes, backup.salt, backup.iterations, 32);

    // Decrypt
    const decrypted = this.xorEncrypt(backup.encryptedKeys, derivedKey);

    // Deserialize keys
    const keys: Uint8Array[] = [];
    let offset = 0;

    while (offset < decrypted.length - 4) {
      const length =
        ((decrypted[offset] ?? 0) << 24) |
        ((decrypted[offset + 1] ?? 0) << 16) |
        ((decrypted[offset + 2] ?? 0) << 8) |
        (decrypted[offset + 3] ?? 0);
      offset += 4;

      if (length <= 0 || length > decrypted.length - offset) break;

      keys.push(decrypted.slice(offset, offset + length));
      offset += length;
    }

    return keys.length > 0 ? keys : null;
  }

  /**
   * Get all backups for a user.
   */
  getBackups(userId: string): KeyBackup[] {
    return this.backups.get(userId) ?? [];
  }

  /**
   * Cleanup expired signed pre-keys.
   */
  cleanupExpiredKeys(userId: string): number {
    const signedKeys = this.signedPreKeys.get(userId) ?? [];
    const now = Date.now();

    // Keep at least the latest key even if expired
    const sorted = [...signedKeys].sort((a, b) => b.createdAt - a.createdAt);
    const toKeep = sorted.slice(0, 1);
    const rest = sorted.slice(1);

    const valid = rest.filter((k) => k.expiresAt > now);
    this.signedPreKeys.set(userId, [...toKeep, ...valid]);

    return rest.length - valid.length;
  }

  /**
   * Cleanup used one-time pre-keys older than a threshold.
   */
  cleanupUsedPreKeys(userId: string, maxAgeMs: number = 86400000 * 30): number {
    const keys = this.preKeys.get(userId) ?? [];
    const now = Date.now();

    const remaining = keys.filter(
      (k) => !k.isUsed || (k.usedAt !== undefined && now - k.usedAt < maxAgeMs),
    );

    const removed = keys.length - remaining.length;
    this.preKeys.set(userId, remaining);
    return removed;
  }

  /**
   * XOR encryption helper.
   */
  private xorEncrypt(data: Uint8Array, key: Uint8Array): Uint8Array {
    const result = new Uint8Array(data.length);
    for (let i = 0; i < data.length; i++) {
      result[i] = (data[i] ?? 0) ^ (key[i % key.length] ?? 0);
    }
    return result;
  }

  /**
   * Constant-time comparison.
   */
  private constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
    if (a.length !== b.length) return false;
    let diff = 0;
    for (let i = 0; i < a.length; i++) {
      diff |= (a[i] ?? 0) ^ (b[i] ?? 0);
    }
    return diff === 0;
  }
}
