// ============================================================================
// QuantNeon - Pinned Posts Service
// Pin/unpin posts, reorder, validation, grid management
// ============================================================================

interface PinnedPost {
  id: string;
  postId: string;
  userId: string;
  position: number;
  pinnedAt: string;
  postType: 'image' | 'video' | 'carousel' | 'reel';
  thumbnailUrl: string;
  caption: string;
  engagement: { likes: number; comments: number };
}

interface PinValidation {
  eligible: boolean;
  reason?: string;
  postType: string;
  isArchived: boolean;
  isRestricted: boolean;
}

interface PinGrid {
  userId: string;
  maxPins: number;
  currentPins: number;
  posts: PinnedPost[];
  lastModified: string;
}

class PinnedPostsService {
  private pinnedPosts: Map<string, PinnedPost[]> = new Map();
  private postPinStatus: Map<string, boolean> = new Map();
  private maxPinsPerUser: number = 3;
  private counter: number = 0;

  private genId(prefix: string): string {
    return `${prefix}_${Date.now().toString(36)}_${(++this.counter).toString(36)}`;
  }

  async pin(postId: string, userId: string, position?: number): Promise<PinnedPost> {
    const validation = await this.validateEligibility(postId, userId);
    if (!validation.eligible) throw new Error(validation.reason || 'Post cannot be pinned');

    const userPins = this.pinnedPosts.get(userId) || [];
    if (userPins.length >= this.maxPinsPerUser) {
      throw new Error(`Maximum ${this.maxPinsPerUser} pinned posts allowed`);
    }

    if (this.postPinStatus.get(postId)) throw new Error('Post is already pinned');

    const targetPosition = position !== undefined ? Math.min(position, userPins.length) : userPins.length;

    const pinnedPost: PinnedPost = {
      id: this.genId('pin'),
      postId,
      userId,
      position: targetPosition,
      pinnedAt: new Date().toISOString(),
      postType: ['image', 'video', 'carousel', 'reel'][Math.floor(Math.random() * 4)] as PinnedPost['postType'],
      thumbnailUrl: `https://cdn.quant.neon/posts/${postId}/thumb.jpg`,
      caption: `Pinned post ${postId}`,
      engagement: {
        likes: Math.floor(100 + Math.random() * 10000),
        comments: Math.floor(10 + Math.random() * 500),
      },
    };

    // Shift existing pins to make room
    for (const pin of userPins) {
      if (pin.position >= targetPosition) pin.position++;
    }

    userPins.push(pinnedPost);
    userPins.sort((a, b) => a.position - b.position);
    this.pinnedPosts.set(userId, userPins);
    this.postPinStatus.set(postId, true);

    return pinnedPost;
  }

  async unpin(postId: string, userId: string): Promise<boolean> {
    const userPins = this.pinnedPosts.get(userId) || [];
    const idx = userPins.findIndex(p => p.postId === postId);
    if (idx === -1) throw new Error('Post is not pinned');

    const removedPosition = userPins[idx].position;
    userPins.splice(idx, 1);

    // Reorder remaining pins
    for (const pin of userPins) {
      if (pin.position > removedPosition) pin.position--;
    }

    this.pinnedPosts.set(userId, userPins);
    this.postPinStatus.set(postId, false);
    return true;
  }

  async reorder(userId: string, postIds: string[]): Promise<PinnedPost[]> {
    const userPins = this.pinnedPosts.get(userId) || [];
    if (postIds.length !== userPins.length) throw new Error('Must provide all pinned post IDs');

    const reordered: PinnedPost[] = [];
    for (let i = 0; i < postIds.length; i++) {
      const pin = userPins.find(p => p.postId === postIds[i]);
      if (!pin) throw new Error(`Post ${postIds[i]} is not pinned`);
      pin.position = i;
      reordered.push(pin);
    }

    reordered.sort((a, b) => a.position - b.position);
    this.pinnedPosts.set(userId, reordered);
    return reordered;
  }

  async getMaxPins(): Promise<{ maxPins: number; description: string }> {
    return {
      maxPins: this.maxPinsPerUser,
      description: `Users can pin up to ${this.maxPinsPerUser} posts to their profile grid`,
    };
  }

  async validateEligibility(postId: string, userId?: string): Promise<PinValidation> {
    // Simulate various validation checks
    const isArchived = Math.random() < 0.05;
    const isRestricted = Math.random() < 0.03;
    const postTypes = ['image', 'video', 'carousel', 'reel'];
    const postType = postTypes[Math.floor(Math.random() * postTypes.length)];

    if (isArchived) {
      return { eligible: false, reason: 'Archived posts cannot be pinned', postType, isArchived, isRestricted };
    }
    if (isRestricted) {
      return { eligible: false, reason: 'Restricted posts cannot be pinned', postType, isArchived, isRestricted };
    }

    return { eligible: true, postType, isArchived: false, isRestricted: false };
  }

  async getPinned(userId: string): Promise<PinGrid> {
    const userPins = this.pinnedPosts.get(userId) || [];
    return {
      userId,
      maxPins: this.maxPinsPerUser,
      currentPins: userPins.length,
      posts: userPins.sort((a, b) => a.position - b.position),
      lastModified: userPins.length > 0
        ? userPins.reduce((latest, p) => p.pinnedAt > latest ? p.pinnedAt : latest, userPins[0].pinnedAt)
        : new Date().toISOString(),
    };
  }

  async swapPositions(userId: string, postId1: string, postId2: string): Promise<PinnedPost[]> {
    const userPins = this.pinnedPosts.get(userId) || [];
    const pin1 = userPins.find(p => p.postId === postId1);
    const pin2 = userPins.find(p => p.postId === postId2);
    if (!pin1 || !pin2) throw new Error('One or both posts are not pinned');

    const tempPos = pin1.position;
    pin1.position = pin2.position;
    pin2.position = tempPos;

    userPins.sort((a, b) => a.position - b.position);
    this.pinnedPosts.set(userId, userPins);
    return userPins;
  }

  async getStats(userId: string): Promise<{ totalPins: number; avgEngagement: number; topPin: PinnedPost | null }> {
    const userPins = this.pinnedPosts.get(userId) || [];
    if (userPins.length === 0) return { totalPins: 0, avgEngagement: 0, topPin: null };

    const avgEngagement = userPins.reduce((s, p) => s + p.engagement.likes + p.engagement.comments, 0) / userPins.length;
    const topPin = userPins.sort((a, b) => (b.engagement.likes + b.engagement.comments) - (a.engagement.likes + a.engagement.comments))[0];

    return { totalPins: userPins.length, avgEngagement: Math.round(avgEngagement), topPin };
  }
}

export const pinnedPostsService = new PinnedPostsService();
export { PinnedPostsService };
