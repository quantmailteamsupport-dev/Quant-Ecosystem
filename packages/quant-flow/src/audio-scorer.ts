import type { AudioScore, FilmProject, VibePreset } from './types.js';

export class AudioScorer {
  generateScore(project: FilmProject): AudioScore[] {
    const scores: AudioScore[] = [];
    let currentTime = 0;

    scores.push({
      type: 'music',
      prompt: `${project.vibePreset.musicStyle} background music`,
      duration: project.storyboard.totalDuration,
      startAt: 0,
    });

    for (const shot of project.storyboard.shots) {
      scores.push({
        type: 'sfx',
        prompt: `ambient sound for ${shot.cameraAngle} ${shot.framing} shot`,
        duration: 3,
        startAt: currentTime,
      });
      currentTime += 5;
    }

    return scores;
  }

  matchVibeMusic(vibePreset: VibePreset): AudioScore {
    return {
      type: 'music',
      prompt: `${vibePreset.musicStyle} soundtrack, ${vibePreset.pacing} pacing`,
      duration: 60,
      startAt: 0,
    };
  }

  addVoiceover(text: string, startAt: number, duration: number): AudioScore {
    if (startAt < 0 || !Number.isFinite(startAt)) {
      throw new RangeError('startAt must be a finite value >= 0');
    }
    if (duration <= 0 || !Number.isFinite(duration)) {
      throw new RangeError('duration must be a finite value > 0');
    }
    return {
      type: 'voiceover',
      prompt: text,
      duration,
      startAt,
    };
  }
}
