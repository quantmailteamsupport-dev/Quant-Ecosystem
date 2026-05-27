import type {
  CaptureItem,
  CaptureType,
  CaptureSource,
  CaptureMetadata,
  CaptureBar,
  CaptureBarPosition,
  QuickNote,
  CaptureRoute,
} from './types.js';

export class UniversalCaptureBar {
  private bar: CaptureBar;
  private captures: Map<string, CaptureItem>;
  private notes: Map<string, QuickNote>;
  private routes: CaptureRoute[];

  constructor(config?: { position?: CaptureBarPosition; maxRecent?: number }) {
    this.bar = {
      id: `bar-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      visible: true,
      position: config?.position ?? 'top',
      width: 100,
      placeholder: 'Capture anything... (notes, links, images, voice)',
      recentCaptures: [],
      maxRecent: config?.maxRecent ?? 10,
    };
    this.captures = new Map();
    this.notes = new Map();
    this.routes = [
      { pattern: 'http', targetApp: 'quant-bookmarks', confidence: 0.8, priority: 1 },
      { pattern: 'todo|task|remind', targetApp: 'quant-tasks', confidence: 0.75, priority: 2 },
      {
        pattern: 'meeting|calendar|schedule',
        targetApp: 'quant-calendar',
        confidence: 0.75,
        priority: 3,
      },
      { pattern: 'note|idea|thought', targetApp: 'quant-notes', confidence: 0.7, priority: 4 },
    ];
  }

  getBar(): CaptureBar {
    return { ...this.bar, recentCaptures: [...this.bar.recentCaptures] };
  }

  show(): void {
    this.bar.visible = true;
  }

  hide(): void {
    this.bar.visible = false;
  }

  toggle(): void {
    this.bar.visible = !this.bar.visible;
  }

  isVisible(): boolean {
    return this.bar.visible;
  }

  setPosition(position: CaptureBarPosition): void {
    this.bar.position = position;
  }

  getPosition(): CaptureBarPosition {
    return this.bar.position;
  }

  capture(params: {
    content: string;
    type?: CaptureType;
    source?: Partial<CaptureSource>;
    metadata?: Partial<CaptureMetadata>;
    tags?: string[];
  }): CaptureItem {
    const captureType = params.type ?? this.detectType(params.content);
    const route = this.autoRoute(params.content);

    const item: CaptureItem = {
      id: `cap-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type: captureType,
      content: params.content,
      source: {
        type: params.source?.type ?? 'capture-bar',
        app: params.source?.app,
        url: params.source?.url,
        device: params.source?.device ?? 'desktop',
      },
      metadata: {
        title: params.metadata?.title,
        url: params.metadata?.url ?? this.extractUrl(params.content),
        imageUrl: params.metadata?.imageUrl,
        voiceTranscript: params.metadata?.voiceTranscript,
        fileSize: params.metadata?.fileSize,
        mimeType: params.metadata?.mimeType,
        dimensions: params.metadata?.dimensions,
      },
      routedTo: route,
      createdAt: new Date(),
      processedAt: route ? new Date() : null,
      tags: params.tags ?? [],
      priority: 'medium',
    };

    this.captures.set(item.id, item);
    this.addToRecent(item);

    return item;
  }

  quickNote(content: string): QuickNote {
    const captureItem = this.capture({ content, type: 'text' });

    const note: QuickNote = {
      id: `qn-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      content,
      captureItemId: captureItem.id,
      createdAt: new Date(),
      editedAt: null,
      routedTo: captureItem.routedTo,
      app: captureItem.routedTo ?? 'quant-notes',
    };

    this.notes.set(note.id, note);
    return note;
  }

  getCapture(captureId: string): CaptureItem | null {
    return this.captures.get(captureId) ?? null;
  }

  getCaptures(): CaptureItem[] {
    return Array.from(this.captures.values());
  }

  getRecentCaptures(): CaptureItem[] {
    return [...this.bar.recentCaptures];
  }

  getQuickNotes(): QuickNote[] {
    return Array.from(this.notes.values());
  }

  getQuickNote(noteId: string): QuickNote | null {
    return this.notes.get(noteId) ?? null;
  }

  autoRoute(content: string): string | null {
    const lower = content.toLowerCase();

    for (const route of this.routes.sort((a, b) => a.priority - b.priority)) {
      const patterns = route.pattern.split('|');
      for (const pat of patterns) {
        if (lower.includes(pat)) {
          return route.targetApp;
        }
      }
    }

    return 'quant-notes';
  }

  addRoute(route: CaptureRoute): void {
    this.routes.push(route);
    this.routes.sort((a, b) => a.priority - b.priority);
  }

  getRoutes(): CaptureRoute[] {
    return [...this.routes];
  }

  removeRoute(pattern: string): boolean {
    const idx = this.routes.findIndex((r) => r.pattern === pattern);
    if (idx === -1) return false;
    this.routes.splice(idx, 1);
    return true;
  }

  deleteCapture(captureId: string): boolean {
    const item = this.captures.get(captureId);
    if (!item) return false;
    this.captures.delete(captureId);
    this.bar.recentCaptures = this.bar.recentCaptures.filter((c) => c.id !== captureId);
    return true;
  }

  private detectType(content: string): CaptureType {
    if (content.match(/^https?:\/\//)) return 'link';
    if (content.match(/\.(png|jpg|jpeg|gif|webp|svg)/i)) return 'image';
    return 'text';
  }

  private extractUrl(content: string): string | undefined {
    const match = content.match(/https?:\/\/[^\s]+/);
    return match ? match[0] : undefined;
  }

  private addToRecent(item: CaptureItem): void {
    this.bar.recentCaptures.unshift(item);
    if (this.bar.recentCaptures.length > this.bar.maxRecent) {
      this.bar.recentCaptures.pop();
    }
  }
}

export function createCaptureBar(config?: {
  position?: CaptureBarPosition;
  maxRecent?: number;
}): UniversalCaptureBar {
  return new UniversalCaptureBar(config);
}
