// ============================================================================
// QuantChat - Folders Service
// Chat organization with folders, ordering, pinning
// ============================================================================

interface ChatFolder {
  id: string;
  userId: string;
  name: string;
  emoji: string | null;
  color: string | null;
  chatIds: string[];
  isPinned: boolean;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

interface FolderContents {
  folder: ChatFolder;
  chats: Array<{ chatId: string; addedAt: Date; order: number }>;
  totalUnread: number;
}

export class FoldersService {
  private folders: Map<string, ChatFolder> = new Map();
  private userFolderIndex: Map<string, string[]> = new Map();
  private chatFolderMap: Map<string, string> = new Map();

  async createFolder(userId: string, config: { name: string; emoji?: string; color?: string }): Promise<ChatFolder> {
    if (!config.name || config.name.trim().length === 0) {
      throw new Error('Folder name is required');
    }
    if (config.name.length > 50) {
      throw new Error('Folder name too long (max 50 characters)');
    }

    const userFolders = this.userFolderIndex.get(userId) || [];
    if (userFolders.length >= 20) {
      throw new Error('Maximum folder limit reached (20)');
    }

    // Check for duplicate names
    for (const folderId of userFolders) {
      const existing = this.folders.get(folderId);
      if (existing && existing.name.toLowerCase() === config.name.toLowerCase().trim()) {
        throw new Error('Folder with this name already exists');
      }
    }

    const folderId = `folder_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const maxOrder = userFolders.reduce((max, id) => {
      const f = this.folders.get(id);
      return f ? Math.max(max, f.order) : max;
    }, 0);

    const folder: ChatFolder = {
      id: folderId,
      userId,
      name: config.name.trim(),
      emoji: config.emoji || null,
      color: config.color || null,
      chatIds: [],
      isPinned: false,
      order: maxOrder + 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.folders.set(folderId, folder);
    userFolders.push(folderId);
    this.userFolderIndex.set(userId, userFolders);

    return folder;
  }

  async renameFolder(folderId: string, userId: string, newName: string): Promise<ChatFolder> {
    const folder = this.folders.get(folderId);
    if (!folder) throw new Error('Folder not found');
    if (folder.userId !== userId) throw new Error('Access denied');
    if (!newName || newName.trim().length === 0) throw new Error('Name is required');

    folder.name = newName.trim();
    folder.updatedAt = new Date();
    return folder;
  }

  async deleteFolder(folderId: string, userId: string): Promise<void> {
    const folder = this.folders.get(folderId);
    if (!folder) throw new Error('Folder not found');
    if (folder.userId !== userId) throw new Error('Access denied');

    // Remove chat associations
    for (const chatId of folder.chatIds) {
      this.chatFolderMap.delete(`${userId}:${chatId}`);
    }

    this.folders.delete(folderId);
    const userFolders = this.userFolderIndex.get(userId) || [];
    this.userFolderIndex.set(userId, userFolders.filter(id => id !== folderId));
  }

  async addChat(folderId: string, userId: string, chatId: string): Promise<ChatFolder> {
    const folder = this.folders.get(folderId);
    if (!folder) throw new Error('Folder not found');
    if (folder.userId !== userId) throw new Error('Access denied');

    if (folder.chatIds.includes(chatId)) {
      throw new Error('Chat already in this folder');
    }

    // Remove from previous folder if any
    const prevFolderKey = `${userId}:${chatId}`;
    const prevFolderId = this.chatFolderMap.get(prevFolderKey);
    if (prevFolderId) {
      const prevFolder = this.folders.get(prevFolderId);
      if (prevFolder) {
        prevFolder.chatIds = prevFolder.chatIds.filter(id => id !== chatId);
        prevFolder.updatedAt = new Date();
      }
    }

    folder.chatIds.push(chatId);
    folder.updatedAt = new Date();
    this.chatFolderMap.set(prevFolderKey, folderId);

    return folder;
  }

  async removeChat(folderId: string, userId: string, chatId: string): Promise<ChatFolder> {
    const folder = this.folders.get(folderId);
    if (!folder) throw new Error('Folder not found');
    if (folder.userId !== userId) throw new Error('Access denied');

    if (!folder.chatIds.includes(chatId)) {
      throw new Error('Chat not in this folder');
    }

    folder.chatIds = folder.chatIds.filter(id => id !== chatId);
    folder.updatedAt = new Date();
    this.chatFolderMap.delete(`${userId}:${chatId}`);

    return folder;
  }

  async reorderChats(folderId: string, userId: string, chatIds: string[]): Promise<ChatFolder> {
    const folder = this.folders.get(folderId);
    if (!folder) throw new Error('Folder not found');
    if (folder.userId !== userId) throw new Error('Access denied');

    // Validate that all chatIds are in the folder
    const folderChatSet = new Set(folder.chatIds);
    for (const id of chatIds) {
      if (!folderChatSet.has(id)) {
        throw new Error(`Chat ${id} is not in this folder`);
      }
    }

    folder.chatIds = chatIds;
    folder.updatedAt = new Date();
    return folder;
  }

  async listFolders(userId: string): Promise<ChatFolder[]> {
    const folderIds = this.userFolderIndex.get(userId) || [];
    return folderIds
      .map(id => this.folders.get(id))
      .filter((f): f is ChatFolder => f !== undefined)
      .sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return a.order - b.order;
      });
  }

  async getFolderContents(folderId: string, userId: string): Promise<FolderContents> {
    const folder = this.folders.get(folderId);
    if (!folder) throw new Error('Folder not found');
    if (folder.userId !== userId) throw new Error('Access denied');

    const chats = folder.chatIds.map((chatId, index) => ({
      chatId,
      addedAt: folder.createdAt,
      order: index,
    }));

    return {
      folder,
      chats,
      totalUnread: Math.floor(Math.random() * 10),
    };
  }

  async pinFolder(folderId: string, userId: string): Promise<ChatFolder> {
    const folder = this.folders.get(folderId);
    if (!folder) throw new Error('Folder not found');
    if (folder.userId !== userId) throw new Error('Access denied');

    folder.isPinned = !folder.isPinned;
    folder.updatedAt = new Date();
    return folder;
  }

  async updateFolderOrder(userId: string, folderOrder: string[]): Promise<ChatFolder[]> {
    const userFolders = this.userFolderIndex.get(userId) || [];

    for (let i = 0; i < folderOrder.length; i++) {
      const folder = this.folders.get(folderOrder[i]);
      if (folder && folder.userId === userId) {
        folder.order = i + 1;
        folder.updatedAt = new Date();
      }
    }

    return this.listFolders(userId);
  }

  async getChatFolder(userId: string, chatId: string): Promise<ChatFolder | null> {
    const folderId = this.chatFolderMap.get(`${userId}:${chatId}`);
    if (!folderId) return null;
    return this.folders.get(folderId) || null;
  }
}

export const foldersService = new FoldersService();
