// ============================================================================
// QuantNeon - Reels Remix Service
// Duet/remix creation, layouts, video composition, credits
// ============================================================================

interface Remix {
  id: string;
  originalReelId: string;
  originalCreatorId: string;
  remixCreatorId: string;
  layout: RemixLayout;
  ownVideoUrl: string;
  credits: RemixCredits;
  status: 'draft' | 'processing' | 'published' | 'removed';
  publishedAt?: string;
  views: number;
  likes: number;
  shares: number;
  createdAt: string;
  updatedAt: string;
  duration: number;
  aspectRatio: string;
}

type RemixLayout = 'side_by_side' | 'top_bottom' | 'green_screen' | 'picture_in_picture' | 'split_diagonal';

interface RemixCredits {
  originalCreator: string;
  originalTitle: string;
  originalUrl: string;
  attribution: string;
  musicCredits?: string;
}

interface RemixSettings {
  reelId: string;
  allowRemix: boolean;
  allowedLayouts: RemixLayout[];
  requireApproval: boolean;
  creditStyle: 'overlay' | 'caption' | 'both';
}

interface RemixAnalytics {
  originalReelId: string;
  totalRemixes: number;
  totalViews: number;
  topRemixes: { remixId: string; views: number; creatorId: string }[];
  layoutDistribution: { layout: RemixLayout; count: number }[];
}

class ReelsRemixService {
  private remixes: Map<string, Remix> = new Map();
  private reelRemixes: Map<string, string[]> = new Map();
  private userRemixes: Map<string, string[]> = new Map();
  private settings: Map<string, RemixSettings> = new Map();
  private counter: number = 0;

  private genId(prefix: string): string {
    return `${prefix}_${Date.now().toString(36)}_${(++this.counter).toString(36)}`;
  }

  async createRemix(originalReelId: string, userId: string): Promise<Remix> {
    const reelSettings = this.settings.get(originalReelId);
    if (reelSettings && !reelSettings.allowRemix) throw new Error('Remixes are disabled for this reel');

    const remix: Remix = {
      id: this.genId('remix'),
      originalReelId,
      originalCreatorId: `creator_${originalReelId.substring(0, 8)}`,
      remixCreatorId: userId,
      layout: 'side_by_side',
      ownVideoUrl: '',
      credits: {
        originalCreator: `Creator of ${originalReelId}`,
        originalTitle: `Original Reel`,
        originalUrl: `https://quant.neon/reels/${originalReelId}`,
        attribution: 'Remix',
      },
      status: 'draft',
      views: 0,
      likes: 0,
      shares: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      duration: 0,
      aspectRatio: '9:16',
    };

    this.remixes.set(remix.id, remix);
    const userList = this.userRemixes.get(userId) || [];
    userList.push(remix.id);
    this.userRemixes.set(userId, userList);

    return remix;
  }

  async setLayout(remixId: string, layout: RemixLayout): Promise<Remix> {
    const remix = this.remixes.get(remixId);
    if (!remix) throw new Error('Remix not found');
    if (remix.status === 'published') throw new Error('Cannot modify published remix');

    const reelSettings = this.settings.get(remix.originalReelId);
    if (reelSettings && reelSettings.allowedLayouts.length > 0 && !reelSettings.allowedLayouts.includes(layout)) {
      throw new Error(`Layout ${layout} not allowed for this reel`);
    }

    remix.layout = layout;
    remix.updatedAt = new Date().toISOString();

    if (layout === 'side_by_side' || layout === 'split_diagonal') remix.aspectRatio = '9:16';
    else if (layout === 'top_bottom') remix.aspectRatio = '9:16';
    else if (layout === 'green_screen') remix.aspectRatio = '9:16';
    else if (layout === 'picture_in_picture') remix.aspectRatio = '9:16';

    return remix;
  }

  async addOwnVideo(remixId: string, videoUrl: string, duration: number): Promise<Remix> {
    const remix = this.remixes.get(remixId);
    if (!remix) throw new Error('Remix not found');
    if (remix.status === 'published') throw new Error('Cannot modify published remix');
    if (duration < 3 || duration > 90) throw new Error('Video must be 3-90 seconds');

    remix.ownVideoUrl = videoUrl;
    remix.duration = duration;
    remix.updatedAt = new Date().toISOString();
    return remix;
  }

  async setCredits(remixId: string, credits: Partial<RemixCredits>): Promise<Remix> {
    const remix = this.remixes.get(remixId);
    if (!remix) throw new Error('Remix not found');

    Object.assign(remix.credits, credits);
    remix.updatedAt = new Date().toISOString();
    return remix;
  }

  async publish(remixId: string): Promise<Remix> {
    const remix = this.remixes.get(remixId);
    if (!remix) throw new Error('Remix not found');
    if (!remix.ownVideoUrl) throw new Error('Must add your own video before publishing');
    if (remix.status === 'published') throw new Error('Already published');

    const reelSettings = this.settings.get(remix.originalReelId);
    if (reelSettings?.requireApproval) {
      remix.status = 'processing';
    } else {
      remix.status = 'published';
      remix.publishedAt = new Date().toISOString();
    }

    const reelList = this.reelRemixes.get(remix.originalReelId) || [];
    reelList.push(remix.id);
    this.reelRemixes.set(remix.originalReelId, reelList);

    remix.updatedAt = new Date().toISOString();
    return remix;
  }

  async getRemixes(reelId: string, opts?: { limit?: number; offset?: number; sort?: 'recent' | 'popular' }): Promise<{ remixes: Remix[]; total: number }> {
    const ids = this.reelRemixes.get(reelId) || [];
    let remixes = ids.map(id => this.remixes.get(id)).filter((r): r is Remix => !!r && r.status === 'published');

    if (opts?.sort === 'popular') remixes.sort((a, b) => b.views - a.views);
    else remixes.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const total = remixes.length;
    const offset = opts?.offset || 0;
    const limit = opts?.limit || 20;
    return { remixes: remixes.slice(offset, offset + limit), total };
  }

  async getRemixCount(reelId: string): Promise<number> {
    const ids = this.reelRemixes.get(reelId) || [];
    return ids.filter(id => { const r = this.remixes.get(id); return r && r.status === 'published'; }).length;
  }

  async disableRemix(reelId: string, creatorId: string): Promise<RemixSettings> {
    const settings: RemixSettings = {
      reelId,
      allowRemix: false,
      allowedLayouts: [],
      requireApproval: false,
      creditStyle: 'overlay',
    };
    this.settings.set(reelId, settings);
    return settings;
  }

  async getAnalytics(reelId: string): Promise<RemixAnalytics> {
    const ids = this.reelRemixes.get(reelId) || [];
    const remixes = ids.map(id => this.remixes.get(id)).filter((r): r is Remix => !!r);

    const totalViews = remixes.reduce((s, r) => s + r.views, 0);
    const topRemixes = remixes.sort((a, b) => b.views - a.views).slice(0, 5)
      .map(r => ({ remixId: r.id, views: r.views, creatorId: r.remixCreatorId }));

    const layoutDist = new Map<RemixLayout, number>();
    for (const r of remixes) { layoutDist.set(r.layout, (layoutDist.get(r.layout) || 0) + 1); }
    const layoutDistribution = Array.from(layoutDist.entries()).map(([layout, count]) => ({ layout, count }));

    return { originalReelId: reelId, totalRemixes: remixes.length, totalViews, topRemixes, layoutDistribution };
  }
}

export const reelsRemixService = new ReelsRemixService();
export { ReelsRemixService };
