import type { EffectPipelineStage, PipelineData } from '../types.js';

export class EffectPipeline {
  private stages: EffectPipelineStage[] = [];
  private lastExecutionTimeMs = 0;

  addStage(stage: EffectPipelineStage): void {
    this.stages.push(stage);
  }

  removeStage(name: string): void {
    this.stages = this.stages.filter((s) => s.name !== name);
  }

  execute(input: PipelineData): PipelineData {
    const start = performance.now();
    let current = input;

    const trackingLost =
      input.tracking.faces.length === 0 &&
      input.tracking.hands.length === 0 &&
      input.tracking.bodies.length === 0;

    if (trackingLost) {
      this.lastExecutionTimeMs = performance.now() - start;
      return current;
    }

    for (const stage of this.stages) {
      current = stage.execute(current);
    }

    this.lastExecutionTimeMs = performance.now() - start;
    return current;
  }

  clear(): void {
    this.stages = [];
  }

  getStageCount(): number {
    return this.stages.length;
  }

  getLastExecutionTimeMs(): number {
    return this.lastExecutionTimeMs;
  }

  getStageNames(): string[] {
    return this.stages.map((s) => s.name);
  }
}
