// ============================================================================
// QuantTube - Creator Service
// Creator tools, analytics, monetization dashboard, content management
// ============================================================================

interface CreatorAnalytics {
  channelId: string;
  period: string;
  views: number;
  watchTime: number;
  subscribers: { total: number; gained: number; lost: number };
  revenue: { total: number; adRevenue: number; memberships: number; superChats: number };
  topVideos: { videoId: string; views: number; watchTime: number; revenue: number }[];
  demographics: { age: Record<string, number>; gender: Record<string, number>; country: Record<string, number> };
  trafficSources: Record<string, number>;
}

interface ContentSchedule {
  id: string;
  channelId: string;
  contentId: string;
  publishAt: string;
  status: 'scheduled' | 'published' | 'cancelled';
  type: 'video' | 'short' | 'premiere' | 'live';
}

interface CreatorTool {
  id: string;
  name: string;
  description: string;
  category: 'editing' | 'analytics' | 'engagement' | 'monetization';
  enabled: boolean;
}

class CreatorService {
  private schedules: Map<string, ContentSchedule[]> = new Map();

  getAnalytics(channelId: string, period: string): CreatorAnalytics {
    const multiplier = period === '7d' ? 1 : period === '30d' ? 4 : 12;

    return {
      channelId,
      period,
      views: Math.floor(10000 * multiplier * (0.8 + Math.random() * 0.4)),
      watchTime: Math.floor(50000 * multiplier),
      subscribers: { total: Math.floor(5000 + Math.random() * 50000), gained: Math.floor(100 * multiplier), lost: Math.floor(20 * multiplier) },
      revenue: { total: Math.floor(500 * multiplier), adRevenue: Math.floor(350 * multiplier), memberships: Math.floor(100 * multiplier), superChats: Math.floor(50 * multiplier) },
      topVideos: Array.from({ length: 5 }, (_, i) => ({ videoId: `vid_top_${i}`, views: Math.floor(5000 * (5 - i)), watchTime: Math.floor(25000 * (5 - i)), revenue: Math.floor(100 * (5 - i)) })),
      demographics: { age: { '13-17': 0.08, '18-24': 0.35, '25-34': 0.28, '35-44': 0.16, '45-54': 0.08, '55+': 0.05 }, gender: { male: 0.62, female: 0.35, other: 0.03 }, country: { US: 0.35, UK: 0.12, IN: 0.10, CA: 0.08, AU: 0.06, other: 0.29 } },
      trafficSources: { search: 0.30, suggested: 0.35, external: 0.15, browse: 0.12, direct: 0.08 },
    };
  }

  scheduleContent(channelId: string, contentId: string, publishAt: string, type: string): ContentSchedule {
    const schedule: ContentSchedule = {
      id: `sched_${Date.now().toString(36)}`,
      channelId,
      contentId,
      publishAt,
      status: 'scheduled',
      type: type as any,
    };
    const channelSchedules = this.schedules.get(channelId) || [];
    channelSchedules.push(schedule);
    this.schedules.set(channelId, channelSchedules);
    return schedule;
  }

  getSchedule(channelId: string): ContentSchedule[] {
    return (this.schedules.get(channelId) || []).sort((a, b) => Date.parse(a.publishAt) - Date.parse(b.publishAt));
  }

  getAvailableTools(): CreatorTool[] {
    return [
      { id: 'tool_editor', name: 'Video Editor', description: 'Built-in video trimming and editing', category: 'editing', enabled: true },
      { id: 'tool_thumbnail', name: 'Thumbnail Generator', description: 'AI-powered thumbnail creation', category: 'editing', enabled: true },
      { id: 'tool_analytics', name: 'Advanced Analytics', description: 'Deep insights into audience behavior', category: 'analytics', enabled: true },
      { id: 'tool_cards', name: 'End Screens & Cards', description: 'Interactive elements for videos', category: 'engagement', enabled: true },
      { id: 'tool_community', name: 'Community Tab', description: 'Engage with your audience', category: 'engagement', enabled: true },
      { id: 'tool_super', name: 'Super Chat & Stickers', description: 'Receive paid messages during live', category: 'monetization', enabled: true },
      { id: 'tool_merch', name: 'Merchandise Shelf', description: 'Sell products on your channel', category: 'monetization', enabled: true },
    ];
  }

  calculateCPM(channelId: string): { cpm: number; estimatedRevenue: number; category: string } {
    // CPM varies by niche/category
    const cpmRates: Record<string, number> = {
      technology: 5.50, finance: 8.00, gaming: 3.50, entertainment: 4.00, education: 6.00, music: 2.50, lifestyle: 4.50, default: 3.00
    };
    const category = 'technology';
    const cpm = cpmRates[category] || cpmRates['default'];
    return { cpm, estimatedRevenue: cpm * 10, category };
  }
}

export const creatorService = new CreatorService();
