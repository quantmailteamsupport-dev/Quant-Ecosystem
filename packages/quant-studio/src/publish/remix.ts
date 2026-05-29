import type { RemixInfo, EarningSplit } from '../types.js';

const DEFAULT_SPLIT: EarningSplit = {
  creator: 0.7,
  remixerChain: 0.2,
  platform: 0.1,
};

export class RemixManager {
  private readonly remixes = new Map<string, RemixInfo>();

  fork(appId: string, originalAuthor: string, newAuthor: string): RemixInfo {
    const existing = this.remixes.get(appId);
    const attributionChain = existing
      ? [...existing.attributionChain, existing.remixAuthor]
      : [originalAuthor];

    const remixId = `${appId}-remix-${Date.now()}`;
    const info: RemixInfo = {
      originalAppId: appId,
      originalAuthor,
      remixAuthor: newAuthor,
      attributionChain,
      createdAt: Date.now(),
    };

    this.remixes.set(remixId, info);
    return info;
  }

  getAttribution(remixId: string): string[] {
    const info = this.remixes.get(remixId);
    if (!info) return [];
    return info.attributionChain;
  }

  calculateEarnings(
    revenue: number,
    _split?: EarningSplit,
  ): {
    creatorAmount: number;
    remixerChainAmount: number;
    platformAmount: number;
  } {
    const split = _split ?? DEFAULT_SPLIT;
    return {
      creatorAmount: revenue * split.creator,
      remixerChainAmount: revenue * split.remixerChain,
      platformAmount: revenue * split.platform,
    };
  }
}
