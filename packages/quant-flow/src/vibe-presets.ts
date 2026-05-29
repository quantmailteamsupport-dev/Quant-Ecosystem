import type { VibePreset, VibePresetName } from './types.js';

const PRESETS: Record<VibePresetName, VibePreset> = {
  cinematic: {
    name: 'cinematic',
    colorGrading: 'teal-and-orange',
    pacing: 'slow',
    transitions: ['dissolve', 'fade'],
    musicStyle: 'orchestral',
  },
  documentary: {
    name: 'documentary',
    colorGrading: 'natural',
    pacing: 'moderate',
    transitions: ['cut', 'dissolve'],
    musicStyle: 'ambient',
  },
  social: {
    name: 'social',
    colorGrading: 'vibrant',
    pacing: 'fast',
    transitions: ['cut', 'wipe'],
    musicStyle: 'pop',
  },
  meme: {
    name: 'meme',
    colorGrading: 'saturated',
    pacing: 'chaotic',
    transitions: ['cut', 'match-cut'],
    musicStyle: 'electronic',
  },
};

export function getPreset(name: VibePresetName): VibePreset {
  const preset = PRESETS[name];
  if (!preset) {
    throw new Error(`Unknown vibe preset: ${name}`);
  }
  return preset;
}

export function listPresets(): VibePreset[] {
  return Object.values(PRESETS);
}
