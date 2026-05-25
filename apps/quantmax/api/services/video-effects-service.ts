// ============================================================================
// QuantMax - Video Effects Service
// Time warp, beauty mode, clone, green screen, slow motion, filters
// ============================================================================

interface Effect { id: string; name: string; category: 'time' | 'beauty' | 'clone' | 'background' | 'filter' | 'speed'; params: Record<string, any>; thumbnailUrl: string; isPremium: boolean; popularity: number; }
interface AppliedEffect { id: string; videoId: string; effectId: string; params: Record<string, any>; order: number; enabled: boolean; appliedAt: string; }
interface EffectChain { id: string; videoId: string; effects: AppliedEffect[]; previewUrl: string; createdAt: string; }
interface EffectPreview { effectId: string; previewUrl: string; thumbnailUrl: string; duration: number; expiresAt: string; }

class VideoEffectsService {
  private effects: Map<string, Effect> = new Map();
  private applied: Map<string, AppliedEffect[]> = new Map();
  private chains: Map<string, EffectChain> = new Map();
  private counter: number = 0;

  constructor() { this.initEffects(); }

  private genId(prefix: string): string { return `${prefix}_${Date.now().toString(36)}_${(++this.counter).toString(36)}`; }

  private initEffects(): void {
    const effectsData: Omit<Effect, 'id'>[] = [
      { name: 'Time Warp', category: 'time', params: { speed: 2 }, thumbnailUrl: '/effects/timewarp.jpg', isPremium: false, popularity: 85000 },
      { name: 'Beauty Mode', category: 'beauty', params: { intensity: 50, smoothing: 30, brighten: 20 }, thumbnailUrl: '/effects/beauty.jpg', isPremium: false, popularity: 120000 },
      { name: 'Clone Effect', category: 'clone', params: { count: 3, delay: 0.5 }, thumbnailUrl: '/effects/clone.jpg', isPremium: true, popularity: 45000 },
      { name: 'Green Screen', category: 'background', params: { tolerance: 40, edgeSoftness: 10 }, thumbnailUrl: '/effects/green.jpg', isPremium: false, popularity: 95000 },
      { name: 'Slow Motion', category: 'speed', params: { factor: 0.5 }, thumbnailUrl: '/effects/slow.jpg', isPremium: false, popularity: 150000 },
      { name: 'Vintage Film', category: 'filter', params: { grain: 30, vignette: 40, warmth: 20 }, thumbnailUrl: '/effects/vintage.jpg', isPremium: false, popularity: 70000 },
      { name: 'Neon Glow', category: 'filter', params: { intensity: 60, color: '#ff00ff' }, thumbnailUrl: '/effects/neon.jpg', isPremium: true, popularity: 55000 },
      { name: 'Glitch', category: 'filter', params: { intensity: 40, frequency: 3 }, thumbnailUrl: '/effects/glitch.jpg', isPremium: false, popularity: 80000 },
      { name: 'Super Speed', category: 'speed', params: { factor: 3 }, thumbnailUrl: '/effects/speed.jpg', isPremium: false, popularity: 60000 },
      { name: 'Mirror', category: 'clone', params: { axis: 'vertical' }, thumbnailUrl: '/effects/mirror.jpg', isPremium: false, popularity: 40000 },
    ];
    effectsData.forEach((e, i) => { this.effects.set(`eff_${i}`, { id: `eff_${i}`, ...e }); });
  }

  async timeWarp(videoId: string, speed: number): Promise<AppliedEffect> {
    if (speed < 0.1 || speed > 10) throw new Error('Speed must be 0.1-10x');
    return this.applyEffect(videoId, 'eff_0', { speed });
  }

  async beautyMode(videoId: string, intensity: number): Promise<AppliedEffect> {
    if (intensity < 0 || intensity > 100) throw new Error('Intensity must be 0-100');
    return this.applyEffect(videoId, 'eff_1', { intensity, smoothing: intensity * 0.6, brighten: intensity * 0.4 });
  }

  async clone(videoId: string, count: number): Promise<AppliedEffect> {
    if (count < 2 || count > 6) throw new Error('Clone count must be 2-6');
    return this.applyEffect(videoId, 'eff_2', { count, delay: 0.3 * count });
  }

  async greenScreen(videoId: string, backgroundUrl: string): Promise<AppliedEffect> {
    if (!backgroundUrl) throw new Error('Background URL required');
    return this.applyEffect(videoId, 'eff_3', { backgroundUrl, tolerance: 40, edgeSoftness: 10 });
  }

  async slowMotion(videoId: string, factor: number): Promise<AppliedEffect> {
    if (factor < 0.1 || factor > 1) throw new Error('Slow motion factor must be 0.1-1');
    return this.applyEffect(videoId, 'eff_4', { factor });
  }

  async applyFilter(videoId: string, filterId: string, params?: Record<string, any>): Promise<AppliedEffect> {
    const effect = this.effects.get(filterId);
    if (!effect) throw new Error('Filter not found');
    return this.applyEffect(videoId, filterId, { ...effect.params, ...params });
  }

  private async applyEffect(videoId: string, effectId: string, params: Record<string, any>): Promise<AppliedEffect> {
    const effect = this.effects.get(effectId);
    if (!effect) throw new Error('Effect not found');

    const videoEffects = this.applied.get(videoId) || [];
    const applied: AppliedEffect = {
      id: this.genId('app'), videoId, effectId, params,
      order: videoEffects.length, enabled: true, appliedAt: new Date().toISOString(),
    };

    videoEffects.push(applied);
    this.applied.set(videoId, videoEffects);
    effect.popularity++;
    return applied;
  }

  async getEffectCatalog(category?: Effect['category']): Promise<Effect[]> {
    let effects = Array.from(this.effects.values());
    if (category) effects = effects.filter(e => e.category === category);
    return effects.sort((a, b) => b.popularity - a.popularity);
  }

  async previewEffect(videoId: string, effectId: string, params?: Record<string, any>): Promise<EffectPreview> {
    const effect = this.effects.get(effectId);
    if (!effect) throw new Error('Effect not found');
    return {
      effectId, previewUrl: `https://cdn.quant.max/preview/${videoId}/${effectId}.mp4`,
      thumbnailUrl: effect.thumbnailUrl, duration: 3,
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
    };
  }

  async chainEffects(videoId: string, effectIds: string[]): Promise<EffectChain> {
    if (effectIds.length > 5) throw new Error('Maximum 5 effects in a chain');
    const effects: AppliedEffect[] = [];
    for (let i = 0; i < effectIds.length; i++) {
      const effect = this.effects.get(effectIds[i]);
      if (!effect) throw new Error(`Effect ${effectIds[i]} not found`);
      effects.push({ id: this.genId('chain'), videoId, effectId: effectIds[i], params: effect.params, order: i, enabled: true, appliedAt: new Date().toISOString() });
    }
    const chain: EffectChain = { id: this.genId('ec'), videoId, effects, previewUrl: `https://cdn.quant.max/chains/${this.genId('c')}.mp4`, createdAt: new Date().toISOString() };
    this.chains.set(chain.id, chain);
    this.applied.set(videoId, effects);
    return chain;
  }

  async removeEffect(videoId: string, appliedId: string): Promise<boolean> {
    const videoEffects = this.applied.get(videoId) || [];
    const idx = videoEffects.findIndex(e => e.id === appliedId);
    if (idx === -1) return false;
    videoEffects.splice(idx, 1);
    videoEffects.forEach((e, i) => { e.order = i; });
    return true;
  }
}

export const videoEffectsService = new VideoEffectsService();
export { VideoEffectsService };
