import type { LensDefinition, LensRuntimeConfig, PipelineData, LensTrigger } from '../types.js';
import { EffectPipeline } from './effect-pipeline.js';

interface RuntimeMetrics {
  frameTimeMs: number;
  withinBudget: boolean;
  effectsExecuted: number;
}

const DEFAULT_CONFIG: LensRuntimeConfig = {
  frameBudgetMs: 16,
  maxMemoryMb: 64,
  sandboxRestrictions: ['no_network', 'no_filesystem', 'no_eval'],
};

export class LensRuntime {
  private config: LensRuntimeConfig;
  private pipeline: EffectPipeline;
  private activeLens: LensDefinition | null = null;

  constructor(config?: Partial<LensRuntimeConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.pipeline = new EffectPipeline();
  }

  loadLens(lens: LensDefinition): void {
    this.activeLens = lens;
    this.pipeline.clear();

    const sortedEffects = [...lens.effects].sort((a, b) => a.order - b.order);
    for (const effect of sortedEffects) {
      this.pipeline.addStage({
        name: effect.effectType,
        execute: (input: PipelineData) => {
          // Apply effect parameters to pipeline data
          return {
            ...input,
            metadata: { ...input.metadata, [effect.effectType]: effect.parameters },
          };
        },
      });
    }
  }

  executeFrame(data: PipelineData): { result: PipelineData; metrics: RuntimeMetrics } {
    if (!this.activeLens) {
      return {
        result: data,
        metrics: { frameTimeMs: 0, withinBudget: true, effectsExecuted: 0 },
      };
    }

    const triggered = this.checkTriggers(data);
    if (!triggered) {
      return {
        result: data,
        metrics: { frameTimeMs: 0, withinBudget: true, effectsExecuted: 0 },
      };
    }

    const start = performance.now();
    const result = this.pipeline.execute(data);
    const frameTimeMs = performance.now() - start;

    return {
      result,
      metrics: {
        frameTimeMs,
        withinBudget: frameTimeMs <= this.config.frameBudgetMs,
        effectsExecuted: this.pipeline.getStageCount(),
      },
    };
  }

  private checkTriggers(data: PipelineData): boolean {
    if (!this.activeLens) return false;

    for (const trigger of this.activeLens.triggers) {
      if (this.evaluateTrigger(trigger, data)) return true;
    }
    return false;
  }

  private evaluateTrigger(trigger: LensTrigger, data: PipelineData): boolean {
    switch (trigger) {
      case 'always':
        return true;
      case 'face_detect':
        return data.tracking.faces.length > 0;
      case 'smile':
        return data.tracking.faces.some((f) =>
          f.expressions.some((e) => e.type === 'smile' && e.intensity > 0.5),
        );
      case 'blink':
        return data.tracking.faces.some((f) =>
          f.expressions.some((e) => e.type === 'blink' && e.intensity > 0.5),
        );
      case 'mouth_open':
        return data.tracking.faces.some((f) =>
          f.expressions.some((e) => e.type === 'mouth_open' && e.intensity > 0.5),
        );
      case 'hand_raise':
        return data.tracking.hands.length > 0;
    }
  }

  getConfig(): LensRuntimeConfig {
    return { ...this.config };
  }

  getActiveLens(): LensDefinition | null {
    return this.activeLens;
  }

  unloadLens(): void {
    this.activeLens = null;
    this.pipeline.clear();
  }
}
