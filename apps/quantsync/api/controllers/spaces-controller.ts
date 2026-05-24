// ============================================================================
// QuantSync - Spaces Controller
// Live audio rooms (like Twitter Spaces)
// ============================================================================

import type { Request, Response } from '../middleware';
import type { Space, SpaceParticipant } from '../../src/types';

class SpacesController {
  private spaces: Map<string, Space> = new Map();
  private userActiveSpace: Map<string, string> = new Map();

  async createSpace(req: Request, res: Response): Promise<void> {
    const userId = req.userId!;
    const body = req.body as {
      title: string;
      description?: string;
      topics?: string[];
      scheduledAt?: string;
      maxListeners?: number;
      communityId?: string;
      isRecording?: boolean;
    };

    if (!body.title) {
      res.status(400).json({ success: false, error: { code: 'TITLE_REQUIRED', message: 'Space title is required', statusCode: 400 } });
      return;
    }

    const space: Space = {
      id: `space_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      title: body.title,
      description: body.description || '',
      hostId: userId,
      coHosts: [],
      speakers: [],
      listeners: [],
      status: body.scheduledAt ? 'scheduled' : 'live',
      scheduledAt: body.scheduledAt,
      startedAt: body.scheduledAt ? undefined : new Date().toISOString(),
      listenerCount: 0,
      maxListeners: body.maxListeners || 1000,
      topics: body.topics || [],
      isRecording: body.isRecording || false,
      communityId: body.communityId,
    };

    // Add host as speaker
    space.speakers.push({
      userId,
      role: 'host',
      isMuted: false,
      joinedAt: new Date().toISOString(),
      raisedHand: false,
    });

    this.spaces.set(space.id, space);
    this.userActiveSpace.set(userId, space.id);

    res.status(201).json({ success: true, data: space });
  }

  async getSpace(req: Request, res: Response): Promise<void> {
    const spaceId = req.params['id'];
    const space = this.spaces.get(spaceId);

    if (!space) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Space not found', statusCode: 404 } });
      return;
    }

    res.status(200).json({ success: true, data: space });
  }

  async listLiveSpaces(req: Request, res: Response): Promise<void> {
    const query = req.query as Record<string, string>;
    const limit = Math.min(parseInt(query['limit'] || '20', 10), 50);

    const liveSpaces = Array.from(this.spaces.values())
      .filter(s => s.status === 'live')
      .sort((a, b) => b.listenerCount - a.listenerCount)
      .slice(0, limit);

    res.status(200).json({ success: true, data: liveSpaces });
  }

  async listScheduledSpaces(req: Request, res: Response): Promise<void> {
    const scheduledSpaces = Array.from(this.spaces.values())
      .filter(s => s.status === 'scheduled')
      .sort((a, b) => new Date(a.scheduledAt || 0).getTime() - new Date(b.scheduledAt || 0).getTime());

    res.status(200).json({ success: true, data: scheduledSpaces });
  }

  async joinSpace(req: Request, res: Response): Promise<void> {
    const userId = req.userId!;
    const spaceId = req.params['id'];

    const space = this.spaces.get(spaceId);
    if (!space) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Space not found', statusCode: 404 } });
      return;
    }

    if (space.status !== 'live') {
      res.status(400).json({ success: false, error: { code: 'NOT_LIVE', message: 'Space is not currently live', statusCode: 400 } });
      return;
    }

    if (space.listenerCount >= space.maxListeners) {
      res.status(400).json({ success: false, error: { code: 'SPACE_FULL', message: 'Space has reached maximum capacity', statusCode: 400 } });
      return;
    }

    const participant: SpaceParticipant = {
      userId,
      role: 'listener',
      isMuted: true,
      joinedAt: new Date().toISOString(),
      raisedHand: false,
    };

    space.listeners.push(participant);
    space.listenerCount++;
    this.userActiveSpace.set(userId, spaceId);

    res.status(200).json({ success: true, data: { joined: true, space } });
  }

  async leaveSpace(req: Request, res: Response): Promise<void> {
    const userId = req.userId!;
    const spaceId = req.params['id'];

    const space = this.spaces.get(spaceId);
    if (!space) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Space not found', statusCode: 404 } });
      return;
    }

    // Remove from speakers or listeners
    space.speakers = space.speakers.filter(s => s.userId !== userId);
    space.listeners = space.listeners.filter(l => l.userId !== userId);
    space.listenerCount = space.listeners.length;
    this.userActiveSpace.delete(userId);

    // End space if host leaves
    if (space.hostId === userId) {
      space.status = 'ended';
      space.endedAt = new Date().toISOString();
    }

    res.status(200).json({ success: true, data: { left: true } });
  }

  async raiseHand(req: Request, res: Response): Promise<void> {
    const userId = req.userId!;
    const spaceId = req.params['id'];

    const space = this.spaces.get(spaceId);
    if (!space) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Space not found', statusCode: 404 } });
      return;
    }

    const listener = space.listeners.find(l => l.userId === userId);
    if (!listener) {
      res.status(400).json({ success: false, error: { code: 'NOT_LISTENER', message: 'You must be a listener to raise hand', statusCode: 400 } });
      return;
    }

    listener.raisedHand = !listener.raisedHand;
    res.status(200).json({ success: true, data: { raisedHand: listener.raisedHand } });
  }

  async promoteToSpeaker(req: Request, res: Response): Promise<void> {
    const hostId = req.userId!;
    const spaceId = req.params['id'];
    const body = req.body as { userId: string };

    const space = this.spaces.get(spaceId);
    if (!space) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Space not found', statusCode: 404 } });
      return;
    }

    if (space.hostId !== hostId && !space.coHosts.some(h => h.id === hostId)) {
      res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Only hosts can promote speakers', statusCode: 403 } });
      return;
    }

    const listenerIndex = space.listeners.findIndex(l => l.userId === body.userId);
    if (listenerIndex === -1) {
      res.status(400).json({ success: false, error: { code: 'NOT_FOUND', message: 'User not found in listeners', statusCode: 400 } });
      return;
    }

    const [listener] = space.listeners.splice(listenerIndex, 1);
    listener.role = 'speaker';
    listener.isMuted = true;
    listener.raisedHand = false;
    space.speakers.push(listener);
    space.listenerCount--;

    res.status(200).json({ success: true, data: { promoted: true, speaker: listener } });
  }

  async endSpace(req: Request, res: Response): Promise<void> {
    const userId = req.userId!;
    const spaceId = req.params['id'];

    const space = this.spaces.get(spaceId);
    if (!space) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Space not found', statusCode: 404 } });
      return;
    }

    if (space.hostId !== userId) {
      res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Only the host can end the space', statusCode: 403 } });
      return;
    }

    space.status = 'ended';
    space.endedAt = new Date().toISOString();

    res.status(200).json({ success: true, data: { ended: true, duration: space.startedAt ? Date.now() - new Date(space.startedAt).getTime() : 0 } });
  }
}

export const spacesController = new SpacesController();
export default SpacesController;
