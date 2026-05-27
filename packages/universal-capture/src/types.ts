export interface CaptureItem {
  id: string;
  type: CaptureType;
  content: string;
  source: CaptureSource;
  metadata: CaptureMetadata;
  routedTo: string | null;
  createdAt: Date;
  processedAt: Date | null;
  tags: string[];
  priority: 'high' | 'medium' | 'low';
}

export type CaptureType = 'text' | 'link' | 'image' | 'voice' | 'file' | 'screenshot' | 'mixed';

export interface CaptureSource {
  type: 'capture-bar' | 'shortcut' | 'extension' | 'share' | 'api' | 'voice';
  app?: string;
  url?: string;
  device: string;
}

export interface CaptureMetadata {
  title?: string;
  url?: string;
  imageUrl?: string;
  voiceTranscript?: string;
  fileSize?: number;
  mimeType?: string;
  dimensions?: { width: number; height: number };
}

export interface CaptureBar {
  id: string;
  visible: boolean;
  position: CaptureBarPosition;
  width: number;
  placeholder: string;
  recentCaptures: CaptureItem[];
  maxRecent: number;
}

export type CaptureBarPosition = 'top' | 'bottom' | 'floating';

export interface QuickNote {
  id: string;
  content: string;
  captureItemId: string;
  createdAt: Date;
  editedAt: Date | null;
  routedTo: string | null;
  app: string;
}

export interface CaptureRoute {
  pattern: string;
  targetApp: string;
  confidence: number;
  priority: number;
}
