// ============================================================================
// QuantMax - Duet & Stitch Service
// Side-by-side duets, stitched clips, layouts, reactions
// ============================================================================

interface Duet {
  id: string;
  originalVideoId: string;
  originalCreatorId: string;
  duetCreatorId: string;
  layout: DuetLayout;
  videoUrl: string;
  status: 'draft' | 'processing' | 'published' | 'removed';
  views: number;
  likes: number;
  comments: number;
  reactions: DuetReaction[];
  createdAt: string;
  publishedAt?: string;
  duration: number;
  sourceClipDuration?: number;
}

type DuetLayout = 'side_by_side' | 'top_bottom' | 'green_screen' | 'react_cam' | 'three_way';

interface DuetReaction {
  userId: string;
  type: 'like' | 'love' | 'funny' | 'wow' | 'sad';
  timestamp: string;
}

interface StitchConfig {
  originalVideoId: string;
  clipDuration: number;
  startTime: number;
  transitionType: 'cut' | 'fade' | 'swipe';
}

interface DuetSettings {
  videoId: string;
  allowDuets: boolean;
  allowStitch: boolean;
  maxStitchDuration: number;
  allowedLayouts: DuetLayout[];
}

class DuetStitchService {
  private duets: Map<string, Duet> = new Map();
  private videoDuets: Map<string, string[]> = new Map();
  private userDuets: Map<string, string[]> = new Map();
  private settings: Map<string, DuetSettings> = new Map();
  private counter: number = 0;

  private genId(prefix: string): string {
    return `${prefix}_${Date.now().toString(36)}_${(++this.counter).toString(36)}`;
  }

  async createDuet(originalVideoId: string, creatorId: string, layout: DuetLayout = 'side_by_side'): Promise<Duet> {
    const videoSettings = this.settings.get(originalVideoId);
    if (videoSettings && !videoSettings.allowDuets) throw new Error('Duets are disabled for this video');
    if (videoSettings && videoSettings.allowedLayouts.length > 0 && !videoSettings.allowedLayouts.includes(layout)) {
      throw new Error(`Layout ${layout} not allowed`);
    }

    const duet: Duet = {
      id: this.genId('duet'),
      originalVideoId,
      originalCreatorId: `creator_${originalVideoId.substring(0, 6)}`,
      duetCreatorId: creatorId,
      layout,
      videoUrl: '',
      status: 'draft',
      views: 0, likes: 0, comments: 0,
      reactions: [],
      createdAt: new Date().toISOString(),
      duration: 0,
    };

    this.duets.set(duet.id, duet);
    return duet;
  }

  async createStitch(originalVideoId: string, creatorId: string, config: StitchConfig): Promise<Duet> {
    const videoSettings = this.settings.get(originalVideoId);
    if (videoSettings && !videoSettings.allowStitch) throw new Error('Stitching disabled for this video');
    if (config.clipDuration < 1 || config.clipDuration > 5) throw new Error('Stitch clip must be 1-5 seconds');

    const duet: Duet = {
      id: this.genId('stitch'),
      originalVideoId,
      originalCreatorId: `creator_${originalVideoId.substring(0, 6)}`,
      duetCreatorId: creatorId,
      layout: 'side_by_side',
      videoUrl: '',
      status: 'draft',
      views: 0, likes: 0, comments: 0,
      reactions: [],
      createdAt: new Date().toISOString(),
      duration: 0,
      sourceClipDuration: config.clipDuration,
    };

    this.duets.set(duet.id, duet);
    return duet;
  }

  async setLayout(duetId: string, layout: DuetLayout): Promise<Duet> {
    const duet = this.duets.get(duetId);
    if (!duet) throw new Error('Duet not found');
    if (duet.status === 'published') throw new Error('Cannot modify published duet');
    duet.layout = layout;
    return duet;
  }

  async trimSource(duetId: string, startTime: number, endTime: number): Promise<Duet> {
    const duet = this.duets.get(duetId);
    if (!duet) throw new Error('Duet not found');
    if (endTime - startTime < 1) throw new Error('Clip must be at least 1 second');
    if (endTime - startTime > 60) throw new Error('Clip cannot exceed 60 seconds');
    duet.sourceClipDuration = endTime - startTime;
    return duet;
  }

  async publish(duetId: string, videoUrl: string, duration: number): Promise<Duet> {
    const duet = this.duets.get(duetId);
    if (!duet) throw new Error('Duet not found');
    if (duet.status === 'published') throw new Error('Already published');
    if (duration < 3 || duration > 180) throw new Error('Duration must be 3-180 seconds');

    duet.videoUrl = videoUrl;
    duet.duration = duration;
    duet.status = 'published';
    duet.publishedAt = new Date().toISOString();

    const vDuets = this.videoDuets.get(duet.originalVideoId) || [];
    vDuets.push(duet.id);
    this.videoDuets.set(duet.originalVideoId, vDuets);

    const uDuets = this.userDuets.get(duet.duetCreatorId) || [];
    uDuets.push(duet.id);
    this.userDuets.set(duet.duetCreatorId, uDuets);

    return duet;
  }

  async getReactions(duetId: string): Promise<{ total: number; byType: Record<string, number>; reactions: DuetReaction[] }> {
    const duet = this.duets.get(duetId);
    if (!duet) throw new Error('Duet not found');

    const byType: Record<string, number> = {};
    for (const r of duet.reactions) {
      byType[r.type] = (byType[r.type] || 0) + 1;
    }

    return { total: duet.reactions.length, byType, reactions: duet.reactions.slice(-50) };
  }

  async disableDuet(videoId: string, creatorId: string): Promise<DuetSettings> {
    const settings: DuetSettings = {
      videoId,
      allowDuets: false,
      allowStitch: false,
      maxStitchDuration: 5,
      allowedLayouts: [],
    };
    this.settings.set(videoId, settings);
    return settings;
  }

  async getDuetCount(videoId: string): Promise<number> {
    const ids = this.videoDuets.get(videoId) || [];
    return ids.filter(id => { const d = this.duets.get(id); return d && d.status === 'published'; }).length;
  }

  async addReaction(duetId: string, userId: string, type: DuetReaction['type']): Promise<DuetReaction> {
    const duet = this.duets.get(duetId);
    if (!duet) throw new Error('Duet not found');
    const reaction: DuetReaction = { userId, type, timestamp: new Date().toISOString() };
    duet.reactions.push(reaction);
    if (type === 'like') duet.likes++;
    return reaction;
  }
}

export const duetStitchService = new DuetStitchService();
export { DuetStitchService };
