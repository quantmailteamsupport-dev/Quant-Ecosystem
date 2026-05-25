// ============================================================================
// QuantMax - Sound Library Service
// Sound search, trending, favorites, usage tracking, original creation
// ============================================================================

interface Sound { id: string; title: string; artist: string; duration: number; url: string; thumbnailUrl: string; category: string; tags: string[]; usageCount: number; likes: number; isOriginal: boolean; createdAt: string; bpm?: number; key?: string; }
interface SoundUsage { id: string; soundId: string; videoId: string; userId: string; startTime: number; endTime: number; usedAt: string; }
interface TrendingSound { sound: Sound; velocity: number; rank: number; rankChange: number; usesLast24h: number; }

class SoundLibraryService {
  private sounds: Map<string, Sound> = new Map();
  private favorites: Map<string, string[]> = new Map();
  private usages: Map<string, SoundUsage[]> = new Map();
  private counter: number = 0;

  constructor() { this.initSounds(); }

  private genId(prefix: string): string { return `${prefix}_${Date.now().toString(36)}_${(++this.counter).toString(36)}`; }

  private initSounds(): void {
    const soundData = [
      { title: 'Viral Beat', artist: 'BeatMaker', category: 'hip-hop', bpm: 140 },
      { title: 'Chill Vibes', artist: 'LoFiKing', category: 'lofi', bpm: 85 },
      { title: 'Epic Drop', artist: 'EDMaster', category: 'electronic', bpm: 128 },
      { title: 'Acoustic Morning', artist: 'GuitarGirl', category: 'acoustic', bpm: 100 },
      { title: 'Pop Anthem', artist: 'PopStar', category: 'pop', bpm: 120 },
      { title: 'Trap King', artist: 'TrapLord', category: 'trap', bpm: 150 },
      { title: 'Jazz Cafe', artist: 'SmoothJazz', category: 'jazz', bpm: 110 },
      { title: 'Rock Energy', artist: 'RockBand', category: 'rock', bpm: 135 },
      { title: 'Classical Piano', artist: 'Pianist', category: 'classical', bpm: 72 },
      { title: 'Reggaeton Flow', artist: 'Latino', category: 'latin', bpm: 95 },
    ];

    soundData.forEach((s, i) => {
      const sound: Sound = {
        id: `sound_${i}`, title: s.title, artist: s.artist, duration: 15 + Math.floor(Math.random() * 45),
        url: `https://cdn.quant.max/sounds/${i}.mp3`, thumbnailUrl: `https://cdn.quant.max/sounds/${i}/thumb.jpg`,
        category: s.category, tags: [s.category, 'trending', 'featured'], usageCount: Math.floor(1000 + Math.random() * 500000),
        likes: Math.floor(500 + Math.random() * 50000), isOriginal: false, createdAt: new Date(Date.now() - Math.random() * 90 * 86400000).toISOString(), bpm: s.bpm, key: ['C', 'D', 'E', 'F', 'G', 'A', 'B'][Math.floor(Math.random() * 7)] + (Math.random() > 0.5 ? ' minor' : ' major'),
      };
      this.sounds.set(sound.id, sound);
    });
  }

  async search(query: string, opts?: { category?: string; bpmMin?: number; bpmMax?: number; limit?: number }): Promise<Sound[]> {
    let results = Array.from(this.sounds.values());
    if (query) results = results.filter(s => s.title.toLowerCase().includes(query.toLowerCase()) || s.artist.toLowerCase().includes(query.toLowerCase()) || s.tags.some(t => t.includes(query.toLowerCase())));
    if (opts?.category) results = results.filter(s => s.category === opts.category);
    if (opts?.bpmMin) results = results.filter(s => (s.bpm || 0) >= opts.bpmMin!);
    if (opts?.bpmMax) results = results.filter(s => (s.bpm || 200) <= opts.bpmMax!);
    return results.sort((a, b) => b.usageCount - a.usageCount).slice(0, opts?.limit || 20);
  }

  async getTrending(limit: number = 20): Promise<TrendingSound[]> {
    const sounds = Array.from(this.sounds.values());
    return sounds.map((sound, i) => {
      const velocity = sound.usageCount / (Math.max(1, (Date.now() - new Date(sound.createdAt).getTime()) / 86400000));
      return { sound, velocity: Math.round(velocity), rank: 0, rankChange: Math.floor((Math.random() - 0.3) * 5), usesLast24h: Math.floor(sound.usageCount * 0.05) };
    }).sort((a, b) => b.velocity - a.velocity).slice(0, limit).map((t, i) => ({ ...t, rank: i + 1 }));
  }

  async getByCategory(category: string): Promise<Sound[]> { return Array.from(this.sounds.values()).filter(s => s.category === category); }

  async addToFavorites(userId: string, soundId: string): Promise<{ added: boolean }> {
    const sound = this.sounds.get(soundId);
    if (!sound) throw new Error('Sound not found');
    const userFavs = this.favorites.get(userId) || [];
    if (userFavs.includes(soundId)) throw new Error('Already in favorites');
    userFavs.push(soundId);
    this.favorites.set(userId, userFavs);
    sound.likes++;
    return { added: true };
  }

  async useInVideo(soundId: string, videoId: string, userId: string, startTime: number = 0, endTime?: number): Promise<SoundUsage> {
    const sound = this.sounds.get(soundId);
    if (!sound) throw new Error('Sound not found');
    const usage: SoundUsage = { id: this.genId('use'), soundId, videoId, userId, startTime, endTime: endTime || sound.duration, usedAt: new Date().toISOString() };
    const soundUsages = this.usages.get(soundId) || [];
    soundUsages.push(usage);
    this.usages.set(soundId, soundUsages);
    sound.usageCount++;
    return usage;
  }

  async getUsageCount(soundId: string): Promise<{ soundId: string; total: number; last24h: number; last7d: number }> {
    const sound = this.sounds.get(soundId);
    if (!sound) throw new Error('Sound not found');
    const usages = this.usages.get(soundId) || [];
    const now = Date.now();
    const last24h = usages.filter(u => now - new Date(u.usedAt).getTime() < 86400000).length;
    const last7d = usages.filter(u => now - new Date(u.usedAt).getTime() < 7 * 86400000).length;
    return { soundId, total: sound.usageCount, last24h, last7d };
  }

  async createOriginal(userId: string, title: string, audioUrl: string, duration: number, opts?: { category?: string; bpm?: number; tags?: string[] }): Promise<Sound> {
    if (title.length < 2 || title.length > 100) throw new Error('Title must be 2-100 characters');
    if (duration < 5 || duration > 60) throw new Error('Duration must be 5-60 seconds');
    const sound: Sound = {
      id: this.genId('sound'), title, artist: userId, duration, url: audioUrl,
      thumbnailUrl: `https://cdn.quant.max/sounds/custom/${this.genId('t')}.jpg`,
      category: opts?.category || 'original', tags: opts?.tags || ['original'],
      usageCount: 0, likes: 0, isOriginal: true, createdAt: new Date().toISOString(),
      bpm: opts?.bpm,
    };
    this.sounds.set(sound.id, sound);
    return sound;
  }

  async getSoundDetails(soundId: string): Promise<Sound & { relatedCount: number }> {
    const sound = this.sounds.get(soundId);
    if (!sound) throw new Error('Sound not found');
    const relatedCount = Array.from(this.sounds.values()).filter(s => s.category === sound.category && s.id !== soundId).length;
    return { ...sound, relatedCount };
  }

  async getRelated(soundId: string, limit: number = 10): Promise<Sound[]> {
    const sound = this.sounds.get(soundId);
    if (!sound) throw new Error('Sound not found');
    return Array.from(this.sounds.values()).filter(s => s.category === sound.category && s.id !== soundId).sort((a, b) => b.usageCount - a.usageCount).slice(0, limit);
  }

  async reportSound(soundId: string, userId: string, reason: string): Promise<{ reported: boolean }> {
    const sound = this.sounds.get(soundId);
    if (!sound) throw new Error('Sound not found');
    return { reported: true };
  }
}

export const soundLibraryService = new SoundLibraryService();
export { SoundLibraryService };
