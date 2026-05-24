// ============================================================================
// QuantNeon API - Reels Controller
// Short-form video, effects, audio, duets, stitches, remix, trending audio
// ============================================================================

import type { Request, Response } from '../middleware';

interface Reel {
  id: string;
  userId: string;
  username: string;
  videoUrl: string;
  thumbnailUrl: string;
  caption: string;
  audioId: string;
  audioName: string;
  effects: string[];
  duration: number;
  likes: number;
  likedBy: Set<string>;
  comments: number;
  shares: number;
  plays: number;
  isDuet: boolean;
  isStitch: boolean;
  originalReelId?: string;
  createdAt: string;
}

interface AudioTrack {
  id: string;
  name: string;
  artist: string;
  duration: number;
  usageCount: number;
  isOriginal: boolean;
  creatorId?: string;
}

const reels: Map<string, Reel> = new Map();
const audioTracks: Map<string, AudioTrack> = new Map();

class ReelsController {
  async createReel(req: Request, res: Response): Promise<void> {
    const body = req.body as any;
    const reelId = `reel_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;
    const reel: Reel = { id: reelId, userId: req.userId || '', username: req.user?.username || '', videoUrl: body.videoUrl || '', thumbnailUrl: body.thumbnailUrl || '', caption: body.caption || '', audioId: body.audioId || 'original', audioName: body.audioName || 'Original Audio', effects: body.effects || [], duration: Math.min(body.duration || 30, 90), likes: 0, likedBy: new Set(), comments: 0, shares: 0, plays: 0, isDuet: false, isStitch: false, createdAt: new Date().toISOString() };
    reels.set(reelId, reel);
    // Track audio usage
    if (body.audioId) { const audio = audioTracks.get(body.audioId); if (audio) audio.usageCount++; }
    res.status(201).json({ success: true, data: { reel: { ...reel, likedBy: undefined } } });
  }

  async getReelsFeed(req: Request, res: Response): Promise<void> {
    const query = req.query as any;
    const page = parseInt((query.page as string) || '1');
    // Algorithmic feed: mix of trending, following, and new
    const allReels = Array.from(reels.values())
      .sort((a, b) => { const scoreA = a.plays * 0.3 + a.likes * 0.4 + (Date.now() - Date.parse(a.createdAt) < 86400000 ? 1000 : 0); const scoreB = b.plays * 0.3 + b.likes * 0.4 + (Date.now() - Date.parse(b.createdAt) < 86400000 ? 1000 : 0); return scoreB - scoreA; })
      .slice((page - 1) * 10, page * 10)
      .map(r => ({ ...r, likedBy: undefined, isLiked: r.likedBy.has(req.userId || '') }));
    res.status(200).json({ success: true, data: { reels: allReels } });
  }

  async getTrending(req: Request, res: Response): Promise<void> {
    const trending = Array.from(reels.values())
      .sort((a, b) => b.plays - a.plays)
      .slice(0, 20)
      .map(r => ({ ...r, likedBy: undefined }));
    res.status(200).json({ success: true, data: { reels: trending } });
  }

  async getReel(req: Request, res: Response): Promise<void> {
    const reel = reels.get(req.params.id);
    if (!reel) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Reel not found', statusCode: 404 } }); return; }
    reel.plays++;
    res.status(200).json({ success: true, data: { reel: { ...reel, likedBy: undefined, isLiked: reel.likedBy.has(req.userId || '') } } });
  }

  async deleteReel(req: Request, res: Response): Promise<void> {
    const reel = reels.get(req.params.id);
    if (!reel) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Reel not found', statusCode: 404 } }); return; }
    if (reel.userId !== req.userId) { res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Not authorized', statusCode: 403 } }); return; }
    reels.delete(req.params.id);
    res.status(200).json({ success: true, data: { message: 'Reel deleted' } });
  }

  async likeReel(req: Request, res: Response): Promise<void> {
    const reel = reels.get(req.params.id);
    if (!reel) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Reel not found', statusCode: 404 } }); return; }
    const userId = req.userId || '';
    if (!reel.likedBy.has(userId)) { reel.likedBy.add(userId); reel.likes++; }
    res.status(200).json({ success: true, data: { liked: true, likeCount: reel.likes } });
  }

  async commentOnReel(req: Request, res: Response): Promise<void> {
    const reel = reels.get(req.params.id);
    if (!reel) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Reel not found', statusCode: 404 } }); return; }
    const body = req.body as any;
    reel.comments++;
    res.status(201).json({ success: true, data: { commentId: `rcmt_${Date.now().toString(36)}`, text: body.text, reelId: reel.id } });
  }

  async createDuet(req: Request, res: Response): Promise<void> {
    const original = reels.get(req.params.id);
    if (!original) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Reel not found', statusCode: 404 } }); return; }
    const body = req.body as any;
    const duetId = `reel_duet_${Date.now().toString(36)}`;
    const duet: Reel = { id: duetId, userId: req.userId || '', username: req.user?.username || '', videoUrl: body.videoUrl || '', thumbnailUrl: body.thumbnailUrl || '', caption: body.caption || `Duet with @${original.username}`, audioId: original.audioId, audioName: original.audioName, effects: body.effects || [], duration: original.duration, likes: 0, likedBy: new Set(), comments: 0, shares: 0, plays: 0, isDuet: true, isStitch: false, originalReelId: original.id, createdAt: new Date().toISOString() };
    reels.set(duetId, duet);
    res.status(201).json({ success: true, data: { reel: { ...duet, likedBy: undefined } } });
  }

  async createStitch(req: Request, res: Response): Promise<void> {
    const original = reels.get(req.params.id);
    if (!original) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Reel not found', statusCode: 404 } }); return; }
    const body = req.body as any;
    const stitchId = `reel_stitch_${Date.now().toString(36)}`;
    const stitch: Reel = { id: stitchId, userId: req.userId || '', username: req.user?.username || '', videoUrl: body.videoUrl || '', thumbnailUrl: '', caption: body.caption || `Stitch with @${original.username}`, audioId: body.audioId || 'original', audioName: body.audioName || 'Original Audio', effects: [], duration: body.duration || 60, likes: 0, likedBy: new Set(), comments: 0, shares: 0, plays: 0, isDuet: false, isStitch: true, originalReelId: original.id, createdAt: new Date().toISOString() };
    reels.set(stitchId, stitch);
    res.status(201).json({ success: true, data: { reel: { ...stitch, likedBy: undefined } } });
  }

  async remixReel(req: Request, res: Response): Promise<void> {
    const body = req.body as any;
    res.status(201).json({ success: true, data: { remixId: `reel_remix_${Date.now().toString(36)}`, originalReelId: req.params.id, userId: req.userId } });
  }

  async getReelsByAudio(req: Request, res: Response): Promise<void> {
    const audioId = req.params.audioId;
    const audioReels = Array.from(reels.values()).filter(r => r.audioId === audioId).map(r => ({ ...r, likedBy: undefined }));
    res.status(200).json({ success: true, data: { reels: audioReels, audio: audioTracks.get(audioId) } });
  }

  async getTrendingAudio(req: Request, res: Response): Promise<void> {
    const trending = Array.from(audioTracks.values()).sort((a, b) => b.usageCount - a.usageCount).slice(0, 20);
    res.status(200).json({ success: true, data: { audio: trending } });
  }

  async getEffects(req: Request, res: Response): Promise<void> {
    const effects = [
      { id: 'effect_blur', name: 'Blur Background', category: 'background', popularity: 95 },
      { id: 'effect_slowmo', name: 'Slow Motion', category: 'speed', popularity: 88 },
      { id: 'effect_glitch', name: 'Glitch', category: 'artistic', popularity: 82 },
      { id: 'effect_green', name: 'Green Screen', category: 'background', popularity: 90 },
      { id: 'effect_beauty', name: 'Beauty Mode', category: 'face', popularity: 92 },
      { id: 'effect_timer', name: 'Timer', category: 'utility', popularity: 75 },
      { id: 'effect_duet', name: 'Duet Layout', category: 'layout', popularity: 85 },
    ];
    res.status(200).json({ success: true, data: { effects } });
  }
}

export const reelsController = new ReelsController();
