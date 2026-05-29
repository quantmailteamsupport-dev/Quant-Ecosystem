import type { QAppBundle, PublishMetadata } from '../types.js';

export interface PublishResult {
  success: boolean;
  metadata?: PublishMetadata;
  error?: string;
}

export class Publisher {
  private readonly listings = new Map<string, PublishMetadata[]>();

  publish(bundle: QAppBundle, metadata: Omit<PublishMetadata, 'publishedAt'>): PublishResult {
    if (!bundle.manifest || !bundle.files.length) {
      return { success: false, error: 'Invalid bundle: missing manifest or files' };
    }

    const entry: PublishMetadata = {
      ...metadata,
      publishedAt: Date.now(),
    };

    const versions = this.listings.get(metadata.appId) ?? [];
    versions.push(entry);
    this.listings.set(metadata.appId, versions);

    return { success: true, metadata: entry };
  }

  unpublish(appId: string, version: string): boolean {
    const versions = this.listings.get(appId);
    if (!versions) return false;

    const idx = versions.findIndex((v) => v.version === version);
    if (idx === -1) return false;

    versions.splice(idx, 1);
    if (versions.length === 0) {
      this.listings.delete(appId);
    }
    return true;
  }

  getVersions(appId: string): PublishMetadata[] {
    return this.listings.get(appId) ?? [];
  }
}
