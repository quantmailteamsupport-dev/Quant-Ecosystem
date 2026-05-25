// ============================================================================
// QuantEdits - AI Background Service
// Background detection, replacement, blur, removal, presets, edge blending
// ============================================================================

interface SegmentationResult {
  id: string;
  imageId: string;
  foregroundMask: number[][];
  backgroundMask: number[][];
  confidence: number;
  edgeQuality: number;
  processingTimeMs: number;
  dimensions: { width: number; height: number };
  detectedSubjects: { type: string; bounds: { x: number; y: number; w: number; h: number }; confidence: number }[];
}

interface BackgroundReplacement {
  id: string;
  imageId: string;
  originalUrl: string;
  newBackgroundUrl: string;
  resultUrl: string;
  blendMode: 'normal' | 'soft_light' | 'overlay' | 'multiply';
  edgeBlend: number;
  lightingAdjusted: boolean;
  status: 'processing' | 'completed' | 'failed';
  createdAt: string;
}

interface BackgroundPreset {
  id: string;
  name: string;
  category: 'nature' | 'urban' | 'studio' | 'abstract' | 'gradient' | 'custom';
  thumbnailUrl: string;
  fullUrl: string;
  popularity: number;
  isPremium: boolean;
}

interface BlurConfig {
  intensity: number;
  type: 'gaussian' | 'bokeh' | 'motion' | 'radial';
  focusPoint?: { x: number; y: number };
  depthAware: boolean;
  edgePreservation: number;
}

interface PreviewResult {
  id: string;
  previewUrl: string;
  quality: 'low' | 'medium' | 'high';
  dimensions: { width: number; height: number };
  expiresAt: string;
}

class AIBackgroundService {
  private segmentations: Map<string, SegmentationResult> = new Map();
  private replacements: Map<string, BackgroundReplacement> = new Map();
  private presets: Map<string, BackgroundPreset> = new Map();
  private counter: number = 0;

  constructor() {
    this.initPresets();
  }

  private genId(prefix: string): string {
    return `${prefix}_${Date.now().toString(36)}_${(++this.counter).toString(36)}`;
  }

  private initPresets(): void {
    const categories: BackgroundPreset['category'][] = ['nature', 'urban', 'studio', 'abstract', 'gradient'];
    const names = ['Sunset Beach', 'City Skyline', 'White Studio', 'Neon Waves', 'Blue Gradient', 'Mountain Lake', 'Night City', 'Dark Studio', 'Geometric', 'Warm Fade'];
    names.forEach((name, i) => {
      const preset: BackgroundPreset = {
        id: `preset_${i}`, name, category: categories[i % categories.length],
        thumbnailUrl: `https://cdn.quant.edits/presets/${i}/thumb.jpg`,
        fullUrl: `https://cdn.quant.edits/presets/${i}/full.jpg`,
        popularity: Math.floor(Math.random() * 10000), isPremium: i > 6,
      };
      this.presets.set(preset.id, preset);
    });
  }

  async detect(imageData: string): Promise<SegmentationResult> {
    const width = 1920;
    const height = 1080;
    const maskSize = 32;
    const foregroundMask: number[][] = [];
    const backgroundMask: number[][] = [];

    for (let y = 0; y < maskSize; y++) {
      const fRow: number[] = [];
      const bRow: number[] = [];
      for (let x = 0; x < maskSize; x++) {
        const cx = x / maskSize - 0.5;
        const cy = y / maskSize - 0.5;
        const dist = Math.sqrt(cx * cx + cy * cy);
        const fg = dist < 0.3 ? 1 : dist < 0.35 ? 1 - (dist - 0.3) / 0.05 : 0;
        fRow.push(Math.round(fg * 100) / 100);
        bRow.push(Math.round((1 - fg) * 100) / 100);
      }
      foregroundMask.push(fRow);
      backgroundMask.push(bRow);
    }

    const result: SegmentationResult = {
      id: this.genId('seg'),
      imageId: imageData.substring(0, 20),
      foregroundMask,
      backgroundMask,
      confidence: 0.92 + Math.random() * 0.07,
      edgeQuality: 0.85 + Math.random() * 0.12,
      processingTimeMs: 100 + Math.floor(Math.random() * 400),
      dimensions: { width, height },
      detectedSubjects: [
        { type: 'person', bounds: { x: 0.2, y: 0.1, w: 0.6, h: 0.8 }, confidence: 0.95 },
      ],
    };

    this.segmentations.set(result.id, result);
    return result;
  }

  async replace(imageId: string, newBackgroundUrl: string): Promise<BackgroundReplacement> {
    const replacement: BackgroundReplacement = {
      id: this.genId('repl'),
      imageId,
      originalUrl: `https://cdn.quant.edits/original/${imageId}.jpg`,
      newBackgroundUrl,
      resultUrl: `https://cdn.quant.edits/results/${this.genId('r')}.jpg`,
      blendMode: 'normal',
      edgeBlend: 0.8,
      lightingAdjusted: true,
      status: 'completed',
      createdAt: new Date().toISOString(),
    };

    this.replacements.set(replacement.id, replacement);
    return replacement;
  }

  async blur(imageId: string, config: Partial<BlurConfig>): Promise<BackgroundReplacement> {
    const blurConfig: BlurConfig = {
      intensity: config.intensity ?? 50,
      type: config.type || 'gaussian',
      focusPoint: config.focusPoint || { x: 0.5, y: 0.5 },
      depthAware: config.depthAware ?? true,
      edgePreservation: config.edgePreservation ?? 0.8,
    };

    if (blurConfig.intensity < 0 || blurConfig.intensity > 100) throw new Error('Intensity must be 0-100');

    const result: BackgroundReplacement = {
      id: this.genId('blur'),
      imageId,
      originalUrl: `https://cdn.quant.edits/original/${imageId}.jpg`,
      newBackgroundUrl: 'blur_effect',
      resultUrl: `https://cdn.quant.edits/blurred/${this.genId('b')}.jpg`,
      blendMode: 'normal',
      edgeBlend: blurConfig.edgePreservation,
      lightingAdjusted: false,
      status: 'completed',
      createdAt: new Date().toISOString(),
    };

    this.replacements.set(result.id, result);
    return result;
  }

  async remove(imageId: string): Promise<BackgroundReplacement> {
    return this.replace(imageId, 'transparent');
  }

  async getPresets(category?: BackgroundPreset['category']): Promise<BackgroundPreset[]> {
    let presets = Array.from(this.presets.values());
    if (category) presets = presets.filter(p => p.category === category);
    return presets.sort((a, b) => b.popularity - a.popularity);
  }

  async blendEdges(replacementId: string, blendStrength: number): Promise<BackgroundReplacement> {
    const replacement = this.replacements.get(replacementId);
    if (!replacement) throw new Error('Replacement not found');
    if (blendStrength < 0 || blendStrength > 1) throw new Error('Blend strength must be 0-1');
    replacement.edgeBlend = blendStrength;
    return replacement;
  }

  async adjustLighting(replacementId: string): Promise<BackgroundReplacement> {
    const replacement = this.replacements.get(replacementId);
    if (!replacement) throw new Error('Replacement not found');
    replacement.lightingAdjusted = true;
    return replacement;
  }

  async previewResult(replacementId: string, quality: PreviewResult['quality'] = 'medium'): Promise<PreviewResult> {
    const replacement = this.replacements.get(replacementId);
    if (!replacement) throw new Error('Replacement not found');

    const dims = quality === 'high' ? { width: 1920, height: 1080 } : quality === 'medium' ? { width: 960, height: 540 } : { width: 480, height: 270 };

    return {
      id: this.genId('prev'),
      previewUrl: `https://cdn.quant.edits/preview/${this.genId('p')}.jpg`,
      quality,
      dimensions: dims,
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
    };
  }
}

export const aiBackgroundService = new AIBackgroundService();
export { AIBackgroundService };
