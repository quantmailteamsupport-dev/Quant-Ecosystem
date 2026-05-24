// ============================================================================
// QuantTube - MusicPlayer Component
// Music player with visualizer, queue, lyrics display
// ============================================================================

import type { Track, SyncedLyric, QueueState } from '../types';

interface MusicPlayerProps {
  track: Track | null;
  isPlaying: boolean;
  currentTime: number;
  volume: number;
  queue: QueueState;
  lyrics: SyncedLyric[];
  showLyrics: boolean;
}

export function MusicPlayer({ track, isPlaying, currentTime, volume, queue, lyrics, showLyrics }: MusicPlayerProps) {
  if (!track) return { type: 'div', props: { className: 'music-player empty' }, children: ['No track selected'] };

  const progress = track.duration > 0 ? (currentTime / track.duration) * 100 : 0;
  const currentLyric = lyrics.find(l => currentTime >= l.startTime && currentTime < l.endTime);

  return {
    type: 'div',
    props: { className: 'music-player' },
    children: [
      { type: 'div', props: { className: 'player-track-info' }, children: [
        { type: 'img', props: { src: track.albumCover, className: 'album-art', alt: track.albumName }, children: [] },
        { type: 'div', props: { className: 'track-text' }, children: [
          { type: 'h3', props: { className: 'track-title' }, children: [track.title] },
          { type: 'p', props: { className: 'track-artist' }, children: [track.artistName] },
        ]},
        { type: 'button', props: { className: 'like-btn' }, children: ['Heart'] },
      ]},
      { type: 'div', props: { className: 'player-controls' }, children: [
        { type: 'button', props: { className: `shuffle-btn ${queue.shuffled ? 'active' : ''}` }, children: ['Shuffle'] },
        { type: 'button', props: { className: 'prev-btn' }, children: ['Prev'] },
        { type: 'button', props: { className: 'play-btn' }, children: [isPlaying ? 'Pause' : 'Play'] },
        { type: 'button', props: { className: 'next-btn' }, children: ['Next'] },
        { type: 'button', props: { className: `repeat-btn ${queue.repeatMode !== 'off' ? 'active' : ''}` }, children: [queue.repeatMode === 'one' ? 'Repeat 1' : 'Repeat'] },
      ]},
      { type: 'div', props: { className: 'player-progress' }, children: [
        { type: 'span', props: { className: 'time-elapsed' }, children: [formatTime(currentTime)] },
        { type: 'div', props: { className: 'progress-bar' }, children: [
          { type: 'div', props: { className: 'progress-fill', style: `width: ${progress}%` }, children: [] },
        ]},
        { type: 'span', props: { className: 'time-total' }, children: [formatTime(track.duration)] },
      ]},
      { type: 'div', props: { className: 'player-extras' }, children: [
        { type: 'button', props: { className: 'lyrics-btn' }, children: ['Lyrics'] },
        { type: 'div', props: { className: 'volume-slider' }, children: [
          { type: 'input', props: { type: 'range', min: 0, max: 100, value: volume * 100 }, children: [] },
        ]},
        { type: 'button', props: { className: 'queue-btn' }, children: [`Queue (${queue.items.length})`] },
      ]},
      showLyrics && currentLyric ? { type: 'div', props: { className: 'lyrics-overlay' }, children: [
        { type: 'p', props: { className: `lyric-line ${currentLyric.isChorus ? 'chorus' : ''}` }, children: [currentLyric.text] },
      ]} : null,
    ].filter(Boolean),
  };
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default MusicPlayer;
