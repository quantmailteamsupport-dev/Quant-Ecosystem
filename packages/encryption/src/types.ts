// ============================================================================
// Encryption - Type Definitions (Signal Protocol-Inspired)
// ============================================================================

// Key Types
export interface KeyPair {
  publicKey: Uint8Array;
  privateKey: Uint8Array;
  keyId: string;
  createdAt: number;
}

export type EncryptionAlgorithm = 'X25519-XSalsa20' | 'AES-256-GCM' | 'ChaCha20-Poly1305';

export interface EncryptedMessage {
  id: string;
  senderId: string;
  recipientId: string;
  payload: EncryptedPayload;
  timestamp: number;
  messageNumber: number;
  previousChainLength: number;
  ratchetPublicKey: Uint8Array;
}

export interface EncryptedPayload {
  ciphertext: Uint8Array;
  nonce: Uint8Array;
  tag: Uint8Array;
  algorithm: EncryptionAlgorithm;
}

export interface SessionKey {
  id: string;
  key: Uint8Array;
  createdAt: number;
  expiresAt: number;
  usageCount: number;
  maxUsage: number;
}

// Signal Protocol State
export interface SignalProtocolState {
  sessionId: string;
  rootKey: Uint8Array;
  sendingChainKey: Uint8Array;
  receivingChainKey: Uint8Array;
  sendingRatchetKey: KeyPair;
  receivingRatchetKey: Uint8Array | null;
  sendingMessageNumber: number;
  receivingMessageNumber: number;
  previousSendingChainLength: number;
  skippedMessageKeys: Map<string, Uint8Array>;
}

export interface PreKeyBundle {
  identityKey: Uint8Array;
  signedPreKey: Uint8Array;
  signedPreKeyId: string;
  signedPreKeySignature: Uint8Array;
  oneTimePreKey?: Uint8Array;
  oneTimePreKeyId?: string;
  registrationId: string;
}

export interface MessageKey {
  key: Uint8Array;
  messageNumber: number;
  chainIndex: number;
}

export interface ChainKey {
  key: Uint8Array;
  index: number;
}

export interface RatchetState {
  rootKey: Uint8Array;
  chainKey: ChainKey;
  messageNumber: number;
  previousChainLength: number;
}

export interface EncryptionConfig {
  maxSkippedMessages: number;
  maxCacheSize: number;
  sessionTimeout: number;
  keyRotationInterval: number;
  algorithm: EncryptionAlgorithm;
}

export interface KeyExchangeResult {
  sharedSecret: Uint8Array;
  associatedData: Uint8Array;
  sessionId: string;
}

// Group Encryption
export interface GroupKey {
  groupId: string;
  key: Uint8Array;
  version: number;
  createdAt: number;
  createdBy: string;
  memberCount: number;
}

export interface SenderKey {
  senderId: string;
  groupId: string;
  key: Uint8Array;
  chainKey: Uint8Array;
  iteration: number;
  createdAt: number;
}

export interface KeyFingerprint {
  fingerprint: string;
  displayFormat: string;
  numericFormat: string;
  verified: boolean;
  verifiedAt?: number;
}

export interface KeyDerivationParams {
  salt: Uint8Array;
  info: Uint8Array;
  iterations: number;
  keyLength: number;
}

// Key Management
export interface PreKeyRecord {
  id: string;
  keyPair: KeyPair;
  isUsed: boolean;
  usedAt?: number;
  usedBy?: string;
}

export interface SignedPreKeyRecord {
  id: string;
  keyPair: KeyPair;
  signature: Uint8Array;
  createdAt: number;
  expiresAt: number;
}

export interface IdentityRecord {
  userId: string;
  identityKey: KeyPair;
  registrationId: string;
  fingerprint: KeyFingerprint;
  createdAt: number;
}

export interface KeyBackup {
  id: string;
  encryptedKeys: Uint8Array;
  salt: Uint8Array;
  iterations: number;
  createdAt: number;
  version: number;
}

export interface GroupSession {
  groupId: string;
  members: string[];
  senderKeys: Map<string, SenderKey>;
  currentVersion: number;
  createdAt: number;
  lastRotatedAt: number;
}
