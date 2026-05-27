export interface CoPresenceRoom {
  id: string;
  name: string;
  documentId: string;
  participants: Participant[];
  maxParticipants: number;
  createdAt: Date;
  expiresAt: Date | null;
  status: RoomStatus;
}

export type RoomStatus = 'active' | 'idle' | 'closed';

export interface Participant {
  userId: string;
  displayName: string;
  color: string;
  cursor: CursorPosition | null;
  selection: SelectionRange | null;
  awareness: AwarenessState;
  joinedAt: Date;
  lastActiveAt: Date;
  isActive: boolean;
}

export interface CursorPosition {
  x: number;
  y: number;
  line?: number;
  column?: number;
  element?: string;
  timestamp: Date;
}

export interface SelectionRange {
  start: { line: number; column: number };
  end: { line: number; column: number };
}

export interface AwarenessState {
  status: 'active' | 'idle' | 'away' | 'offline';
  currentView: string;
  currentAction?: string;
  typing: boolean;
  lastUpdate: Date;
}
