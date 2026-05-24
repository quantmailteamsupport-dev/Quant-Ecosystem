// ============================================================================
// QuantNeon API - Profiles Controller
// User profiles, bio, highlights, grid layout, tagged, followers/following
// ============================================================================

import type { Request, Response } from '../middleware';

interface Profile {
  id: string;
  userId: string;
  username: string;
  displayName: string;
  bio: string;
  avatarUrl: string;
  website: string;
  isVerified: boolean;
  isPrivate: boolean;
  postCount: number;
  followerCount: number;
  followingCount: number;
  category: string;
}

const profiles: Map<string, Profile> = new Map();
const followers: Map<string, Set<string>> = new Map();
const following: Map<string, Set<string>> = new Map();
const closeFriends: Map<string, string[]> = new Map();
const blocked: Map<string, Set<string>> = new Map();

class ProfilesController {
  async getProfile(req: Request, res: Response): Promise<void> {
    const profile = profiles.get(req.params.id) || this.createDefaultProfile(req.params.id);
    const isFollowing = following.get(req.userId || '')?.has(req.params.id) || false;
    res.status(200).json({ success: true, data: { profile: { ...profile, isFollowing } } });
  }

  async updateProfile(req: Request, res: Response): Promise<void> {
    if (req.params.id !== req.userId) { res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Cannot edit another profile', statusCode: 403 } }); return; }
    const profile = profiles.get(req.params.id) || this.createDefaultProfile(req.params.id);
    const body = req.body as any;
    if (body.displayName) profile.displayName = body.displayName;
    if (body.bio) profile.bio = body.bio;
    if (body.avatarUrl) profile.avatarUrl = body.avatarUrl;
    if (body.website) profile.website = body.website;
    if (body.isPrivate !== undefined) profile.isPrivate = body.isPrivate;
    if (body.category) profile.category = body.category;
    profiles.set(req.params.id, profile);
    res.status(200).json({ success: true, data: { profile } });
  }

  async getProfilePosts(req: Request, res: Response): Promise<void> {
    res.status(200).json({ success: true, data: { posts: [], userId: req.params.id } });
  }

  async getProfileReels(req: Request, res: Response): Promise<void> {
    res.status(200).json({ success: true, data: { reels: [], userId: req.params.id } });
  }

  async getTaggedPosts(req: Request, res: Response): Promise<void> {
    res.status(200).json({ success: true, data: { posts: [], userId: req.params.id } });
  }

  async follow(req: Request, res: Response): Promise<void> {
    const userId = req.userId || '';
    const targetId = req.params.id;
    if (userId === targetId) { res.status(400).json({ success: false, error: { code: 'CANNOT_FOLLOW_SELF', message: 'Cannot follow yourself', statusCode: 400 } }); return; }
    const userFollowing = following.get(userId) || new Set();
    const targetFollowers = followers.get(targetId) || new Set();
    userFollowing.add(targetId);
    targetFollowers.add(userId);
    following.set(userId, userFollowing);
    followers.set(targetId, targetFollowers);
    const profile = profiles.get(targetId);
    if (profile) profile.followerCount = targetFollowers.size;
    res.status(200).json({ success: true, data: { following: true, followerCount: targetFollowers.size } });
  }

  async unfollow(req: Request, res: Response): Promise<void> {
    const userId = req.userId || '';
    const targetId = req.params.id;
    const userFollowing = following.get(userId) || new Set();
    const targetFollowers = followers.get(targetId) || new Set();
    userFollowing.delete(targetId);
    targetFollowers.delete(userId);
    following.set(userId, userFollowing);
    followers.set(targetId, targetFollowers);
    const profile = profiles.get(targetId);
    if (profile) profile.followerCount = targetFollowers.size;
    res.status(200).json({ success: true, data: { following: false, followerCount: targetFollowers.size } });
  }

  async getFollowers(req: Request, res: Response): Promise<void> {
    const targetFollowers = followers.get(req.params.id) || new Set();
    res.status(200).json({ success: true, data: { followers: Array.from(targetFollowers), count: targetFollowers.size } });
  }

  async getFollowing(req: Request, res: Response): Promise<void> {
    const userFollowing = following.get(req.params.id) || new Set();
    res.status(200).json({ success: true, data: { following: Array.from(userFollowing), count: userFollowing.size } });
  }

  async blockUser(req: Request, res: Response): Promise<void> {
    const userId = req.userId || '';
    const userBlocked = blocked.get(userId) || new Set();
    userBlocked.add(req.params.id);
    blocked.set(userId, userBlocked);
    // Also unfollow
    const userFollowing = following.get(userId) || new Set();
    userFollowing.delete(req.params.id);
    res.status(200).json({ success: true, data: { blocked: true } });
  }

  async updateCloseFriends(req: Request, res: Response): Promise<void> {
    const body = req.body as any;
    closeFriends.set(req.userId || '', body.userIds || []);
    res.status(200).json({ success: true, data: { closeFriends: body.userIds } });
  }

  async getSuggestions(req: Request, res: Response): Promise<void> {
    const suggestions = Array.from(profiles.values())
      .filter(p => p.userId !== req.userId)
      .slice(0, 10)
      .map(p => ({ ...p, reason: 'Suggested for you' }));
    res.status(200).json({ success: true, data: { suggestions } });
  }

  private createDefaultProfile(userId: string): Profile {
    const profile: Profile = { id: userId, userId, username: `user_${userId.substring(0, 8)}`, displayName: 'New User', bio: '', avatarUrl: '', website: '', isVerified: false, isPrivate: false, postCount: 0, followerCount: 0, followingCount: 0, category: 'personal' };
    profiles.set(userId, profile);
    return profile;
  }
}

export const profilesController = new ProfilesController();
