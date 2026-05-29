import type { GenerativeLensRequest, LensDefinition, LensTrigger } from '../types.js';

const EFFECT_KEYWORDS: Record<string, string> = {
  sparkle: 'particles',
  glitter: 'particles',
  confetti: 'particles',
  glow: 'bloom',
  blur: 'bg_blur',
  vintage: 'color_grade',
  warm: 'color_grade',
  cool: 'color_grade',
  dark: 'vignette',
  smooth: 'face_relight',
  light: 'face_relight',
  sticker: 'overlay_2d',
  hat: 'overlay_3d',
  glasses: 'overlay_3d',
  mask: 'overlay_3d',
  style: 'style_transfer',
  paint: 'style_transfer',
  background: 'background_replace',
};

const TRIGGER_KEYWORDS: Record<string, LensTrigger> = {
  smile: 'smile',
  blink: 'blink',
  open: 'mouth_open',
  wave: 'hand_raise',
  hand: 'hand_raise',
  face: 'face_detect',
};

export class PromptToLens {
  generate(request: GenerativeLensRequest): LensDefinition {
    const prompt = request.prompt.toLowerCase();
    const effects = this.extractEffects(prompt);
    const triggers = this.extractTriggers(prompt);
    const intensity = request.intensity ?? 0.7;

    return {
      id: `generated_${Date.now()}`,
      name: this.generateName(request.prompt),
      version: '1.0.0',
      triggers: triggers.length > 0 ? triggers : ['always'],
      effects: effects.map((effectType, i) => ({
        effectType,
        parameters: { intensity },
        order: i,
      })),
      parameters: {
        intensity: { min: 0, max: 1, default: intensity },
      },
    };
  }

  private extractEffects(prompt: string): string[] {
    const effects = new Set<string>();
    for (const [keyword, effect] of Object.entries(EFFECT_KEYWORDS)) {
      if (prompt.includes(keyword)) {
        effects.add(effect);
      }
    }
    if (effects.size === 0) {
      effects.add('color_grade');
    }
    return [...effects];
  }

  private extractTriggers(prompt: string): LensTrigger[] {
    const triggers = new Set<LensTrigger>();
    for (const [keyword, trigger] of Object.entries(TRIGGER_KEYWORDS)) {
      if (prompt.includes(keyword)) {
        triggers.add(trigger);
      }
    }
    return [...triggers];
  }

  private generateName(prompt: string): string {
    const words = prompt.split(/\s+/).slice(0, 4);
    return words.map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
  }

  validate(lens: LensDefinition): boolean {
    return (
      lens.id.length > 0 &&
      lens.name.length > 0 &&
      lens.triggers.length > 0 &&
      lens.effects.length > 0
    );
  }
}
