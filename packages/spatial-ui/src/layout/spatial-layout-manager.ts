import type { SpatialLayout } from '../types.js';

export class SpatialLayoutManager {
  private layouts = new Map<string, SpatialLayout>();
  private activeLayoutId: string | null = null;
  private defaults = new Map<string, string>();

  saveLayout(layout: SpatialLayout): void {
    this.layouts.set(layout.id, layout);
  }

  getLayout(id: string): SpatialLayout | null {
    return this.layouts.get(id) ?? null;
  }

  deleteLayout(id: string): boolean {
    if (this.activeLayoutId === id) {
      this.activeLayoutId = null;
    }
    return this.layouts.delete(id);
  }

  activateLayout(id: string): boolean {
    if (!this.layouts.has(id)) return false;
    this.activeLayoutId = id;
    return true;
  }

  getActiveLayout(): SpatialLayout | null {
    if (!this.activeLayoutId) return null;
    return this.layouts.get(this.activeLayoutId) ?? null;
  }

  setDefault(task: string, layoutId: string): boolean {
    if (!this.layouts.has(layoutId)) return false;
    this.defaults.set(task, layoutId);
    return true;
  }

  getDefault(task: string): SpatialLayout | null {
    const id = this.defaults.get(task);
    if (!id) return null;
    return this.layouts.get(id) ?? null;
  }

  switchWorkspace(layoutId: string): SpatialLayout | null {
    if (!this.layouts.has(layoutId)) return null;
    this.activeLayoutId = layoutId;
    return this.layouts.get(layoutId) ?? null;
  }

  listLayouts(): SpatialLayout[] {
    return [...this.layouts.values()];
  }
}
