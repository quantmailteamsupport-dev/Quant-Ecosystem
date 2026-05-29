import { SceneComposer } from '../scene-composer.js';

describe('SceneComposer', () => {
  const composer = new SceneComposer();

  describe('composeFromText', () => {
    it('parses narrative text into scenes by paragraph', () => {
      const text = `A lone figure walks through a city at night.

Rain begins to fall as neon signs flicker overhead.

The figure reaches a door and enters.`;

      const scenes = composer.composeFromText(text);
      expect(scenes).toHaveLength(3);
      expect(scenes[0]!.id).toBe('scene-1');
      expect(scenes[0]!.description).toContain('lone figure');
      expect(scenes[0]!.visualPrompt).toBeDefined();
      expect(scenes[0]!.duration).toBeGreaterThan(0);
    });

    it('generates visual prompts from text', () => {
      const text = 'A sunset over the ocean. Waves crash against the shore.';
      const scenes = composer.composeFromText(text);
      expect(scenes[0]!.visualPrompt).toBe('A sunset over the ocean');
    });

    it('adds transitions between scenes but not after last', () => {
      const text = `Scene one description.

Scene two description.

Scene three description.`;

      const scenes = composer.composeFromText(text);
      expect(scenes[0]!.transitions).toHaveLength(1);
      expect(scenes[1]!.transitions).toHaveLength(1);
      expect(scenes[2]!.transitions).toHaveLength(0);
    });

    it('returns empty array for empty text', () => {
      const scenes = composer.composeFromText('');
      expect(scenes).toHaveLength(0);
    });
  });

  describe('composeFromPrompts', () => {
    it('creates one scene per prompt', () => {
      const prompts = ['wide shot of forest', 'close-up of flowers', 'aerial view of river'];
      const scenes = composer.composeFromPrompts(prompts);
      expect(scenes).toHaveLength(3);
      expect(scenes[0]!.visualPrompt).toBe('wide shot of forest');
      expect(scenes[1]!.visualPrompt).toBe('close-up of flowers');
      expect(scenes[2]!.visualPrompt).toBe('aerial view of river');
    });

    it('assigns sequential scene IDs', () => {
      const prompts = ['a', 'b'];
      const scenes = composer.composeFromPrompts(prompts);
      expect(scenes[0]!.id).toBe('scene-1');
      expect(scenes[1]!.id).toBe('scene-2');
    });
  });

  describe('setTransitions', () => {
    it('applies a uniform transition style to all scenes', () => {
      const scenes = composer.composeFromPrompts(['a', 'b', 'c']);
      const result = composer.setTransitions(scenes, 'fade');
      expect(result[0]!.transitions).toEqual(['fade']);
      expect(result[1]!.transitions).toEqual(['fade']);
      expect(result[2]!.transitions).toEqual([]);
    });
  });
});
