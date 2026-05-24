// ============================================================================
// QuantTube API - Music Controller
// Music streaming, albums, artists, playlists, radio, lyrics sync, podcasts
// ============================================================================

import type { Request, Response } from '../middleware';
import { musicService } from '../services/music-service';

interface Track {
  id: string;
  title: string;
  artistId: string;
  artistName: string;
  albumId: string;
  albumName: string;
  duration: number;
  trackNumber: number;
  streamUrl: string;
  coverUrl: string;
  genre: string;
  plays: number;
  explicit: boolean;
  releaseDate: string;
}

interface Album {
  id: string;
  title: string;
  artistId: string;
  artistName: string;
  coverUrl: string;
  releaseDate: string;
  tracks: string[];
  genre: string;
  type: 'album' | 'single' | 'ep';
}

interface Artist {
  id: string;
  name: string;
  bio: string;
  imageUrl: string;
  genres: string[];
  monthlyListeners: number;
  verified: boolean;
  albums: string[];
}

interface Podcast {
  id: string;
  title: string;
  host: string;
  description: string;
  coverUrl: string;
  category: string;
  episodes: PodcastEpisode[];
}

interface PodcastEpisode {
  id: string;
  title: string;
  description: string;
  duration: number;
  publishedAt: string;
  streamUrl: string;
}

const tracks: Map<string, Track> = new Map();
const albums: Map<string, Album> = new Map();
const artists: Map<string, Artist> = new Map();
const podcasts: Map<string, Podcast> = new Map();
const userQueues: Map<string, string[]> = new Map();

class MusicController {
  async getHome(req: Request, res: Response): Promise<void> {
    const recentTracks = Array.from(tracks.values()).slice(0, 10);
    const featuredAlbums = Array.from(albums.values()).slice(0, 6);
    const topArtists = Array.from(artists.values()).sort((a, b) => b.monthlyListeners - a.monthlyListeners).slice(0, 8);

    res.status(200).json({
      success: true,
      data: {
        sections: [
          { type: 'recent', title: 'Recently Played', items: recentTracks },
          { type: 'albums', title: 'New Releases', items: featuredAlbums },
          { type: 'artists', title: 'Popular Artists', items: topArtists },
        ],
      },
    });
  }

  async listTracks(req: Request, res: Response): Promise<void> {
    const query = req.query as any;
    const genre = query.genre;
    let filtered = Array.from(tracks.values());
    if (genre) filtered = filtered.filter(t => t.genre === genre);
    filtered.sort((a, b) => b.plays - a.plays);
    res.status(200).json({ success: true, data: { tracks: filtered.slice(0, 50) } });
  }

  async getTrack(req: Request, res: Response): Promise<void> {
    const track = tracks.get(req.params.id);
    if (!track) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Track not found', statusCode: 404 } });
      return;
    }
    track.plays++;
    res.status(200).json({ success: true, data: { track } });
  }

  async streamTrack(req: Request, res: Response): Promise<void> {
    const track = tracks.get(req.params.id);
    if (!track) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Track not found', statusCode: 404 } });
      return;
    }
    const quality = (req.query as any).quality || 'high';
    const streamInfo = musicService.getAudioStream(track.id, quality);
    res.status(200).json({ success: true, data: { streamUrl: streamInfo.url, quality: streamInfo.quality, format: streamInfo.format, bitrate: streamInfo.bitrate, expiresAt: streamInfo.expiresAt } });
  }

  async getLyrics(req: Request, res: Response): Promise<void> {
    const track = tracks.get(req.params.id);
    if (!track) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Track not found', statusCode: 404 } });
      return;
    }
    const lyrics = musicService.getSyncedLyrics(track.id);
    res.status(200).json({ success: true, data: { lyrics } });
  }

  async listAlbums(req: Request, res: Response): Promise<void> {
    const query = req.query as any;
    let filtered = Array.from(albums.values());
    if (query.genre) filtered = filtered.filter(a => a.genre === query.genre);
    if (query.type) filtered = filtered.filter(a => a.type === query.type);
    res.status(200).json({ success: true, data: { albums: filtered } });
  }

  async getAlbum(req: Request, res: Response): Promise<void> {
    const album = albums.get(req.params.id);
    if (!album) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Album not found', statusCode: 404 } });
      return;
    }
    const albumTracks = album.tracks.map(tid => tracks.get(tid)).filter(Boolean);
    res.status(200).json({ success: true, data: { album, tracks: albumTracks } });
  }

  async listArtists(req: Request, res: Response): Promise<void> {
    const allArtists = Array.from(artists.values()).sort((a, b) => b.monthlyListeners - a.monthlyListeners);
    res.status(200).json({ success: true, data: { artists: allArtists } });
  }

  async getArtist(req: Request, res: Response): Promise<void> {
    const artist = artists.get(req.params.id);
    if (!artist) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Artist not found', statusCode: 404 } });
      return;
    }
    const topTracks = Array.from(tracks.values()).filter(t => t.artistId === artist.id).sort((a, b) => b.plays - a.plays).slice(0, 10);
    res.status(200).json({ success: true, data: { artist, topTracks } });
  }

  async getDiscography(req: Request, res: Response): Promise<void> {
    const artist = artists.get(req.params.id);
    if (!artist) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Artist not found', statusCode: 404 } });
      return;
    }
    const discography = Array.from(albums.values()).filter(a => a.artistId === artist.id);
    res.status(200).json({ success: true, data: { artist: artist.name, discography } });
  }

  async getRadioStations(req: Request, res: Response): Promise<void> {
    const stations = [
      { id: 'radio_pop', name: 'Pop Hits Radio', genre: 'pop', description: 'Top pop tracks', listeners: 45000 },
      { id: 'radio_rock', name: 'Rock Classics', genre: 'rock', description: 'Best rock anthems', listeners: 32000 },
      { id: 'radio_hiphop', name: 'Hip-Hop Central', genre: 'hip-hop', description: 'Fresh beats', listeners: 55000 },
      { id: 'radio_electronic', name: 'Electronic Vibes', genre: 'electronic', description: 'EDM and chill', listeners: 28000 },
      { id: 'radio_jazz', name: 'Smooth Jazz', genre: 'jazz', description: 'Relaxing jazz', listeners: 15000 },
    ];
    res.status(200).json({ success: true, data: { stations } });
  }

  async generateRadio(req: Request, res: Response): Promise<void> {
    const body = req.body as any;
    const seedTrackId = body.seedTrackId;
    const seedGenre = body.genre;
    const stationId = `radio_custom_${Date.now().toString(36)}`;

    const radioTracks = musicService.generateRadioPlaylist(seedTrackId, seedGenre, 25);
    res.status(201).json({ success: true, data: { stationId, name: body.name || 'Custom Radio', tracks: radioTracks, seed: { trackId: seedTrackId, genre: seedGenre } } });
  }

  async listPodcasts(req: Request, res: Response): Promise<void> {
    const allPodcasts = Array.from(podcasts.values());
    res.status(200).json({ success: true, data: { podcasts: allPodcasts } });
  }

  async getPodcast(req: Request, res: Response): Promise<void> {
    const podcast = podcasts.get(req.params.id);
    if (!podcast) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Podcast not found', statusCode: 404 } });
      return;
    }
    res.status(200).json({ success: true, data: { podcast } });
  }

  async getPodcastEpisodes(req: Request, res: Response): Promise<void> {
    const podcast = podcasts.get(req.params.id);
    if (!podcast) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Podcast not found', statusCode: 404 } });
      return;
    }
    res.status(200).json({ success: true, data: { episodes: podcast.episodes } });
  }

  async addToQueue(req: Request, res: Response): Promise<void> {
    const userId = req.userId || '';
    const body = req.body as any;
    const queue = userQueues.get(userId) || [];
    queue.push(body.trackId);
    userQueues.set(userId, queue);
    res.status(200).json({ success: true, data: { queue, position: queue.length } });
  }

  async getQueue(req: Request, res: Response): Promise<void> {
    const userId = req.userId || '';
    const queue = userQueues.get(userId) || [];
    const queueTracks = queue.map(id => tracks.get(id)).filter(Boolean);
    res.status(200).json({ success: true, data: { queue: queueTracks } });
  }

  async removeFromQueue(req: Request, res: Response): Promise<void> {
    const userId = req.userId || '';
    const queue = userQueues.get(userId) || [];
    const idx = queue.indexOf(req.params.id);
    if (idx > -1) queue.splice(idx, 1);
    userQueues.set(userId, queue);
    res.status(200).json({ success: true, data: { queue } });
  }

  async uploadTrack(req: Request, res: Response): Promise<void> {
    const body = req.body as any;
    const trackId = `track_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;

    const track: Track = {
      id: trackId,
      title: body.title || 'Untitled Track',
      artistId: req.userId || '',
      artistName: req.user?.username || 'Unknown Artist',
      albumId: body.albumId || '',
      albumName: body.albumName || '',
      duration: body.duration || 0,
      trackNumber: body.trackNumber || 1,
      streamUrl: `/audio/${trackId}/stream`,
      coverUrl: body.coverUrl || '',
      genre: body.genre || 'other',
      plays: 0,
      explicit: body.explicit || false,
      releaseDate: body.releaseDate || new Date().toISOString(),
    };

    tracks.set(trackId, track);
    res.status(201).json({ success: true, data: { track } });
  }
}

export const musicController = new MusicController();
