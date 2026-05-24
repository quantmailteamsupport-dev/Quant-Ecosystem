// ============================================================================
// QuantNeon - Reels Page
// Full-screen reels viewer with swipe navigation
// ============================================================================

import type { Reel } from '../types';

interface ReelsPageProps {
  reels: Reel[];
  currentIndex: number;
  isPlaying: boolean;
}

export function ReelsPage({ reels, currentIndex, isPlaying }: ReelsPageProps) {
  const currentReel = reels[currentIndex];
  if (!currentReel) return { type: 'div', props: { className: 'reels-empty' }, children: ['No reels available'] };

  return {
    type: 'div',
    props: { className: 'reels-page fullscreen' },
    children: [
      { type: 'div', props: { className: 'reel-viewport' }, children: [
        { type: 'video', props: { src: currentReel.videoUrl, className: 'reel-video', autoplay: true, loop: true }, children: [] },
        { type: 'div', props: { className: 'reel-overlay' }, children: [
          { type: 'div', props: { className: 'reel-info' }, children: [
            { type: 'span', props: { className: 'reel-username' }, children: [`@${currentReel.username}`] },
            { type: 'p', props: { className: 'reel-caption' }, children: [currentReel.caption] },
            { type: 'div', props: { className: 'reel-audio' }, children: [{ type: 'span', props: {}, children: [currentReel.audioName] }] },
          ]},
          { type: 'div', props: { className: 'reel-actions' }, children: [
            { type: 'button', props: { className: `reel-like ${currentReel.isLiked ? 'liked' : ''}` }, children: [String(currentReel.likes)] },
            { type: 'button', props: { className: 'reel-comment' }, children: [String(currentReel.comments)] },
            { type: 'button', props: { className: 'reel-share' }, children: [String(currentReel.shares)] },
            { type: 'button', props: { className: 'reel-audio-btn' }, children: ['Audio'] },
          ]},
        ]},
      ]},
      { type: 'div', props: { className: 'reel-nav' }, children: [
        { type: 'span', props: {}, children: [`${currentIndex + 1} / ${reels.length}`] },
      ]},
    ],
  };
}

export default ReelsPage;
