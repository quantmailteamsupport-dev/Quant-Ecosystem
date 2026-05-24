// ============================================================================
// QuantTube - MiniPlayer Component
// Picture-in-picture mini player for videos and music
// ============================================================================

import type { Video, Track, PlayerState } from '../types';

interface MiniPlayerProps {
  content: Video | Track | null;
  state: PlayerState;
  onExpand: () => void;
  onClose: () => void;
  onPlayPause: () => void;
  onNext: () => void;
}

export function MiniPlayer({ content, state, onExpand, onClose, onPlayPause, onNext }: MiniPlayerProps) {
  if (!content || !state.isMiniPlayer) return null;

  const isVideo = 'channelName' in content;
  const progress = state.duration > 0 ? (state.currentTime / state.duration) * 100 : 0;

  return {
    type: 'div',
    props: { className: 'mini-player' },
    children: [
      { type: 'div', props: { className: 'mini-progress', style: `width: ${progress}%` }, children: [] },
      { type: 'div', props: { className: 'mini-content' }, children: [
        { type: 'div', props: { className: 'mini-thumb' }, children: [
          isVideo ? { type: 'video', props: { src: (content as Video).url, className: 'mini-video' }, children: [] }
            : { type: 'img', props: { src: (content as Track).albumCover, className: 'mini-art' }, children: [] },
        ]},
        { type: 'div', props: { className: 'mini-info' }, children: [
          { type: 'p', props: { className: 'mini-title' }, children: [content.title] },
          { type: 'p', props: { className: 'mini-sub' }, children: [isVideo ? (content as Video).channelName : (content as Track).artistName] },
        ]},
        { type: 'div', props: { className: 'mini-controls' }, children: [
          { type: 'button', props: { className: 'mini-play' }, children: [state.isPlaying ? 'Pause' : 'Play'] },
          { type: 'button', props: { className: 'mini-next' }, children: ['Next'] },
          { type: 'button', props: { className: 'mini-expand' }, children: ['Expand'] },
          { type: 'button', props: { className: 'mini-close' }, children: ['X'] },
        ]},
      ]},
    ],
  };
}

export default MiniPlayer;
