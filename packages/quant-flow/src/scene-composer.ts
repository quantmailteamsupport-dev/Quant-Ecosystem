import type { Scene, TransitionStyle } from './types.js';

export class SceneComposer {
  composeFromText(text: string): Scene[] {
    const paragraphs = text
      .split(/\r?\n\s*\r?\n+/)
      .map((p) => p.trim())
      .filter((p) => p.length > 0);

    if (paragraphs.length === 0) {
      return [];
    }

    return paragraphs.map((paragraph, index) => ({
      id: `scene-${index + 1}`,
      description: paragraph,
      visualPrompt: this.extractVisualPrompt(paragraph),
      duration: this.estimateDuration(paragraph),
      transitions: index < paragraphs.length - 1 ? ['dissolve' as TransitionStyle] : [],
    }));
  }

  composeFromPrompts(prompts: string[]): Scene[] {
    return prompts.map((prompt, index) => ({
      id: `scene-${index + 1}`,
      description: prompt,
      visualPrompt: prompt,
      duration: 5,
      transitions: index < prompts.length - 1 ? ['cut' as TransitionStyle] : [],
    }));
  }

  setTransitions(scenes: Scene[], style: TransitionStyle): Scene[] {
    return scenes.map((scene, index) => ({
      ...scene,
      transitions: index < scenes.length - 1 ? [style] : [],
    }));
  }

  private extractVisualPrompt(paragraph: string): string {
    const firstSentence = paragraph.split(/[.!?]/)[0];
    return firstSentence ? firstSentence.trim() : paragraph.slice(0, 100);
  }

  private estimateDuration(paragraph: string): number {
    const words = paragraph.split(/\s+/).length;
    return Math.max(3, Math.min(15, Math.ceil(words / 20) * 3));
  }
}
