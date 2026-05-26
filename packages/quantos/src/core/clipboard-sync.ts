// ============================================================================
// QuantOS - Clipboard Sync
// ============================================================================

import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import type { ClipboardItem, ClipboardContentType } from '../types';

// ============================================================================
// Validation Schemas
// ============================================================================

export const CopySchema = z.object({
  content: z.string().min(1),
  type: z.enum(['text', 'image', 'html', 'file', 'rich']).default('text'),
  sourceApp: z.string().min(1),
});

// ============================================================================
// ClipboardSync Class
// ============================================================================

export class ClipboardSync {
  private history: ClipboardItem[] = [];
  private maxHistorySize = 100;

  copy(content: string, type: ClipboardContentType = 'text', sourceApp: string): ClipboardItem {
    CopySchema.parse({ content, type, sourceApp });

    const item: ClipboardItem = {
      id: randomUUID(),
      content,
      type,
      sourceApp,
      timestamp: Date.now(),
      synced: false,
    };

    this.history.unshift(item);

    if (this.history.length > this.maxHistorySize) {
      this.history = this.history.slice(0, this.maxHistorySize);
    }

    return item;
  }

  paste(): ClipboardItem | null {
    return this.history[0] ?? null;
  }

  getHistory(): ClipboardItem[] {
    return [...this.history];
  }

  clearHistory(): void {
    this.history = [];
  }

  syncToDevice(_deviceId: string): void {
    // Mark all unsynced items as synced
    for (const item of this.history) {
      item.synced = true;
    }
  }

  setMaxHistorySize(size: number): void {
    this.maxHistorySize = size;
    if (this.history.length > size) {
      this.history = this.history.slice(0, size);
    }
  }
}
