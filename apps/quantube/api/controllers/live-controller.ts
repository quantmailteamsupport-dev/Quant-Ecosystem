// ============================================================================
// QuantTube API - Live Controller
// Live streaming, real-time chat, donations/super chats, raids, clips, replay
// ============================================================================

import type { Request, Response } from '../middleware';
import { liveService } from '../services/live-service';

interface LiveStream {
  id: string;
  channelId: string;
  channelName: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  status: 'scheduled' | 'live' | 'ended';
  viewerCount: number;
  peakViewers: number;
  startedAt?: string;
  endedAt?: string;
  scheduledAt?: string;
  category: string;
  tags: string[];
  chatEnabled: boolean;
  donationsEnabled: boolean;
  streamKey: string;
  ingestUrl: string;
}

interface ChatMessage {
  id: string;
  streamId: string;
  userId: string;
  username: string;
  message: string;
  type: 'message' | 'superchat' | 'membership' | 'system';
  amount?: number;
  timestamp: string;
}

interface Clip {
  id: string;
  streamId: string;
  userId: string;
  title: string;
  startOffset: number;
  duration: number;
  url: string;
  views: number;
  createdAt: string;
}

const streams: Map<string, LiveStream> = new Map();
const chatMessages: Map<string, ChatMessage[]> = new Map();
const clips: Map<string, Clip[]> = new Map();

class LiveController {
  async startStream(req: Request, res: Response): Promise<void> {
    const body = req.body as any;
    const streamId = `live_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;
    const streamKey = liveService.generateStreamKey();
    const stream: LiveStream = { id: streamId, channelId: req.user?.channelId || req.userId || '', channelName: req.user?.username || '', title: body.title || 'Live Stream', description: body.description || '', thumbnailUrl: body.thumbnailUrl || '', status: 'live', viewerCount: 0, peakViewers: 0, startedAt: new Date().toISOString(), category: body.category || 'general', tags: body.tags || [], chatEnabled: body.chatEnabled !== false, donationsEnabled: body.donationsEnabled !== false, streamKey, ingestUrl: `rtmp://ingest.quant.app/live/${streamKey}` };
    streams.set(streamId, stream);
    res.status(201).json({ success: true, data: { stream, streamKey, ingestUrl: stream.ingestUrl } });
  }

  async stopStream(req: Request, res: Response): Promise<void> {
    const stream = streams.get(req.params.id);
    if (!stream) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Stream not found', statusCode: 404 } }); return; }
    stream.status = 'ended';
    stream.endedAt = new Date().toISOString();
    res.status(200).json({ success: true, data: { stream } });
  }

  async listStreams(req: Request, res: Response): Promise<void> {
    const query = req.query as any;
    let active = Array.from(streams.values()).filter(s => s.status === 'live');
    if (query.category) active = active.filter(s => s.category === query.category);
    active.sort((a, b) => b.viewerCount - a.viewerCount);
    res.status(200).json({ success: true, data: { streams: active } });
  }

  async getFeatured(req: Request, res: Response): Promise<void> {
    const featured = Array.from(streams.values()).filter(s => s.status === 'live').sort((a, b) => b.viewerCount - a.viewerCount).slice(0, 10);
    res.status(200).json({ success: true, data: { streams: featured } });
  }

  async getStream(req: Request, res: Response): Promise<void> {
    const stream = streams.get(req.params.id);
    if (!stream) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Stream not found', statusCode: 404 } }); return; }
    res.status(200).json({ success: true, data: { stream } });
  }

  async watchStream(req: Request, res: Response): Promise<void> {
    const stream = streams.get(req.params.id);
    if (!stream) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Stream not found', statusCode: 404 } }); return; }
    stream.viewerCount++;
    if (stream.viewerCount > stream.peakViewers) stream.peakViewers = stream.viewerCount;
    const playbackUrl = liveService.getPlaybackUrl(stream.id, stream.streamKey);
    res.status(200).json({ success: true, data: { playbackUrl, viewerCount: stream.viewerCount, chatEnabled: stream.chatEnabled } });
  }

  async sendChatMessage(req: Request, res: Response): Promise<void> {
    const body = req.body as any;
    const streamId = req.params.id;
    const msgId = `msg_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
    const msg: ChatMessage = { id: msgId, streamId, userId: req.userId || '', username: req.user?.username || '', message: body.message, type: 'message', timestamp: new Date().toISOString() };
    const messages = chatMessages.get(streamId) || [];
    messages.push(msg);
    chatMessages.set(streamId, messages);
    res.status(201).json({ success: true, data: { message: msg } });
  }

  async getChatMessages(req: Request, res: Response): Promise<void> {
    const streamId = req.params.id;
    const messages = chatMessages.get(streamId) || [];
    const since = (req.query as any).since;
    let filtered = messages;
    if (since) filtered = messages.filter(m => Date.parse(m.timestamp) > Date.parse(since as string));
    res.status(200).json({ success: true, data: { messages: filtered.slice(-100) } });
  }

  async sendSuperChat(req: Request, res: Response): Promise<void> {
    const body = req.body as any;
    const streamId = req.params.id;
    const msgId = `sc_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
    const msg: ChatMessage = { id: msgId, streamId, userId: req.userId || '', username: req.user?.username || '', message: body.message || '', type: 'superchat', amount: body.amount || 5, timestamp: new Date().toISOString() };
    const messages = chatMessages.get(streamId) || [];
    messages.push(msg);
    chatMessages.set(streamId, messages);
    res.status(201).json({ success: true, data: { superChat: msg } });
  }

  async donate(req: Request, res: Response): Promise<void> {
    const body = req.body as any;
    res.status(200).json({ success: true, data: { donationId: `don_${Date.now().toString(36)}`, streamId: req.params.id, amount: body.amount, currency: body.currency || 'USD', message: body.message || '', from: req.user?.username } });
  }

  async raid(req: Request, res: Response): Promise<void> {
    const body = req.body as any;
    const stream = streams.get(req.params.id);
    if (!stream) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Stream not found', statusCode: 404 } }); return; }
    res.status(200).json({ success: true, data: { raidId: `raid_${Date.now().toString(36)}`, fromStream: req.params.id, toChannel: body.targetChannelId, viewers: stream.viewerCount } });
  }

  async createClip(req: Request, res: Response): Promise<void> {
    const body = req.body as any;
    const clipId = `clip_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
    const clip: Clip = { id: clipId, streamId: req.params.id, userId: req.userId || '', title: body.title || 'Clip', startOffset: body.startOffset || 0, duration: Math.min(body.duration || 30, 60), url: `/clips/${clipId}`, views: 0, createdAt: new Date().toISOString() };
    const streamClips = clips.get(req.params.id) || [];
    streamClips.push(clip);
    clips.set(req.params.id, streamClips);
    res.status(201).json({ success: true, data: { clip } });
  }

  async getClips(req: Request, res: Response): Promise<void> {
    const streamClips = clips.get(req.params.id) || [];
    res.status(200).json({ success: true, data: { clips: streamClips } });
  }

  async getReplay(req: Request, res: Response): Promise<void> {
    const stream = streams.get(req.params.id);
    if (!stream || stream.status !== 'ended') { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Replay not available', statusCode: 404 } }); return; }
    res.status(200).json({ success: true, data: { replayUrl: `/replays/${stream.id}/manifest.m3u8`, duration: stream.startedAt && stream.endedAt ? (Date.parse(stream.endedAt) - Date.parse(stream.startedAt)) / 1000 : 0, chat: chatMessages.get(stream.id) || [] } });
  }

  async updateSettings(req: Request, res: Response): Promise<void> {
    const stream = streams.get(req.params.id);
    if (!stream) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Stream not found', statusCode: 404 } }); return; }
    const body = req.body as any;
    if (body.title) stream.title = body.title;
    if (body.chatEnabled !== undefined) stream.chatEnabled = body.chatEnabled;
    if (body.donationsEnabled !== undefined) stream.donationsEnabled = body.donationsEnabled;
    res.status(200).json({ success: true, data: { stream } });
  }

  async scheduleStream(req: Request, res: Response): Promise<void> {
    const body = req.body as any;
    const streamId = `live_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;
    const stream: LiveStream = { id: streamId, channelId: req.user?.channelId || req.userId || '', channelName: req.user?.username || '', title: body.title || 'Scheduled Stream', description: body.description || '', thumbnailUrl: body.thumbnailUrl || '', status: 'scheduled', viewerCount: 0, peakViewers: 0, scheduledAt: body.scheduledAt, category: body.category || 'general', tags: body.tags || [], chatEnabled: true, donationsEnabled: true, streamKey: liveService.generateStreamKey(), ingestUrl: '' };
    streams.set(streamId, stream);
    res.status(201).json({ success: true, data: { stream } });
  }
}

export const liveController = new LiveController();
