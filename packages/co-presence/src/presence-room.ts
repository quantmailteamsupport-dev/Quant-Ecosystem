import type {
  CoPresenceRoom,
  Participant,
  CursorPosition,
  SelectionRange,
  AwarenessState,
  RoomStatus,
} from './types.js';

const COLORS = [
  '#FF6B6B',
  '#4ECDC4',
  '#45B7D1',
  '#FFA07A',
  '#98D8C8',
  '#F06292',
  '#AED581',
  '#FFD54F',
  '#7986CB',
  '#4DB6AC',
];

export class PresenceRoom {
  private room: CoPresenceRoom;

  constructor(params: { name: string; documentId: string; maxParticipants?: number }) {
    this.room = {
      id: `room-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: params.name,
      documentId: params.documentId,
      participants: [],
      maxParticipants: params.maxParticipants ?? 50,
      createdAt: new Date(),
      expiresAt: null,
      status: 'active',
    };
  }

  getId(): string {
    return this.room.id;
  }

  getName(): string {
    return this.room.name;
  }

  getDocumentId(): string {
    return this.room.documentId;
  }

  getStatus(): RoomStatus {
    return this.room.status;
  }

  getRoom(): CoPresenceRoom {
    return {
      ...this.room,
      participants: [...this.room.participants],
    };
  }

  getParticipants(): Participant[] {
    return [...this.room.participants];
  }

  getActiveParticipants(): Participant[] {
    return this.room.participants.filter((p) => p.isActive);
  }

  getParticipant(userId: string): Participant | null {
    return this.room.participants.find((p) => p.userId === userId) ?? null;
  }

  join(userId: string, displayName: string): Participant | null {
    if (this.room.status === 'closed') return null;
    if (this.room.participants.length >= this.room.maxParticipants) return null;
    if (this.room.participants.some((p) => p.userId === userId)) {
      return this.room.participants.find((p) => p.userId === userId)!;
    }

    const color = COLORS[this.room.participants.length % COLORS.length]!;

    const participant: Participant = {
      userId,
      displayName,
      color,
      cursor: null,
      selection: null,
      awareness: {
        status: 'active',
        currentView: '',
        typing: false,
        lastUpdate: new Date(),
      },
      joinedAt: new Date(),
      lastActiveAt: new Date(),
      isActive: true,
    };

    this.room.participants.push(participant);
    return participant;
  }

  leave(userId: string): boolean {
    const idx = this.room.participants.findIndex((p) => p.userId === userId);
    if (idx === -1) return false;
    this.room.participants.splice(idx, 1);

    if (this.room.participants.length === 0) {
      this.room.status = 'idle';
    }

    return true;
  }

  updateCursor(userId: string, position: CursorPosition): boolean {
    const participant = this.room.participants.find((p) => p.userId === userId);
    if (!participant) return false;

    participant.cursor = position;
    participant.lastActiveAt = new Date();
    participant.awareness.lastUpdate = new Date();
    return true;
  }

  updateSelection(userId: string, selection: SelectionRange | null): boolean {
    const participant = this.room.participants.find((p) => p.userId === userId);
    if (!participant) return false;

    participant.selection = selection;
    participant.lastActiveAt = new Date();
    return true;
  }

  updateAwareness(userId: string, awareness: Partial<AwarenessState>): boolean {
    const participant = this.room.participants.find((p) => p.userId === userId);
    if (!participant) return false;

    participant.awareness = {
      ...participant.awareness,
      ...awareness,
      lastUpdate: new Date(),
    };
    participant.lastActiveAt = new Date();
    return true;
  }

  setActive(userId: string, active: boolean): boolean {
    const participant = this.room.participants.find((p) => p.userId === userId);
    if (!participant) return false;

    participant.isActive = active;
    participant.awareness.status = active ? 'active' : 'away';
    participant.lastActiveAt = new Date();
    return true;
  }

  close(): void {
    this.room.status = 'closed';
    for (const p of this.room.participants) {
      p.isActive = false;
      p.awareness.status = 'offline';
    }
  }

  isOpen(): boolean {
    return this.room.status !== 'closed';
  }

  isFull(): boolean {
    return this.room.participants.length >= this.room.maxParticipants;
  }
}

export function createPresenceRoom(params: {
  name: string;
  documentId: string;
  maxParticipants?: number;
}): PresenceRoom {
  return new PresenceRoom(params);
}
