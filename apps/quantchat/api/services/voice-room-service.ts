// ============================================================================
// QuantChat - Voice Room Service
// Real-time voice rooms, speaker management, permissions, recording
// ============================================================================

interface VoiceRoom {
  id: string;
  name: string;
  creatorId: string;
  type: 'open' | 'invite_only' | 'social';
  status: 'active' | 'ended' | 'scheduled';
  participants: VoiceParticipant[];
  speakers: string[];
  maxParticipants: number;
  isRecording: boolean;
  recordingUrl: string | null;
  scheduledStart: Date | null;
  startedAt: Date | null;
  endedAt: Date | null;
  createdAt: Date;
}

interface VoiceParticipant {
  userId: string;
  role: 'host' | 'speaker' | 'listener';
  isMuted: boolean;
  joinedAt: Date;
  leftAt: Date | null;
  handRaised: boolean;
}

interface RoomPermissions {
  roomId: string;
  allowAudienceChat: boolean;
  allowHandRaise: boolean;
  allowRecording: boolean;
  requireApproval: boolean;
  maxSpeakers: number;
  allowedUsers: string[];
  blockedUsers: string[];
}

interface RoomRecording {
  id: string;
  roomId: string;
  duration: number;
  size: number;
  url: string;
  createdAt: Date;
}

export class VoiceRoomService {
  private rooms: Map<string, VoiceRoom> = new Map();
  private permissions: Map<string, RoomPermissions> = new Map();
  private recordings: Map<string, RoomRecording[]> = new Map();
  private userActiveRoom: Map<string, string> = new Map();

  async createRoom(userId: string, config: {
    name: string;
    type?: 'open' | 'invite_only' | 'social';
    maxParticipants?: number;
    scheduledStart?: Date;
  }): Promise<VoiceRoom> {
    if (!config.name || config.name.trim().length === 0) {
      throw new Error('Room name is required');
    }

    // Check if user is already in a room
    if (this.userActiveRoom.has(userId)) {
      throw new Error('You must leave current room before creating a new one');
    }

    const roomId = `vroom_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const room: VoiceRoom = {
      id: roomId,
      name: config.name.trim(),
      creatorId: userId,
      type: config.type || 'open',
      status: config.scheduledStart ? 'scheduled' : 'active',
      participants: [{
        userId,
        role: 'host',
        isMuted: false,
        joinedAt: new Date(),
        leftAt: null,
        handRaised: false,
      }],
      speakers: [userId],
      maxParticipants: config.maxParticipants || 100,
      isRecording: false,
      recordingUrl: null,
      scheduledStart: config.scheduledStart || null,
      startedAt: config.scheduledStart ? null : new Date(),
      endedAt: null,
      createdAt: new Date(),
    };

    this.rooms.set(roomId, room);
    this.userActiveRoom.set(userId, roomId);

    // Set default permissions
    this.permissions.set(roomId, {
      roomId,
      allowAudienceChat: true,
      allowHandRaise: true,
      allowRecording: false,
      requireApproval: config.type === 'invite_only',
      maxSpeakers: 10,
      allowedUsers: [],
      blockedUsers: [],
    });

    return room;
  }

  async joinRoom(userId: string, roomId: string): Promise<VoiceRoom> {
    const room = this.rooms.get(roomId);
    if (!room) throw new Error('Room not found');
    if (room.status !== 'active') throw new Error('Room is not active');
    if (room.participants.filter(p => !p.leftAt).length >= room.maxParticipants) {
      throw new Error('Room is full');
    }

    const perms = this.permissions.get(roomId);
    if (perms?.blockedUsers.includes(userId)) {
      throw new Error('You are blocked from this room');
    }
    if (room.type === 'invite_only' && perms && !perms.allowedUsers.includes(userId)) {
      throw new Error('This room requires an invitation');
    }

    // Check if already in room
    const existing = room.participants.find(p => p.userId === userId && !p.leftAt);
    if (existing) throw new Error('Already in this room');

    // Leave current room if in one
    const currentRoom = this.userActiveRoom.get(userId);
    if (currentRoom) await this.leaveRoom(userId, currentRoom);

    room.participants.push({
      userId,
      role: 'listener',
      isMuted: true,
      joinedAt: new Date(),
      leftAt: null,
      handRaised: false,
    });

    this.userActiveRoom.set(userId, roomId);
    return room;
  }

  async leaveRoom(userId: string, roomId: string): Promise<void> {
    const room = this.rooms.get(roomId);
    if (!room) throw new Error('Room not found');

    const participant = room.participants.find(p => p.userId === userId && !p.leftAt);
    if (!participant) throw new Error('Not in this room');

    participant.leftAt = new Date();
    room.speakers = room.speakers.filter(id => id !== userId);
    this.userActiveRoom.delete(userId);

    // If host leaves and no other speakers, end room
    if (participant.role === 'host') {
      const activeSpeakers = room.participants.filter(p => !p.leftAt && p.role === 'speaker');
      if (activeSpeakers.length > 0) {
        activeSpeakers[0].role = 'host';
      } else {
        await this.endRoom(userId, roomId);
      }
    }
  }

  async endRoom(userId: string, roomId: string): Promise<void> {
    const room = this.rooms.get(roomId);
    if (!room) throw new Error('Room not found');
    if (room.creatorId !== userId) {
      const participant = room.participants.find(p => p.userId === userId);
      if (!participant || participant.role !== 'host') {
        throw new Error('Only host can end the room');
      }
    }

    room.status = 'ended';
    room.endedAt = new Date();

    for (const p of room.participants) {
      if (!p.leftAt) {
        p.leftAt = new Date();
        this.userActiveRoom.delete(p.userId);
      }
    }
  }

  async muteUser(hostId: string, roomId: string, targetUserId: string): Promise<VoiceParticipant> {
    const room = this.rooms.get(roomId);
    if (!room) throw new Error('Room not found');

    const host = room.participants.find(p => p.userId === hostId && !p.leftAt);
    if (!host || (host.role !== 'host' && host.role !== 'speaker')) {
      throw new Error('Only host or speakers can mute others');
    }

    const target = room.participants.find(p => p.userId === targetUserId && !p.leftAt);
    if (!target) throw new Error('User not in room');

    target.isMuted = true;
    return target;
  }

  async unmuteUser(hostId: string, roomId: string, targetUserId: string): Promise<VoiceParticipant> {
    const room = this.rooms.get(roomId);
    if (!room) throw new Error('Room not found');

    const host = room.participants.find(p => p.userId === hostId && !p.leftAt);
    if (!host || host.role !== 'host') {
      throw new Error('Only host can unmute others');
    }

    const target = room.participants.find(p => p.userId === targetUserId && !p.leftAt);
    if (!target) throw new Error('User not in room');

    target.isMuted = false;
    return target;
  }

  async setSpeaker(hostId: string, roomId: string, targetUserId: string): Promise<VoiceRoom> {
    const room = this.rooms.get(roomId);
    if (!room) throw new Error('Room not found');

    const host = room.participants.find(p => p.userId === hostId && !p.leftAt);
    if (!host || host.role !== 'host') throw new Error('Only host can promote speakers');

    const perms = this.permissions.get(roomId);
    if (perms && room.speakers.length >= perms.maxSpeakers) {
      throw new Error('Maximum speakers reached');
    }

    const target = room.participants.find(p => p.userId === targetUserId && !p.leftAt);
    if (!target) throw new Error('User not in room');

    target.role = 'speaker';
    target.isMuted = false;
    target.handRaised = false;
    if (!room.speakers.includes(targetUserId)) {
      room.speakers.push(targetUserId);
    }

    return room;
  }

  async kickUser(hostId: string, roomId: string, targetUserId: string): Promise<void> {
    const room = this.rooms.get(roomId);
    if (!room) throw new Error('Room not found');

    const host = room.participants.find(p => p.userId === hostId && !p.leftAt);
    if (!host || host.role !== 'host') throw new Error('Only host can kick users');

    const target = room.participants.find(p => p.userId === targetUserId && !p.leftAt);
    if (!target) throw new Error('User not in room');

    target.leftAt = new Date();
    room.speakers = room.speakers.filter(id => id !== targetUserId);
    this.userActiveRoom.delete(targetUserId);
  }

  async setPermissions(hostId: string, roomId: string, updates: Partial<RoomPermissions>): Promise<RoomPermissions> {
    const room = this.rooms.get(roomId);
    if (!room) throw new Error('Room not found');
    if (room.creatorId !== hostId) throw new Error('Only creator can change permissions');

    const perms = this.permissions.get(roomId)!;
    if (updates.allowAudienceChat !== undefined) perms.allowAudienceChat = updates.allowAudienceChat;
    if (updates.allowHandRaise !== undefined) perms.allowHandRaise = updates.allowHandRaise;
    if (updates.allowRecording !== undefined) perms.allowRecording = updates.allowRecording;
    if (updates.requireApproval !== undefined) perms.requireApproval = updates.requireApproval;
    if (updates.maxSpeakers !== undefined) perms.maxSpeakers = updates.maxSpeakers;

    return perms;
  }

  async listActiveRooms(options?: { type?: string }): Promise<VoiceRoom[]> {
    let rooms = Array.from(this.rooms.values()).filter(r => r.status === 'active');
    if (options?.type) rooms = rooms.filter(r => r.type === options.type);
    return rooms.sort((a, b) =>
      b.participants.filter(p => !p.leftAt).length - a.participants.filter(p => !p.leftAt).length
    );
  }

  async getParticipants(roomId: string): Promise<VoiceParticipant[]> {
    const room = this.rooms.get(roomId);
    if (!room) throw new Error('Room not found');
    return room.participants.filter(p => !p.leftAt);
  }

  async recordRoom(hostId: string, roomId: string, start: boolean): Promise<VoiceRoom> {
    const room = this.rooms.get(roomId);
    if (!room) throw new Error('Room not found');
    if (room.creatorId !== hostId) throw new Error('Only creator can record');

    const perms = this.permissions.get(roomId);
    if (perms && !perms.allowRecording) throw new Error('Recording not allowed in this room');

    room.isRecording = start;
    if (!start && room.startedAt) {
      const duration = Math.floor((Date.now() - room.startedAt.getTime()) / 1000);
      const recording: RoomRecording = {
        id: `rec_${Date.now()}`,
        roomId,
        duration,
        size: duration * 16000,
        url: `https://recordings.quantchat.com/${roomId}/${Date.now()}.ogg`,
        createdAt: new Date(),
      };
      const recs = this.recordings.get(roomId) || [];
      recs.push(recording);
      this.recordings.set(roomId, recs);
    }

    return room;
  }
}

export const voiceRoomService = new VoiceRoomService();
