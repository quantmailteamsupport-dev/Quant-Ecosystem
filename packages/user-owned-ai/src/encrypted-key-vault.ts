import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
  type CipherGCM,
  type DecipherGCM,
} from 'node:crypto';
import { z } from 'zod';
import type { EncryptedKeyEntry, KeyVaultConfig } from './types.js';

export const StoreKeySchema = z.object({
  userId: z.string().min(1),
  provider: z.string().min(1),
  apiKey: z.string().min(1),
});

const DEFAULT_CONFIG: KeyVaultConfig = {
  encryptionAlgorithm: 'aes-256-gcm',
  keyDerivationSalt: 'quant-vault-default-salt',
};

export class EncryptedKeyVault {
  private readonly config: KeyVaultConfig;
  private readonly entries: Map<string, EncryptedKeyEntry[]> = new Map();
  private readonly masterKey: Buffer;

  constructor(config: Partial<KeyVaultConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.masterKey = scryptSync(this.config.keyDerivationSalt, 'quant-salt', 32);
  }

  storeKey(userId: string, provider: string, apiKey: string): EncryptedKeyEntry {
    StoreKeySchema.parse({ userId, provider, apiKey });

    const iv = randomBytes(16);
    const cipher = createCipheriv('aes-256-gcm', this.masterKey, iv) as CipherGCM;

    let encrypted = cipher.update(apiKey, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');
    const encryptedKey = encrypted + ':' + authTag;

    const entry: EncryptedKeyEntry = {
      id: `key_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      userId,
      provider,
      encryptedKey,
      iv: iv.toString('hex'),
      algorithm: this.config.encryptionAlgorithm,
      createdAt: Date.now(),
      lastUsedAt: Date.now(),
    };

    const userEntries = this.entries.get(userId) ?? [];
    const existingIndex = userEntries.findIndex((e) => e.provider === provider);
    if (existingIndex >= 0) {
      userEntries[existingIndex] = entry;
    } else {
      userEntries.push(entry);
    }
    this.entries.set(userId, userEntries);

    return entry;
  }

  retrieveKey(userId: string, provider: string): string {
    const userEntries = this.entries.get(userId);
    if (!userEntries) throw new Error(`No keys found for user: ${userId}`);

    const entry = userEntries.find((e) => e.provider === provider);
    if (!entry) throw new Error(`No key found for provider: ${provider}`);

    const [encrypted, authTag] = entry.encryptedKey.split(':');
    if (!encrypted || !authTag) throw new Error('Invalid encrypted key format');

    const iv = Buffer.from(entry.iv, 'hex');
    const decipher = createDecipheriv('aes-256-gcm', this.masterKey, iv) as DecipherGCM;
    decipher.setAuthTag(Buffer.from(authTag, 'hex'));

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    entry.lastUsedAt = Date.now();

    return decrypted;
  }

  deleteKey(userId: string, provider: string): boolean {
    const userEntries = this.entries.get(userId);
    if (!userEntries) return false;

    const index = userEntries.findIndex((e) => e.provider === provider);
    if (index < 0) return false;

    userEntries.splice(index, 1);
    if (userEntries.length === 0) {
      this.entries.delete(userId);
    }
    return true;
  }

  listKeys(userId: string): Omit<EncryptedKeyEntry, 'encryptedKey'>[] {
    const userEntries = this.entries.get(userId) ?? [];
    return userEntries.map(({ encryptedKey: _enc, ...rest }) => rest);
  }

  rotateKey(userId: string, provider: string, newKey: string): EncryptedKeyEntry {
    this.deleteKey(userId, provider);
    return this.storeKey(userId, provider, newKey);
  }
}
