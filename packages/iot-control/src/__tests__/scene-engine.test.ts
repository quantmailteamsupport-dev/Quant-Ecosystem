import {
  DeviceCategory,
  DeviceRegistry,
  DeviceStatus,
  IoTProtocol,
  Scene,
  SceneEngine,
} from '../index.js';

describe('SceneEngine', () => {
  let registry: DeviceRegistry;
  let engine: SceneEngine;

  beforeEach(() => {
    registry = new DeviceRegistry();
    engine = new SceneEngine(registry);
    registry.registerDevice({
      id: 'light-1',
      name: 'Living Room Light',
      protocol: IoTProtocol.mqtt,
      category: DeviceCategory.light,
      roomId: 'room-1',
      status: DeviceStatus.online,
      properties: { brightness: 100 },
      lastSeen: Date.now(),
    });
  });

  const scene: Scene = {
    id: 'scene-1',
    name: 'Movie Night',
    deviceStates: [{ deviceId: 'light-1', properties: { brightness: 20 } }],
    active: false,
  };

  it('creates and retrieves a scene', () => {
    engine.createScene(scene);
    expect(engine.getScene('scene-1')).toEqual(scene);
  });

  it('activates a scene and applies properties', () => {
    engine.createScene(scene);
    const result = engine.activateScene('scene-1');
    expect(result).toBe(true);
    expect(engine.getScene('scene-1')!.active).toBe(true);
    expect(registry.getDevice('light-1')!.properties).toEqual({ brightness: 20 });
  });

  it('returns false when activating non-existent scene', () => {
    expect(engine.activateScene('nope')).toBe(false);
  });

  it('deactivates a scene', () => {
    engine.createScene(scene);
    engine.activateScene('scene-1');
    expect(engine.deactivateScene('scene-1')).toBe(true);
    expect(engine.getScene('scene-1')!.active).toBe(false);
  });

  it('lists all scenes', () => {
    engine.createScene(scene);
    engine.createScene({ ...scene, id: 'scene-2', name: 'Reading' });
    expect(engine.listScenes()).toHaveLength(2);
  });
});
