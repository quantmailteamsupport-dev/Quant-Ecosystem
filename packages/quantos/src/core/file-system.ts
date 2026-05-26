// ============================================================================
// QuantOS - File System Abstraction
// ============================================================================

import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import type { FileNode } from '../types';

// ============================================================================
// Validation Schemas
// ============================================================================

export const CreateFileSchema = z.object({
  path: z.string().min(1),
  content: z.string(),
  mimeType: z.string().min(1).default('text/plain'),
});

export const MoveFileSchema = z.object({
  from: z.string().min(1),
  to: z.string().min(1),
});

// ============================================================================
// FileSystemAbstraction Class
// ============================================================================

export class FileSystemAbstraction {
  private files: Map<string, FileNode> = new Map();
  private contents: Map<string, string> = new Map();

  createFile(path: string, content: string, mimeType = 'text/plain'): FileNode {
    CreateFileSchema.parse({ path, content, mimeType });

    if (this.files.has(path)) {
      throw new Error(`File already exists: ${path}`);
    }

    const name = path.split('/').pop() ?? path;
    const node: FileNode = {
      id: randomUUID(),
      name,
      path,
      type: 'file',
      size: content.length,
      mimeType,
      createdAt: Date.now(),
      modifiedAt: Date.now(),
    };

    this.files.set(path, node);
    this.contents.set(path, content);

    // Ensure parent directories exist
    this.ensureDirectories(path);

    return node;
  }

  readFile(path: string): { node: FileNode; content: string } {
    const node = this.files.get(path);
    if (!node) {
      throw new Error(`File not found: ${path}`);
    }
    if (node.type !== 'file') {
      throw new Error(`Not a file: ${path}`);
    }

    const content = this.contents.get(path) ?? '';
    return { node, content };
  }

  deleteFile(path: string): void {
    const node = this.files.get(path);
    if (!node) {
      throw new Error(`File not found: ${path}`);
    }

    if (node.type === 'directory') {
      // Delete all children
      for (const [filePath] of this.files) {
        if (filePath.startsWith(path + '/')) {
          this.files.delete(filePath);
          this.contents.delete(filePath);
        }
      }
    }

    this.files.delete(path);
    this.contents.delete(path);
  }

  listDirectory(path: string): FileNode[] {
    const dir = this.files.get(path);
    if (!dir && path !== '/') {
      throw new Error(`Directory not found: ${path}`);
    }

    const prefix = path === '/' ? '/' : path + '/';
    const results: FileNode[] = [];

    for (const [filePath, node] of this.files) {
      if (filePath === path) continue;
      if (!filePath.startsWith(prefix)) continue;

      // Only direct children
      const remaining = filePath.slice(prefix.length);
      if (!remaining.includes('/')) {
        results.push(node);
      }
    }

    return results;
  }

  moveFile(from: string, to: string): FileNode {
    MoveFileSchema.parse({ from, to });

    const node = this.files.get(from);
    if (!node) {
      throw new Error(`File not found: ${from}`);
    }

    if (this.files.has(to)) {
      throw new Error(`Destination already exists: ${to}`);
    }

    const content = this.contents.get(from) ?? '';
    const name = to.split('/').pop() ?? to;

    this.files.delete(from);
    this.contents.delete(from);

    const movedNode: FileNode = {
      ...node,
      name,
      path: to,
      modifiedAt: Date.now(),
    };

    this.files.set(to, movedNode);
    this.contents.set(to, content);
    this.ensureDirectories(to);

    return movedNode;
  }

  copyFile(from: string, to: string): FileNode {
    const node = this.files.get(from);
    if (!node) {
      throw new Error(`File not found: ${from}`);
    }

    if (this.files.has(to)) {
      throw new Error(`Destination already exists: ${to}`);
    }

    const content = this.contents.get(from) ?? '';
    const name = to.split('/').pop() ?? to;

    const copyNode: FileNode = {
      id: randomUUID(),
      name,
      path: to,
      type: node.type,
      size: node.size,
      mimeType: node.mimeType,
      createdAt: Date.now(),
      modifiedAt: Date.now(),
    };

    this.files.set(to, copyNode);
    this.contents.set(to, content);
    this.ensureDirectories(to);

    return copyNode;
  }

  searchFiles(query: string): FileNode[] {
    const results: FileNode[] = [];
    const lowerQuery = query.toLowerCase();

    for (const [, node] of this.files) {
      if (
        node.name.toLowerCase().includes(lowerQuery) ||
        node.path.toLowerCase().includes(lowerQuery)
      ) {
        results.push(node);
      }
    }

    return results;
  }

  getMetadata(path: string): FileNode {
    const node = this.files.get(path);
    if (!node) {
      throw new Error(`File not found: ${path}`);
    }
    return node;
  }

  private ensureDirectories(filePath: string): void {
    const parts = filePath.split('/').filter(Boolean);
    let currentPath = '';

    // Exclude the file itself
    for (let i = 0; i < parts.length - 1; i++) {
      currentPath += '/' + parts[i];

      if (!this.files.has(currentPath)) {
        const dirNode: FileNode = {
          id: randomUUID(),
          name: parts[i]!,
          path: currentPath,
          type: 'directory',
          size: 0,
          mimeType: 'inode/directory',
          createdAt: Date.now(),
          modifiedAt: Date.now(),
        };
        this.files.set(currentPath, dirNode);
      }
    }
  }
}
