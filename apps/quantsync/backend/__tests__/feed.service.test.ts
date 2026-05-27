import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FeedService } from '../services/feed.service';

function createMockPrisma() {
  return {
    post: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    userRelationship: {
      findMany: vi.fn(),
    },
  };
}

describe('FeedService', () => {
  let service: FeedService;
  let prisma: ReturnType<typeof createMockPrisma>;

  beforeEach(() => {
    prisma = createMockPrisma();
    service = new FeedService(prisma as never);
  });

  describe('getFeed', () => {
    it('returns paginated feed from followed users', async () => {
      prisma.userRelationship.findMany.mockResolvedValue([
        { followingId: 'user-2' },
        { followingId: 'user-3' },
      ]);
      prisma.post.findMany.mockResolvedValue([
        { id: 'post-1', userId: 'user-2' },
        { id: 'post-2', userId: 'user-3' },
      ]);
      prisma.post.count.mockResolvedValue(2);

      const result = await service.getFeed('user-1', { page: 1, pageSize: 20 });

      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
    });
  });

  describe('getTrending', () => {
    it('returns trending posts within timeframe', async () => {
      prisma.post.findMany.mockResolvedValue([{ id: 'post-1', likeCount: 100 }]);
      prisma.post.count.mockResolvedValue(1);

      const result = await service.getTrending('24h', { page: 1, pageSize: 20 });

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
    });
  });

  describe('getBookmarks', () => {
    it('returns paginated bookmarks for a user', async () => {
      prisma.post.findMany.mockResolvedValue([{ id: 'post-1', userId: 'user-1' }]);
      prisma.post.count.mockResolvedValue(1);

      const result = await service.getBookmarks('user-1', { page: 1, pageSize: 20 });

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
    });

    it('handles empty bookmarks', async () => {
      prisma.post.findMany.mockResolvedValue([]);
      prisma.post.count.mockResolvedValue(0);

      const result = await service.getBookmarks('user-1');

      expect(result.data).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });

  describe('getExploreFeed', () => {
    it('returns popular public content', async () => {
      prisma.post.findMany.mockResolvedValue([{ id: 'post-1', viewCount: 1000 }]);
      prisma.post.count.mockResolvedValue(1);

      const result = await service.getExploreFeed({ page: 1, pageSize: 20 });

      expect(result.data).toHaveLength(1);
    });
  });
});
