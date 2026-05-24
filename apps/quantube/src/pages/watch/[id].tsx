// ============================================================================
// QuantTube - Watch Page (Video Player)
// Full video player with comments, related videos, chapters, subtitles
// ============================================================================

import type { Video, Chapter, Subtitle, Recommendation } from '../../types';

interface WatchPageProps {
  video: Video | null;
  relatedVideos: Video[];
  recommendations: Recommendation[];
  isPlaying: boolean;
  currentTime: number;
}

export function WatchPage({ video, relatedVideos, recommendations, isPlaying, currentTime }: WatchPageProps) {
  if (!video) {
    return { type: 'div', props: { className: 'loading' }, children: ['Loading video...'] };
  }

  return {
    type: 'div',
    props: { className: 'watch-page' },
    children: [
      { type: 'div', props: { className: 'watch-main' }, children: [
        renderPlayer(video, isPlaying, currentTime),
        renderVideoInfo(video),
        renderCommentSection(video.id),
      ]},
      { type: 'aside', props: { className: 'watch-sidebar' }, children: [
        renderChapterList(video.chapters, currentTime),
        renderRelatedVideos(relatedVideos),
      ]},
    ],
  };
}

function renderPlayer(video: Video, isPlaying: boolean, currentTime: number) {
  return {
    type: 'div',
    props: { className: 'video-player-container' },
    children: [
      { type: 'div', props: { className: 'player', 'data-video-id': video.id, 'data-playing': isPlaying }, children: [
        { type: 'video', props: { src: video.url, poster: video.thumbnailUrl, className: 'player-video' }, children: [] },
        { type: 'div', props: { className: 'player-overlay' }, children: [
          { type: 'div', props: { className: 'player-controls' }, children: [
            { type: 'button', props: { className: 'play-btn' }, children: [isPlaying ? 'Pause' : 'Play'] },
            { type: 'div', props: { className: 'progress-bar' }, children: [
              { type: 'div', props: { className: 'progress', style: `width: ${(currentTime / video.duration) * 100}%` }, children: [] },
            ]},
            { type: 'span', props: { className: 'time' }, children: [`${formatTime(currentTime)} / ${formatTime(video.duration)}`] },
            { type: 'button', props: { className: 'quality-btn' }, children: [video.resolution] },
            { type: 'button', props: { className: 'subtitle-btn' }, children: ['CC'] },
            { type: 'button', props: { className: 'fullscreen-btn' }, children: ['Fullscreen'] },
          ]},
        ]},
      ]},
    ],
  };
}

function renderVideoInfo(video: Video) {
  return {
    type: 'div',
    props: { className: 'video-info' },
    children: [
      { type: 'h1', props: { className: 'video-title' }, children: [video.title] },
      { type: 'div', props: { className: 'video-meta' }, children: [
        { type: 'span', props: {}, children: [`${formatNumber(video.views)} views`] },
        { type: 'span', props: {}, children: [video.publishedAt] },
      ]},
      { type: 'div', props: { className: 'video-actions' }, children: [
        { type: 'button', props: { className: 'like-btn' }, children: [`Like ${formatNumber(video.likes)}`] },
        { type: 'button', props: { className: 'dislike-btn' }, children: ['Dislike'] },
        { type: 'button', props: { className: 'share-btn' }, children: ['Share'] },
        { type: 'button', props: { className: 'save-btn' }, children: ['Save'] },
      ]},
      { type: 'div', props: { className: 'channel-info' }, children: [
        { type: 'img', props: { src: video.channelAvatar, className: 'channel-avatar' }, children: [] },
        { type: 'div', props: {}, children: [
          { type: 'h3', props: {}, children: [video.channelName] },
          { type: 'button', props: { className: 'subscribe-btn' }, children: ['Subscribe'] },
        ]},
      ]},
      { type: 'p', props: { className: 'description' }, children: [video.description] },
      { type: 'div', props: { className: 'tags' }, children: video.tags.map(tag => ({ type: 'span', props: { className: 'tag' }, children: [`#${tag}`] })) },
    ],
  };
}

function renderChapterList(chapters: Chapter[], currentTime: number) {
  if (chapters.length === 0) return { type: 'div', props: {}, children: [] };
  return {
    type: 'div',
    props: { className: 'chapters-panel' },
    children: [
      { type: 'h3', props: {}, children: ['Chapters'] },
      { type: 'ul', props: { className: 'chapter-list' }, children: chapters.map(ch => ({
        type: 'li',
        props: { className: `chapter-item ${currentTime >= ch.startTime && currentTime < ch.endTime ? 'active' : ''}` },
        children: [
          { type: 'span', props: { className: 'chapter-time' }, children: [formatTime(ch.startTime)] },
          { type: 'span', props: { className: 'chapter-title' }, children: [ch.title] },
        ],
      }))},
    ],
  };
}

function renderCommentSection(videoId: string) {
  return {
    type: 'div',
    props: { className: 'comments-section' },
    children: [
      { type: 'h3', props: {}, children: ['Comments'] },
      { type: 'div', props: { className: 'comment-input' }, children: [
        { type: 'textarea', props: { placeholder: 'Add a comment...' }, children: [] },
        { type: 'button', props: { className: 'submit-comment' }, children: ['Comment'] },
      ]},
      { type: 'div', props: { className: 'comments-list', 'data-video-id': videoId }, children: [] },
    ],
  };
}

function renderRelatedVideos(videos: Video[]) {
  return {
    type: 'div',
    props: { className: 'related-videos' },
    children: [
      { type: 'h3', props: {}, children: ['Up Next'] },
      ...videos.map(v => ({
        type: 'div', props: { className: 'related-card' }, children: [
          { type: 'img', props: { src: v.thumbnailUrl, className: 'related-thumb' }, children: [] },
          { type: 'div', props: {}, children: [
            { type: 'h4', props: {}, children: [v.title] },
            { type: 'p', props: {}, children: [v.channelName] },
            { type: 'p', props: {}, children: [`${formatNumber(v.views)} views`] },
          ]},
        ],
      })),
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

function formatNumber(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toString();
}

export default WatchPage;
