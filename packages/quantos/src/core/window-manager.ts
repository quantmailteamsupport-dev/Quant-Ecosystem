// ============================================================================
// QuantOS - Window Manager
// ============================================================================

import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import type { Window, WindowConfig, WindowPosition, WindowSize, TileLayout } from '../types';

// ============================================================================
// Validation Schemas
// ============================================================================

export const CreateWindowSchema = z.object({
  appId: z.string().min(1),
  title: z.string().min(1).max(256),
  config: z
    .object({
      position: z.object({ x: z.number(), y: z.number() }).optional(),
      size: z.object({ width: z.number().positive(), height: z.number().positive() }).optional(),
    })
    .optional(),
});

export const MoveWindowSchema = z.object({
  windowId: z.string().min(1),
  position: z.object({ x: z.number(), y: z.number() }),
});

export const ResizeWindowSchema = z.object({
  windowId: z.string().min(1),
  size: z.object({ width: z.number().positive(), height: z.number().positive() }),
});

// ============================================================================
// WindowManager Class
// ============================================================================

export class WindowManager {
  private windows: Map<string, Window> = new Map();
  private nextZIndex = 1;

  createWindow(appId: string, title: string, config?: WindowConfig): Window {
    CreateWindowSchema.parse({ appId, title, config });

    const window: Window = {
      id: randomUUID(),
      title,
      position: config?.position ?? { x: 100, y: 100 },
      size: config?.size ?? { width: 800, height: 600 },
      state: 'normal',
      zIndex: this.nextZIndex++,
      appId,
      createdAt: Date.now(),
    };

    this.windows.set(window.id, window);
    return window;
  }

  closeWindow(windowId: string): void {
    if (!this.windows.has(windowId)) {
      throw new Error(`Window not found: ${windowId}`);
    }
    this.windows.delete(windowId);
  }

  moveWindow(windowId: string, position: WindowPosition): Window {
    MoveWindowSchema.parse({ windowId, position });

    const window = this.windows.get(windowId);
    if (!window) {
      throw new Error(`Window not found: ${windowId}`);
    }

    window.position = position;
    return window;
  }

  resizeWindow(windowId: string, size: WindowSize): Window {
    ResizeWindowSchema.parse({ windowId, size });

    const window = this.windows.get(windowId);
    if (!window) {
      throw new Error(`Window not found: ${windowId}`);
    }

    window.size = size;
    return window;
  }

  maximizeWindow(windowId: string): Window {
    const window = this.windows.get(windowId);
    if (!window) {
      throw new Error(`Window not found: ${windowId}`);
    }

    window.state = 'maximized';
    window.position = { x: 0, y: 0 };
    window.size = { width: 1920, height: 1080 };
    return window;
  }

  minimizeWindow(windowId: string): Window {
    const window = this.windows.get(windowId);
    if (!window) {
      throw new Error(`Window not found: ${windowId}`);
    }

    window.state = 'minimized';
    return window;
  }

  restoreWindow(windowId: string): Window {
    const window = this.windows.get(windowId);
    if (!window) {
      throw new Error(`Window not found: ${windowId}`);
    }

    window.state = 'normal';
    return window;
  }

  tileWindows(layout: TileLayout): Window[] {
    const allWindows = Array.from(this.windows.values());
    if (allWindows.length === 0) return [];

    const count = allWindows.length;

    if (layout === 'horizontal') {
      const width = Math.floor(1920 / count);
      allWindows.forEach((win, index) => {
        win.position = { x: index * width, y: 0 };
        win.size = { width, height: 1080 };
        win.state = 'normal';
      });
    } else if (layout === 'vertical') {
      const height = Math.floor(1080 / count);
      allWindows.forEach((win, index) => {
        win.position = { x: 0, y: index * height };
        win.size = { width: 1920, height };
        win.state = 'normal';
      });
    } else {
      // grid layout
      const cols = Math.ceil(Math.sqrt(count));
      const rows = Math.ceil(count / cols);
      const cellWidth = Math.floor(1920 / cols);
      const cellHeight = Math.floor(1080 / rows);

      allWindows.forEach((win, index) => {
        const col = index % cols;
        const row = Math.floor(index / cols);
        win.position = { x: col * cellWidth, y: row * cellHeight };
        win.size = { width: cellWidth, height: cellHeight };
        win.state = 'normal';
      });
    }

    return allWindows;
  }

  focusWindow(windowId: string): Window {
    const window = this.windows.get(windowId);
    if (!window) {
      throw new Error(`Window not found: ${windowId}`);
    }

    window.zIndex = this.nextZIndex++;
    if (window.state === 'minimized') {
      window.state = 'normal';
    }
    return window;
  }

  getWindowStack(): Window[] {
    return Array.from(this.windows.values()).sort((a, b) => a.zIndex - b.zIndex);
  }
}
