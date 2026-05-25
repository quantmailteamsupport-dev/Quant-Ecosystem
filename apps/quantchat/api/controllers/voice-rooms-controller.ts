// ============================================================================
// QuantChat API - Voice Rooms Controller
// Voice room creation, management, participant handling
// ============================================================================

import type { Request, Response } from '../middleware';
import { voiceRoomService } from '../services/voice-room-service';

export class VoiceRoomsController {
  async createRoom(req: Request, res: Response): Promise<void> {
    const userId = req.userId!;
    const body = req.body as { name: string; type?: 'open' | 'invite_only' | 'social'; maxParticipants?: number };

    if (!body.name) {
      res.status(400).json({ success: false, error: { code: 'INVALID_REQUEST', message: 'Room name is required', statusCode: 400 } });
      return;
    }

    try {
      const room = await voiceRoomService.createRoom(userId, body);
      res.status(201).json({ success: true, data: room });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to create room';
      res.status(400).json({ success: false, error: { code: 'CREATE_FAILED', message: msg, statusCode: 400 } });
    }
  }

  async joinRoom(req: Request, res: Response): Promise<void> {
    const userId = req.userId!;
    const roomId = req.params['roomId'];

    try {
      const room = await voiceRoomService.joinRoom(userId, roomId);
      res.status(200).json({ success: true, data: room });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to join room';
      res.status(400).json({ success: false, error: { code: 'JOIN_FAILED', message: msg, statusCode: 400 } });
    }
  }

  async leaveRoom(req: Request, res: Response): Promise<void> {
    const userId = req.userId!;
    const roomId = req.params['roomId'];

    try {
      await voiceRoomService.leaveRoom(userId, roomId);
      res.status(200).json({ success: true, data: { message: 'Left room' } });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to leave room';
      res.status(400).json({ success: false, error: { code: 'LEAVE_FAILED', message: msg, statusCode: 400 } });
    }
  }

  async endRoom(req: Request, res: Response): Promise<void> {
    const userId = req.userId!;
    const roomId = req.params['roomId'];

    try {
      await voiceRoomService.endRoom(userId, roomId);
      res.status(200).json({ success: true, data: { message: 'Room ended' } });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to end room';
      res.status(400).json({ success: false, error: { code: 'END_FAILED', message: msg, statusCode: 400 } });
    }
  }

  async muteUser(req: Request, res: Response): Promise<void> {
    const userId = req.userId!;
    const roomId = req.params['roomId'];
    const body = req.body as { targetUserId: string };

    if (!body.targetUserId) {
      res.status(400).json({ success: false, error: { code: 'INVALID_REQUEST', message: 'Target user ID is required', statusCode: 400 } });
      return;
    }

    try {
      const participant = await voiceRoomService.muteUser(userId, roomId, body.targetUserId);
      res.status(200).json({ success: true, data: participant });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to mute user';
      res.status(400).json({ success: false, error: { code: 'MUTE_FAILED', message: msg, statusCode: 400 } });
    }
  }

  async setSpeaker(req: Request, res: Response): Promise<void> {
    const userId = req.userId!;
    const roomId = req.params['roomId'];
    const body = req.body as { targetUserId: string };

    try {
      const room = await voiceRoomService.setSpeaker(userId, roomId, body.targetUserId);
      res.status(200).json({ success: true, data: room });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to set speaker';
      res.status(400).json({ success: false, error: { code: 'SPEAKER_FAILED', message: msg, statusCode: 400 } });
    }
  }

  async listActiveRooms(req: Request, res: Response): Promise<void> {
    const type = req.query['type'] as string | undefined;
    const rooms = await voiceRoomService.listActiveRooms({ type });
    res.status(200).json({ success: true, data: rooms, metadata: { count: rooms.length } });
  }

  async getParticipants(req: Request, res: Response): Promise<void> {
    const roomId = req.params['roomId'];

    try {
      const participants = await voiceRoomService.getParticipants(roomId);
      res.status(200).json({ success: true, data: participants });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to get participants';
      res.status(400).json({ success: false, error: { code: 'FETCH_FAILED', message: msg, statusCode: 400 } });
    }
  }

  async setPermissions(req: Request, res: Response): Promise<void> {
    const userId = req.userId!;
    const roomId = req.params['roomId'];
    const body = req.body;

    try {
      const perms = await voiceRoomService.setPermissions(userId, roomId, body);
      res.status(200).json({ success: true, data: perms });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to update permissions';
      res.status(400).json({ success: false, error: { code: 'PERM_FAILED', message: msg, statusCode: 400 } });
    }
  }
}

export const voiceRoomsController = new VoiceRoomsController();
