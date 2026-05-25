// ============================================================================
// QuantEdits - Motion Tracking Service
// Object tracking across frames, element attachment, keyframes, path smoothing
// ============================================================================

interface TrackedObject {
  id: string;
  videoId: string;
  name: string;
  initialBounds: BoundingBox;
  frames: TrackingFrame[];
  smoothedPath: Point[];
  status: 'tracking' | 'completed' | 'lost';
  confidence: number;
  algorithm: 'optical_flow' | 'correlation' | 'deep_learning' | 'hybrid';
  createdAt: string;
}

interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
}

interface Point {
  x: number;
  y: number;
  time: number;
}

interface TrackingFrame {
  frameIndex: number;
  timestamp: number;
  bounds: BoundingBox;
  confidence: number;
  isKeyframe: boolean;
  velocity: { vx: number; vy: number };
}

interface AttachedElement {
  id: string;
  trackId: string;
  type: 'text' | 'sticker' | 'image' | 'shape' | 'effect';
  content: string;
  offset: { x: number; y: number };
  scale: number;
  rotation: number;
  opacity: number;
  followRotation: boolean;
  followScale: boolean;
}

interface TrackingExportData {
  trackId: string;
  format: 'json' | 'csv' | 'after_effects';
  frames: { time: number; x: number; y: number; scale: number; rotation: number }[];
  metadata: { fps: number; duration: number; totalFrames: number };
}

class MotionTrackingService {
  private tracks: Map<string, TrackedObject> = new Map();
  private attachments: Map<string, AttachedElement[]> = new Map();
  private counter: number = 0;

  private genId(prefix: string): string {
    return `${prefix}_${Date.now().toString(36)}_${(++this.counter).toString(36)}`;
  }

  async trackObject(videoId: string, objectBounds: BoundingBox, options?: { name?: string; algorithm?: TrackedObject['algorithm']; fps?: number; duration?: number }): Promise<TrackedObject> {
    const fps = options?.fps || 30;
    const duration = options?.duration || 10;
    const totalFrames = fps * duration;

    const frames: TrackingFrame[] = [];
    let currentX = objectBounds.x;
    let currentY = objectBounds.y;
    let currentRotation = objectBounds.rotation;

    // Simulate realistic motion tracking with slight variations
    for (let i = 0; i < totalFrames; i++) {
      const vx = (Math.random() - 0.5) * 4;
      const vy = (Math.random() - 0.5) * 3;
      currentX += vx;
      currentY += vy;
      currentRotation += (Math.random() - 0.5) * 2;

      // Keep in bounds
      currentX = Math.max(0, Math.min(1920, currentX));
      currentY = Math.max(0, Math.min(1080, currentY));

      const confidence = Math.max(0.5, 0.95 - Math.abs(vx) * 0.01 - Math.abs(vy) * 0.01 + (Math.random() - 0.5) * 0.1);

      frames.push({
        frameIndex: i,
        timestamp: i / fps,
        bounds: {
          x: currentX,
          y: currentY,
          width: objectBounds.width * (0.95 + Math.random() * 0.1),
          height: objectBounds.height * (0.95 + Math.random() * 0.1),
          rotation: currentRotation,
        },
        confidence,
        isKeyframe: i % (fps * 2) === 0,
        velocity: { vx, vy },
      });
    }

    const smoothedPath = this.smoothPath(frames.map(f => ({ x: f.bounds.x, y: f.bounds.y, time: f.timestamp })));
    const avgConfidence = frames.reduce((s, f) => s + f.confidence, 0) / frames.length;

    const track: TrackedObject = {
      id: this.genId('track'),
      videoId,
      name: options?.name || `Tracked Object ${this.counter}`,
      initialBounds: objectBounds,
      frames,
      smoothedPath,
      status: avgConfidence > 0.7 ? 'completed' : 'lost',
      confidence: Math.round(avgConfidence * 1000) / 1000,
      algorithm: options?.algorithm || 'hybrid',
      createdAt: new Date().toISOString(),
    };

    this.tracks.set(track.id, track);
    return track;
  }

  async attachElement(trackId: string, element: Omit<AttachedElement, 'id' | 'trackId'>): Promise<AttachedElement> {
    const track = this.tracks.get(trackId);
    if (!track) throw new Error('Track not found');
    if (track.status === 'lost') throw new Error('Cannot attach to lost track');

    const attached: AttachedElement = {
      id: this.genId('elem'),
      trackId,
      ...element,
    };

    const trackAttachments = this.attachments.get(trackId) || [];
    trackAttachments.push(attached);
    this.attachments.set(trackId, trackAttachments);
    return attached;
  }

  async setKeyframes(trackId: string, keyframeIndices: number[]): Promise<TrackedObject> {
    const track = this.tracks.get(trackId);
    if (!track) throw new Error('Track not found');

    // Reset all keyframes
    for (const frame of track.frames) {
      frame.isKeyframe = false;
    }

    // Set new keyframes
    for (const idx of keyframeIndices) {
      if (idx >= 0 && idx < track.frames.length) {
        track.frames[idx].isKeyframe = true;
      }
    }

    return track;
  }

  smoothPath(points: Point[], windowSize: number = 5): Point[] {
    if (points.length < windowSize) return points;

    const smoothed: Point[] = [];
    const half = Math.floor(windowSize / 2);

    for (let i = 0; i < points.length; i++) {
      const start = Math.max(0, i - half);
      const end = Math.min(points.length - 1, i + half);
      const window = points.slice(start, end + 1);

      const avgX = window.reduce((s, p) => s + p.x, 0) / window.length;
      const avgY = window.reduce((s, p) => s + p.y, 0) / window.length;

      smoothed.push({ x: Math.round(avgX * 100) / 100, y: Math.round(avgY * 100) / 100, time: points[i].time });
    }

    return smoothed;
  }

  async previewTracking(trackId: string, startFrame?: number, endFrame?: number): Promise<{ trackId: string; frames: TrackingFrame[]; previewUrl: string }> {
    const track = this.tracks.get(trackId);
    if (!track) throw new Error('Track not found');

    const start = startFrame || 0;
    const end = endFrame || Math.min(track.frames.length, 90);
    const frames = track.frames.slice(start, end);

    return {
      trackId,
      frames,
      previewUrl: `https://cdn.quant.edits/tracking/${trackId}/preview.mp4`,
    };
  }

  async getTrackingPoints(trackId: string): Promise<{ points: Point[]; keyframes: Point[] }> {
    const track = this.tracks.get(trackId);
    if (!track) throw new Error('Track not found');

    const points = track.frames.map(f => ({ x: f.bounds.x, y: f.bounds.y, time: f.timestamp }));
    const keyframes = track.frames.filter(f => f.isKeyframe).map(f => ({ x: f.bounds.x, y: f.bounds.y, time: f.timestamp }));

    return { points, keyframes };
  }

  async exportData(trackId: string, format: TrackingExportData['format'] = 'json'): Promise<TrackingExportData> {
    const track = this.tracks.get(trackId);
    if (!track) throw new Error('Track not found');

    const fps = track.frames.length > 0 ? Math.round(1 / (track.frames[1]?.timestamp - track.frames[0]?.timestamp || 1/30)) : 30;
    const duration = track.frames[track.frames.length - 1]?.timestamp || 0;

    return {
      trackId,
      format,
      frames: track.frames.map(f => ({
        time: f.timestamp,
        x: f.bounds.x,
        y: f.bounds.y,
        scale: f.bounds.width / track.initialBounds.width,
        rotation: f.bounds.rotation,
      })),
      metadata: { fps, duration, totalFrames: track.frames.length },
    };
  }
}

export const motionTrackingService = new MotionTrackingService();
export { MotionTrackingService };
