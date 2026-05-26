import { describe, it, expect, beforeEach } from 'vitest';
import { WindowManager } from '../core/window-manager';

describe('WindowManager', () => {
  let wm: WindowManager;

  beforeEach(() => {
    wm = new WindowManager();
  });

  describe('createWindow', () => {
    it('should create a window with default config', () => {
      const win = wm.createWindow('app-1', 'Test Window');

      expect(win.id).toBeTruthy();
      expect(win.title).toBe('Test Window');
      expect(win.appId).toBe('app-1');
      expect(win.state).toBe('normal');
      expect(win.position).toEqual({ x: 100, y: 100 });
      expect(win.size).toEqual({ width: 800, height: 600 });
      expect(win.zIndex).toBe(1);
      expect(win.createdAt).toBeGreaterThan(0);
    });

    it('should create a window with custom config', () => {
      const win = wm.createWindow('app-2', 'Custom', {
        position: { x: 200, y: 300 },
        size: { width: 1024, height: 768 },
      });

      expect(win.position).toEqual({ x: 200, y: 300 });
      expect(win.size).toEqual({ width: 1024, height: 768 });
    });

    it('should assign incrementing z-indexes', () => {
      const win1 = wm.createWindow('app-1', 'Win 1');
      const win2 = wm.createWindow('app-1', 'Win 2');
      const win3 = wm.createWindow('app-1', 'Win 3');

      expect(win1.zIndex).toBe(1);
      expect(win2.zIndex).toBe(2);
      expect(win3.zIndex).toBe(3);
    });

    it('should throw on empty title', () => {
      expect(() => wm.createWindow('app-1', '')).toThrow();
    });
  });

  describe('closeWindow', () => {
    it('should close an existing window', () => {
      const win = wm.createWindow('app-1', 'Test');
      wm.closeWindow(win.id);

      expect(wm.getWindowStack()).toHaveLength(0);
    });

    it('should throw for non-existent window', () => {
      expect(() => wm.closeWindow('nonexistent')).toThrow('Window not found');
    });
  });

  describe('moveWindow', () => {
    it('should move a window to new position', () => {
      const win = wm.createWindow('app-1', 'Test');
      const moved = wm.moveWindow(win.id, { x: 500, y: 400 });

      expect(moved.position).toEqual({ x: 500, y: 400 });
    });

    it('should throw for non-existent window', () => {
      expect(() => wm.moveWindow('nonexistent', { x: 0, y: 0 })).toThrow('Window not found');
    });
  });

  describe('resizeWindow', () => {
    it('should resize a window', () => {
      const win = wm.createWindow('app-1', 'Test');
      const resized = wm.resizeWindow(win.id, { width: 1200, height: 900 });

      expect(resized.size).toEqual({ width: 1200, height: 900 });
    });

    it('should throw for invalid size', () => {
      const win = wm.createWindow('app-1', 'Test');
      expect(() => wm.resizeWindow(win.id, { width: -100, height: 900 })).toThrow();
    });

    it('should throw for non-existent window', () => {
      expect(() => wm.resizeWindow('nonexistent', { width: 100, height: 100 })).toThrow(
        'Window not found',
      );
    });
  });

  describe('maximizeWindow', () => {
    it('should maximize a window', () => {
      const win = wm.createWindow('app-1', 'Test');
      const maximized = wm.maximizeWindow(win.id);

      expect(maximized.state).toBe('maximized');
      expect(maximized.position).toEqual({ x: 0, y: 0 });
      expect(maximized.size).toEqual({ width: 1920, height: 1080 });
    });

    it('should throw for non-existent window', () => {
      expect(() => wm.maximizeWindow('nonexistent')).toThrow('Window not found');
    });
  });

  describe('minimizeWindow', () => {
    it('should minimize a window', () => {
      const win = wm.createWindow('app-1', 'Test');
      const minimized = wm.minimizeWindow(win.id);

      expect(minimized.state).toBe('minimized');
    });

    it('should throw for non-existent window', () => {
      expect(() => wm.minimizeWindow('nonexistent')).toThrow('Window not found');
    });
  });

  describe('restoreWindow', () => {
    it('should restore a minimized window', () => {
      const win = wm.createWindow('app-1', 'Test');
      wm.minimizeWindow(win.id);
      const restored = wm.restoreWindow(win.id);

      expect(restored.state).toBe('normal');
    });

    it('should restore a maximized window', () => {
      const win = wm.createWindow('app-1', 'Test');
      wm.maximizeWindow(win.id);
      const restored = wm.restoreWindow(win.id);

      expect(restored.state).toBe('normal');
    });
  });

  describe('tileWindows', () => {
    it('should tile windows horizontally', () => {
      wm.createWindow('app-1', 'Win 1');
      wm.createWindow('app-2', 'Win 2');

      const tiled = wm.tileWindows('horizontal');

      expect(tiled).toHaveLength(2);
      expect(tiled[0]!.position.x).toBe(0);
      expect(tiled[1]!.position.x).toBe(960);
      expect(tiled[0]!.size.width).toBe(960);
    });

    it('should tile windows vertically', () => {
      wm.createWindow('app-1', 'Win 1');
      wm.createWindow('app-2', 'Win 2');

      const tiled = wm.tileWindows('vertical');

      expect(tiled).toHaveLength(2);
      expect(tiled[0]!.position.y).toBe(0);
      expect(tiled[1]!.position.y).toBe(540);
      expect(tiled[0]!.size.height).toBe(540);
    });

    it('should tile windows in grid layout', () => {
      wm.createWindow('app-1', 'Win 1');
      wm.createWindow('app-2', 'Win 2');
      wm.createWindow('app-3', 'Win 3');
      wm.createWindow('app-4', 'Win 4');

      const tiled = wm.tileWindows('grid');

      expect(tiled).toHaveLength(4);
      expect(tiled[0]!.position).toEqual({ x: 0, y: 0 });
      expect(tiled[1]!.position).toEqual({ x: 960, y: 0 });
      expect(tiled[2]!.position).toEqual({ x: 0, y: 540 });
      expect(tiled[3]!.position).toEqual({ x: 960, y: 540 });
    });

    it('should return empty array with no windows', () => {
      const tiled = wm.tileWindows('horizontal');
      expect(tiled).toHaveLength(0);
    });
  });

  describe('focusWindow', () => {
    it('should bring window to front with highest z-index', () => {
      const win1 = wm.createWindow('app-1', 'Win 1');
      wm.createWindow('app-2', 'Win 2');

      const focused = wm.focusWindow(win1.id);

      expect(focused.zIndex).toBe(3);
    });

    it('should restore minimized window on focus', () => {
      const win = wm.createWindow('app-1', 'Test');
      wm.minimizeWindow(win.id);

      const focused = wm.focusWindow(win.id);

      expect(focused.state).toBe('normal');
    });

    it('should throw for non-existent window', () => {
      expect(() => wm.focusWindow('nonexistent')).toThrow('Window not found');
    });
  });

  describe('getWindowStack', () => {
    it('should return windows sorted by z-index', () => {
      const win1 = wm.createWindow('app-1', 'Win 1');
      const win2 = wm.createWindow('app-2', 'Win 2');
      wm.focusWindow(win1.id);

      const stack = wm.getWindowStack();

      expect(stack).toHaveLength(2);
      expect(stack[0]!.id).toBe(win2.id);
      expect(stack[1]!.id).toBe(win1.id);
    });

    it('should return empty array when no windows', () => {
      expect(wm.getWindowStack()).toHaveLength(0);
    });
  });
});
