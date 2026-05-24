// ============================================================================
// QuantTube - Library Page
// User library: watch later, history, playlists, downloads
// ============================================================================

import type { Playlist, Video } from '../types';

interface LibraryPageProps {
  watchLater: Video[];
  history: { contentId: string; watchedAt: string; progress: number }[];
  playlists: Playlist[];
  downloads: { id: string; title: string; quality: string; size: number }[];
  activeTab: 'watch-later' | 'history' | 'playlists' | 'downloads';
}

export function LibraryPage({ watchLater, history, playlists, downloads, activeTab }: LibraryPageProps) {
  return {
    type: 'div',
    props: { className: 'library-page' },
    children: [
      { type: 'h1', props: {}, children: ['Your Library'] },
      { type: 'nav', props: { className: 'library-tabs' }, children: [
        { type: 'button', props: { className: `tab ${activeTab === 'watch-later' ? 'active' : ''}` }, children: ['Watch Later'] },
        { type: 'button', props: { className: `tab ${activeTab === 'history' ? 'active' : ''}` }, children: ['History'] },
        { type: 'button', props: { className: `tab ${activeTab === 'playlists' ? 'active' : ''}` }, children: ['Playlists'] },
        { type: 'button', props: { className: `tab ${activeTab === 'downloads' ? 'active' : ''}` }, children: ['Downloads'] },
      ]},
      activeTab === 'watch-later' ? renderWatchLater(watchLater) : null,
      activeTab === 'history' ? renderHistory(history) : null,
      activeTab === 'playlists' ? renderPlaylists(playlists) : null,
      activeTab === 'downloads' ? renderDownloads(downloads) : null,
    ].filter(Boolean),
  };
}

function renderWatchLater(videos: Video[]) {
  return { type: 'div', props: { className: 'watch-later-list' }, children: videos.map(v => ({ type: 'div', props: { className: 'video-row' }, children: [{ type: 'img', props: { src: v.thumbnailUrl }, children: [] }, { type: 'div', props: {}, children: [{ type: 'h3', props: {}, children: [v.title] }, { type: 'p', props: {}, children: [v.channelName] }] }] })) };
}

function renderHistory(history: { contentId: string; watchedAt: string; progress: number }[]) {
  return { type: 'div', props: { className: 'history-list' }, children: [{ type: 'div', props: { className: 'history-actions' }, children: [{ type: 'button', props: {}, children: ['Clear All History'] }] }, ...history.map(h => ({ type: 'div', props: { className: 'history-item' }, children: [{ type: 'span', props: {}, children: [h.contentId] }, { type: 'span', props: {}, children: [h.watchedAt] }] }))] };
}

function renderPlaylists(playlists: Playlist[]) {
  return { type: 'div', props: { className: 'playlists-list' }, children: [{ type: 'button', props: { className: 'create-playlist-btn' }, children: ['+ New Playlist'] }, ...playlists.map(p => ({ type: 'div', props: { className: 'playlist-card' }, children: [{ type: 'h3', props: {}, children: [p.title] }, { type: 'p', props: {}, children: [`${p.itemCount} items - ${p.visibility}`] }] }))] };
}

function renderDownloads(downloads: { id: string; title: string; quality: string; size: number }[]) {
  return { type: 'div', props: { className: 'downloads-list' }, children: downloads.map(d => ({ type: 'div', props: { className: 'download-item' }, children: [{ type: 'h3', props: {}, children: [d.title] }, { type: 'span', props: {}, children: [`${d.quality} - ${(d.size / 1048576).toFixed(1)} MB`] }] })) };
}

export default LibraryPage;
