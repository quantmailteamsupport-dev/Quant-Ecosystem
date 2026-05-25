// ============================================================================
// Double Ratchet - Signal Protocol Implementation (Simulated Cryptography)
// ============================================================================

import type {
  KeyPair,
  EncryptedMessage,
  EncryptedPayload,
  SignalProtocolState,
  EncryptionConfig,
} from '../types.js';

// Constants for key derivation
const CHAIN_KEY_CONSTANT = 0x01;
const MESSAGE_KEY_CONSTANT = 0x02;
const MAX_SKIP_DEFAULT = 1000;

/**
 * Simple hash simulation using a deterministic mixing function.
 * In production, this would use SHA-256 or similar.
 */
function simpleHash(data: Uint8Array): Uint8Array {
  const result = new Uint8Array(32);
  let state = 0x6a09e667; // SHA-256 initial state fragment

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
 * HMAC simulation using hash mixing.
 */
function hmac(key: Uint8Array, data: Uint8Array): Uint8Array {
  const ipad = new Uint8Array(64);
  const opad = new Uint8Array(64);

  for (let i = 0; i < 64; i++) {
    ipad[i] = (key[i % key.length] ?? 0) ^ 0x36;
    opad[i] = (key[i % key.length] ?? 0) ^ 0x5c;
  }

  // Inner hash: H(ipad || data)
  const innerInput = new Uint8Array(ipad.length + data.length);
  innerInput.set(ipad);
  innerInput.set(data, ipad.length);
  const innerHash = simpleHash(innerInput);

  // Outer hash: H(opad || innerHash)
  const outerInput = new Uint8Array(opad.length + innerHash.length);
  outerInput.set(opad);
  outerInput.set(innerHash, opad.length);
  return simpleHash(outerInput);
}

/**
 * HKDF-like key derivation using hash chaining.
 * Derives multiple keys from input key material.
 */
function hkdfDerive(
  inputKey: Uint8Array,
  salt: Uint8Array,
  info: Uint8Array,
  outputLength: number,
): Uint8Array {
  // Extract
  const prk = hmac(salt, inputKey);

  // Expand
  const output = new Uint8Array(outputLength);
  let previous = new Uint8Array(0);
  let offset = 0;
  let counter = 1;

  while (offset < outputLength) {
    const input = new Uint8Array(previous.length + info.length + 1);
    input.set(previous);
    input.set(info, previous.length);
    input[previous.length + info.length] = counter;

    previous = hmac(prk, input);

    const remaining = outputLength - offset;
    const toCopy = Math.min(remaining, previous.length);
    output.set(previous.subarray(0, toCopy), offset);
    offset += toCopy;
    counter++;
  }

  return output;
}

/**
 * Simulate Diffie-Hellman key agreement.
 * In production, this would use Curve25519/X25519.
 */
function simulateDH(myPrivateKey: Uint8Array, theirPublicKey: Uint8Array): Uint8Array {
  // XOR + hash as DH simulation
  const combined = new Uint8Array(Math.max(myPrivateKey.length, theirPublicKey.length));
  for (let i = 0; i < combined.length; i++) {
    combined[i] =
      (myPrivateKey[i % myPrivateKey.length] ?? 0) ^
      (theirPublicKey[i % theirPublicKey.length] ?? 0);
  }
  return simpleHash(combined);
}

/**
 * Generate a simulated key pair.
 */
function generateKeyPair(): KeyPair {
  const privateKey = new Uint8Array(32);
  const publicKey = new Uint8Array(32);

  // Use Math.random for simulation (crypto.getRandomValues in production)
  for (let i = 0; i < 32; i++) {
    privateKey[i] = Math.floor(Math.random() * 256);
  }

  // Public key derived from private key via hash
  const derived = simpleHash(privateKey);
  publicKey.set(derived);

  return {
    publicKey,
    privateKey,
    keyId: `key_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
    createdAt: Date.now(),
  };
}

export class DoubleRatchet {
  private sessions: Map<string, SignalProtocolState> = new Map();
  private config: EncryptionConfig;

  constructor(config?: Partial<EncryptionConfig>) {
    this.config = {
      maxSkippedMessages: config?.maxSkippedMessages ?? MAX_SKIP_DEFAULT,
      maxCacheSize: config?.maxCacheSize ?? 5000,
      sessionTimeout: config?.sessionTimeout ?? 86400000 * 30, // 30 days
      keyRotationInterval: config?.keyRotationInterval ?? 100,
      algorithm: config?.algorithm ?? 'X25519-XSalsa20',
    };
  }

  /**
   * Initialize a new session as the initiator (Alice).
   * Uses the recipient's pre-key bundle to establish the session.
   */
  initializeSession(
    sessionId: string,
    ourIdentityKey: KeyPair,
    theirPreKeyBundle: {
      identityKey: Uint8Array;
      signedPreKey: Uint8Array;
      oneTimePreKey?: Uint8Array;
    },
  ): SignalProtocolState {
    // X3DH key agreement simulation
    // DH1 = DH(IKa, SPKb)
    const dh1 = simulateDH(ourIdentityKey.privateKey, theirPreKeyBundle.signedPreKey);
    // DH2 = DH(EKa, IKb) - using a new ephemeral key
    const ephemeralKey = generateKeyPair();
    const dh2 = simulateDH(ephemeralKey.privateKey, theirPreKeyBundle.identityKey);
    // DH3 = DH(EKa, SPKb)
    const dh3 = simulateDH(ephemeralKey.privateKey, theirPreKeyBundle.signedPreKey);

    // Combine DH outputs
    const combined = new Uint8Array(dh1.length + dh2.length + dh3.length);
    combined.set(dh1);
    combined.set(dh2, dh1.length);
    combined.set(dh3, dh1.length + dh2.length);

    // If one-time pre-key available, include DH4
    if (theirPreKeyBundle.oneTimePreKey) {
      const dh4 = simulateDH(ephemeralKey.privateKey, theirPreKeyBundle.oneTimePreKey);
      const withOTPK = new Uint8Array(combined.length + dh4.length);
      withOTPK.set(combined);
      withOTPK.set(dh4, combined.length);
    }

    // Derive root key and chain key from shared secret
    const info = new TextEncoder().encode('DoubleRatchetInit');
    const salt = new Uint8Array(32); // Zero salt for initial
    const derived = hkdfDerive(combined, salt, info, 64);
    const rootKey = derived.slice(0, 32);
    const sendingChainKey = derived.slice(32, 64);

    // Create initial sending ratchet key pair
    const sendingRatchetKey = generateKeyPair();

    const state: SignalProtocolState = {
      sessionId,
      rootKey,
      sendingChainKey,
      receivingChainKey: new Uint8Array(32),
      sendingRatchetKey,
      receivingRatchetKey: theirPreKeyBundle.signedPreKey,
      sendingMessageNumber: 0,
      receivingMessageNumber: 0,
      previousSendingChainLength: 0,
      skippedMessageKeys: new Map(),
    };

    this.sessions.set(sessionId, state);
    return state;
  }

  /**
   * Initialize a session as the responder (Bob).
   */
  initializeResponderSession(
    sessionId: string,
    ourIdentityKey: KeyPair,
    ourSignedPreKey: KeyPair,
    theirIdentityKey: Uint8Array,
    theirEphemeralKey: Uint8Array,
  ): SignalProtocolState {
    // Compute the same shared secret from Bob's perspective
    const dh1 = simulateDH(ourSignedPreKey.privateKey, theirIdentityKey);
    const dh2 = simulateDH(ourIdentityKey.privateKey, theirEphemeralKey);
    const dh3 = simulateDH(ourSignedPreKey.privateKey, theirEphemeralKey);

    const combined = new Uint8Array(dh1.length + dh2.length + dh3.length);
    combined.set(dh1);
    combined.set(dh2, dh1.length);
    combined.set(dh3, dh1.length + dh2.length);

    const info = new TextEncoder().encode('DoubleRatchetInit');
    const salt = new Uint8Array(32);
    const derived = hkdfDerive(combined, salt, info, 64);
    const rootKey = derived.slice(0, 32);
    const receivingChainKey = derived.slice(32, 64);

    const sendingRatchetKey = generateKeyPair();

    const state: SignalProtocolState = {
      sessionId,
      rootKey,
      sendingChainKey: new Uint8Array(32),
      receivingChainKey,
      sendingRatchetKey,
      receivingRatchetKey: theirEphemeralKey,
      sendingMessageNumber: 0,
      receivingMessageNumber: 0,
      previousSendingChainLength: 0,
      skippedMessageKeys: new Map(),
    };

    this.sessions.set(sessionId, state);
    return state;
  }

  /**
   * Perform a DH ratchet step.
   * Derives new root key and chain key from DH output.
   */
  dhRatchetStep(state: SignalProtocolState, theirNewRatchetKey: Uint8Array): void {
    // Save previous sending chain length
    state.previousSendingChainLength = state.sendingMessageNumber;
    state.sendingMessageNumber = 0;
    state.receivingMessageNumber = 0;
    state.receivingRatchetKey = theirNewRatchetKey;

    // Derive new receiving chain key
    const dhOutput = simulateDH(state.sendingRatchetKey.privateKey, theirNewRatchetKey);
    const info = new TextEncoder().encode('RatchetReceive');
    const derived = hkdfDerive(dhOutput, state.rootKey, info, 64);
    state.rootKey = derived.slice(0, 32);
    state.receivingChainKey = derived.slice(32, 64);

    // Generate new sending ratchet key pair
    state.sendingRatchetKey = generateKeyPair();

    // Derive new sending chain key
    const dhOutput2 = simulateDH(state.sendingRatchetKey.privateKey, theirNewRatchetKey);
    const info2 = new TextEncoder().encode('RatchetSend');
    const derived2 = hkdfDerive(dhOutput2, state.rootKey, info2, 64);
    state.rootKey = derived2.slice(0, 32);
    state.sendingChainKey = derived2.slice(32, 64);
  }

  /**
   * Advance the symmetric ratchet to derive the next message key.
   * chainKey(n+1) = HMAC(chainKey(n), 0x01)
   * messageKey = HMAC(chainKey(n), 0x02)
   */
  symmetricRatchetStep(chainKey: Uint8Array): { newChainKey: Uint8Array; messageKey: Uint8Array } {
    const chainConstant = new Uint8Array([CHAIN_KEY_CONSTANT]);
    const messageConstant = new Uint8Array([MESSAGE_KEY_CONSTANT]);

    const newChainKey = hmac(chainKey, chainConstant);
    const messageKey = hmac(chainKey, messageConstant);

    return { newChainKey, messageKey };
  }

  /**
   * Encrypt a message using the current session state.
   */
  encrypt(sessionId: string, plaintext: Uint8Array): EncryptedMessage {
    const state = this.sessions.get(sessionId);
    if (!state) {
      throw new Error(`No session found: ${sessionId}`);
    }

    // Derive message key from sending chain
    const { newChainKey, messageKey } = this.symmetricRatchetStep(state.sendingChainKey);
    state.sendingChainKey = newChainKey;

    // Encrypt plaintext with message key (XOR cipher + HMAC tag simulation)
    const ciphertext = this.xorEncrypt(plaintext, messageKey);
    const nonce = this.generateNonce(state.sendingMessageNumber);
    const tag = hmac(messageKey, ciphertext);

    const payload: EncryptedPayload = {
      ciphertext,
      nonce,
      tag,
      algorithm: this.config.algorithm,
    };

    const message: EncryptedMessage = {
      id: `msg_${sessionId}_${state.sendingMessageNumber}`,
      senderId: sessionId.split(':')[0] ?? sessionId,
      recipientId: sessionId.split(':')[1] ?? '',
      payload,
      timestamp: Date.now(),
      messageNumber: state.sendingMessageNumber,
      previousChainLength: state.previousSendingChainLength,
      ratchetPublicKey: state.sendingRatchetKey.publicKey,
    };

    state.sendingMessageNumber += 1;
    this.sessions.set(sessionId, state);

    return message;
  }

  /**
   * Decrypt a received message.
   * Handles out-of-order messages using stored skipped keys.
   */
  decrypt(sessionId: string, message: EncryptedMessage): Uint8Array {
    const state = this.sessions.get(sessionId);
    if (!state) {
      throw new Error(`No session found: ${sessionId}`);
    }

    // Check if we have a stored key for this message (out-of-order)
    const skipKey = `${message.messageNumber}:${this.bytesToHex(message.ratchetPublicKey)}`;
    const storedKey = state.skippedMessageKeys.get(skipKey);
    if (storedKey) {
      state.skippedMessageKeys.delete(skipKey);
      return this.decryptWithKey(message.payload, storedKey);
    }

    // Check if we need a DH ratchet step (new ratchet key from sender)
    if (
      !state.receivingRatchetKey ||
      !this.keysEqual(message.ratchetPublicKey, state.receivingRatchetKey)
    ) {
      // Skip any missed messages in the current chain
      this.skipMessages(state, state.receivingMessageNumber, message.previousChainLength);

      // Perform DH ratchet
      this.dhRatchetStep(state, message.ratchetPublicKey);
    }

    // Skip any missed messages up to the received message number
    this.skipMessages(state, state.receivingMessageNumber, message.messageNumber);

    // Derive the message key
    const { newChainKey, messageKey } = this.symmetricRatchetStep(state.receivingChainKey);
    state.receivingChainKey = newChainKey;
    state.receivingMessageNumber = message.messageNumber + 1;

    this.sessions.set(sessionId, state);

    // Decrypt and verify
    return this.decryptWithKey(message.payload, messageKey);
  }

  /**
   * Skip messages and store their keys for later decryption.
   */
  private skipMessages(state: SignalProtocolState, start: number, until: number): void {
    if (until - start > this.config.maxSkippedMessages) {
      throw new Error(
        `Too many skipped messages (${until - start} > ${this.config.maxSkippedMessages}). Forward secrecy limit exceeded.`,
      );
    }

    let chainKey = state.receivingChainKey;
    for (let i = start; i < until; i++) {
      const { newChainKey, messageKey } = this.symmetricRatchetStep(chainKey);
      chainKey = newChainKey;

      const keyId = `${i}:${this.bytesToHex(state.receivingRatchetKey ?? new Uint8Array(0))}`;
      state.skippedMessageKeys.set(keyId, messageKey);

      // Enforce max cache size
      if (state.skippedMessageKeys.size > this.config.maxCacheSize) {
        // Remove oldest entry
        const firstKey = state.skippedMessageKeys.keys().next().value;
        if (firstKey !== undefined) {
          state.skippedMessageKeys.delete(firstKey);
        }
      }
    }
    state.receivingChainKey = chainKey;
  }

  /**
   * Decrypt payload with a specific message key.
   */
  private decryptWithKey(payload: EncryptedPayload, messageKey: Uint8Array): Uint8Array {
    // Verify HMAC tag
    const expectedTag = hmac(messageKey, payload.ciphertext);
    if (!this.keysEqual(expectedTag, payload.tag)) {
      throw new Error('Message authentication failed: invalid HMAC tag');
    }

    // XOR decrypt
    return this.xorEncrypt(payload.ciphertext, messageKey);
  }

  /**
   * XOR-based encryption (symmetric, so encrypt = decrypt).
   */
  private xorEncrypt(data: Uint8Array, key: Uint8Array): Uint8Array {
    const result = new Uint8Array(data.length);
    for (let i = 0; i < data.length; i++) {
      result[i] = (data[i] ?? 0) ^ (key[i % key.length] ?? 0);
    }
    return result;
  }

  /**
   * Generate a nonce from a message number.
   */
  private generateNonce(messageNumber: number): Uint8Array {
    const nonce = new Uint8Array(24);
    const view = new DataView(nonce.buffer);
    view.setUint32(0, messageNumber, true);
    view.setUint32(4, Date.now() & 0xffffffff, true);
    return nonce;
  }

  /**
   * Compare two byte arrays for equality.
   */
  private keysEqual(a: Uint8Array, b: Uint8Array): boolean {
    if (a.length !== b.length) return false;
    let diff = 0;
    for (let i = 0; i < a.length; i++) {
      diff |= (a[i] ?? 0) ^ (b[i] ?? 0);
    }
    return diff === 0;
  }

  /**
   * Convert bytes to hex string.
   */
  private bytesToHex(bytes: Uint8Array): string {
    return Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }

  /**
   * Get session state.
   */
  getSession(sessionId: string): SignalProtocolState | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Check if a session exists.
   */
  hasSession(sessionId: string): boolean {
    return this.sessions.has(sessionId);
  }

  /**
   * Delete a session.
   */
  deleteSession(sessionId: string): void {
    this.sessions.delete(sessionId);
  }

  /**
   * Get the number of skipped message keys stored.
   */
  getSkippedKeyCount(sessionId: string): number {
    const state = this.sessions.get(sessionId);
    return state?.skippedMessageKeys.size ?? 0;
  }

  /**
   * Get the current message number for sending.
   */
  getSendingMessageNumber(sessionId: string): number {
    const state = this.sessions.get(sessionId);
    return state?.sendingMessageNumber ?? 0;
  }
}
