// ============================================================================
// QuantSync - Lists Service
// User list CRUD, add/remove members, timeline generation, public/private
// ============================================================================

interface UserList {
  id: string;
  ownerId: string;
  name: string;
  description: string;
  isPublic: boolean;
  members: string[];
  followers: string[];
  isPinned: boolean;
  coverImage?: string;
  createdAt: string;
  updatedAt: string;
}

interface ListTimeline {
  listId: string;
  posts: ListPost[];
  cursor?: string;
  hasMore: boolean;
}

interface ListPost {
  id: string;
  authorId: string;
  authorName: string;
  authorHandle: string;
  authorAvatar: string;
  content: string;
  likes: number;
  replies: number;
  createdAt: string;
}

interface ListStore {
  lists: Map<string, UserList>;
}

const store: ListStore = {
  lists: new Map(),
};

function generateId(): string {
  return `lst_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

export class ListsService {
  async createList(ownerId: string, data: { name: string; description?: string; isPublic?: boolean }): Promise<UserList> {
    if (!data.name.trim()) throw new Error('List name is required');
    if (data.name.length > 50) throw new Error('List name too long');

    const userLists = Array.from(store.lists.values()).filter(l => l.ownerId === ownerId);
    if (userLists.length >= 100) throw new Error('Maximum 100 lists per user');

    const list: UserList = {
      id: generateId(),
      ownerId,
      name: data.name.trim(),
      description: data.description?.trim() || '',
      isPublic: data.isPublic ?? true,
      members: [],
      followers: [],
      isPinned: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    store.lists.set(list.id, list);
    return list;
  }

  async updateList(listId: string, ownerId: string, data: { name?: string; description?: string; isPublic?: boolean }): Promise<UserList> {
    const list = store.lists.get(listId);
    if (!list || list.ownerId !== ownerId) throw new Error('List not found');

    if (data.name !== undefined) list.name = data.name.trim();
    if (data.description !== undefined) list.description = data.description.trim();
    if (data.isPublic !== undefined) list.isPublic = data.isPublic;
    list.updatedAt = new Date().toISOString();

    return list;
  }

  async deleteList(listId: string, ownerId: string): Promise<void> {
    const list = store.lists.get(listId);
    if (!list || list.ownerId !== ownerId) throw new Error('List not found');
    store.lists.delete(listId);
  }

  async getList(listId: string, requesterId?: string): Promise<UserList | null> {
    const list = store.lists.get(listId);
    if (!list) return null;
    if (!list.isPublic && list.ownerId !== requesterId) return null;
    return list;
  }

  async getUserLists(userId: string): Promise<{ lists: UserList[] }> {
    const lists = Array.from(store.lists.values())
      .filter(l => l.ownerId === userId)
      .sort((a, b) => {
        if (a.isPinned !== b.isPinned) return b.isPinned ? 1 : -1;
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      });
    return { lists };
  }

  async getFollowingLists(userId: string): Promise<{ lists: UserList[] }> {
    const lists = Array.from(store.lists.values()).filter(l => l.followers.includes(userId));
    return { lists };
  }

  async discoverLists(options: { limit?: number; category?: string } = {}): Promise<{ lists: UserList[] }> {
    const { limit = 20 } = options;
    const lists = Array.from(store.lists.values())
      .filter(l => l.isPublic && l.members.length > 0)
      .sort((a, b) => b.followers.length - a.followers.length)
      .slice(0, limit);
    return { lists };
  }

  async addMember(listId: string, ownerId: string, memberId: string): Promise<void> {
    const list = store.lists.get(listId);
    if (!list || list.ownerId !== ownerId) throw new Error('List not found');
    if (list.members.includes(memberId)) return;
    if (list.members.length >= 5000) throw new Error('Maximum 5000 members per list');
    list.members.push(memberId);
    list.updatedAt = new Date().toISOString();
  }

  async removeMember(listId: string, ownerId: string, memberId: string): Promise<void> {
    const list = store.lists.get(listId);
    if (!list || list.ownerId !== ownerId) throw new Error('List not found');
    list.members = list.members.filter(m => m !== memberId);
    list.updatedAt = new Date().toISOString();
  }

  async getMembers(listId: string, requesterId?: string): Promise<{ members: string[] }> {
    const list = store.lists.get(listId);
    if (!list) throw new Error('List not found');
    if (!list.isPublic && list.ownerId !== requesterId) throw new Error('Access denied');
    return { members: list.members };
  }

  async followList(listId: string, userId: string): Promise<void> {
    const list = store.lists.get(listId);
    if (!list) throw new Error('List not found');
    if (!list.isPublic && list.ownerId !== userId) throw new Error('Access denied');
    if (!list.followers.includes(userId)) {
      list.followers.push(userId);
    }
  }

  async unfollowList(listId: string, userId: string): Promise<void> {
    const list = store.lists.get(listId);
    if (!list) throw new Error('List not found');
    list.followers = list.followers.filter(f => f !== userId);
  }

  async pinList(listId: string, userId: string): Promise<void> {
    const list = store.lists.get(listId);
    if (!list || list.ownerId !== userId) throw new Error('List not found');
    list.isPinned = !list.isPinned;
  }

  async getListTimeline(listId: string, requesterId: string, options: { limit?: number; cursor?: string } = {}): Promise<ListTimeline> {
    const { limit = 20 } = options;
    const list = store.lists.get(listId);
    if (!list) throw new Error('List not found');
    if (!list.isPublic && list.ownerId !== requesterId && !list.followers.includes(requesterId)) {
      throw new Error('Access denied');
    }

    const posts: ListPost[] = list.members.slice(0, limit).map((memberId, i) => ({
      id: `post_${listId}_${i}`,
      authorId: memberId,
      authorName: `User ${i + 1}`,
      authorHandle: `user${i + 1}`,
      authorAvatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${memberId}`,
      content: `Post from list member ${i + 1}`,
      likes: Math.floor(Math.random() * 100),
      replies: Math.floor(Math.random() * 20),
      createdAt: new Date(Date.now() - Math.random() * 86400000).toISOString(),
    }));

    return { listId, posts, hasMore: list.members.length > limit };
  }

  async bulkAddMembers(listId: string, ownerId: string, memberIds: string[]): Promise<{ added: number; skipped: number }> {
    const list = store.lists.get(listId);
    if (!list || list.ownerId !== ownerId) throw new Error('List not found');

    let added = 0;
    let skipped = 0;
    for (const memberId of memberIds) {
      if (list.members.includes(memberId)) {
        skipped++;
      } else if (list.members.length < 5000) {
        list.members.push(memberId);
        added++;
      }
    }
    list.updatedAt = new Date().toISOString();
    return { added, skipped };
  }

  async searchLists(query: string, options: { limit?: number } = {}): Promise<{ lists: UserList[] }> {
    const { limit = 20 } = options;
    const q = query.toLowerCase();
    const lists = Array.from(store.lists.values())
      .filter(l => l.isPublic && (l.name.toLowerCase().includes(q) || l.description.toLowerCase().includes(q)))
      .slice(0, limit);
    return { lists };
  }
}

export const listsService = new ListsService();
