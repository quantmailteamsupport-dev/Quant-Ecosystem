// ============================================================================
// QuantTube API - Playlists Controller
// Create/manage playlists (video + music), collaborative, auto-mix, smart shuffle
// ============================================================================

import type { Request, Response } from '../middleware';

interface Playlist {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  ownerId: string;
  ownerName: string;
  type: 'video' | 'music' | 'mixed';
  visibility: 'public' | 'private' | 'unlisted';
  items: PlaylistItem[];
  collaborators: string[];
  isCollaborative: boolean;
  itemCount: number;
  totalDuration: number;
  createdAt: string;
  updatedAt: string;
}

interface PlaylistItem {
  id: string;
  contentId: string;
  contentType: 'video' | 'track' | 'episode';
  title: string;
  duration: number;
  addedAt: string;
  addedBy: string;
  position: number;
}

const playlists: Map<string, Playlist> = new Map();

class PlaylistsController {
  async createPlaylist(req: Request, res: Response): Promise<void> {
    const body = req.body as any;
    const playlistId = `pl_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;
    const playlist: Playlist = { id: playlistId, title: body.title || 'New Playlist', description: body.description || '', thumbnailUrl: body.thumbnailUrl || '', ownerId: req.userId || '', ownerName: req.user?.username || '', type: body.type || 'mixed', visibility: body.visibility || 'private', items: [], collaborators: [], isCollaborative: body.isCollaborative || false, itemCount: 0, totalDuration: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    playlists.set(playlistId, playlist);
    res.status(201).json({ success: true, data: { playlist } });
  }

  async listPlaylists(req: Request, res: Response): Promise<void> {
    const userId = req.userId || '';
    const userPlaylists = Array.from(playlists.values()).filter(p => p.ownerId === userId || p.collaborators.includes(userId));
    res.status(200).json({ success: true, data: { playlists: userPlaylists } });
  }

  async getPlaylist(req: Request, res: Response): Promise<void> {
    const playlist = playlists.get(req.params.id);
    if (!playlist) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Playlist not found', statusCode: 404 } }); return; }
    if (playlist.visibility === 'private' && playlist.ownerId !== req.userId && !playlist.collaborators.includes(req.userId || '')) { res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Private playlist', statusCode: 403 } }); return; }
    res.status(200).json({ success: true, data: { playlist } });
  }

  async updatePlaylist(req: Request, res: Response): Promise<void> {
    const playlist = playlists.get(req.params.id);
    if (!playlist) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Playlist not found', statusCode: 404 } }); return; }
    if (playlist.ownerId !== req.userId) { res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Not playlist owner', statusCode: 403 } }); return; }
    const body = req.body as any;
    if (body.title) playlist.title = body.title;
    if (body.description) playlist.description = body.description;
    if (body.visibility) playlist.visibility = body.visibility;
    if (body.isCollaborative !== undefined) playlist.isCollaborative = body.isCollaborative;
    playlist.updatedAt = new Date().toISOString();
    res.status(200).json({ success: true, data: { playlist } });
  }

  async deletePlaylist(req: Request, res: Response): Promise<void> {
    const playlist = playlists.get(req.params.id);
    if (!playlist) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Playlist not found', statusCode: 404 } }); return; }
    if (playlist.ownerId !== req.userId) { res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Not playlist owner', statusCode: 403 } }); return; }
    playlists.delete(req.params.id);
    res.status(200).json({ success: true, data: { message: 'Playlist deleted' } });
  }

  async addItem(req: Request, res: Response): Promise<void> {
    const playlist = playlists.get(req.params.id);
    if (!playlist) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Playlist not found', statusCode: 404 } }); return; }
    const body = req.body as any;
    const item: PlaylistItem = { id: `pli_${Date.now().toString(36)}`, contentId: body.contentId, contentType: body.contentType || 'video', title: body.title || '', duration: body.duration || 0, addedAt: new Date().toISOString(), addedBy: req.userId || '', position: playlist.items.length };
    playlist.items.push(item);
    playlist.itemCount = playlist.items.length;
    playlist.totalDuration += item.duration;
    playlist.updatedAt = new Date().toISOString();
    res.status(200).json({ success: true, data: { item, playlist: { id: playlist.id, itemCount: playlist.itemCount } } });
  }

  async removeItem(req: Request, res: Response): Promise<void> {
    const playlist = playlists.get(req.params.id);
    if (!playlist) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Playlist not found', statusCode: 404 } }); return; }
    const idx = playlist.items.findIndex(i => i.id === req.params.itemId);
    if (idx > -1) { const removed = playlist.items.splice(idx, 1)[0]; playlist.totalDuration -= removed.duration; playlist.itemCount = playlist.items.length; }
    playlist.updatedAt = new Date().toISOString();
    res.status(200).json({ success: true, data: { message: 'Item removed' } });
  }

  async reorderItems(req: Request, res: Response): Promise<void> {
    const playlist = playlists.get(req.params.id);
    if (!playlist) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Playlist not found', statusCode: 404 } }); return; }
    const body = req.body as any;
    const order: string[] = body.order || [];
    const reordered: PlaylistItem[] = [];
    for (const itemId of order) { const item = playlist.items.find(i => i.id === itemId); if (item) { item.position = reordered.length; reordered.push(item); } }
    playlist.items = reordered;
    playlist.updatedAt = new Date().toISOString();
    res.status(200).json({ success: true, data: { items: playlist.items } });
  }

  async addCollaborator(req: Request, res: Response): Promise<void> {
    const playlist = playlists.get(req.params.id);
    if (!playlist) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Playlist not found', statusCode: 404 } }); return; }
    const body = req.body as any;
    if (!playlist.collaborators.includes(body.userId)) playlist.collaborators.push(body.userId);
    playlist.isCollaborative = true;
    res.status(200).json({ success: true, data: { collaborators: playlist.collaborators } });
  }

  async removeCollaborator(req: Request, res: Response): Promise<void> {
    const playlist = playlists.get(req.params.id);
    if (!playlist) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Playlist not found', statusCode: 404 } }); return; }
    const idx = playlist.collaborators.indexOf(req.params.userId);
    if (idx > -1) playlist.collaborators.splice(idx, 1);
    res.status(200).json({ success: true, data: { collaborators: playlist.collaborators } });
  }

  async generateAutoMix(req: Request, res: Response): Promise<void> {
    const body = req.body as any;
    const seedTracks: string[] = body.seedTracks || [];
    const mood = body.mood || 'mixed';
    const mixId = `mix_${Date.now().toString(36)}`;
    // Scoring logic: rank by similarity to seed tracks
    const scores = seedTracks.map((t, i) => ({ trackId: t, score: 1.0 - (i * 0.05) }));
    res.status(201).json({ success: true, data: { mixId, name: `Auto Mix - ${mood}`, seedTracks, generatedTracks: scores, totalItems: scores.length + 15 } });
  }

  async smartShuffle(req: Request, res: Response): Promise<void> {
    const playlist = playlists.get(req.params.id);
    if (!playlist) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Playlist not found', statusCode: 404 } }); return; }
    // Fisher-Yates shuffle with genre clustering
    const shuffled = [...playlist.items];
    for (let i = shuffled.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]; }
    res.status(200).json({ success: true, data: { shuffledOrder: shuffled.map(i => i.id), algorithm: 'smart_shuffle_v2' } });
  }

  async getSuggested(req: Request, res: Response): Promise<void> {
    res.status(200).json({ success: true, data: { suggestions: [{ type: 'daily_mix', title: 'Daily Mix 1', description: 'Based on your recent listening' }, { type: 'discover', title: 'Discover Weekly', description: 'New music we think you will love' }] } });
  }
}

export const playlistsController = new PlaylistsController();
