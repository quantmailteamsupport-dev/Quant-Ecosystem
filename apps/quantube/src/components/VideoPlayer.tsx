// ============================================================================
// QuantTube - VideoPlayer Component
// Full-featured video player with chapters, subtitles, quality selection
// ============================================================================

import type { Video, Chapter, Subtitle, PlayerState } from '../types';

interface VideoPlayerProps {
  video: Video;
  state: PlayerState;
  onPlay: () => void;
  onPause: () => void;
  onSeek: (time: number) => void;
  onQualityChange: (quality: string) => void;
  onSubtitleChange: (subtitle: Subtitle | null) => void;
  onFullscreen: () => void;
  onMiniPlayer: () => void;
  onPlaybackRateChange: (rate: number) => void;
}

export function VideoPlayer({ video, state, onPlay, onPause, onSeek, onQualityChange, onSubtitleChange, onFullscreen, onMiniPlayer, onPlaybackRateChange }: VideoPlayerProps) {
  const progressPercent = state.duration > 0 ? (state.currentTime / state.duration) * 100 : 0;
  const currentChapter = video.chapters.find(ch => state.currentTime >= ch.startTime && state.currentTime < ch.endTime);
  const qualities = ['360p', '480p', '720p', '1080p', '1440p', '4k'];
  const playbackRates = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

  return {
    type: 'div',
    props: { className: `video-player ${state.isFullscreen ? 'fullscreen' : ''} ${state.isMiniPlayer ? 'mini' : ''}` },
    children: [
      { type: 'div', props: { className: 'player-viewport' }, children: [
        { type: 'video', props: { src: video.url, poster: video.thumbnailUrl, 'data-playing': state.isPlaying }, children: [] },
        { type: 'div', props: { className: 'overlay' }, children: [
          { type: 'button', props: { className: 'big-play', onClick: state.isPlaying ? 'onPause' : 'onPlay' }, children: [state.isPlaying ? 'II' : 'Play'] },
        ]},
      ]},
      { type: 'div', props: { className: 'progress-container' }, children: [
        { type: 'div', props: { className: 'chapter-markers' }, children: video.chapters.map(ch => ({
          type: 'div', props: { className: 'chapter-marker', style: `left: ${(ch.startTime / state.duration) * 100}%`, title: ch.title }, children: [],
        }))},
        { type: 'div', props: { className: 'progress-track' }, children: [
          { type: 'div', props: { className: 'progress-fill', style: `width: ${progressPercent}%` }, children: [] },
          { type: 'div', props: { className: 'progress-handle', style: `left: ${progressPercent}%` }, children: [] },
        ]},
      ]},
      { type: 'div', props: { className: 'controls-bar' }, children: [
        { type: 'div', props: { className: 'controls-left' }, children: [
          { type: 'button', props: { className: 'ctrl-btn play' }, children: [state.isPlaying ? 'Pause' : 'Play'] },
          { type: 'button', props: { className: 'ctrl-btn prev' }, children: ['Prev'] },
          { type: 'button', props: { className: 'ctrl-btn next' }, children: ['Next'] },
          { type: 'div', props: { className: 'volume-control' }, children: [
            { type: 'button', props: { className: 'ctrl-btn mute' }, children: [state.muted ? 'Unmute' : 'Mute'] },
            { type: 'input', props: { type: 'range', min: 0, max: 100, value: state.volume * 100 }, children: [] },
          ]},
          { type: 'span', props: { className: 'time-display' }, children: [`${formatTime(state.currentTime)} / ${formatTime(state.duration)}`] },
        ]},
        { type: 'div', props: { className: 'controls-center' }, children: [
          currentChapter ? { type: 'span', props: { className: 'current-chapter' }, children: [currentChapter.title] } : null,
        ].filter(Boolean) },
        { type: 'div', props: { className: 'controls-right' }, children: [
          { type: 'select', props: { className: 'speed-select', value: state.playbackRate }, children: playbackRates.map(r => ({ type: 'option', props: { value: r }, children: [`${r}x`] })) },
          { type: 'select', props: { className: 'quality-select', value: state.quality }, children: qualities.map(q => ({ type: 'option', props: { value: q }, children: [q] })) },
          { type: 'button', props: { className: 'ctrl-btn subtitles' }, children: ['CC'] },
          { type: 'button', props: { className: 'ctrl-btn mini-player' }, children: ['Mini'] },
          { type: 'button', props: { className: 'ctrl-btn fullscreen' }, children: [state.isFullscreen ? 'Exit' : 'Fullscreen'] },
        ]},
      ]},
    ],
  };
}

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default VideoPlayer;
