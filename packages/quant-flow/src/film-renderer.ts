import type { FilmProject, RenderResult } from './types.js';

interface RenderProgress {
  percent: number;
  stage: string;
}

export class FilmRenderer {
  private progress = new Map<string, RenderProgress>();

  render(project: FilmProject): RenderResult {
    this.progress.set(project.id, { percent: 0, stage: 'initializing' });

    this.progress.set(project.id, { percent: 25, stage: 'composing-shots' });
    const shotCount = project.storyboard.shots.length;

    this.progress.set(project.id, { percent: 50, stage: 'scoring-audio' });
    const totalDuration = project.storyboard.totalDuration;

    this.progress.set(project.id, { percent: 75, stage: 'assembling' });

    this.progress.set(project.id, { percent: 100, stage: 'complete' });

    return {
      projectId: project.id,
      outputUri: `render://${project.id}/output-${shotCount}-shots.mp4`,
      duration: totalDuration,
      resolution: '1920x1080',
    };
  }

  getProgress(projectId: string): RenderProgress {
    return this.progress.get(projectId) ?? { percent: 0, stage: 'idle' };
  }
}
