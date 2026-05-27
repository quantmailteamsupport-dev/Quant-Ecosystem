// ============================================================================
// Following Mode - Pure reverse-chronological feed of followed accounts
// ============================================================================

export interface SocialGraph {
  getFollowing(userId: string): string[];
}

export interface ContentPost {
  id: string;
  authorId: string;
  content: string;
  timestamp: number;
  metadata: Record<string, unknown>;
}

export interface ContentStore {
  getPostsByAuthors(
    authorIds: string[],
    options: { limit: number; offset: number; before?: number },
  ): ContentPost[];
}

export interface FollowingFeedResult {
  items: ContentPost[];
  page: number;
  pageSize: number;
  totalAvailable: number;
}

export class FollowingMode {
  private socialGraph: SocialGraph;
  private contentStore: ContentStore;

  constructor(socialGraph: SocialGraph, contentStore: ContentStore) {
    this.socialGraph = socialGraph;
    this.contentStore = contentStore;
  }

  getFeed(userId: string, page: number, pageSize: number): FollowingFeedResult {
    const following = this.socialGraph.getFollowing(userId);

    if (following.length === 0) {
      return { items: [], page, pageSize, totalAvailable: 0 };
    }

    // Fetch all available posts from followed authors
    const posts = this.contentStore.getPostsByAuthors(following, {
      limit: Number.MAX_SAFE_INTEGER,
      offset: 0,
    });

    // Sort by timestamp descending (pure chronological)
    posts.sort((a, b) => b.timestamp - a.timestamp);

    const totalAvailable = posts.length;
    const offset = (page - 1) * pageSize;
    const items = posts.slice(offset, offset + pageSize);

    return {
      items,
      page,
      pageSize,
      totalAvailable,
    };
  }
}
