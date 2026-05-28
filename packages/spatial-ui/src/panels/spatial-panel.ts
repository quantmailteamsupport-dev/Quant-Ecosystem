import type { SpatialPanel } from '../types.js';

type LayoutPreset = 'meeting-grid' | 'workspace' | 'theater';

const PRESETS: Record<
  LayoutPreset,
  Array<{ position: { x: number; y: number; z: number }; size: { w: number; h: number } }>
> = {
  'meeting-grid': [
    { position: { x: -1, y: 1.5, z: -2 }, size: { w: 80, h: 60 } },
    { position: { x: 1, y: 1.5, z: -2 }, size: { w: 80, h: 60 } },
    { position: { x: -1, y: 0.5, z: -2 }, size: { w: 80, h: 60 } },
    { position: { x: 1, y: 0.5, z: -2 }, size: { w: 80, h: 60 } },
  ],
  workspace: [
    { position: { x: 0, y: 1.2, z: -1.5 }, size: { w: 160, h: 100 } },
    { position: { x: -1.5, y: 1.2, z: -1 }, size: { w: 80, h: 100 } },
  ],
  theater: [{ position: { x: 0, y: 1.5, z: -3 }, size: { w: 300, h: 180 } }],
};

export class SpatialPanelManager {
  private panels = new Map<string, SpatialPanel>();
  private groups = new Map<string, Set<string>>();
  private snapGrid = 0.25;

  createPanel(opts: Omit<SpatialPanel, 'id'>): SpatialPanel {
    const id = `panel-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const panel: SpatialPanel = { id, ...opts };
    this.panels.set(id, panel);
    return panel;
  }

  movePanel(id: string, pos: { x: number; y: number; z: number }): boolean {
    const p = this.panels.get(id);
    if (!p) return false;
    p.position = pos;
    return true;
  }

  resizePanel(id: string, size: { w: number; h: number }): boolean {
    const p = this.panels.get(id);
    if (!p) return false;
    p.size = size;
    return true;
  }

  anchorPanel(id: string, anchor: SpatialPanel['anchor']): boolean {
    const p = this.panels.get(id);
    if (!p) return false;
    p.anchor = anchor;
    return true;
  }

  removePanel(id: string): boolean {
    return this.panels.delete(id);
  }

  snapToGrid(id: string): boolean {
    const p = this.panels.get(id);
    if (!p) return false;
    p.position = {
      x: Math.round(p.position.x / this.snapGrid) * this.snapGrid,
      y: Math.round(p.position.y / this.snapGrid) * this.snapGrid,
      z: Math.round(p.position.z / this.snapGrid) * this.snapGrid,
    };
    return true;
  }

  groupPanels(groupId: string, panelIds: string[]): boolean {
    const valid = panelIds.filter((id) => this.panels.has(id));
    if (valid.length === 0) return false;
    const group = this.groups.get(groupId) ?? new Set();
    for (const pid of valid) {
      group.add(pid);
      const panel = this.panels.get(pid);
      if (panel) panel.group = groupId;
    }
    this.groups.set(groupId, group);
    return true;
  }

  getGroup(groupId: string): string[] {
    const group = this.groups.get(groupId);
    return group ? [...group] : [];
  }

  focusPanel(id: string): boolean {
    const p = this.panels.get(id);
    if (!p) return false;
    for (const panel of this.panels.values()) {
      panel.focused = false;
    }
    p.focused = true;
    return true;
  }

  getFocusedPanel(): SpatialPanel | null {
    for (const panel of this.panels.values()) {
      if (panel.focused) return panel;
    }
    return null;
  }

  applyPreset(preset: LayoutPreset): SpatialPanel[] {
    const configs = PRESETS[preset];
    const panels: SpatialPanel[] = [];
    for (const config of configs) {
      panels.push(this.createPanel({ ...config, anchor: 'room' }));
    }
    return panels;
  }

  getPanel(id: string): SpatialPanel | null {
    return this.panels.get(id) ?? null;
  }
}
