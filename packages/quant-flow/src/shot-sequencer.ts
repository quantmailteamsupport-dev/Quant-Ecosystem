import type { Scene, Shot, TransitionStyle } from './types.js';

const CAMERA_ANGLES: Shot['cameraAngle'][] = ['wide', 'medium', 'close-up'];
const FRAMINGS: Shot['framing'][] = ['full', 'medium', 'tight'];
const MOTIONS: Shot['motion'][] = ['static', 'pan', 'dolly'];

export class ShotSequencer {
  fromStoryboard(scenes: Scene[]): Shot[] {
    return scenes.map((scene, index) => ({
      sceneId: scene.id,
      cameraAngle: CAMERA_ANGLES[index % CAMERA_ANGLES.length]!,
      framing: FRAMINGS[index % FRAMINGS.length]!,
      motion: MOTIONS[index % MOTIONS.length]!,
    }));
  }

  reorder(shots: Shot[], newOrder: number[]): Shot[] {
    return newOrder.filter((idx) => idx >= 0 && idx < shots.length).map((idx) => shots[idx]!);
  }

  addTransition(shotA: Shot, shotB: Shot, type: TransitionStyle): Shot[] {
    // Record the transition on the incoming shot so the choice is observable
    // downstream (renderers read shotB.transition to drive the cut/dissolve/etc).
    return [{ ...shotA }, { ...shotB, transition: type }];
  }
}
