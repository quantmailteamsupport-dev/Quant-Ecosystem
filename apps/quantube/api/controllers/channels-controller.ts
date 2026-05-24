// ============================================================================
// QuantTube API - Channels Controller
// Creator channels, subscriptions, memberships, community posts
// ============================================================================

import type { Request, Response } from '../middleware';

interface Channel {
  id: string;
  name: string;
  handle: string;
  description: string;
  avatarUrl: string;
  bannerUrl: string;
  subscriberCount: number;
  videoCount: number;
  totalViews: number;
  verified: boolean;
  createdAt: string;
  ownerId: string;
  memberships: MembershipTier[];
}

interface MembershipTier {
  id: string;
  name: string;
  price: number;
  perks: string[];
}

interface CommunityPost {
  id: string;
  channelId: string;
  type: 'text' | 'image' | 'poll' | 'video';
  content: string;
  imageUrl?: string;
  pollOptions?: { text: string; votes: number }[];
  likes: number;
  comments: number;
  createdAt: string;
}

const channels: Map<string, Channel> = new Map();
const communityPosts: Map<string, CommunityPost[]> = new Map();
const subscriptions: Map<string, string[]> = new Map();

class ChannelsController {
  async createChannel(req: Request, res: Response): Promise<void> {
    const body = req.body as any;
    const channelId = `ch_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;
    const channel: Channel = { id: channelId, name: body.name, handle: body.handle || `@${body.name.toLowerCase().replace(/\s/g, '')}`, description: body.description || '', avatarUrl: body.avatarUrl || '', bannerUrl: body.bannerUrl || '', subscriberCount: 0, videoCount: 0, totalViews: 0, verified: false, createdAt: new Date().toISOString(), ownerId: req.userId || '', memberships: [] };
    channels.set(channelId, channel);
    res.status(201).json({ success: true, data: { channel } });
  }

  async listChannels(req: Request, res: Response): Promise<void> {
    const query = req.query as any;
    let allChannels = Array.from(channels.values());
    if (query.search) allChannels = allChannels.filter(c => c.name.toLowerCase().includes((query.search as string).toLowerCase()));
    allChannels.sort((a, b) => b.subscriberCount - a.subscriberCount);
    res.status(200).json({ success: true, data: { channels: allChannels.slice(0, 50) } });
  }

  async getChannel(req: Request, res: Response): Promise<void> {
    const channel = channels.get(req.params.id);
    if (!channel) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Channel not found', statusCode: 404 } }); return; }
    res.status(200).json({ success: true, data: { channel } });
  }

  async updateChannel(req: Request, res: Response): Promise<void> {
    const channel = channels.get(req.params.id);
    if (!channel) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Channel not found', statusCode: 404 } }); return; }
    if (channel.ownerId !== req.userId) { res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Not channel owner', statusCode: 403 } }); return; }
    const body = req.body as any;
    if (body.name) channel.name = body.name;
    if (body.description) channel.description = body.description;
    if (body.avatarUrl) channel.avatarUrl = body.avatarUrl;
    if (body.bannerUrl) channel.bannerUrl = body.bannerUrl;
    res.status(200).json({ success: true, data: { channel } });
  }

  async getChannelVideos(req: Request, res: Response): Promise<void> {
    const channel = channels.get(req.params.id);
    if (!channel) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Channel not found', statusCode: 404 } }); return; }
    res.status(200).json({ success: true, data: { channelId: channel.id, videos: [], total: channel.videoCount } });
  }

  async getChannelPlaylists(req: Request, res: Response): Promise<void> {
    const channel = channels.get(req.params.id);
    if (!channel) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Channel not found', statusCode: 404 } }); return; }
    res.status(200).json({ success: true, data: { channelId: channel.id, playlists: [] } });
  }

  async getCommunityPosts(req: Request, res: Response): Promise<void> {
    const posts = communityPosts.get(req.params.id) || [];
    res.status(200).json({ success: true, data: { posts } });
  }

  async createCommunityPost(req: Request, res: Response): Promise<void> {
    const body = req.body as any;
    const postId = `cp_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;
    const post: CommunityPost = { id: postId, channelId: req.params.id, type: body.type || 'text', content: body.content || '', imageUrl: body.imageUrl, pollOptions: body.pollOptions, likes: 0, comments: 0, createdAt: new Date().toISOString() };
    const posts = communityPosts.get(req.params.id) || [];
    posts.unshift(post);
    communityPosts.set(req.params.id, posts);
    res.status(201).json({ success: true, data: { post } });
  }

  async subscribe(req: Request, res: Response): Promise<void> {
    const userId = req.userId || '';
    const channelId = req.params.id;
    const channel = channels.get(channelId);
    if (!channel) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Channel not found', statusCode: 404 } }); return; }
    const userSubs = subscriptions.get(userId) || [];
    if (!userSubs.includes(channelId)) { userSubs.push(channelId); channel.subscriberCount++; }
    subscriptions.set(userId, userSubs);
    res.status(200).json({ success: true, data: { subscribed: true, subscriberCount: channel.subscriberCount } });
  }

  async unsubscribe(req: Request, res: Response): Promise<void> {
    const userId = req.userId || '';
    const channelId = req.params.id;
    const channel = channels.get(channelId);
    if (!channel) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Channel not found', statusCode: 404 } }); return; }
    const userSubs = subscriptions.get(userId) || [];
    const idx = userSubs.indexOf(channelId);
    if (idx > -1) { userSubs.splice(idx, 1); channel.subscriberCount = Math.max(0, channel.subscriberCount - 1); }
    subscriptions.set(userId, userSubs);
    res.status(200).json({ success: true, data: { subscribed: false, subscriberCount: channel.subscriberCount } });
  }

  async getMemberships(req: Request, res: Response): Promise<void> {
    const channel = channels.get(req.params.id);
    if (!channel) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Channel not found', statusCode: 404 } }); return; }
    res.status(200).json({ success: true, data: { memberships: channel.memberships } });
  }

  async joinMembership(req: Request, res: Response): Promise<void> {
    const body = req.body as any;
    res.status(200).json({ success: true, data: { membershipId: `mem_${Date.now().toString(36)}`, channelId: req.params.id, tierId: body.tierId, userId: req.userId, startedAt: new Date().toISOString() } });
  }

  async getAnalytics(req: Request, res: Response): Promise<void> {
    const channel = channels.get(req.params.id);
    if (!channel) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Channel not found', statusCode: 404 } }); return; }
    res.status(200).json({ success: true, data: { channelId: channel.id, subscribers: channel.subscriberCount, totalViews: channel.totalViews, videos: channel.videoCount, revenue: { total: 0, thisMonth: 0 }, growth: { subscribers: 0.05, views: 0.12 } } });
  }

  async getSubscriptions(req: Request, res: Response): Promise<void> {
    const userId = req.userId || '';
    const userSubs = subscriptions.get(userId) || [];
    const subChannels = userSubs.map(id => channels.get(id)).filter(Boolean);
    res.status(200).json({ success: true, data: { subscriptions: subChannels } });
  }
}

export const channelsController = new ChannelsController();
