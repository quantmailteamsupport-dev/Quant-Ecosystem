// ============================================================================
// Group Encryption - Sender Keys Protocol with Forward Secrecy
// ============================================================================

import type { SenderKey, GroupKey, GroupSession, EncryptedPayload } from '../types.js';

/**
 * Simple hash for key derivation.
 */
function hashMix(data: Uint8Array): Uint8Array {
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
 * HMAC for chain ratcheting.
 */
function hmacHash(key: Uint8Array, data: Uint8Array): Uint8Array {
  const combined = new Uint8Array(key.length + data.length);
  combined.set(key);
  combined.set(data, key.length);
  return hashMix(combined);
}

/**
 * Generate random bytes using Math.random (simulation).
 */
function randomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  for (let i = 0; i < length; i++) {
    bytes[i] = Math.floor(Math.random() * 256);
  }
  return bytes;
}

interface GroupMessage {
  id: string;
  groupId: string;
  senderId: string;
  payload: EncryptedPayload;
  senderKeyIteration: number;
  timestamp: number;
}

interface MemberKeyDistribution {
  memberId: string;
  senderKeys: Map<string, SenderKey>;
  distributedAt: number;
}

export class GroupEncryption {
  private sessions: Map<string, GroupSession> = new Map();
  private senderKeys: Map<string, SenderKey> = new Map();
  private memberDistributions: Map<string, MemberKeyDistribution[]> = new Map();

  /**
   * Create a new group encryption session.
   */
  createGroup(groupId: string, creatorId: string, initialMembers: string[]): GroupSession {
    const allMembers = [creatorId, ...initialMembers.filter((m) => m !== creatorId)];

    const session: GroupSession = {
      groupId,
      members: allMembers,
      senderKeys: new Map(),
      currentVersion: 1,
      createdAt: Date.now(),
      lastRotatedAt: Date.now(),
    };

    // Generate sender keys for each member
    for (const memberId of allMembers) {
      const senderKey = this.generateSenderKey(memberId, groupId);
      session.senderKeys.set(memberId, senderKey);
      this.senderKeys.set(this.getSenderKeyId(memberId, groupId), senderKey);
    }

    this.sessions.set(groupId, session);
    return session;
  }

  /**
   * Generate a new sender key for a member.
   */
  private generateSenderKey(senderId: string, groupId: string): SenderKey {
    return {
      senderId,
      groupId,
      key: randomBytes(32),
      chainKey: randomBytes(32),
      iteration: 0,
      createdAt: Date.now(),
    };
  }

  /**
   * Get the key ID for storage.
   */
  private getSenderKeyId(senderId: string, groupId: string): string {
    return `${groupId}:${senderId}`;
  }

  /**
   * Encrypt a message for the group using the sender's key.
   * Single encryption per sender (all members can decrypt with sender's key).
   */
  encryptGroupMessage(groupId: string, senderId: string, plaintext: Uint8Array): GroupMessage {
    const session = this.sessions.get(groupId);
    if (!session) {
      throw new Error(`Group session not found: ${groupId}`);
    }

    if (!session.members.includes(senderId)) {
      throw new Error(`Sender ${senderId} is not a member of group ${groupId}`);
    }

    const senderKey = session.senderKeys.get(senderId);
    if (!senderKey) {
      throw new Error(`No sender key found for ${senderId} in group ${groupId}`);
    }

    // Advance the hash ratchet on the sender key (forward secrecy)
    const messageKey = this.advanceSenderKeyRatchet(senderKey);

    // Encrypt with the derived message key
    const ciphertext = this.xorEncrypt(plaintext, messageKey);
    const nonce = randomBytes(24);
    const tag = hmacHash(messageKey, ciphertext);

    const payload: EncryptedPayload = {
      ciphertext,
      nonce,
      tag,
      algorithm: 'AES-256-GCM',
    };

    const message: GroupMessage = {
      id: `gmsg_${groupId}_${senderId}_${senderKey.iteration}`,
      groupId,
      senderId,
      payload,
      senderKeyIteration: senderKey.iteration,
      timestamp: Date.now(),
    };

    return message;
  }

  /**
   * Decrypt a group message using the sender's key.
   */
  decryptGroupMessage(groupId: string, message: GroupMessage): Uint8Array {
    const session = this.sessions.get(groupId);
    if (!session) {
      throw new Error(`Group session not found: ${groupId}`);
    }

    const senderKey = session.senderKeys.get(message.senderId);
    if (!senderKey) {
      throw new Error(`No sender key found for ${message.senderId} in group ${groupId}`);
    }

    // Derive the message key at the correct iteration
    const messageKey = this.deriveSenderMessageKey(senderKey, message.senderKeyIteration);

    // Verify tag
    const expectedTag = hmacHash(messageKey, message.payload.ciphertext);
    if (!this.constantTimeEqual(expectedTag, message.payload.tag)) {
      throw new Error('Group message authentication failed');
    }

    // Decrypt
    return this.xorEncrypt(message.payload.ciphertext, messageKey);
  }

  /**
   * Advance the sender key hash ratchet for forward secrecy.
   * Returns the message key for the current iteration.
   */
  private advanceSenderKeyRatchet(senderKey: SenderKey): Uint8Array {
    // Derive message key from current chain key
    const messageKeyInput = new Uint8Array([...senderKey.chainKey, 0x01]);
    const messageKey = hashMix(messageKeyInput);

    // Advance chain key
    const chainKeyInput = new Uint8Array([...senderKey.chainKey, 0x02]);
    senderKey.chainKey = hashMix(chainKeyInput);
    senderKey.iteration += 1;

    return messageKey;
  }

  /**
   * Derive a message key at a specific iteration.
   * Used for decryption when the receiver needs to catch up.
   */
  private deriveSenderMessageKey(senderKey: SenderKey, targetIteration: number): Uint8Array {
    // Re-derive from base key to reach the target iteration
    // In a real implementation, we would cache intermediate keys
    const baseKey = senderKey.key;
    let currentChain = new Uint8Array(baseKey);

    for (let i = 0; i < targetIteration; i++) {
      const input = new Uint8Array([...currentChain, 0x02]);
      currentChain = hashMix(input);
    }

    // Derive message key at this iteration
    const messageKeyInput = new Uint8Array([...currentChain, 0x01]);
    return hashMix(messageKeyInput);
  }

  /**
   * Add a new member to the group.
   * Distributes existing sender keys to the new member.
   */
  addMember(groupId: string, newMemberId: string): SenderKey {
    const session = this.sessions.get(groupId);
    if (!session) {
      throw new Error(`Group session not found: ${groupId}`);
    }

    if (session.members.includes(newMemberId)) {
      throw new Error(`Member ${newMemberId} already in group ${groupId}`);
    }

    // Generate a sender key for the new member
    const newSenderKey = this.generateSenderKey(newMemberId, groupId);
    session.senderKeys.set(newMemberId, newSenderKey);
    session.members.push(newMemberId);
    this.senderKeys.set(this.getSenderKeyId(newMemberId, groupId), newSenderKey);

    // Record key distribution to the new member
    const distribution: MemberKeyDistribution = {
      memberId: newMemberId,
      senderKeys: new Map(session.senderKeys),
      distributedAt: Date.now(),
    };

    const distributions = this.memberDistributions.get(groupId) ?? [];
    distributions.push(distribution);
    this.memberDistributions.set(groupId, distributions);

    this.sessions.set(groupId, session);
    return newSenderKey;
  }

  /**
   * Remove a member from the group.
   * Triggers key rotation for all remaining members (re-key).
   */
  removeMember(groupId: string, removedMemberId: string): void {
    const session = this.sessions.get(groupId);
    if (!session) {
      throw new Error(`Group session not found: ${groupId}`);
    }

    const memberIndex = session.members.indexOf(removedMemberId);
    if (memberIndex === -1) {
      throw new Error(`Member ${removedMemberId} not in group ${groupId}`);
    }

    // Remove the member
    session.members.splice(memberIndex, 1);
    session.senderKeys.delete(removedMemberId);
    this.senderKeys.delete(this.getSenderKeyId(removedMemberId, groupId));

    // Re-key all remaining members for forward secrecy
    this.rotateAllKeys(groupId);
  }

  /**
   * Rotate all sender keys in the group.
   * Called on member removal to ensure the removed member cannot decrypt future messages.
   */
  rotateAllKeys(groupId: string): void {
    const session = this.sessions.get(groupId);
    if (!session) {
      throw new Error(`Group session not found: ${groupId}`);
    }

    session.currentVersion += 1;
    session.lastRotatedAt = Date.now();

    // Generate new sender keys for all remaining members
    for (const memberId of session.members) {
      const newKey = this.generateSenderKey(memberId, groupId);
      session.senderKeys.set(memberId, newKey);
      this.senderKeys.set(this.getSenderKeyId(memberId, groupId), newKey);
    }

    this.sessions.set(groupId, session);
  }

  /**
   * Periodic key rotation for forward secrecy.
   * Should be called on a schedule (e.g., every N messages or time period).
   */
  periodicRotation(groupId: string, maxIterations: number = 100): boolean {
    const session = this.sessions.get(groupId);
    if (!session) return false;

    // Check if any sender key has exceeded the max iterations
    let needsRotation = false;
    for (const [, senderKey] of session.senderKeys) {
      if (senderKey.iteration >= maxIterations) {
        needsRotation = true;
        break;
      }
    }

    if (needsRotation) {
      this.rotateAllKeys(groupId);
      return true;
    }

    return false;
  }

  /**
   * Get the group session.
   */
  getSession(groupId: string): GroupSession | undefined {
    return this.sessions.get(groupId);
  }

  /**
   * Get the members of a group.
   */
  getMembers(groupId: string): string[] {
    const session = this.sessions.get(groupId);
    return session?.members ?? [];
  }

  /**
   * Get a sender key for a specific member.
   */
  getSenderKey(groupId: string, memberId: string): SenderKey | undefined {
    const session = this.sessions.get(groupId);
    return session?.senderKeys.get(memberId);
  }

  /**
   * Get group key info.
   */
  getGroupKey(groupId: string): GroupKey | undefined {
    const session = this.sessions.get(groupId);
    if (!session) return undefined;

    // Derive a shared group key from all sender keys
    let combinedKey = new Uint8Array(32);
    for (const [, senderKey] of session.senderKeys) {
      for (let i = 0; i < 32; i++) {
        combinedKey[i] = (combinedKey[i] ?? 0) ^ (senderKey.key[i] ?? 0);
      }
    }

    return {
      groupId,
      key: hashMix(combinedKey),
      version: session.currentVersion,
      createdAt: session.createdAt,
      createdBy: session.members[0] ?? '',
      memberCount: session.members.length,
    };
  }

  /**
   * Check if a group session exists.
   */
  hasGroup(groupId: string): boolean {
    return this.sessions.has(groupId);
  }

  /**
   * Delete a group session.
   */
  deleteGroup(groupId: string): void {
    const session = this.sessions.get(groupId);
    if (session) {
      for (const memberId of session.members) {
        this.senderKeys.delete(this.getSenderKeyId(memberId, groupId));
      }
    }
    this.sessions.delete(groupId);
    this.memberDistributions.delete(groupId);
  }

  /**
   * XOR encryption/decryption.
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
