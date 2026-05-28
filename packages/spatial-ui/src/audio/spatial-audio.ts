import type { SpatialAudioSource } from '../types.js';

export class SpatialAudio {
  private sources = new Map<string, SpatialAudioSource>();
  private listenerPosition = { x: 0, y: 0, z: 0 };
  private hrtfProfile: 'default' | 'narrow' | 'wide' = 'default';

  addSource(opts: Omit<SpatialAudioSource, 'id'>): SpatialAudioSource {
    const id = `audio-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const source: SpatialAudioSource = { id, ...opts };
    this.sources.set(id, source);
    return source;
  }

  removeSource(id: string): boolean {
    return this.sources.delete(id);
  }

  moveSource(id: string, position: { x: number; y: number; z: number }): boolean {
    const source = this.sources.get(id);
    if (!source) return false;
    source.position = position;
    return true;
  }

  setVolume(id: string, volume: number): boolean {
    const source = this.sources.get(id);
    if (!source) return false;
    source.volume = Math.max(0, Math.min(1, volume));
    return true;
  }

  getEffectiveVolume(id: string): number {
    const source = this.sources.get(id);
    if (!source) return 0;
    const distance = this.calculateDistance(source.position);
    if (distance >= source.maxDistance) return 0;
    const attenuation = 1 - distance / source.maxDistance;
    return source.volume * attenuation;
  }

  setListenerPosition(position: { x: number; y: number; z: number }): void {
    this.listenerPosition = position;
  }

  getListenerPosition(): { x: number; y: number; z: number } {
    return { ...this.listenerPosition };
  }

  setHRTFProfile(profile: 'default' | 'narrow' | 'wide'): void {
    this.hrtfProfile = profile;
  }

  getHRTFProfile(): string {
    return this.hrtfProfile;
  }

  getSource(id: string): SpatialAudioSource | null {
    return this.sources.get(id) ?? null;
  }

  getActiveSources(): SpatialAudioSource[] {
    return [...this.sources.values()].filter((s) => this.getEffectiveVolume(s.id) > 0);
  }

  private calculateDistance(pos: { x: number; y: number; z: number }): number {
    const dx = pos.x - this.listenerPosition.x;
    const dy = pos.y - this.listenerPosition.y;
    const dz = pos.z - this.listenerPosition.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }
}
