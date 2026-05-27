import { describe, it, expect, beforeEach } from 'vitest';
import { BreakoutService } from '../services/breakout.service';

describe('BreakoutService', () => {
  let service: BreakoutService;

  beforeEach(() => {
    service = new BreakoutService();
  });

  describe('createBreakoutRoom', () => {
    it('creates a sub-room with parent reference and assigns initial participants', async () => {
      const room = await service.createBreakoutRoom('parent-1', 'Group A', ['p-1', 'p-2']);

      expect(room.id).toBeDefined();
      expect(room.parentRoomId).toBe('parent-1');
      expect(room.name).toBe('Group A');
      expect(room.participants).toEqual(['p-1', 'p-2']);
      expect(room.createdAt).toBeInstanceOf(Date);
      expect(room.closedAt).toBeNull();
    });

    it('creates room with empty participants when none assigned', async () => {
      const room = await service.createBreakoutRoom('parent-1', 'Empty Group', []);

      expect(room.participants).toEqual([]);
    });

    it('generates unique ids for each breakout room', async () => {
      const r1 = await service.createBreakoutRoom('parent-1', 'Group A', ['p-1']);
      const r2 = await service.createBreakoutRoom('parent-1', 'Group B', ['p-2']);

      expect(r1.id).not.toBe(r2.id);
    });

    it('does not mutate the input array', async () => {
      const participants = ['p-1', 'p-2'];
      const room = await service.createBreakoutRoom('parent-1', 'Group A', participants);

      room.participants.push('p-3');
      expect(participants).toEqual(['p-1', 'p-2']);
    });

    it('generates livekitRoomName with naming convention', async () => {
      const room = await service.createBreakoutRoom('parent-1', 'Group A', ['p-1']);

      expect(room.livekitRoomName).toBe('parent-1:breakout:Group A');
    });
  });

  describe('assignParticipant', () => {
    it('adds participant to breakout room', async () => {
      const room = await service.createBreakoutRoom('parent-1', 'Group A', ['p-1']);
      const updated = service.assignParticipant(room.id, 'p-2');

      expect(updated.participants).toContain('p-2');
      expect(updated.participants).toHaveLength(2);
    });

    it('throws BREAKOUT_ROOM_NOT_FOUND for non-existent room', () => {
      expect(() => service.assignParticipant('fake-id', 'p-1')).toThrow('Breakout room not found');
    });

    it('throws BREAKOUT_ROOM_CLOSED if room is closed', async () => {
      const room = await service.createBreakoutRoom('parent-1', 'Group A', ['p-1']);
      await service.closeBreakoutRoom(room.id);

      expect(() => service.assignParticipant(room.id, 'p-2')).toThrow('Breakout room is closed');
    });

    it('throws ALREADY_IN_BREAKOUT if participant already in room', async () => {
      const room = await service.createBreakoutRoom('parent-1', 'Group A', ['p-1']);

      expect(() => service.assignParticipant(room.id, 'p-1')).toThrow(
        'Participant already in breakout room',
      );
    });
  });

  describe('closeBreakoutRoom', () => {
    it('marks room as closed and clears participants', async () => {
      const room = await service.createBreakoutRoom('parent-1', 'Group A', ['p-1', 'p-2']);
      await service.closeBreakoutRoom(room.id);

      const rooms = service.listBreakoutRooms('parent-1');
      const closedRoom = rooms.find((r) => r.id === room.id);
      expect(closedRoom?.closedAt).toBeInstanceOf(Date);
      expect(closedRoom?.participants).toEqual([]);
    });

    it('throws BREAKOUT_ROOM_NOT_FOUND for non-existent room', async () => {
      await expect(service.closeBreakoutRoom('ghost-room')).rejects.toThrow(
        'Breakout room not found',
      );
    });

    it('throws BREAKOUT_ROOM_ALREADY_CLOSED if already closed', async () => {
      const room = await service.createBreakoutRoom('parent-1', 'Group A', ['p-1']);
      await service.closeBreakoutRoom(room.id);

      await expect(service.closeBreakoutRoom(room.id)).rejects.toThrow(
        'Breakout room already closed',
      );
    });
  });

  describe('listBreakoutRooms', () => {
    it('returns all breakout rooms for a parent (including closed)', async () => {
      await service.createBreakoutRoom('parent-1', 'Group A', ['p-1']);
      await service.createBreakoutRoom('parent-1', 'Group B', ['p-2']);
      const closedRoom = await service.createBreakoutRoom('parent-1', 'Group C', ['p-3']);
      await service.closeBreakoutRoom(closedRoom.id);

      const rooms = service.listBreakoutRooms('parent-1');

      expect(rooms).toHaveLength(3);
    });

    it('returns empty array for parent with no breakout rooms', () => {
      const rooms = service.listBreakoutRooms('no-parent');
      expect(rooms).toEqual([]);
    });

    it('does not return rooms from other parents', async () => {
      await service.createBreakoutRoom('parent-1', 'Group A', ['p-1']);
      await service.createBreakoutRoom('parent-2', 'Group B', ['p-2']);

      const rooms = service.listBreakoutRooms('parent-1');

      expect(rooms).toHaveLength(1);
      expect(rooms[0]!.parentRoomId).toBe('parent-1');
    });
  });

  describe('returnToMainRoom', () => {
    it('removes participant from breakout room', async () => {
      const room = await service.createBreakoutRoom('parent-1', 'Group A', ['p-1', 'p-2']);
      service.returnToMainRoom(room.id, 'p-1');

      const rooms = service.listBreakoutRooms('parent-1');
      const updated = rooms.find((r) => r.id === room.id);
      expect(updated?.participants).toEqual(['p-2']);
    });

    it('throws BREAKOUT_ROOM_NOT_FOUND for non-existent room', () => {
      expect(() => service.returnToMainRoom('fake-room', 'p-1')).toThrow('Breakout room not found');
    });

    it('throws PARTICIPANT_NOT_IN_BREAKOUT if participant not in room', async () => {
      const room = await service.createBreakoutRoom('parent-1', 'Group A', ['p-1']);

      expect(() => service.returnToMainRoom(room.id, 'p-99')).toThrow(
        'Participant not in breakout room',
      );
    });

    it('allows all participants to leave', async () => {
      const room = await service.createBreakoutRoom('parent-1', 'Group A', ['p-1', 'p-2']);
      service.returnToMainRoom(room.id, 'p-1');
      service.returnToMainRoom(room.id, 'p-2');

      const rooms = service.listBreakoutRooms('parent-1');
      const updated = rooms.find((r) => r.id === room.id);
      expect(updated?.participants).toEqual([]);
    });
  });
});
