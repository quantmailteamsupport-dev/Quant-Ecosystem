// ============================================================================
// QuantSync - Scheduling Service
// Post scheduling, queue management, optimal timing, recurrence
// ============================================================================

interface ScheduledPost {
  id: string;
  userId: string;
  content: string;
  mediaUrls: string[];
  hashtags: string[];
  scheduledAt: Date;
  timezone: string;
  status: 'scheduled' | 'published' | 'failed' | 'cancelled';
  publishedAt: Date | null;
  postId: string | null;
  recurrence: RecurrenceConfig | null;
  analytics: PostAnalytics | null;
  createdAt: Date;
}

interface RecurrenceConfig {
  frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly';
  endDate: Date | null;
  occurrences: number;
  maxOccurrences: number;
}

interface PostAnalytics {
  impressions: number;
  likes: number;
  reposts: number;
  replies: number;
  engagementRate: number;
}

interface OptimalTime {
  dayOfWeek: number;
  hour: number;
  score: number;
  reason: string;
}

interface QueueItem {
  post: ScheduledPost;
  position: number;
  timeUntilPublish: number;
}

export class SchedulingService {
  private posts: Map<string, ScheduledPost> = new Map();
  private userPostIndex: Map<string, string[]> = new Map();
  private publishHistory: Map<string, PostAnalytics[]> = new Map();

  async schedulePost(userId: string, config: {
    content: string;
    scheduledAt: Date;
    mediaUrls?: string[];
    hashtags?: string[];
    timezone?: string;
    recurrence?: Omit<RecurrenceConfig, 'occurrences'>;
  }): Promise<ScheduledPost> {
    if (!config.content || config.content.trim().length === 0) {
      throw new Error('Content is required');
    }
    if (config.content.length > 500) {
      throw new Error('Content exceeds 500 character limit');
    }

    const scheduledAt = new Date(config.scheduledAt);
    if (scheduledAt <= new Date()) {
      throw new Error('Scheduled time must be in the future');
    }

    const userPosts = this.userPostIndex.get(userId) || [];
    const pendingCount = userPosts.filter(id => {
      const p = this.posts.get(id);
      return p && p.status === 'scheduled';
    }).length;

    if (pendingCount >= 100) {
      throw new Error('Maximum 100 scheduled posts allowed');
    }

    const postId = `sp_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const post: ScheduledPost = {
      id: postId,
      userId,
      content: config.content.trim(),
      mediaUrls: config.mediaUrls || [],
      hashtags: config.hashtags || this.extractHashtags(config.content),
      scheduledAt,
      timezone: config.timezone || 'UTC',
      status: 'scheduled',
      publishedAt: null,
      postId: null,
      recurrence: config.recurrence ? { ...config.recurrence, occurrences: 0, maxOccurrences: config.recurrence.maxOccurrences || 52 } : null,
      analytics: null,
      createdAt: new Date(),
    };

    this.posts.set(postId, post);
    userPosts.push(postId);
    this.userPostIndex.set(userId, userPosts);

    return post;
  }

  async cancelScheduled(postId: string, userId: string): Promise<ScheduledPost> {
    const post = this.posts.get(postId);
    if (!post) throw new Error('Scheduled post not found');
    if (post.userId !== userId) throw new Error('Access denied');
    if (post.status !== 'scheduled') throw new Error('Post cannot be cancelled');

    post.status = 'cancelled';
    return post;
  }

  async reschedule(postId: string, userId: string, newTime: Date): Promise<ScheduledPost> {
    const post = this.posts.get(postId);
    if (!post) throw new Error('Scheduled post not found');
    if (post.userId !== userId) throw new Error('Access denied');
    if (post.status !== 'scheduled') throw new Error('Only scheduled posts can be rescheduled');

    const newDate = new Date(newTime);
    if (newDate <= new Date()) throw new Error('New time must be in the future');

    post.scheduledAt = newDate;
    return post;
  }

  async getQueue(userId: string): Promise<QueueItem[]> {
    const postIds = this.userPostIndex.get(userId) || [];
    const now = Date.now();

    const scheduled = postIds
      .map(id => this.posts.get(id))
      .filter((p): p is ScheduledPost => p !== undefined && p.status === 'scheduled')
      .sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime());

    return scheduled.map((post, index) => ({
      post,
      position: index + 1,
      timeUntilPublish: Math.max(0, post.scheduledAt.getTime() - now),
    }));
  }

  async getOptimalTimes(userId: string): Promise<OptimalTime[]> {
    const history = this.publishHistory.get(userId) || [];
    const optimalTimes: OptimalTime[] = [];

    // Default optimal times based on general social media best practices
    const defaults: Array<{ day: number; hour: number; reason: string }> = [
      { day: 1, hour: 9, reason: 'Monday morning peak engagement' },
      { day: 2, hour: 12, reason: 'Tuesday lunch break high activity' },
      { day: 3, hour: 15, reason: 'Wednesday afternoon engagement spike' },
      { day: 4, hour: 10, reason: 'Thursday mid-morning optimal reach' },
      { day: 5, hour: 11, reason: 'Friday pre-lunch high visibility' },
      { day: 6, hour: 14, reason: 'Saturday afternoon leisure browsing' },
      { day: 0, hour: 18, reason: 'Sunday evening high engagement' },
    ];

    for (const slot of defaults) {
      const baseScore = 70 + Math.floor(Math.random() * 25);
      const historyBonus = history.length > 0 ? Math.min(history.length * 2, 10) : 0;

      optimalTimes.push({
        dayOfWeek: slot.day,
        hour: slot.hour,
        score: Math.min(100, baseScore + historyBonus),
        reason: slot.reason,
      });
    }

    return optimalTimes.sort((a, b) => b.score - a.score);
  }

  async setRecurrence(postId: string, userId: string, recurrence: Omit<RecurrenceConfig, 'occurrences'>): Promise<ScheduledPost> {
    const post = this.posts.get(postId);
    if (!post) throw new Error('Post not found');
    if (post.userId !== userId) throw new Error('Access denied');
    if (post.status !== 'scheduled') throw new Error('Only scheduled posts can have recurrence');

    post.recurrence = { ...recurrence, occurrences: 0, maxOccurrences: recurrence.maxOccurrences || 52 };
    return post;
  }

  async getAnalyticsForScheduled(userId: string): Promise<{
    totalScheduled: number;
    totalPublished: number;
    avgEngagement: number;
    bestPerforming: string | null;
    publishSuccess: number;
  }> {
    const postIds = this.userPostIndex.get(userId) || [];
    const posts = postIds.map(id => this.posts.get(id)).filter((p): p is ScheduledPost => p !== undefined);

    const scheduled = posts.filter(p => p.status === 'scheduled').length;
    const published = posts.filter(p => p.status === 'published');
    const failed = posts.filter(p => p.status === 'failed').length;

    let totalEngagement = 0;
    let bestPost: ScheduledPost | null = null;
    let bestEngagement = 0;

    for (const post of published) {
      if (post.analytics) {
        totalEngagement += post.analytics.engagementRate;
        if (post.analytics.engagementRate > bestEngagement) {
          bestEngagement = post.analytics.engagementRate;
          bestPost = post;
        }
      }
    }

    const avgEngagement = published.length > 0 ? totalEngagement / published.length : 0;
    const successRate = (published.length + scheduled) > 0
      ? (published.length / (published.length + failed)) * 100
      : 100;

    return {
      totalScheduled: scheduled,
      totalPublished: published.length,
      avgEngagement: Math.round(avgEngagement * 100) / 100,
      bestPerforming: bestPost?.id || null,
      publishSuccess: Math.round(successRate),
    };
  }

  async processQueue(): Promise<{ published: number; failed: number }> {
    const now = new Date();
    let published = 0;
    let failed = 0;

    for (const post of this.posts.values()) {
      if (post.status !== 'scheduled') continue;
      if (post.scheduledAt > now) continue;

      const success = Math.random() > 0.02; // 98% success rate
      if (success) {
        post.status = 'published';
        post.publishedAt = new Date();
        post.postId = `post_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        post.analytics = {
          impressions: Math.floor(Math.random() * 5000),
          likes: Math.floor(Math.random() * 200),
          reposts: Math.floor(Math.random() * 50),
          replies: Math.floor(Math.random() * 30),
          engagementRate: Math.random() * 10,
        };
        published++;

        // Handle recurrence
        if (post.recurrence && post.recurrence.occurrences < post.recurrence.maxOccurrences) {
          this.scheduleNextRecurrence(post);
        }
      } else {
        post.status = 'failed';
        failed++;
      }
    }

    return { published, failed };
  }

  private scheduleNextRecurrence(post: ScheduledPost): void {
    if (!post.recurrence) return;
    post.recurrence.occurrences++;

    let nextDate: Date;
    switch (post.recurrence.frequency) {
      case 'daily': nextDate = new Date(post.scheduledAt.getTime() + 86400000); break;
      case 'weekly': nextDate = new Date(post.scheduledAt.getTime() + 7 * 86400000); break;
      case 'biweekly': nextDate = new Date(post.scheduledAt.getTime() + 14 * 86400000); break;
      case 'monthly':
        nextDate = new Date(post.scheduledAt);
        nextDate.setMonth(nextDate.getMonth() + 1);
        break;
      default: return;
    }

    if (post.recurrence.endDate && nextDate > post.recurrence.endDate) return;

    const newId = `sp_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const newPost: ScheduledPost = { ...post, id: newId, status: 'scheduled', scheduledAt: nextDate, publishedAt: null, postId: null, analytics: null, createdAt: new Date() };
    this.posts.set(newId, newPost);
    const userPosts = this.userPostIndex.get(post.userId) || [];
    userPosts.push(newId);
    this.userPostIndex.set(post.userId, userPosts);
  }

  private extractHashtags(content: string): string[] {
    const matches = content.match(/#\w+/g) || [];
    return matches.map(h => h.substring(1));
  }
}

export const schedulingService = new SchedulingService();
