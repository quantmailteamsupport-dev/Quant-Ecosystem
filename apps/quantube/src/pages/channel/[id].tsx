// ============================================================================
// QuantTube - Channel Page
// Creator channel with videos, playlists, community, about
// ============================================================================

import type { Channel, Video, Playlist } from '../../types';

interface ChannelPageProps {
  channel: Channel | null;
  videos: Video[];
  playlists: Playlist[];
  tab: 'videos' | 'playlists' | 'community' | 'about';
}

export function ChannelPage({ channel, videos, playlists, tab }: ChannelPageProps) {
  if (!channel) return { type: 'div', props: { className: 'loading' }, children: ['Loading...'] };

  return {
    type: 'div',
    props: { className: 'channel-page' },
    children: [
      { type: 'div', props: { className: 'channel-banner' }, children: [
        { type: 'img', props: { src: channel.bannerUrl, alt: '' }, children: [] },
      ]},
      { type: 'div', props: { className: 'channel-header' }, children: [
        { type: 'img', props: { src: channel.avatarUrl, className: 'channel-avatar' }, children: [] },
        { type: 'div', props: { className: 'channel-meta' }, children: [
          { type: 'h1', props: {}, children: [channel.name, channel.verified ? ' (Verified)' : ''] },
          { type: 'p', props: { className: 'handle' }, children: [channel.handle] },
          { type: 'p', props: { className: 'stats' }, children: [`${formatNumber(channel.subscriberCount)} subscribers - ${channel.videoCount} videos`] },
        ]},
        { type: 'button', props: { className: `subscribe-btn ${channel.isSubscribed ? 'subscribed' : ''}` }, children: [channel.isSubscribed ? 'Subscribed' : 'Subscribe'] },
      ]},
      { type: 'nav', props: { className: 'channel-tabs' }, children: [
        { type: 'button', props: { className: `tab ${tab === 'videos' ? 'active' : ''}` }, children: ['Videos'] },
        { type: 'button', props: { className: `tab ${tab === 'playlists' ? 'active' : ''}` }, children: ['Playlists'] },
        { type: 'button', props: { className: `tab ${tab === 'community' ? 'active' : ''}` }, children: ['Community'] },
        { type: 'button', props: { className: `tab ${tab === 'about' ? 'active' : ''}` }, children: ['About'] },
      ]},
      tab === 'videos' ? renderVideosTab(videos) : null,
      tab === 'playlists' ? renderPlaylistsTab(playlists) : null,
      tab === 'about' ? renderAboutTab(channel) : null,
    ].filter(Boolean),
  };
}

function renderVideosTab(videos: Video[]) {
  return { type: 'div', props: { className: 'channel-videos grid' }, children: videos.map(v => ({ type: 'div', props: { className: 'video-card' }, children: [{ type: 'img', props: { src: v.thumbnailUrl }, children: [] }, { type: 'h3', props: {}, children: [v.title] }, { type: 'p', props: {}, children: [`${formatNumber(v.views)} views`] }] })) };
}

function renderPlaylistsTab(playlists: Playlist[]) {
  return { type: 'div', props: { className: 'channel-playlists' }, children: playlists.map(p => ({ type: 'div', props: { className: 'playlist-card' }, children: [{ type: 'h3', props: {}, children: [p.title] }, { type: 'p', props: {}, children: [`${p.itemCount} items`] }] })) };
}

function renderAboutTab(channel: Channel) {
  return { type: 'div', props: { className: 'channel-about' }, children: [{ type: 'p', props: {}, children: [channel.description] }, { type: 'p', props: {}, children: [`Total views: ${formatNumber(channel.totalViews)}`] }] };
}

function formatNumber(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toString();
}

export default ChannelPage;
