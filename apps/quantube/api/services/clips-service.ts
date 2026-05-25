// ============================================================================
// QuantTube - Clips Service
// Video clips creation, sharing, trending, analytics
// ============================================================================

interface Clip {
  id: string;
  videoId: string;
  creatorId: string;
  title: string;
  startTime: number;
  endTime: number;
  duration: number;
  thumbnailUrl: string;
  clipUrl: string;
  views: number;
  likes: number;
  shares: number;
  status: 'processing' | 'active' | 'removed';
  createdAt: string;
  updatedAt: string;
}

interface ClipShare {
  id: string;
  clipId: string;
  platform: 'twitter' | 'facebook' | 'reddit' | 'discord' | 'embed' | 'link';
  userId: string;
  sharedAt: string;
  clicks: number;
}

interface TrendingClip {
  clip: Clip;
  score: number;
  velocity: number;
  rankChange: number;
}

interface ClipAnalytics {
  clipId: string;
  totalViews: number;
  uniqueViewers: number;
  avgWatchPercentage: number;
  shareCount: number;
  conversionToFullVideo: number;
  peakConcurrentViewers: number;
  viewsBySource: { source: string; views: number }[];
}

class ClipsService {
  private clips: Map<string, Clip> = new Map();
  private videoClips: Map<string, string[]> = new Map();
  private creatorClips: Map<string, string[]> = new Map();
  private shares: Map<string, ClipShare[]> = new Map();
  private counter: number = 0;

  private genId(prefix: string): string {
    return `${prefix}_${Date.now().toString(36)}_${(++this.counter).toString(36)}`;
  }

  async createClip(videoId: string, creatorId: string, startTime: number, endTime: number, title: string): Promise<Clip> {
    if (endTime <= startTime) throw new Error('End time must be after start time');
    const duration = endTime - startTime;
    if (duration < 5) throw new Error('Clip must be at least 5 seconds');
    if (duration > 60) throw new Error('Clip cannot exceed 60 seconds');
    if (title.length < 1 || title.length > 140) throw new Error('Title must be 1-140 characters');

    const clip: Clip = {
      id: this.genId('clip'),
      videoId,
      creatorId,
      title: title.trim(),
      startTime,
      endTime,
      duration,
      thumbnailUrl: `https://cdn.quant.tube/clips/${videoId}/${startTime}.jpg`,
      clipUrl: `https://clips.quant.tube/${this.genId('c')}`,
      views: 0,
      likes: 0,
      shares: 0,
      status: 'processing',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Simulate processing
    setTimeout(() => { clip.status = 'active'; }, 0);
    clip.status = 'active';

    this.clips.set(clip.id, clip);
    const vClips = this.videoClips.get(videoId) || [];
    vClips.push(clip.id);
    this.videoClips.set(videoId, vClips);
    const cClips = this.creatorClips.get(creatorId) || [];
    cClips.push(clip.id);
    this.creatorClips.set(creatorId, cClips);

    return clip;
  }

  async shareClip(clipId: string, userId: string, platform: ClipShare['platform']): Promise<ClipShare> {
    const clip = this.clips.get(clipId);
    if (!clip) throw new Error('Clip not found');
    if (clip.status !== 'active') throw new Error('Clip is not available');

    const share: ClipShare = {
      id: this.genId('share'),
      clipId,
      platform,
      userId,
      sharedAt: new Date().toISOString(),
      clicks: 0,
    };

    clip.shares++;
    clip.updatedAt = new Date().toISOString();
    const clipShares = this.shares.get(clipId) || [];
    clipShares.push(share);
    this.shares.set(clipId, clipShares);

    return share;
  }

  async getClipViews(clipId: string): Promise<ClipAnalytics> {
    const clip = this.clips.get(clipId);
    if (!clip) throw new Error('Clip not found');

    const uniqueViewers = Math.floor(clip.views * 0.75);
    const avgWatchPct = 60 + Math.random() * 35;
    const conversion = Math.random() * 15;

    return {
      clipId,
      totalViews: clip.views,
      uniqueViewers,
      avgWatchPercentage: Math.round(avgWatchPct * 100) / 100,
      shareCount: clip.shares,
      conversionToFullVideo: Math.round(conversion * 100) / 100,
      peakConcurrentViewers: Math.floor(clip.views * 0.1),
      viewsBySource: [
        { source: 'direct', views: Math.floor(clip.views * 0.3) },
        { source: 'social', views: Math.floor(clip.views * 0.4) },
        { source: 'embed', views: Math.floor(clip.views * 0.2) },
        { source: 'search', views: Math.floor(clip.views * 0.1) },
      ],
    };
  }

  async deleteClip(clipId: string, userId: string): Promise<boolean> {
    const clip = this.clips.get(clipId);
    if (!clip) throw new Error('Clip not found');
    if (clip.creatorId !== userId) throw new Error('Only clip creator can delete');

    clip.status = 'removed';
    clip.updatedAt = new Date().toISOString();
    return true;
  }

  async trendingClips(limit: number = 20, category?: string): Promise<TrendingClip[]> {
    const activeClips = Array.from(this.clips.values()).filter(c => c.status === 'active');

    const scored = activeClips.map(clip => {
      const ageHours = (Date.now() - new Date(clip.createdAt).getTime()) / 3600000;
      const recencyBoost = Math.max(0, 1 - ageHours / 168);
      const engagementScore = (clip.views * 1 + clip.likes * 3 + clip.shares * 5);
      const velocity = ageHours > 0 ? engagementScore / ageHours : engagementScore;
      const score = velocity * recencyBoost * 100;

      return { clip, score: Math.round(score), velocity: Math.round(velocity * 100) / 100, rankChange: Math.floor((Math.random() - 0.3) * 10) };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, limit);
  }

  async getClipsByVideo(videoId: string, opts?: { limit?: number; offset?: number; sort?: 'recent' | 'popular' }): Promise<{ clips: Clip[]; total: number }> {
    const clipIds = this.videoClips.get(videoId) || [];
    let clips = clipIds.map(id => this.clips.get(id)).filter((c): c is Clip => !!c && c.status === 'active');

    if (opts?.sort === 'popular') clips.sort((a, b) => b.views - a.views);
    else clips.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const total = clips.length;
    const offset = opts?.offset || 0;
    const limit = opts?.limit || 20;
    return { clips: clips.slice(offset, offset + limit), total };
  }

  async getClipsByCreator(creatorId: string, opts?: { limit?: number; offset?: number }): Promise<{ clips: Clip[]; total: number }> {
    const clipIds = this.creatorClips.get(creatorId) || [];
    const clips = clipIds.map(id => this.clips.get(id)).filter((c): c is Clip => !!c);
    clips.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const total = clips.length;
    const offset = opts?.offset || 0;
    const limit = opts?.limit || 20;
    return { clips: clips.slice(offset, offset + limit), total };
  }

  async recordView(clipId: string): Promise<void> {
    const clip = this.clips.get(clipId);
    if (clip && clip.status === 'active') {
      clip.views++;
      clip.updatedAt = new Date().toISOString();
    }
  }

  async likeClip(clipId: string): Promise<void> {
    const clip = this.clips.get(clipId);
    if (clip && clip.status === 'active') {
      clip.likes++;
      clip.updatedAt = new Date().toISOString();
    }
  }
}

export const clipsService = new ClipsService();
export { ClipsService };
