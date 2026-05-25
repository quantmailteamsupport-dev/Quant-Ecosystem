// ============================================================================
// QuantMail - PGP Encryption Service
// Key generation, encryption, decryption, signing, verification
// ============================================================================

interface PGPKeyPair {
  keyId: string;
  userId: string;
  email: string;
  publicKey: string;
  privateKey: string;
  fingerprint: string;
  algorithm: string;
  keySize: number;
  createdAt: Date;
  expiresAt: Date | null;
  isRevoked: boolean;
}

interface KeyRingEntry {
  keyId: string;
  email: string;
  publicKey: string;
  fingerprint: string;
  trust: 'unknown' | 'marginal' | 'full' | 'ultimate';
  importedAt: Date;
}

interface EncryptedMessage {
  ciphertext: string;
  recipientKeyId: string;
  senderKeyId: string;
  algorithm: string;
  timestamp: Date;
}

interface SignatureResult {
  signature: string;
  keyId: string;
  timestamp: Date;
  algorithm: string;
}

interface VerificationResult {
  valid: boolean;
  signerKeyId: string;
  signerEmail: string;
  signedAt: Date;
  reason?: string;
}

export class PGPService {
  private keyPairs: Map<string, PGPKeyPair> = new Map();
  private keyRings: Map<string, Map<string, KeyRingEntry>> = new Map();
  private userKeyIndex: Map<string, string[]> = new Map();

  async generateKeyPair(userId: string, email: string, options?: {
    algorithm?: string;
    keySize?: number;
    expiresInDays?: number;
    passphrase?: string;
  }): Promise<PGPKeyPair> {
    const algorithm = options?.algorithm || 'RSA';
    const keySize = options?.keySize || 4096;
    const keyId = `key_${Date.now()}_${this.randomHex(8)}`;
    const fingerprint = this.generateFingerprint();

    const publicKey = this.generateMockKey('PUBLIC', email, keySize);
    const privateKey = this.generateMockKey('PRIVATE', email, keySize);

    const expiresAt = options?.expiresInDays
      ? new Date(Date.now() + options.expiresInDays * 86400000)
      : null;

    const keyPair: PGPKeyPair = {
      keyId,
      userId,
      email,
      publicKey,
      privateKey,
      fingerprint,
      algorithm,
      keySize,
      createdAt: new Date(),
      expiresAt,
      isRevoked: false,
    };

    this.keyPairs.set(keyId, keyPair);
    const userKeys = this.userKeyIndex.get(userId) || [];
    userKeys.push(keyId);
    this.userKeyIndex.set(userId, userKeys);

    // Auto-add to own keyring
    await this.addToKeyRing(userId, {
      keyId,
      email,
      publicKey,
      fingerprint,
      trust: 'ultimate',
      importedAt: new Date(),
    });

    return keyPair;
  }

  async importPublicKey(userId: string, publicKeyArmored: string): Promise<KeyRingEntry> {
    const emailMatch = publicKeyArmored.match(/<([^>]+)>/);
    const email = emailMatch ? emailMatch[1] : 'unknown@unknown.com';
    const keyId = `imported_${Date.now()}_${this.randomHex(6)}`;
    const fingerprint = this.generateFingerprint();

    const entry: KeyRingEntry = {
      keyId,
      email,
      publicKey: publicKeyArmored,
      fingerprint,
      trust: 'unknown',
      importedAt: new Date(),
    };

    await this.addToKeyRing(userId, entry);
    return entry;
  }

  async exportPublicKey(keyId: string, userId: string): Promise<string> {
    const keyPair = this.keyPairs.get(keyId);
    if (!keyPair) throw new Error('Key not found');
    if (keyPair.userId !== userId) throw new Error('Access denied');
    if (keyPair.isRevoked) throw new Error('Key has been revoked');

    return keyPair.publicKey;
  }

  async encrypt(message: string, recipientKeyId: string, senderKeyId: string): Promise<EncryptedMessage> {
    const recipientEntry = this.findKeyInAnyRing(recipientKeyId);
    if (!recipientEntry) throw new Error('Recipient key not found in keyring');

    const senderKey = this.keyPairs.get(senderKeyId);
    if (!senderKey) throw new Error('Sender key not found');
    if (senderKey.isRevoked) throw new Error('Sender key is revoked');

    const encoded = Buffer.from(message, 'utf-8').toString('base64');
    const seed = this.hashString(recipientEntry.publicKey + senderKey.privateKey);
    const ciphertext = `-----BEGIN PGP MESSAGE-----\nVersion: QuantMail PGP v1.0\n\nhQEMA${seed}${encoded}\n-----END PGP MESSAGE-----`;

    return {
      ciphertext,
      recipientKeyId,
      senderKeyId,
      algorithm: 'RSA/AES-256',
      timestamp: new Date(),
    };
  }

  async decrypt(ciphertext: string, privateKeyId: string): Promise<string> {
    const keyPair = this.keyPairs.get(privateKeyId);
    if (!keyPair) throw new Error('Private key not found');
    if (keyPair.isRevoked) throw new Error('Key has been revoked');

    const lines = ciphertext.split('\n');
    const dataLine = lines.find(l => l.startsWith('hQEMA'));
    if (!dataLine) throw new Error('Invalid PGP message format');

    const seed = this.hashString(keyPair.publicKey + keyPair.privateKey);
    const encoded = dataLine.substring(5 + seed.length);

    try {
      return Buffer.from(encoded, 'base64').toString('utf-8');
    } catch {
      throw new Error('Decryption failed - invalid key or corrupted message');
    }
  }

  async sign(message: string, privateKeyId: string): Promise<SignatureResult> {
    const keyPair = this.keyPairs.get(privateKeyId);
    if (!keyPair) throw new Error('Private key not found');
    if (keyPair.isRevoked) throw new Error('Key has been revoked');
    if (keyPair.expiresAt && keyPair.expiresAt < new Date()) {
      throw new Error('Key has expired');
    }

    const messageHash = this.hashString(message);
    const keyHash = this.hashString(keyPair.privateKey);
    const signature = `-----BEGIN PGP SIGNATURE-----\nVersion: QuantMail PGP v1.0\n\niQEzBAEB${messageHash}${keyHash}\n-----END PGP SIGNATURE-----`;

    return {
      signature,
      keyId: privateKeyId,
      timestamp: new Date(),
      algorithm: 'RSA-SHA256',
    };
  }

  async verify(message: string, signature: string, publicKeyId: string): Promise<VerificationResult> {
    const entry = this.findKeyInAnyRing(publicKeyId);
    if (!entry) {
      return { valid: false, signerKeyId: publicKeyId, signerEmail: '', signedAt: new Date(), reason: 'Public key not found' };
    }

    const keyPair = this.keyPairs.get(publicKeyId);
    if (!keyPair) {
      return { valid: false, signerKeyId: publicKeyId, signerEmail: entry.email, signedAt: new Date(), reason: 'Cannot verify - key data unavailable' };
    }
    if (keyPair.isRevoked) {
      return { valid: false, signerKeyId: publicKeyId, signerEmail: entry.email, signedAt: new Date(), reason: 'Key has been revoked' };
    }

    const messageHash = this.hashString(message);
    const keyHash = this.hashString(keyPair.privateKey);
    const expectedSig = `iQEzBAEB${messageHash}${keyHash}`;
    const sigLines = signature.split('\n');
    const sigData = sigLines.find(l => l.startsWith('iQEzBAEB')) || '';
    const valid = sigData === expectedSig;

    return { valid, signerKeyId: publicKeyId, signerEmail: entry.email, signedAt: new Date() };
  }

  async getKeyRing(userId: string): Promise<KeyRingEntry[]> {
    const ring = this.keyRings.get(userId);
    if (!ring) return [];
    return Array.from(ring.values());
  }

  async revokeKey(keyId: string, userId: string): Promise<void> {
    const keyPair = this.keyPairs.get(keyId);
    if (!keyPair) throw new Error('Key not found');
    if (keyPair.userId !== userId) throw new Error('Access denied');

    keyPair.isRevoked = true;
  }

  async getKeyFingerprint(keyId: string): Promise<string> {
    const keyPair = this.keyPairs.get(keyId);
    if (keyPair) return keyPair.fingerprint;

    for (const ring of this.keyRings.values()) {
      const entry = ring.get(keyId);
      if (entry) return entry.fingerprint;
    }

    throw new Error('Key not found');
  }

  async setTrustLevel(userId: string, keyId: string, trust: KeyRingEntry['trust']): Promise<void> {
    const ring = this.keyRings.get(userId);
    if (!ring) throw new Error('Keyring not found');
    const entry = ring.get(keyId);
    if (!entry) throw new Error('Key not in keyring');
    entry.trust = trust;
  }

  private async addToKeyRing(userId: string, entry: KeyRingEntry): Promise<void> {
    let ring = this.keyRings.get(userId);
    if (!ring) {
      ring = new Map();
      this.keyRings.set(userId, ring);
    }
    ring.set(entry.keyId, entry);
  }

  private findKeyInAnyRing(keyId: string): KeyRingEntry | null {
    for (const ring of this.keyRings.values()) {
      const entry = ring.get(keyId);
      if (entry) return entry;
    }
    return null;
  }

  private generateFingerprint(): string {
    const segments: string[] = [];
    for (let i = 0; i < 10; i++) {
      segments.push(this.randomHex(4).toUpperCase());
    }
    return segments.join(' ');
  }

  private generateMockKey(type: string, email: string, keySize: number): string {
    const header = `-----BEGIN PGP ${type} KEY BLOCK-----`;
    const footer = `-----END PGP ${type} KEY BLOCK-----`;
    const version = 'Version: QuantMail PGP v1.0';
    const comment = `Comment: ${email} (${keySize}-bit)`;
    const body = this.randomHex(128);
    return `${header}\n${version}\n${comment}\n\n${body}\n${footer}`;
  }

  private randomHex(length: number): string {
    const chars = '0123456789abcdef';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars[Math.floor(Math.random() * chars.length)];
    }
    return result;
  }

  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }
}

export const pgpService = new PGPService();
