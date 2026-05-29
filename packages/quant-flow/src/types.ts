export interface Scene {
  id: string;
  description: string;
  visualPrompt: string;
  duration: number;
  transitions: TransitionStyle[];
}

export type CameraAngle = 'wide' | 'medium' | 'close-up' | 'overhead' | 'low-angle' | 'dutch';
export type Framing = 'full' | 'medium' | 'tight' | 'extreme-close';
export type MotionType = 'static' | 'pan' | 'tilt' | 'dolly' | 'zoom' | 'handheld';
export type TransitionStyle = 'cut' | 'dissolve' | 'fade' | 'wipe' | 'match-cut';

export interface Shot {
  sceneId: string;
  cameraAngle: CameraAngle;
  framing: Framing;
  motion: MotionType;
}

export interface Storyboard {
  shots: Shot[];
  totalDuration: number;
  style: string;
}

export type AudioScoreType = 'music' | 'sfx' | 'voiceover';

export interface AudioScore {
  type: AudioScoreType;
  prompt: string;
  duration: number;
  startAt: number;
}

export type VibePresetName = 'cinematic' | 'documentary' | 'social' | 'meme';

export interface VibePreset {
  name: VibePresetName;
  colorGrading: string;
  pacing: string;
  transitions: TransitionStyle[];
  musicStyle: string;
}

export type ProjectStatus = 'draft' | 'rendering' | 'completed' | 'failed';

export interface FilmProject {
  id: string;
  title: string;
  storyboard: Storyboard;
  scores: AudioScore[];
  vibePreset: VibePreset;
  status: ProjectStatus;
}

export interface RenderResult {
  projectId: string;
  outputUri: string;
  duration: number;
  resolution: string;
}
