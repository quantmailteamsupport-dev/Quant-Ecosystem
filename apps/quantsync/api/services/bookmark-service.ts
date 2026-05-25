// ============================================================================
// QuantSync - Bookmark Service
// Post bookmarking, folder organization, tagging, search, export
// ============================================================================

interface Bookmark {
  id: string;
  userId: string;
  postId: string;
  folderId: string | null;
  tags: string[];
  note: string | null;
  postPreview: string;
  authorId: string;
  createdAt: Date;
}

interface BookmarkFolder {
  id: string;
  userId: string;
  name: string;
  emoji: string | null;
  isPrivate: boolean;
  bookmarkCount: number;
  createdAt: Date;
  updatedAt: Date;
}

interface BookmarkStats {
  totalBookmarks: number;
  totalFolders: number;
  topTags: Array<{ tag: string; count: number }>;
  recentActivity: Date | null;
  mostBookmarkedAuthors: Array<{ authorId: string; count: number }>;
}

export class BookmarkService {
  private bookmarks: Map<string, Bookmark> = new Map();
  private folders: Map<string, BookmarkFolder> = new Map();
  private userBookmarkIndex: Map<string, string[]> = new Map();
  private userFolderIndex: Map<string, string[]> = new Map();
  private postBookmarkMap: Map<string, string> = new Map();

  async addBookmark(userId: string, postId: string, options?: { folderId?: string; tags?: string[]; note?: string; postPreview?: string; authorId?: string }): Promise<Bookmark> {
    // Check for duplicate
    const existingKey = `${userId}:${postId}`;
    if (this.postBookmarkMap.has(existingKey)) {
      throw new Error('Post already bookmarked');
    }

    if (options?.folderId) {
      const folder = this.folders.get(options.folderId);
      if (!folder || folder.userId !== userId) throw new Error('Folder not found');
    }

    const bookmarkId = `bm_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const bookmark: Bookmark = {
      id: bookmarkId,
      userId,
      postId,
      folderId: options?.folderId || null,
      tags: options?.tags || [],
      note: options?.note || null,
      postPreview: options?.postPreview || `Post ${postId}`,
      authorId: options?.authorId || 'unknown',
      createdAt: new Date(),
    };

    this.bookmarks.set(bookmarkId, bookmark);
    this.postBookmarkMap.set(existingKey, bookmarkId);

    const userBms = this.userBookmarkIndex.get(userId) || [];
    userBms.push(bookmarkId);
    this.userBookmarkIndex.set(userId, userBms);

    // Update folder count
    if (bookmark.folderId) {
      const folder = this.folders.get(bookmark.folderId);
      if (folder) folder.bookmarkCount++;
    }

    return bookmark;
  }

  async removeBookmark(userId: string, postId: string): Promise<void> {
    const key = `${userId}:${postId}`;
    const bookmarkId = this.postBookmarkMap.get(key);
    if (!bookmarkId) throw new Error('Bookmark not found');

    const bookmark = this.bookmarks.get(bookmarkId);
    if (!bookmark) throw new Error('Bookmark not found');
    if (bookmark.userId !== userId) throw new Error('Access denied');

    if (bookmark.folderId) {
      const folder = this.folders.get(bookmark.folderId);
      if (folder) folder.bookmarkCount = Math.max(0, folder.bookmarkCount - 1);
    }

    this.bookmarks.delete(bookmarkId);
    this.postBookmarkMap.delete(key);
    const userBms = this.userBookmarkIndex.get(userId) || [];
    this.userBookmarkIndex.set(userId, userBms.filter(id => id !== bookmarkId));
  }

  async createFolder(userId: string, name: string, options?: { emoji?: string; isPrivate?: boolean }): Promise<BookmarkFolder> {
    if (!name || name.trim().length === 0) throw new Error('Folder name is required');

    const userFolders = this.userFolderIndex.get(userId) || [];
    if (userFolders.length >= 50) throw new Error('Maximum 50 folders allowed');

    // Check duplicate name
    for (const folderId of userFolders) {
      const f = this.folders.get(folderId);
      if (f && f.name.toLowerCase() === name.toLowerCase().trim()) {
        throw new Error('Folder with this name already exists');
      }
    }

    const folderId = `bf_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const folder: BookmarkFolder = {
      id: folderId,
      userId,
      name: name.trim(),
      emoji: options?.emoji || null,
      isPrivate: options?.isPrivate ?? true,
      bookmarkCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.folders.set(folderId, folder);
    userFolders.push(folderId);
    this.userFolderIndex.set(userId, userFolders);

    return folder;
  }

  async tagBookmark(bookmarkId: string, userId: string, tags: string[]): Promise<Bookmark> {
    const bookmark = this.bookmarks.get(bookmarkId);
    if (!bookmark) throw new Error('Bookmark not found');
    if (bookmark.userId !== userId) throw new Error('Access denied');

    const normalizedTags = tags.map(t => t.toLowerCase().trim()).filter(t => t.length > 0);
    const uniqueTags = [...new Set([...bookmark.tags, ...normalizedTags])];
    if (uniqueTags.length > 20) throw new Error('Maximum 20 tags per bookmark');

    bookmark.tags = uniqueTags;
    return bookmark;
  }

  async search(userId: string, query: string, options?: { folderId?: string; tags?: string[] }): Promise<Bookmark[]> {
    const userBmIds = this.userBookmarkIndex.get(userId) || [];
    let bookmarks = userBmIds
      .map(id => this.bookmarks.get(id))
      .filter((b): b is Bookmark => b !== undefined);

    if (options?.folderId) {
      bookmarks = bookmarks.filter(b => b.folderId === options.folderId);
    }
    if (options?.tags && options.tags.length > 0) {
      const searchTags = options.tags.map(t => t.toLowerCase());
      bookmarks = bookmarks.filter(b => searchTags.some(t => b.tags.includes(t)));
    }

    if (query && query.trim().length > 0) {
      const q = query.toLowerCase();
      bookmarks = bookmarks.filter(b =>
        b.postPreview.toLowerCase().includes(q) ||
        b.note?.toLowerCase().includes(q) ||
        b.tags.some(t => t.includes(q))
      );
    }

    return bookmarks.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async moveToFolder(bookmarkId: string, userId: string, folderId: string | null): Promise<Bookmark> {
    const bookmark = this.bookmarks.get(bookmarkId);
    if (!bookmark) throw new Error('Bookmark not found');
    if (bookmark.userId !== userId) throw new Error('Access denied');

    if (folderId) {
      const folder = this.folders.get(folderId);
      if (!folder || folder.userId !== userId) throw new Error('Folder not found');
      folder.bookmarkCount++;
    }

    if (bookmark.folderId) {
      const oldFolder = this.folders.get(bookmark.folderId);
      if (oldFolder) oldFolder.bookmarkCount = Math.max(0, oldFolder.bookmarkCount - 1);
    }

    bookmark.folderId = folderId;
    return bookmark;
  }

  async export(userId: string, format: 'json' | 'csv' = 'json'): Promise<string> {
    const userBmIds = this.userBookmarkIndex.get(userId) || [];
    const bookmarks = userBmIds
      .map(id => this.bookmarks.get(id))
      .filter((b): b is Bookmark => b !== undefined);

    if (format === 'json') {
      return JSON.stringify({ bookmarks, exportedAt: new Date(), count: bookmarks.length }, null, 2);
    }

    const header = 'id,postId,folder,tags,note,createdAt\n';
    const rows = bookmarks.map(b =>
      `${b.id},${b.postId},${b.folderId || ''},${b.tags.join(';')},${(b.note || '').replace(/,/g, ';')},${b.createdAt.toISOString()}`
    ).join('\n');

    return header + rows;
  }

  async getStats(userId: string): Promise<BookmarkStats> {
    const userBmIds = this.userBookmarkIndex.get(userId) || [];
    const bookmarks = userBmIds
      .map(id => this.bookmarks.get(id))
      .filter((b): b is Bookmark => b !== undefined);

    const folderIds = this.userFolderIndex.get(userId) || [];
    const tagCounts = new Map<string, number>();
    const authorCounts = new Map<string, number>();

    for (const bm of bookmarks) {
      for (const tag of bm.tags) {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
      }
      authorCounts.set(bm.authorId, (authorCounts.get(bm.authorId) || 0) + 1);
    }

    const topTags = Array.from(tagCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([tag, count]) => ({ tag, count }));

    const mostBookmarkedAuthors = Array.from(authorCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([authorId, count]) => ({ authorId, count }));

    const recentActivity = bookmarks.length > 0
      ? bookmarks.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0].createdAt
      : null;

    return {
      totalBookmarks: bookmarks.length,
      totalFolders: folderIds.length,
      topTags,
      recentActivity,
      mostBookmarkedAuthors,
    };
  }

  async getRecent(userId: string, limit: number = 20): Promise<Bookmark[]> {
    const userBmIds = this.userBookmarkIndex.get(userId) || [];
    return userBmIds
      .map(id => this.bookmarks.get(id))
      .filter((b): b is Bookmark => b !== undefined)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }
}

export const bookmarkService = new BookmarkService();
