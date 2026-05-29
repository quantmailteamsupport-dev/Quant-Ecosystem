import { ShotSequencer } from '../shot-sequencer.js';
import { SceneComposer } from '../scene-composer.js';

describe('ShotSequencer', () => {
  const sequencer = new ShotSequencer();
  const composer = new SceneComposer();

  describe('fromStoryboard', () => {
    it('generates a shot for each scene', () => {
      const scenes = composer.composeFromPrompts(['a', 'b', 'c']);
      const shots = sequencer.fromStoryboard(scenes);
      expect(shots).toHaveLength(3);
      expect(shots[0]!.sceneId).toBe('scene-1');
      expect(shots[1]!.sceneId).toBe('scene-2');
      expect(shots[2]!.sceneId).toBe('scene-3');
    });

    it('assigns camera angles and framings', () => {
      const scenes = composer.composeFromPrompts(['x']);
      const shots = sequencer.fromStoryboard(scenes);
      expect(shots[0]!.cameraAngle).toBeDefined();
      expect(shots[0]!.framing).toBeDefined();
      expect(shots[0]!.motion).toBeDefined();
    });
  });

  describe('reorder', () => {
    it('reorders shots based on new indices', () => {
      const scenes = composer.composeFromPrompts(['a', 'b', 'c']);
      const shots = sequencer.fromStoryboard(scenes);
      const reordered = sequencer.reorder(shots, [2, 0, 1]);
      expect(reordered[0]!.sceneId).toBe('scene-3');
      expect(reordered[1]!.sceneId).toBe('scene-1');
      expect(reordered[2]!.sceneId).toBe('scene-2');
    });

    it('skips invalid indices', () => {
      const scenes = composer.composeFromPrompts(['a', 'b']);
      const shots = sequencer.fromStoryboard(scenes);
      const reordered = sequencer.reorder(shots, [0, 99, -1]);
      expect(reordered).toHaveLength(1);
    });
  });

  describe('addTransition', () => {
    it('returns a pair of shots', () => {
      const scenes = composer.composeFromPrompts(['a', 'b']);
      const shots = sequencer.fromStoryboard(scenes);
      const result = sequencer.addTransition(shots[0]!, shots[1]!, 'dissolve');
      expect(result).toHaveLength(2);
      expect(result[0]!.sceneId).toBe('scene-1');
      expect(result[1]!.sceneId).toBe('scene-2');
      expect(result[1]!.transition).toBe('dissolve');
    });
  });
});
