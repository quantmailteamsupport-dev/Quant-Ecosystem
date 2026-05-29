import { getPreset, listPresets } from '../vibe-presets.js';

describe('vibe-presets', () => {
  describe('getPreset', () => {
    it('loads cinematic preset', () => {
      const preset = getPreset('cinematic');
      expect(preset.name).toBe('cinematic');
      expect(preset.colorGrading).toBe('teal-and-orange');
      expect(preset.pacing).toBe('slow');
      expect(preset.musicStyle).toBe('orchestral');
    });

    it('loads documentary preset', () => {
      const preset = getPreset('documentary');
      expect(preset.name).toBe('documentary');
      expect(preset.colorGrading).toBe('natural');
      expect(preset.musicStyle).toBe('ambient');
    });

    it('loads social preset', () => {
      const preset = getPreset('social');
      expect(preset.name).toBe('social');
      expect(preset.colorGrading).toBe('vibrant');
      expect(preset.pacing).toBe('fast');
      expect(preset.musicStyle).toBe('pop');
    });

    it('loads meme preset', () => {
      const preset = getPreset('meme');
      expect(preset.name).toBe('meme');
      expect(preset.colorGrading).toBe('saturated');
      expect(preset.pacing).toBe('chaotic');
      expect(preset.musicStyle).toBe('electronic');
    });

    it('throws for unknown preset', () => {
      expect(() => getPreset('unknown' as never)).toThrow('Unknown vibe preset');
    });
  });

  describe('listPresets', () => {
    it('returns all 4 presets', () => {
      const presets = listPresets();
      expect(presets).toHaveLength(4);
      const names = presets.map((p) => p.name);
      expect(names).toContain('cinematic');
      expect(names).toContain('documentary');
      expect(names).toContain('social');
      expect(names).toContain('meme');
    });
  });
});
