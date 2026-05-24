// ============================================================================
// QuantTube API - Shows Controller
// Series, episodes, seasons, watch progress, downloads, originals catalog
// ============================================================================

import type { Request, Response } from '../middleware';

interface Show {
  id: string;
  title: string;
  description: string;
  posterUrl: string;
  bannerUrl: string;
  genre: string[];
  rating: string;
  year: number;
  isOriginal: boolean;
  seasons: Season[];
  status: 'ongoing' | 'completed' | 'upcoming';
  createdAt: string;
}

interface Season {
  id: string;
  number: number;
  title: string;
  episodes: Episode[];
  releaseDate: string;
}

interface Episode {
  id: string;
  number: number;
  title: string;
  description: string;
  duration: number;
  thumbnailUrl: string;
  streamUrl: string;
  releaseDate: string;
}

interface WatchProgress {
  userId: string;
  showId: string;
  episodeId: string;
  position: number;
  duration: number;
  completed: boolean;
  updatedAt: string;
}

const shows: Map<string, Show> = new Map();
const watchProgress: Map<string, WatchProgress[]> = new Map();

class ShowsController {
  async listShows(req: Request, res: Response): Promise<void> {
    const query = req.query as any;
    let filtered = Array.from(shows.values());
    if (query.genre) filtered = filtered.filter(s => s.genre.includes(query.genre));
    if (query.status) filtered = filtered.filter(s => s.status === query.status);
    res.status(200).json({ success: true, data: { shows: filtered } });
  }

  async getOriginals(req: Request, res: Response): Promise<void> {
    const originals = Array.from(shows.values()).filter(s => s.isOriginal);
    res.status(200).json({ success: true, data: { shows: originals } });
  }

  async getCategories(req: Request, res: Response): Promise<void> {
    const categories = ['Drama', 'Comedy', 'Thriller', 'Sci-Fi', 'Documentary', 'Animation', 'Action', 'Horror', 'Romance', 'Fantasy'];
    const categorized = categories.map(cat => ({
      name: cat,
      count: Array.from(shows.values()).filter(s => s.genre.includes(cat.toLowerCase())).length,
    }));
    res.status(200).json({ success: true, data: { categories: categorized } });
  }

  async getShow(req: Request, res: Response): Promise<void> {
    const show = shows.get(req.params.id);
    if (!show) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Show not found', statusCode: 404 } }); return; }
    res.status(200).json({ success: true, data: { show } });
  }

  async getSeasons(req: Request, res: Response): Promise<void> {
    const show = shows.get(req.params.id);
    if (!show) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Show not found', statusCode: 404 } }); return; }
    res.status(200).json({ success: true, data: { seasons: show.seasons.map(s => ({ ...s, episodes: s.episodes.length })) } });
  }

  async getSeason(req: Request, res: Response): Promise<void> {
    const show = shows.get(req.params.id);
    if (!show) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Show not found', statusCode: 404 } }); return; }
    const season = show.seasons.find(s => s.id === req.params.seasonId);
    if (!season) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Season not found', statusCode: 404 } }); return; }
    res.status(200).json({ success: true, data: { season } });
  }

  async getEpisode(req: Request, res: Response): Promise<void> {
    const show = shows.get(req.params.id);
    if (!show) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Show not found', statusCode: 404 } }); return; }
    let episode: Episode | undefined;
    for (const s of show.seasons) { episode = s.episodes.find(e => e.id === req.params.episodeId); if (episode) break; }
    if (!episode) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Episode not found', statusCode: 404 } }); return; }
    res.status(200).json({ success: true, data: { episode } });
  }

  async streamEpisode(req: Request, res: Response): Promise<void> {
    const show = shows.get(req.params.id);
    if (!show) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Show not found', statusCode: 404 } }); return; }
    let episode: Episode | undefined;
    for (const s of show.seasons) { episode = s.episodes.find(e => e.id === req.params.episodeId); if (episode) break; }
    if (!episode) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Episode not found', statusCode: 404 } }); return; }
    res.status(200).json({ success: true, data: { streamUrl: episode.streamUrl, quality: 'auto', availableQualities: ['360p', '480p', '720p', '1080p', '4k'] } });
  }

  async updateProgress(req: Request, res: Response): Promise<void> {
    const userId = req.userId || '';
    const body = req.body as any;
    const key = `${userId}_${req.params.id}`;
    const existing = watchProgress.get(key) || [];
    const idx = existing.findIndex(p => p.episodeId === body.episodeId);
    const entry: WatchProgress = { userId, showId: req.params.id, episodeId: body.episodeId, position: body.position || 0, duration: body.duration || 0, completed: body.completed || false, updatedAt: new Date().toISOString() };
    if (idx > -1) existing[idx] = entry; else existing.push(entry);
    watchProgress.set(key, existing);
    res.status(200).json({ success: true, data: { progress: entry } });
  }

  async getProgress(req: Request, res: Response): Promise<void> {
    const userId = req.userId || '';
    const key = `${userId}_${req.params.id}`;
    const progress = watchProgress.get(key) || [];
    res.status(200).json({ success: true, data: { progress } });
  }

  async downloadEpisode(req: Request, res: Response): Promise<void> {
    const body = req.body as any;
    res.status(200).json({ success: true, data: { downloadId: `dl_${Date.now().toString(36)}`, episodeId: body.episodeId, quality: body.quality || '720p', expiresAt: new Date(Date.now() + 48 * 3600000).toISOString() } });
  }

  async getContinueWatching(req: Request, res: Response): Promise<void> {
    const userId = req.userId || '';
    const allProgress: WatchProgress[] = [];
    for (const [key, entries] of watchProgress) { if (key.startsWith(userId)) allProgress.push(...entries.filter(e => !e.completed)); }
    allProgress.sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
    res.status(200).json({ success: true, data: { items: allProgress.slice(0, 20) } });
  }

  async createShow(req: Request, res: Response): Promise<void> {
    const body = req.body as any;
    const showId = `show_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;
    const show: Show = { id: showId, title: body.title, description: body.description || '', posterUrl: body.posterUrl || '', bannerUrl: body.bannerUrl || '', genre: body.genre || [], rating: body.rating || 'TV-14', year: body.year || new Date().getFullYear(), isOriginal: body.isOriginal || false, seasons: [], status: body.status || 'upcoming', createdAt: new Date().toISOString() };
    shows.set(showId, show);
    res.status(201).json({ success: true, data: { show } });
  }

  async updateShow(req: Request, res: Response): Promise<void> {
    const show = shows.get(req.params.id);
    if (!show) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Show not found', statusCode: 404 } }); return; }
    const body = req.body as any;
    if (body.title) show.title = body.title;
    if (body.description) show.description = body.description;
    if (body.genre) show.genre = body.genre;
    if (body.status) show.status = body.status;
    res.status(200).json({ success: true, data: { show } });
  }
}

export const showsController = new ShowsController();
