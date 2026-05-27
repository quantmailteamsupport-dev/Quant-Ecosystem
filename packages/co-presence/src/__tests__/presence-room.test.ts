import { describe, expect, it } from 'vitest';
import { createPresenceRoom } from '../presence-room.js';

describe('PresenceRoom', () => {
  it('creates a room for a document', () => {
    const room = createPresenceRoom({ name: 'Doc Editing', documentId: 'doc-1' });

    expect(room.getId()).toBeTruthy();
    expect(room.getName()).toBe('Doc Editing');
    expect(room.getDocumentId()).toBe('doc-1');
    expect(room.getStatus()).toBe('active');
    expect(room.getParticipants()).toHaveLength(0);
  });

  it('allows participants to join', () => {
    const room = createPresenceRoom({ name: 'Room', documentId: 'doc-1' });
    const participant = room.join('user-1', 'Alice');

    expect(participant).not.toBeNull();
    expect(participant!.userId).toBe('user-1');
    expect(participant!.displayName).toBe('Alice');
    expect(participant!.color).toBeTruthy();
    expect(participant!.isActive).toBe(true);
    expect(room.getParticipants()).toHaveLength(1);
  });

  it('assigns unique colors to participants', () => {
    const room = createPresenceRoom({ name: 'Room', documentId: 'doc-1' });
    const p1 = room.join('user-1', 'Alice');
    const p2 = room.join('user-2', 'Bob');

    expect(p1!.color).not.toBe(p2!.color);
  });

  it('prevents duplicate joins', () => {
    const room = createPresenceRoom({ name: 'Room', documentId: 'doc-1' });
    room.join('user-1', 'Alice');
    const p2 = room.join('user-1', 'Alice');

    expect(room.getParticipants()).toHaveLength(1);
    expect(p2!.userId).toBe('user-1');
  });

  it('enforces max participants', () => {
    const room = createPresenceRoom({
      name: 'Small Room',
      documentId: 'doc-1',
      maxParticipants: 2,
    });
    room.join('user-1', 'Alice');
    room.join('user-2', 'Bob');

    const p3 = room.join('user-3', 'Carol');
    expect(p3).toBeNull();
    expect(room.isFull()).toBe(true);
  });

  it('allows participants to leave', () => {
    const room = createPresenceRoom({ name: 'Room', documentId: 'doc-1' });
    room.join('user-1', 'Alice');
    room.join('user-2', 'Bob');

    expect(room.leave('user-1')).toBe(true);
    expect(room.getParticipants()).toHaveLength(1);
    expect(room.getParticipant('user-1')).toBeNull();
  });

  it('sets room to idle when empty', () => {
    const room = createPresenceRoom({ name: 'Room', documentId: 'doc-1' });
    room.join('user-1', 'Alice');
    room.leave('user-1');

    expect(room.getStatus()).toBe('idle');
  });

  it('shares cursor positions', () => {
    const room = createPresenceRoom({ name: 'Room', documentId: 'doc-1' });
    room.join('user-1', 'Alice');

    const updated = room.updateCursor('user-1', {
      x: 100,
      y: 200,
      line: 5,
      column: 10,
      timestamp: new Date(),
    });

    expect(updated).toBe(true);
    const participant = room.getParticipant('user-1');
    expect(participant!.cursor).not.toBeNull();
    expect(participant!.cursor!.x).toBe(100);
    expect(participant!.cursor!.y).toBe(200);
    expect(participant!.cursor!.line).toBe(5);
  });

  it('shares text selection', () => {
    const room = createPresenceRoom({ name: 'Room', documentId: 'doc-1' });
    room.join('user-1', 'Alice');

    room.updateSelection('user-1', {
      start: { line: 1, column: 0 },
      end: { line: 3, column: 15 },
    });

    const participant = room.getParticipant('user-1');
    expect(participant!.selection).not.toBeNull();
    expect(participant!.selection!.start.line).toBe(1);
    expect(participant!.selection!.end.line).toBe(3);
  });

  it('updates awareness indicators', () => {
    const room = createPresenceRoom({ name: 'Room', documentId: 'doc-1' });
    room.join('user-1', 'Alice');

    room.updateAwareness('user-1', {
      status: 'active',
      currentView: 'editor',
      typing: true,
    });

    const participant = room.getParticipant('user-1');
    expect(participant!.awareness.status).toBe('active');
    expect(participant!.awareness.currentView).toBe('editor');
    expect(participant!.awareness.typing).toBe(true);
  });

  it('tracks active vs inactive participants', () => {
    const room = createPresenceRoom({ name: 'Room', documentId: 'doc-1' });
    room.join('user-1', 'Alice');
    room.join('user-2', 'Bob');

    room.setActive('user-2', false);

    expect(room.getActiveParticipants()).toHaveLength(1);
    expect(room.getActiveParticipants()[0]!.userId).toBe('user-1');
  });

  it('closes room and marks all offline', () => {
    const room = createPresenceRoom({ name: 'Room', documentId: 'doc-1' });
    room.join('user-1', 'Alice');
    room.join('user-2', 'Bob');

    room.close();

    expect(room.getStatus()).toBe('closed');
    expect(room.isOpen()).toBe(false);
    const participants = room.getParticipants();
    expect(participants.every((p) => !p.isActive)).toBe(true);
    expect(participants.every((p) => p.awareness.status === 'offline')).toBe(true);
  });

  it('prevents joining closed room', () => {
    const room = createPresenceRoom({ name: 'Room', documentId: 'doc-1' });
    room.close();

    const p = room.join('user-1', 'Alice');
    expect(p).toBeNull();
  });
});
