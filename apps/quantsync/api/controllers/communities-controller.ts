// ============================================================================
// QuantSync - Communities Controller
// Create/join communities, moderation, rules, flairs
// ============================================================================

import type { Request, Response } from '../middleware';
import type { Community, CommunityCategory, CommunityRule, CommunitySettings, Flair } from '../../src/types';
import { searchService } from '../services/search-service';

class CommunitiesController {
  private communities: Map<string, Community> = new Map();
  private members: Map<string, Map<string, 'member' | 'moderator' | 'admin' | 'owner'>> = new Map();
  private userCommunities: Map<string, Set<string>> = new Map();

  async createCommunity(req: Request, res: Response): Promise<void> {
    const userId = req.userId!;
    const body = req.body as {
      name: string;
      displayName: string;
      description: string;
      category: CommunityCategory;
      icon?: string;
      banner?: string;
      rules?: { title: string; description: string }[];
      settings?: Partial<CommunitySettings>;
    };

    if (!body.name || !body.displayName || !body.description) {
      res.status(400).json({ success: false, error: { code: 'MISSING_FIELDS', message: 'name, displayName, and description are required', statusCode: 400 } });
      return;
    }

    // Check for duplicate name
    for (const c of this.communities.values()) {
      if (c.name.toLowerCase() === body.name.toLowerCase()) {
        res.status(409).json({ success: false, error: { code: 'NAME_TAKEN', message: 'Community name is already taken', statusCode: 409 } });
        return;
      }
    }

    const communityId = `community_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    const rules: CommunityRule[] = (body.rules || []).map((r, i) => ({
      id: `rule_${i}`,
      title: r.title,
      description: r.description,
      order: i + 1,
    }));

    const defaultSettings: CommunitySettings = {
      postApproval: false,
      allowAnonymous: true,
      allowPolls: true,
      allowMedia: true,
      restrictPostTypes: [],
      minKarmaToPost: 0,
      minAccountAge: 0,
      autoModEnabled: true,
      spamFilterLevel: 'medium',
    };

    const community: Community = {
      id: communityId,
      name: body.name,
      displayName: body.displayName,
      description: body.description,
      icon: body.icon || '',
      banner: body.banner || '',
      category: body.category || 'other',
      memberCount: 1,
      onlineCount: 1,
      postCount: 0,
      createdAt: new Date().toISOString(),
      rules,
      flairs: [],
      moderators: [],
      settings: { ...defaultSettings, ...body.settings },
      userRole: 'owner',
      isJoined: true,
    };

    this.communities.set(communityId, community);

    // Add creator as owner
    const memberMap = new Map<string, 'member' | 'moderator' | 'admin' | 'owner'>();
    memberMap.set(userId, 'owner');
    this.members.set(communityId, memberMap);

    // Track user membership
    if (!this.userCommunities.has(userId)) this.userCommunities.set(userId, new Set());
    this.userCommunities.get(userId)!.add(communityId);

    searchService.indexCommunity(community);

    res.status(201).json({ success: true, data: community });
  }

  async getCommunity(req: Request, res: Response): Promise<void> {
    const communityId = req.params['id'];
    const userId = req.userId;

    const community = this.communities.get(communityId);
    if (!community) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Community not found', statusCode: 404 } });
      return;
    }

    if (userId) {
      const memberMap = this.members.get(communityId);
      community.userRole = memberMap?.get(userId);
      community.isJoined = memberMap?.has(userId) || false;
    }

    res.status(200).json({ success: true, data: community });
  }

  async listCommunities(req: Request, res: Response): Promise<void> {
    const query = req.query as Record<string, string>;
    const category = query['category'] as CommunityCategory | undefined;
    const sortBy = query['sort'] || 'popular';
    const limit = Math.min(parseInt(query['limit'] || '20', 10), 50);
    const offset = parseInt(query['offset'] || '0', 10);

    let communities = Array.from(this.communities.values());

    if (category) {
      communities = communities.filter(c => c.category === category);
    }

    switch (sortBy) {
      case 'popular':
        communities.sort((a, b) => b.memberCount - a.memberCount);
        break;
      case 'new':
        communities.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      case 'active':
        communities.sort((a, b) => b.onlineCount - a.onlineCount);
        break;
    }

    const paginated = communities.slice(offset, offset + limit);
    res.status(200).json({ success: true, data: paginated, meta: { total: communities.length, limit, offset } });
  }

  async joinCommunity(req: Request, res: Response): Promise<void> {
    const userId = req.userId!;
    const communityId = req.params['id'];

    const community = this.communities.get(communityId);
    if (!community) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Community not found', statusCode: 404 } });
      return;
    }

    const memberMap = this.members.get(communityId) || new Map();
    if (memberMap.has(userId)) {
      res.status(409).json({ success: false, error: { code: 'ALREADY_MEMBER', message: 'You are already a member', statusCode: 409 } });
      return;
    }

    memberMap.set(userId, 'member');
    this.members.set(communityId, memberMap);
    community.memberCount++;

    if (!this.userCommunities.has(userId)) this.userCommunities.set(userId, new Set());
    this.userCommunities.get(userId)!.add(communityId);

    res.status(200).json({ success: true, data: { joined: true, memberCount: community.memberCount } });
  }

  async leaveCommunity(req: Request, res: Response): Promise<void> {
    const userId = req.userId!;
    const communityId = req.params['id'];

    const community = this.communities.get(communityId);
    if (!community) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Community not found', statusCode: 404 } });
      return;
    }

    const memberMap = this.members.get(communityId);
    if (!memberMap?.has(userId)) {
      res.status(400).json({ success: false, error: { code: 'NOT_MEMBER', message: 'You are not a member', statusCode: 400 } });
      return;
    }

    if (memberMap.get(userId) === 'owner') {
      res.status(400).json({ success: false, error: { code: 'OWNER_CANNOT_LEAVE', message: 'Transfer ownership before leaving', statusCode: 400 } });
      return;
    }

    memberMap.delete(userId);
    community.memberCount--;
    this.userCommunities.get(userId)?.delete(communityId);

    res.status(200).json({ success: true, data: { left: true, memberCount: community.memberCount } });
  }

  async updateCommunity(req: Request, res: Response): Promise<void> {
    const userId = req.userId!;
    const communityId = req.params['id'];
    const body = req.body as Partial<Pick<Community, 'displayName' | 'description' | 'icon' | 'banner' | 'category'>>;

    const community = this.communities.get(communityId);
    if (!community) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Community not found', statusCode: 404 } });
      return;
    }

    const memberMap = this.members.get(communityId);
    const role = memberMap?.get(userId);
    if (!role || !['owner', 'admin', 'moderator'].includes(role)) {
      res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Insufficient permissions', statusCode: 403 } });
      return;
    }

    if (body.displayName) community.displayName = body.displayName;
    if (body.description) community.description = body.description;
    if (body.icon) community.icon = body.icon;
    if (body.banner) community.banner = body.banner;
    if (body.category) community.category = body.category;

    res.status(200).json({ success: true, data: community });
  }

  async addFlair(req: Request, res: Response): Promise<void> {
    const userId = req.userId!;
    const communityId = req.params['id'];
    const body = req.body as { text: string; color: string; backgroundColor: string; emoji?: string };

    const community = this.communities.get(communityId);
    if (!community) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Community not found', statusCode: 404 } });
      return;
    }

    const memberMap = this.members.get(communityId);
    const role = memberMap?.get(userId);
    if (!role || !['owner', 'admin', 'moderator'].includes(role)) {
      res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Insufficient permissions', statusCode: 403 } });
      return;
    }

    const flair: Flair = {
      id: `flair_${Date.now()}`,
      text: body.text,
      color: body.color,
      backgroundColor: body.backgroundColor,
      emoji: body.emoji,
    };

    community.flairs.push(flair);
    res.status(201).json({ success: true, data: flair });
  }

  async addRule(req: Request, res: Response): Promise<void> {
    const userId = req.userId!;
    const communityId = req.params['id'];
    const body = req.body as { title: string; description: string };

    const community = this.communities.get(communityId);
    if (!community) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Community not found', statusCode: 404 } });
      return;
    }

    const memberMap = this.members.get(communityId);
    const role = memberMap?.get(userId);
    if (!role || !['owner', 'admin'].includes(role)) {
      res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Only admins can add rules', statusCode: 403 } });
      return;
    }

    const rule: CommunityRule = {
      id: `rule_${community.rules.length}`,
      title: body.title,
      description: body.description,
      order: community.rules.length + 1,
    };

    community.rules.push(rule);
    res.status(201).json({ success: true, data: rule });
  }

  async getUserCommunities(req: Request, res: Response): Promise<void> {
    const userId = req.params['userId'] || req.userId!;
    const communityIds = this.userCommunities.get(userId) || new Set();
    const communities = Array.from(communityIds).map(id => this.communities.get(id)).filter(Boolean);

    res.status(200).json({ success: true, data: communities });
  }
}

export const communitiesController = new CommunitiesController();
export default CommunitiesController;
