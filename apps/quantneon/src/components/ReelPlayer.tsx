// ============================================================================
// QuantNeon - ReelPlayer Component (Full-screen vertical video)
// ============================================================================

import type { Reel } from '../types';

interface ReelPlayerProps { reel: Reel; isActive: boolean; isMuted: boolean; }

export function ReelPlayer({ reel, isActive, isMuted }: ReelPlayerProps) {
  return {
    type: 'div', props: { className: 'reel-player' }, children: [
      { type: 'video', props: { src: reel.videoUrl, poster: reel.thumbnailUrl, loop: true, muted: isMuted, 'data-active': isActive, className: 'reel-video' }, children: [] },
      { type: 'div', props: { className: 'reel-sidebar' }, children: [
        { type: 'button', props: { className: `like ${reel.isLiked ? 'liked' : ''}` }, children: [String(reel.likes)] },
        { type: 'button', props: { className: 'comment' }, children: [String(reel.comments)] },
        { type: 'button', props: { className: 'share' }, children: [String(reel.shares)] },
        { type: 'div', props: { className: 'audio-disc' }, children: [] },
      ]},
      { type: 'div', props: { className: 'reel-footer' }, children: [
        { type: 'span', props: { className: 'username' }, children: [`@${reel.username}`] },
        { type: 'p', props: { className: 'caption' }, children: [reel.caption] },
        { type: 'div', props: { className: 'audio-info' }, children: [{ type: 'span', props: {}, children: [reel.audioName] }] },
      ]},
    ],
  };
}
export default ReelPlayer;
