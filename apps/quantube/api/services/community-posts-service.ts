// ============================================================================
// QuantTube - Community Posts Service
// Community posts, polls, engagement, moderation, scheduling
// ============================================================================

interface CommunityPost {
  id: string;
  channelId: string;
  authorId: string;
  content: string;
  type: 'text' | 'image' | 'poll' | 'video' | 'quiz';
  mediaUrls: string[];
  poll?: Poll;
  likes: number;
  dislikes: number;
  comments: number;
  isPinned: boolean;
  isScheduled: boolean;
  scheduledAt?: string;
  publishedAt: string;
  updatedAt: string;
  status: 'draft' | 'published' | 'scheduled' | 'removed';
  visibility: 'public' | 'members_only' | 'unlisted';
}

interface Poll {
  id: string;
  options: PollOption[];
  totalVotes: number;
  endTime: string;
  isMultipleChoice: boolean;
  isAnonymous: boolean;
  status: 'active' | 'ended';
}

interface PollOption {
  id: string;
  text: string;
  votes: number;
  percentage: number;
  voterIds: string[];
}

interface PostComment {
  id: string;
  postId: string;
  userId: string;
  username: string;
  content: string;
  likes: number;
  parentId?: string;
  createdAt: string;
  isHearted: boolean;
  isPinned: boolean;
}

interface PostEngagement {
  postId: string;
  impressions: number;
  reaches: number;
  engagementRate: number;
  likeRate: number;
  commentRate: number;
  shareCount: number;
  clickThroughRate: number;
  avgTimeOnPost: number;
}

class CommunityPostsService {
  private posts: Map<string, CommunityPost> = new Map();
  private comments: Map<string, PostComment[]> = new Map();
  private channelPosts: Map<string, string[]> = new Map();
  private userVotes: Map<string, Map<string, string[]>> = new Map();
  private counter: number = 0;

  private genId(prefix: string): string {
    return `${prefix}_${Date.now().toString(36)}_${(++this.counter).toString(36)}`;
  }

  async createPost(channelId: string, authorId: string, content: string, type: CommunityPost['type'], options?: { mediaUrls?: string[]; visibility?: CommunityPost['visibility'] }): Promise<CommunityPost> {
    if (content.length < 1 || content.length > 5000) throw new Error('Content must be 1-5000 characters');

    const post: CommunityPost = {
      id: this.genId('post'),
      channelId,
      authorId,
      content: content.trim(),
      type,
      mediaUrls: options?.mediaUrls || [],
      likes: 0,
      dislikes: 0,
      comments: 0,
      isPinned: false,
      isScheduled: false,
      publishedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'published',
      visibility: options?.visibility || 'public',
    };

    this.posts.set(post.id, post);
    const cPosts = this.channelPosts.get(channelId) || [];
    cPosts.unshift(post.id);
    this.channelPosts.set(channelId, cPosts);

    return post;
  }

  async createPoll(channelId: string, authorId: string, question: string, options: string[], duration: number, config?: { isMultipleChoice?: boolean; isAnonymous?: boolean }): Promise<CommunityPost> {
    if (options.length < 2 || options.length > 5) throw new Error('Poll must have 2-5 options');
    if (duration < 3600 || duration > 604800) throw new Error('Duration must be 1 hour to 7 days');

    const pollOptions: PollOption[] = options.map(text => ({
      id: this.genId('opt'),
      text: text.trim(),
      votes: 0,
      percentage: 0,
      voterIds: [],
    }));

    const poll: Poll = {
      id: this.genId('poll'),
      options: pollOptions,
      totalVotes: 0,
      endTime: new Date(Date.now() + duration * 1000).toISOString(),
      isMultipleChoice: config?.isMultipleChoice || false,
      isAnonymous: config?.isAnonymous || false,
      status: 'active',
    };

    const post = await this.createPost(channelId, authorId, question, 'poll');
    post.poll = poll;
    return post;
  }

  async votePoll(postId: string, userId: string, optionIds: string[]): Promise<Poll> {
    const post = this.posts.get(postId);
    if (!post || !post.poll) throw new Error('Poll not found');
    if (post.poll.status !== 'active') throw new Error('Poll has ended');
    if (new Date(post.poll.endTime).getTime() < Date.now()) {
      post.poll.status = 'ended';
      throw new Error('Poll has expired');
    }

    const userVotesMap = this.userVotes.get(userId) || new Map<string, string[]>();
    const existingVotes = userVotesMap.get(postId) || [];
    if (existingVotes.length > 0 && !post.poll.isMultipleChoice) throw new Error('Already voted');

    if (!post.poll.isMultipleChoice && optionIds.length > 1) throw new Error('Only one option allowed');

    for (const optId of optionIds) {
      const option = post.poll.options.find(o => o.id === optId);
      if (!option) throw new Error(`Option ${optId} not found`);
      if (!existingVotes.includes(optId)) {
        option.votes++;
        option.voterIds.push(userId);
        post.poll.totalVotes++;
        existingVotes.push(optId);
      }
    }

    // Recalculate percentages
    for (const opt of post.poll.options) {
      opt.percentage = post.poll.totalVotes > 0 ? Math.round((opt.votes / post.poll.totalVotes) * 10000) / 100 : 0;
    }

    userVotesMap.set(postId, existingVotes);
    this.userVotes.set(userId, userVotesMap);
    return post.poll;
  }

  async getPollResults(postId: string): Promise<Poll> {
    const post = this.posts.get(postId);
    if (!post || !post.poll) throw new Error('Poll not found');
    if (new Date(post.poll.endTime).getTime() < Date.now()) post.poll.status = 'ended';
    return post.poll;
  }

  async getEngagement(postId: string): Promise<PostEngagement> {
    const post = this.posts.get(postId);
    if (!post) throw new Error('Post not found');

    const impressions = Math.floor(1000 + Math.random() * 100000);
    const reaches = Math.floor(impressions * (0.4 + Math.random() * 0.4));
    const totalEngagements = post.likes + post.dislikes + post.comments;
    const engagementRate = reaches > 0 ? (totalEngagements / reaches) * 100 : 0;

    return {
      postId,
      impressions,
      reaches,
      engagementRate: Math.round(engagementRate * 100) / 100,
      likeRate: reaches > 0 ? Math.round((post.likes / reaches) * 10000) / 100 : 0,
      commentRate: reaches > 0 ? Math.round((post.comments / reaches) * 10000) / 100 : 0,
      shareCount: Math.floor(post.likes * 0.1),
      clickThroughRate: Math.round((2 + Math.random() * 8) * 100) / 100,
      avgTimeOnPost: Math.round((5 + Math.random() * 30) * 100) / 100,
    };
  }

  async pinPost(postId: string, channelId: string): Promise<CommunityPost> {
    const post = this.posts.get(postId);
    if (!post) throw new Error('Post not found');
    if (post.channelId !== channelId) throw new Error('Post does not belong to channel');

    // Unpin other posts
    const cPosts = this.channelPosts.get(channelId) || [];
    for (const pId of cPosts) {
      const p = this.posts.get(pId);
      if (p && p.isPinned && p.id !== postId) p.isPinned = false;
    }

    post.isPinned = true;
    post.updatedAt = new Date().toISOString();
    return post;
  }

  async unpinPost(postId: string): Promise<CommunityPost> {
    const post = this.posts.get(postId);
    if (!post) throw new Error('Post not found');
    post.isPinned = false;
    post.updatedAt = new Date().toISOString();
    return post;
  }

  async getComments(postId: string, opts?: { limit?: number; offset?: number; sort?: 'recent' | 'top' }): Promise<{ comments: PostComment[]; total: number }> {
    let allComments = this.comments.get(postId) || [];
    if (opts?.sort === 'top') allComments = [...allComments].sort((a, b) => b.likes - a.likes);
    else allComments = [...allComments].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const total = allComments.length;
    const offset = opts?.offset || 0;
    const limit = opts?.limit || 20;
    return { comments: allComments.slice(offset, offset + limit), total };
  }

  async moderatePost(postId: string, action: 'remove' | 'restrict' | 'approve'): Promise<CommunityPost> {
    const post = this.posts.get(postId);
    if (!post) throw new Error('Post not found');
    if (action === 'remove') post.status = 'removed';
    else if (action === 'restrict') post.visibility = 'unlisted';
    post.updatedAt = new Date().toISOString();
    return post;
  }

  async schedulePost(channelId: string, authorId: string, content: string, type: CommunityPost['type'], scheduledAt: string): Promise<CommunityPost> {
    const scheduleTime = new Date(scheduledAt).getTime();
    if (scheduleTime <= Date.now()) throw new Error('Scheduled time must be in the future');

    const post = await this.createPost(channelId, authorId, content, type);
    post.status = 'scheduled';
    post.isScheduled = true;
    post.scheduledAt = scheduledAt;
    return post;
  }
}

export const communityPostsService = new CommunityPostsService();
export { CommunityPostsService };
