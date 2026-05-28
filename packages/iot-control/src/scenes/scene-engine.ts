import { DeviceRegistry } from '../devices/device-registry.js';
import { DeviceStatus, Scene } from '../types.js';

export class SceneEngine {
  private scenes = new Map<string, Scene>();

  constructor(private registry: DeviceRegistry) {}

  createScene(scene: Scene): void {
    this.scenes.set(scene.id, scene);
  }

  activateScene(sceneId: string): boolean {
    const scene = this.scenes.get(sceneId);
    if (!scene) return false;
    for (const state of scene.deviceStates) {
      const device = this.registry.getDevice(state.deviceId);
      if (!device || device.status !== DeviceStatus.online) continue;
      this.registry.updateDeviceProperties(state.deviceId, state.properties);
    }
    scene.active = true;
    return true;
  }

  deactivateScene(sceneId: string): boolean {
    const scene = this.scenes.get(sceneId);
    if (!scene) return false;
    scene.active = false;
    return true;
  }

  getScene(id: string): Scene | undefined {
    return this.scenes.get(id);
  }

  listScenes(): Scene[] {
    return [...this.scenes.values()];
  }
}
