// ============================================================================
// QuantTube - Watch Party Service
// Synchronized video watching, real-time chat, invitations, host controls
// ============================================================================

interface WatchParty {
  id: string;
  videoId: string;
  hostId: string;
  title: string;
  status: 'waiting' | 'playing' | 'paused' | 'ended';
  participants: Participant[];
  maxParticipants: number;
  currentTimestamp: number;
  playbackState: 'playing' | 'paused' | 'buffering';
  chatMessages: PartyMessage[];
  permissions: PartyPermissions;
  createdAt: string;
  startedAt?: string;
  endedAt?: string;
  inviteCode: string;
}

interface Participant {
  userId: string;
  username: string;
  avatarUrl: string;
  role: 'host' | 'moderator' | 'viewer';
  joinedAt: string;
  isActive: boolean;
  lastSeen: string;
  syncStatus: 'synced' | 'buffering' | 'behind';
}

interface PartyMessage {
  id: string;
  userId: string;
  username: string;
  content: string;
  type: 'text' | 'reaction' | 'system' | 'timestamp';
  timestamp: string;
  reactionEmoji?: string;
}

interface PartyPermissions {
  anyoneCanPause: boolean;
  anyoneCanSeek: boolean;
  chatEnabled: boolean;
  reactionsEnabled: boolean;
  maxMessageLength: number;
}

interface SyncEvent {
  partyId: string;
  timestamp: number;
  state: 'playing' | 'paused';
  initiatedBy: string;
  serverTime: number;
}

class WatchPartyService {
  private parties: Map<string, WatchParty> = new Map();
  private userParties: Map<string, string> = new Map();
  private inviteCodes: Map<string, string> = new Map();
  private syncHistory: Map<string, SyncEvent[]> = new Map();
  private counter: number = 0;

  private genId(prefix: string): string {
    return `${prefix}_${Date.now().toString(36)}_${(++this.counter).toString(36)}`;
  }

  private genInviteCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
    return code;
  }

  async create(videoId: string, hostId: string, options?: { title?: string; maxParticipants?: number; permissions?: Partial<PartyPermissions> }): Promise<WatchParty> {
    const existingParty = this.userParties.get(hostId);
    if (existingParty) {
      const party = this.parties.get(existingParty);
      if (party && party.status !== 'ended') throw new Error('User already hosting a party');
    }

    const inviteCode = this.genInviteCode();
    const party: WatchParty = {
      id: this.genId('party'),
      videoId,
      hostId,
      title: options?.title || `Watch Party - ${new Date().toLocaleDateString()}`,
      status: 'waiting',
      participants: [{
        userId: hostId,
        username: `Host_${hostId.substring(0, 6)}`,
        avatarUrl: `https://cdn.quant.tube/avatars/${hostId}.jpg`,
        role: 'host',
        joinedAt: new Date().toISOString(),
        isActive: true,
        lastSeen: new Date().toISOString(),
        syncStatus: 'synced',
      }],
      maxParticipants: options?.maxParticipants || 50,
      currentTimestamp: 0,
      playbackState: 'paused',
      chatMessages: [],
      permissions: {
        anyoneCanPause: options?.permissions?.anyoneCanPause ?? false,
        anyoneCanSeek: options?.permissions?.anyoneCanSeek ?? false,
        chatEnabled: options?.permissions?.chatEnabled ?? true,
        reactionsEnabled: options?.permissions?.reactionsEnabled ?? true,
        maxMessageLength: options?.permissions?.maxMessageLength || 500,
      },
      createdAt: new Date().toISOString(),
      inviteCode,
    };

    this.parties.set(party.id, party);
    this.userParties.set(hostId, party.id);
    this.inviteCodes.set(inviteCode, party.id);

    return party;
  }

  async join(partyId: string, userId: string, inviteCode?: string): Promise<WatchParty> {
    const party = this.parties.get(partyId);
    if (!party) throw new Error('Party not found');
    if (party.status === 'ended') throw new Error('Party has ended');
    if (party.participants.length >= party.maxParticipants) throw new Error('Party is full');

    const existing = party.participants.find(p => p.userId === userId);
    if (existing) {
      existing.isActive = true;
      existing.lastSeen = new Date().toISOString();
      return party;
    }

    party.participants.push({
      userId,
      username: `User_${userId.substring(0, 6)}`,
      avatarUrl: `https://cdn.quant.tube/avatars/${userId}.jpg`,
      role: 'viewer',
      joinedAt: new Date().toISOString(),
      isActive: true,
      lastSeen: new Date().toISOString(),
      syncStatus: 'synced',
    });

    this.userParties.set(userId, partyId);
    this.addSystemMessage(party, `User_${userId.substring(0, 6)} joined the party`);
    return party;
  }

  async syncPlayback(partyId: string, userId: string, timestamp: number, state: 'playing' | 'paused'): Promise<SyncEvent> {
    const party = this.parties.get(partyId);
    if (!party) throw new Error('Party not found');

    const participant = party.participants.find(p => p.userId === userId);
    if (!participant) throw new Error('Not a participant');

    const canControl = participant.role === 'host' || participant.role === 'moderator' ||
      (state === 'paused' && party.permissions.anyoneCanPause) ||
      (party.permissions.anyoneCanSeek);

    if (!canControl) throw new Error('Insufficient permissions');

    party.currentTimestamp = timestamp;
    party.playbackState = state;
    if (state === 'playing' && party.status === 'waiting') {
      party.status = 'playing';
      party.startedAt = new Date().toISOString();
    } else if (state === 'paused') {
      party.status = 'paused';
    } else {
      party.status = 'playing';
    }

    const event: SyncEvent = { partyId, timestamp, state, initiatedBy: userId, serverTime: Date.now() };
    const history = this.syncHistory.get(partyId) || [];
    history.push(event);
    if (history.length > 100) history.shift();
    this.syncHistory.set(partyId, history);

    // Update all participants sync status
    for (const p of party.participants) {
      if (p.isActive) p.syncStatus = 'synced';
    }

    return event;
  }

  async chat(partyId: string, userId: string, content: string, type?: PartyMessage['type']): Promise<PartyMessage> {
    const party = this.parties.get(partyId);
    if (!party) throw new Error('Party not found');
    if (!party.permissions.chatEnabled) throw new Error('Chat is disabled');

    const participant = party.participants.find(p => p.userId === userId && p.isActive);
    if (!participant) throw new Error('Not an active participant');

    if (content.length > party.permissions.maxMessageLength) {
      throw new Error(`Message too long (max ${party.permissions.maxMessageLength})`);
    }

    const message: PartyMessage = {
      id: this.genId('msg'),
      userId,
      username: participant.username,
      content: content.trim(),
      type: type || 'text',
      timestamp: new Date().toISOString(),
    };

    party.chatMessages.push(message);
    if (party.chatMessages.length > 500) party.chatMessages.shift();
    return message;
  }

  async invite(partyId: string, hostId: string, userIds: string[]): Promise<{ invited: string[]; failed: string[] }> {
    const party = this.parties.get(partyId);
    if (!party) throw new Error('Party not found');
    if (party.hostId !== hostId) throw new Error('Only host can invite');

    const invited: string[] = [];
    const failed: string[] = [];

    for (const uid of userIds) {
      if (party.participants.length >= party.maxParticipants) { failed.push(uid); continue; }
      if (party.participants.find(p => p.userId === uid)) { failed.push(uid); continue; }
      invited.push(uid);
    }
    return { invited, failed };
  }

  async getActive(): Promise<WatchParty[]> {
    return Array.from(this.parties.values()).filter(p => p.status !== 'ended');
  }

  async endParty(partyId: string, userId: string): Promise<WatchParty> {
    const party = this.parties.get(partyId);
    if (!party) throw new Error('Party not found');
    if (party.hostId !== userId) throw new Error('Only host can end party');

    party.status = 'ended';
    party.endedAt = new Date().toISOString();
    this.addSystemMessage(party, 'The watch party has ended');

    for (const p of party.participants) {
      this.userParties.delete(p.userId);
    }
    this.inviteCodes.delete(party.inviteCode);
    return party;
  }

  async setPermissions(partyId: string, hostId: string, perms: Partial<PartyPermissions>): Promise<PartyPermissions> {
    const party = this.parties.get(partyId);
    if (!party) throw new Error('Party not found');
    if (party.hostId !== hostId) throw new Error('Only host can change permissions');
    Object.assign(party.permissions, perms);
    return party.permissions;
  }

  async kickUser(partyId: string, hostId: string, targetUserId: string): Promise<boolean> {
    const party = this.parties.get(partyId);
    if (!party) throw new Error('Party not found');
    if (party.hostId !== hostId) throw new Error('Only host can kick users');
    if (targetUserId === hostId) throw new Error('Cannot kick yourself');

    const idx = party.participants.findIndex(p => p.userId === targetUserId);
    if (idx === -1) return false;
    party.participants.splice(idx, 1);
    this.userParties.delete(targetUserId);
    this.addSystemMessage(party, `User was removed from the party`);
    return true;
  }

  async getParticipants(partyId: string): Promise<Participant[]> {
    const party = this.parties.get(partyId);
    if (!party) throw new Error('Party not found');
    return party.participants.filter(p => p.isActive);
  }

  private addSystemMessage(party: WatchParty, content: string): void {
    party.chatMessages.push({
      id: this.genId('sys'),
      userId: 'system',
      username: 'System',
      content,
      type: 'system',
      timestamp: new Date().toISOString(),
    });
  }
}

export const watchPartyService = new WatchPartyService();
export { WatchPartyService };
