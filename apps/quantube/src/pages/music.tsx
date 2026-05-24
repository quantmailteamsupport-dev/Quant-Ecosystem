// ============================================================================
// QuantTube - Music Page
// Music player with queue, playlists, artists, albums
// ============================================================================

import type { Track, Album, Artist, Playlist } from '../types';

interface MusicPageProps {
  currentTrack: Track | null;
  queue: Track[];
  recentTracks: Track[];
  featuredAlbums: Album[];
  topArtists: Artist[];
  playlists: Playlist[];
  isPlaying: boolean;
  currentTime: number;
}

export function MusicPage({ currentTrack, queue, recentTracks, featuredAlbums, topArtists, playlists, isPlaying, currentTime }: MusicPageProps) {
  return {
    type: 'div',
    props: { className: 'music-page' },
    children: [
      renderMusicHeader(),
      renderNowPlaying(currentTrack, isPlaying, currentTime),
      renderRecentlyPlayed(recentTracks),
      renderFeaturedAlbums(featuredAlbums),
      renderTopArtists(topArtists),
      renderPlaylists(playlists),
      renderQueue(queue),
    ],
  };
}

function renderMusicHeader() {
  return {
    type: 'header',
    props: { className: 'music-header' },
    children: [
      { type: 'h1', props: {}, children: ['QuantTube Music'] },
      { type: 'nav', props: { className: 'music-nav' }, children: [
        { type: 'a', props: { href: '/music', className: 'active' }, children: ['Home'] },
        { type: 'a', props: { href: '/music/browse' }, children: ['Browse'] },
        { type: 'a', props: { href: '/music/radio' }, children: ['Radio'] },
        { type: 'a', props: { href: '/music/podcasts' }, children: ['Podcasts'] },
      ]},
    ],
  };
}

function renderNowPlaying(track: Track | null, isPlaying: boolean, currentTime: number) {
  if (!track) return { type: 'div', props: { className: 'no-track' }, children: ['Select a track to play'] };
  return {
    type: 'div',
    props: { className: 'now-playing' },
    children: [
      { type: 'img', props: { src: track.albumCover, className: 'album-art', alt: track.albumName }, children: [] },
      { type: 'div', props: { className: 'track-info' }, children: [
        { type: 'h2', props: {}, children: [track.title] },
        { type: 'p', props: { className: 'artist' }, children: [track.artistName] },
        { type: 'p', props: { className: 'album' }, children: [track.albumName] },
      ]},
      { type: 'div', props: { className: 'playback-controls' }, children: [
        { type: 'button', props: { className: 'prev-btn' }, children: ['Previous'] },
        { type: 'button', props: { className: 'play-btn' }, children: [isPlaying ? 'Pause' : 'Play'] },
        { type: 'button', props: { className: 'next-btn' }, children: ['Next'] },
        { type: 'div', props: { className: 'progress' }, children: [
          { type: 'span', props: {}, children: [formatTime(currentTime)] },
          { type: 'div', props: { className: 'bar', style: `width: ${(currentTime / track.duration) * 100}%` }, children: [] },
          { type: 'span', props: {}, children: [formatTime(track.duration)] },
        ]},
      ]},
    ],
  };
}

function renderRecentlyPlayed(tracks: Track[]) {
  return {
    type: 'section',
    props: { className: 'recently-played' },
    children: [
      { type: 'h2', props: {}, children: ['Recently Played'] },
      { type: 'div', props: { className: 'track-list' }, children: tracks.map(t => renderTrackRow(t)) },
    ],
  };
}

function renderTrackRow(track: Track) {
  return {
    type: 'div',
    props: { className: 'track-row', 'data-id': track.id },
    children: [
      { type: 'img', props: { src: track.albumCover, className: 'track-thumb' }, children: [] },
      { type: 'div', props: { className: 'track-details' }, children: [
        { type: 'span', props: { className: 'title' }, children: [track.title] },
        { type: 'span', props: { className: 'artist' }, children: [track.artistName] },
      ]},
      { type: 'span', props: { className: 'duration' }, children: [formatTime(track.duration)] },
      { type: 'button', props: { className: 'add-queue-btn' }, children: ['+'] },
    ],
  };
}

function renderFeaturedAlbums(albums: Album[]) {
  return {
    type: 'section',
    props: { className: 'featured-albums' },
    children: [
      { type: 'h2', props: {}, children: ['New Releases'] },
      { type: 'div', props: { className: 'album-grid' }, children: albums.map(a => ({
        type: 'div', props: { className: 'album-card', 'data-id': a.id }, children: [
          { type: 'img', props: { src: a.coverUrl, className: 'album-cover' }, children: [] },
          { type: 'h3', props: {}, children: [a.title] },
          { type: 'p', props: {}, children: [a.artistName] },
        ],
      }))},
    ],
  };
}

function renderTopArtists(artists: Artist[]) {
  return {
    type: 'section',
    props: { className: 'top-artists' },
    children: [
      { type: 'h2', props: {}, children: ['Popular Artists'] },
      { type: 'div', props: { className: 'artist-grid' }, children: artists.map(a => ({
        type: 'div', props: { className: 'artist-card', 'data-id': a.id }, children: [
          { type: 'img', props: { src: a.imageUrl, className: 'artist-image' }, children: [] },
          { type: 'h3', props: {}, children: [a.name] },
          { type: 'p', props: {}, children: [`${formatNumber(a.monthlyListeners)} monthly listeners`] },
        ],
      }))},
    ],
  };
}

function renderPlaylists(playlists: Playlist[]) {
  return {
    type: 'section',
    props: { className: 'playlists' },
    children: [
      { type: 'h2', props: {}, children: ['Your Playlists'] },
      { type: 'div', props: { className: 'playlist-grid' }, children: playlists.map(p => ({
        type: 'div', props: { className: 'playlist-card' }, children: [
          { type: 'h3', props: {}, children: [p.title] },
          { type: 'p', props: {}, children: [`${p.itemCount} tracks`] },
        ],
      }))},
    ],
  };
}

function renderQueue(queue: Track[]) {
  return {
    type: 'aside',
    props: { className: 'queue-panel' },
    children: [
      { type: 'h3', props: {}, children: ['Queue'] },
      { type: 'div', props: { className: 'queue-list' }, children: queue.map((t, i) => ({
        type: 'div', props: { className: 'queue-item' }, children: [
          { type: 'span', props: { className: 'queue-num' }, children: [`${i + 1}`] },
          { type: 'span', props: { className: 'queue-title' }, children: [t.title] },
          { type: 'span', props: { className: 'queue-artist' }, children: [t.artistName] },
        ],
      }))},
    ],
  };
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatNumber(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toString();
}

export default MusicPage;
