// ============================================================================
// QuantMail - Email Analytics Service
// Open tracking, click tracking, bounce management, engagement scoring
// ============================================================================

interface TrackingPixel {
  id: string;
  emailId: string;
  recipientEmail: string;
  campaignId: string | null;
  opened: boolean;
  openedAt: Date | null;
  openCount: number;
  deviceInfo: string | null;
  ipAddress: string | null;
}

interface ClickEvent {
  id: string;
  emailId: string;
  recipientEmail: string;
  url: string;
  clickedAt: Date;
  deviceInfo: string | null;
}

interface BounceRecord {
  id: string;
  emailId: string;
  recipientEmail: string;
  type: 'hard' | 'soft';
  reason: string;
  bouncedAt: Date;
  retryCount: number;
}

interface UnsubscribeRecord {
  id: string;
  email: string;
  reason: string | null;
  listId: string;
  unsubscribedAt: Date;
}

interface EngagementScore {
  email: string;
  score: number;
  openRate: number;
  clickRate: number;
  lastEngagement: Date | null;
  category: 'highly_engaged' | 'engaged' | 'passive' | 'disengaged' | 'inactive';
}

interface HeatmapData {
  hour: number;
  day: number;
  opens: number;
  clicks: number;
  intensity: number;
}

export class EmailAnalytics {
  private pixels: Map<string, TrackingPixel> = new Map();
  private clicks: Map<string, ClickEvent[]> = new Map();
  private bounces: Map<string, BounceRecord[]> = new Map();
  private unsubscribes: Map<string, UnsubscribeRecord> = new Map();
  private emailPixelIndex: Map<string, string[]> = new Map();
  private userAnalytics: Map<string, { sent: number; campaignIds: string[] }> = new Map();

  async trackOpen(emailId: string, recipientEmail: string, metadata?: { device?: string; ip?: string }): Promise<TrackingPixel> {
    const pixelId = this.getOrCreatePixel(emailId, recipientEmail);
    const pixel = this.pixels.get(pixelId)!;

    pixel.opened = true;
    pixel.openCount++;
    if (!pixel.openedAt) pixel.openedAt = new Date();
    if (metadata?.device) pixel.deviceInfo = metadata.device;
    if (metadata?.ip) pixel.ipAddress = metadata.ip;

    return pixel;
  }

  async trackClick(emailId: string, recipientEmail: string, url: string, metadata?: { device?: string }): Promise<ClickEvent> {
    const clickId = `click_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const event: ClickEvent = {
      id: clickId,
      emailId,
      recipientEmail,
      url,
      clickedAt: new Date(),
      deviceInfo: metadata?.device || null,
    };

    const emailClicks = this.clicks.get(emailId) || [];
    emailClicks.push(event);
    this.clicks.set(emailId, emailClicks);

    // Also register as an open
    await this.trackOpen(emailId, recipientEmail, metadata);

    return event;
  }

  async trackBounce(emailId: string, recipientEmail: string, type: 'hard' | 'soft', reason: string): Promise<BounceRecord> {
    const bounceId = `bounce_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const record: BounceRecord = {
      id: bounceId,
      emailId,
      recipientEmail,
      type,
      reason,
      bouncedAt: new Date(),
      retryCount: type === 'soft' ? 1 : 0,
    };

    const emailBounces = this.bounces.get(emailId) || [];
    emailBounces.push(record);
    this.bounces.set(emailId, emailBounces);

    return record;
  }

  async trackUnsubscribe(email: string, listId: string, reason?: string): Promise<UnsubscribeRecord> {
    const record: UnsubscribeRecord = {
      id: `unsub_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      email,
      reason: reason || null,
      listId,
      unsubscribedAt: new Date(),
    };

    this.unsubscribes.set(`${email}:${listId}`, record);
    return record;
  }

  async getOpenRate(emailId: string): Promise<{ rate: number; opened: number; total: number; uniqueOpens: number }> {
    const pixelIds = this.emailPixelIndex.get(emailId) || [];
    const pixels = pixelIds.map(id => this.pixels.get(id)).filter((p): p is TrackingPixel => p !== undefined);

    const total = pixels.length;
    const opened = pixels.filter(p => p.opened).length;
    const uniqueOpens = new Set(pixels.filter(p => p.opened).map(p => p.recipientEmail)).size;
    const rate = total > 0 ? (opened / total) * 100 : 0;

    return { rate: Math.round(rate * 100) / 100, opened, total, uniqueOpens };
  }

  async getClickRate(emailId: string): Promise<{ rate: number; clicks: number; uniqueClickers: number; total: number }> {
    const emailClicks = this.clicks.get(emailId) || [];
    const pixelIds = this.emailPixelIndex.get(emailId) || [];
    const total = pixelIds.length;

    const uniqueClickers = new Set(emailClicks.map(c => c.recipientEmail)).size;
    const rate = total > 0 ? (uniqueClickers / total) * 100 : 0;

    return { rate: Math.round(rate * 100) / 100, clicks: emailClicks.length, uniqueClickers, total };
  }

  async getBounceRate(emailId: string): Promise<{ rate: number; hard: number; soft: number; total: number }> {
    const emailBounces = this.bounces.get(emailId) || [];
    const pixelIds = this.emailPixelIndex.get(emailId) || [];
    const total = pixelIds.length;

    const hard = emailBounces.filter(b => b.type === 'hard').length;
    const soft = emailBounces.filter(b => b.type === 'soft').length;
    const bounceTotal = hard + soft;
    const rate = total > 0 ? (bounceTotal / total) * 100 : 0;

    return { rate: Math.round(rate * 100) / 100, hard, soft, total };
  }

  async getHeatmap(userId: string): Promise<HeatmapData[]> {
    const heatmap: HeatmapData[] = [];

    for (let day = 0; day < 7; day++) {
      for (let hour = 0; hour < 24; hour++) {
        let opens = 0;
        let clicks = 0;

        for (const pixel of this.pixels.values()) {
          if (pixel.openedAt) {
            const openDate = new Date(pixel.openedAt);
            if (openDate.getDay() === day && openDate.getHours() === hour) {
              opens++;
            }
          }
        }

        for (const emailClicks of this.clicks.values()) {
          for (const click of emailClicks) {
            const clickDate = new Date(click.clickedAt);
            if (clickDate.getDay() === day && clickDate.getHours() === hour) {
              clicks++;
            }
          }
        }

        const intensity = Math.min((opens + clicks * 2) / 10, 1);
        heatmap.push({ hour, day, opens, clicks, intensity });
      }
    }

    return heatmap;
  }

  async getEngagementScore(recipientEmail: string): Promise<EngagementScore> {
    let totalSent = 0;
    let totalOpens = 0;
    let totalClicks = 0;
    let lastEngagement: Date | null = null;

    for (const pixel of this.pixels.values()) {
      if (pixel.recipientEmail === recipientEmail) {
        totalSent++;
        if (pixel.opened) {
          totalOpens++;
          if (!lastEngagement || (pixel.openedAt && pixel.openedAt > lastEngagement)) {
            lastEngagement = pixel.openedAt;
          }
        }
      }
    }

    for (const emailClicks of this.clicks.values()) {
      for (const click of emailClicks) {
        if (click.recipientEmail === recipientEmail) {
          totalClicks++;
          if (!lastEngagement || click.clickedAt > lastEngagement) {
            lastEngagement = click.clickedAt;
          }
        }
      }
    }

    const openRate = totalSent > 0 ? totalOpens / totalSent : 0;
    const clickRate = totalSent > 0 ? totalClicks / totalSent : 0;
    const score = Math.round((openRate * 40 + clickRate * 60) * 100);

    let category: EngagementScore['category'];
    if (score >= 80) category = 'highly_engaged';
    else if (score >= 60) category = 'engaged';
    else if (score >= 30) category = 'passive';
    else if (score >= 10) category = 'disengaged';
    else category = 'inactive';

    return { email: recipientEmail, score, openRate, clickRate, lastEngagement, category };
  }

  async getTopLinks(emailId: string, limit: number = 10): Promise<Array<{ url: string; clicks: number; uniqueClickers: number }>> {
    const emailClicks = this.clicks.get(emailId) || [];
    const linkMap = new Map<string, { clicks: number; clickers: Set<string> }>();

    for (const click of emailClicks) {
      const entry = linkMap.get(click.url) || { clicks: 0, clickers: new Set<string>() };
      entry.clicks++;
      entry.clickers.add(click.recipientEmail);
      linkMap.set(click.url, entry);
    }

    return Array.from(linkMap.entries())
      .map(([url, data]) => ({ url, clicks: data.clicks, uniqueClickers: data.clickers.size }))
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, limit);
  }

  async exportReport(emailId: string): Promise<{
    summary: { sent: number; opened: number; clicked: number; bounced: number; unsubscribed: number };
    openRate: number;
    clickRate: number;
    bounceRate: number;
    topLinks: Array<{ url: string; clicks: number }>;
    timeline: Array<{ date: string; opens: number; clicks: number }>;
  }> {
    const openData = await this.getOpenRate(emailId);
    const clickData = await this.getClickRate(emailId);
    const bounceData = await this.getBounceRate(emailId);
    const topLinks = await this.getTopLinks(emailId, 5);

    const timeline: Array<{ date: string; opens: number; clicks: number }> = [];
    const dateMap = new Map<string, { opens: number; clicks: number }>();

    const pixelIds = this.emailPixelIndex.get(emailId) || [];
    for (const id of pixelIds) {
      const pixel = this.pixels.get(id);
      if (pixel?.openedAt) {
        const dateKey = pixel.openedAt.toISOString().split('T')[0];
        const entry = dateMap.get(dateKey) || { opens: 0, clicks: 0 };
        entry.opens++;
        dateMap.set(dateKey, entry);
      }
    }

    for (const [date, data] of dateMap) {
      timeline.push({ date, ...data });
    }

    return {
      summary: {
        sent: openData.total,
        opened: openData.opened,
        clicked: clickData.clicks,
        bounced: bounceData.hard + bounceData.soft,
        unsubscribed: 0,
      },
      openRate: openData.rate,
      clickRate: clickData.rate,
      bounceRate: bounceData.rate,
      topLinks: topLinks.map(l => ({ url: l.url, clicks: l.clicks })),
      timeline: timeline.sort((a, b) => a.date.localeCompare(b.date)),
    };
  }

  private getOrCreatePixel(emailId: string, recipientEmail: string): string {
    const pixelIds = this.emailPixelIndex.get(emailId) || [];
    for (const id of pixelIds) {
      const pixel = this.pixels.get(id);
      if (pixel && pixel.recipientEmail === recipientEmail) return id;
    }

    const pixelId = `px_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const pixel: TrackingPixel = {
      id: pixelId,
      emailId,
      recipientEmail,
      campaignId: null,
      opened: false,
      openedAt: null,
      openCount: 0,
      deviceInfo: null,
      ipAddress: null,
    };

    this.pixels.set(pixelId, pixel);
    pixelIds.push(pixelId);
    this.emailPixelIndex.set(emailId, pixelIds);
    return pixelId;
  }
}

export const emailAnalytics = new EmailAnalytics();
