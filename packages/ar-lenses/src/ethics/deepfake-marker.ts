import type { DeepfakeMarkerData } from '../types.js';

export class DeepfakeMarker {
  private registry = new Map<string, DeepfakeMarkerData>();

  embed(assetId: string, transformations: string[]): DeepfakeMarkerData {
    const marker: DeepfakeMarkerData = {
      assetId,
      timestamp: Date.now(),
      transformations,
      signature: this.generateSignature(assetId, transformations),
      c2paCompatible: true,
    };

    this.registry.set(assetId, marker);
    return marker;
  }

  verify(assetId: string): { valid: boolean; marker: DeepfakeMarkerData | null } {
    const marker = this.registry.get(assetId);
    if (!marker) return { valid: false, marker: null };

    const expectedSig = this.generateSignature(assetId, marker.transformations);
    const valid = marker.signature === expectedSig;
    return { valid, marker };
  }

  hasMarker(assetId: string): boolean {
    return this.registry.has(assetId);
  }

  getTransformations(assetId: string): string[] {
    return this.registry.get(assetId)?.transformations ?? [];
  }

  private generateSignature(assetId: string, transformations: string[]): string {
    const data = `${assetId}:${transformations.join(',')}`;
    return `c2pa:${Buffer.from(data).toString('hex').slice(0, 32)}`;
  }
}
