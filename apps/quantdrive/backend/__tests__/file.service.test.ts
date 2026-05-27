import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FileService } from '../services/file.service';

function createMockPrisma() {
  return {
    file: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    fileVersion: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
  };
}

describe('FileService', () => {
  let service: FileService;
  let prisma: ReturnType<typeof createMockPrisma>;

  beforeEach(() => {
    prisma = createMockPrisma();
    service = new FileService(prisma as never);
  });

  describe('uploadFile', () => {
    it('encrypts content and stores file with IV, authTag, and contentHash', async () => {
      let capturedData: Record<string, unknown> = {};
      prisma.file.create.mockImplementation(async (args: { data: Record<string, unknown> }) => {
        capturedData = args.data;
        return { id: 'file-1', ...args.data };
      });

      const plaintext = Buffer.from('Hello, World! This is secret content.');
      const result = await service.uploadFile({
        name: 'test.txt',
        content: plaintext,
        mimeType: 'text/plain',
        userId: 'user-1',
      });

      // Encrypted content should differ from plaintext
      const encryptedContent = capturedData['encryptedContent'] as string;
      expect(encryptedContent).not.toBe(plaintext.toString('base64'));
      expect(encryptedContent.length).toBeGreaterThan(0);

      // IV and authTag should be present
      expect(capturedData['encryptionIV']).toBeDefined();
      expect((capturedData['encryptionIV'] as string).length).toBe(24); // 12 bytes hex
      expect(capturedData['encryptionAuthTag']).toBeDefined();
      expect((capturedData['encryptionAuthTag'] as string).length).toBe(32); // 16 bytes hex

      // contentHash should be a 64-char SHA-256 hex string
      expect(capturedData['contentHash']).toBeDefined();
      expect((capturedData['contentHash'] as string).length).toBe(64);

      expect(result).toBeDefined();
    });

    it('produces same contentHash for same plaintext content', async () => {
      const capturedCalls: Array<Record<string, unknown>> = [];
      prisma.file.create.mockImplementation(async (args: { data: Record<string, unknown> }) => {
        capturedCalls.push(args.data);
        return { id: `file-${capturedCalls.length}`, ...args.data };
      });

      const plaintext = Buffer.from('Identical content for hash test');

      await service.uploadFile({
        name: 'file1.txt',
        content: plaintext,
        mimeType: 'text/plain',
        userId: 'user-1',
      });

      await service.uploadFile({
        name: 'file2.txt',
        content: plaintext,
        mimeType: 'text/plain',
        userId: 'user-1',
      });

      expect(capturedCalls[0]!['contentHash']).toBe(capturedCalls[1]!['contentHash']);
    });
  });

  describe('downloadFile', () => {
    it('decrypts content and returns original plaintext (round-trip)', async () => {
      let capturedData: Record<string, unknown> = {};
      prisma.file.create.mockImplementation(async (args: { data: Record<string, unknown> }) => {
        capturedData = { id: 'file-1', ...args.data };
        return capturedData;
      });

      const originalContent = Buffer.from(
        'This is my super secret file content that should survive encryption round-trip!',
      );

      await service.uploadFile({
        name: 'secret.txt',
        content: originalContent,
        mimeType: 'text/plain',
        userId: 'user-1',
      });

      // Now mock findUnique to return the captured encrypted data
      prisma.file.findUnique.mockResolvedValue(capturedData);

      const downloaded = await service.downloadFile('file-1', 'user-1');

      expect(downloaded.content).toEqual(originalContent);
      expect(downloaded.name).toBe('secret.txt');
      expect(downloaded.mimeType).toBe('text/plain');
      expect(downloaded.size).toBe(originalContent.length);
    });
  });

  describe('getFileMetadata', () => {
    it('returns file record when found and user is owner', async () => {
      const mockFile = {
        id: 'file-1',
        name: 'test.txt',
        mimeType: 'text/plain',
        size: 100,
        userId: 'user-1',
        isDeleted: false,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      prisma.file.findUnique.mockResolvedValue(mockFile);

      const result = await service.getFileMetadata('file-1', 'user-1');

      expect(result).toEqual(mockFile);
    });

    it('throws 404 for missing file', async () => {
      prisma.file.findUnique.mockResolvedValue(null);

      await expect(service.getFileMetadata('missing', 'user-1')).rejects.toThrow('File not found');
    });

    it('throws 403 for wrong user', async () => {
      const mockFile = {
        id: 'file-1',
        name: 'test.txt',
        userId: 'user-1',
        isDeleted: false,
      };
      prisma.file.findUnique.mockResolvedValue(mockFile);

      await expect(service.getFileMetadata('file-1', 'user-2')).rejects.toThrow(
        'Not authorized to access this file',
      );
    });
  });

  describe('updateFile', () => {
    it('creates a version with encryptionKey when content is updated', async () => {
      const existingFile = {
        id: 'file-1',
        name: 'test.txt',
        mimeType: 'text/plain',
        size: 100,
        encryptedContent: 'oldEncrypted',
        encryptionIV: 'aabbccdd00112233aabbccdd',
        encryptionAuthTag: 'aabbccdd00112233aabbccdd00112233',
        encryptionKey: 'a'.repeat(64),
        contentHash: 'oldhash',
        userId: 'user-1',
        folderId: null,
        isDeleted: false,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      prisma.file.findUnique.mockResolvedValue(existingFile);
      prisma.fileVersion.create.mockResolvedValue({});
      prisma.file.update.mockResolvedValue({ ...existingFile, name: 'updated.txt' });

      const result = await service.updateFile('file-1', 'user-1', {
        name: 'updated.txt',
        content: Buffer.from('new content'),
      });

      expect(prisma.fileVersion.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          fileId: 'file-1',
          encryptedContent: 'oldEncrypted',
          encryptionIV: 'aabbccdd00112233aabbccdd',
          encryptionAuthTag: 'aabbccdd00112233aabbccdd00112233',
          encryptionKey: 'a'.repeat(64),
          size: 100,
        }),
      });
      expect(result.name).toBe('updated.txt');
    });
  });

  describe('deleteFile', () => {
    it('soft deletes the file with isDeleted=true', async () => {
      const existingFile = {
        id: 'file-1',
        name: 'test.txt',
        mimeType: 'text/plain',
        size: 100,
        userId: 'user-1',
        isDeleted: false,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      prisma.file.findUnique.mockResolvedValue(existingFile);
      prisma.file.update.mockResolvedValue({ ...existingFile, isDeleted: true });

      const result = await service.deleteFile('file-1', 'user-1');

      expect(result.isDeleted).toBe(true);
      expect(prisma.file.update).toHaveBeenCalledWith({
        where: { id: 'file-1' },
        data: { isDeleted: true, deletedAt: expect.any(Date), updatedAt: expect.any(Date) },
      });
    });
  });

  describe('getFile', () => {
    it('returns file metadata (alias for getFileMetadata)', async () => {
      const mockFile = {
        id: 'file-1',
        name: 'test.txt',
        mimeType: 'text/plain',
        size: 100,
        userId: 'user-1',
        isDeleted: false,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      prisma.file.findUnique.mockResolvedValue(mockFile);

      const result = await service.getFile('file-1', 'user-1');

      expect(result.id).toBe('file-1');
      expect(result.name).toBe('test.txt');
    });
  });

  describe('listFiles', () => {
    it('returns files for user', async () => {
      const files = [
        { id: 'f-1', name: 'a.txt', userId: 'user-1', isDeleted: false },
        { id: 'f-2', name: 'b.txt', userId: 'user-1', isDeleted: false },
      ];
      prisma.file.findMany.mockResolvedValue(files);

      const result = await service.listFiles('user-1');

      expect(result).toHaveLength(2);
      expect(prisma.file.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-1', isDeleted: false },
        }),
      );
    });

    it('filters by folderId when provided', async () => {
      prisma.file.findMany.mockResolvedValue([]);

      await service.listFiles('user-1', 'folder-1');

      expect(prisma.file.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-1', isDeleted: false, folderId: 'folder-1' },
        }),
      );
    });

    it('supports limit and offset options', async () => {
      prisma.file.findMany.mockResolvedValue([]);

      await service.listFiles('user-1', undefined, { limit: 10, offset: 5 });

      expect(prisma.file.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 10,
          skip: 5,
        }),
      );
    });
  });

  describe('moveFile', () => {
    it('updates file folderId to target folder', async () => {
      const existingFile = {
        id: 'file-1',
        name: 'test.txt',
        mimeType: 'text/plain',
        size: 100,
        userId: 'user-1',
        folderId: 'folder-1',
        isDeleted: false,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      prisma.file.findUnique.mockResolvedValue(existingFile);
      prisma.file.update.mockResolvedValue({ ...existingFile, folderId: 'folder-2' });

      const result = await service.moveFile('file-1', 'user-1', 'folder-2');

      expect(result.folderId).toBe('folder-2');
      expect(prisma.file.update).toHaveBeenCalledWith({
        where: { id: 'file-1' },
        data: { folderId: 'folder-2', updatedAt: expect.any(Date) },
      });
    });
  });

  describe('copyFile', () => {
    it('creates a copy of the file in the target folder', async () => {
      const existingFile = {
        id: 'file-1',
        name: 'test.txt',
        mimeType: 'text/plain',
        size: 100,
        encryptedContent: 'encrypted-data',
        encryptionIV: 'iv-hex',
        encryptionAuthTag: 'tag-hex',
        encryptionKey: 'key-hex',
        contentHash: 'hash-abc',
        userId: 'user-1',
        folderId: 'folder-1',
        isDeleted: false,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      prisma.file.findUnique.mockResolvedValue(existingFile);
      prisma.file.create.mockImplementation(async (args: { data: Record<string, unknown> }) => ({
        id: 'file-2',
        ...args.data,
      }));

      const result = await service.copyFile('file-1', 'user-1', 'folder-2');

      expect(result.name).toBe('test.txt (copy)');
      expect(result.folderId).toBe('folder-2');
      expect(prisma.file.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'test.txt (copy)',
          folderId: 'folder-2',
          encryptedContent: 'encrypted-data',
        }),
      });
    });
  });
});
