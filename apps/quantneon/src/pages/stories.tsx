// ============================================================================
// QuantNeon - Story Viewer Page
// ============================================================================

import type { Story } from '../types';

interface StoriesPageProps { stories: Story[]; currentIndex: number; progress: number; }

export function StoriesPage({ stories, currentIndex, progress }: StoriesPageProps) {
  const story = stories[currentIndex];
  if (!story) return { type: 'div', props: {}, children: ['No stories'] };
  return {
    type: 'div', props: { className: 'stories-viewer fullscreen' }, children: [
      { type: 'div', props: { className: 'story-progress' }, children: stories.map((_, i) => ({ type: 'div', props: { className: `progress-segment ${i < currentIndex ? 'complete' : i === currentIndex ? 'active' : ''}`, style: i === currentIndex ? `width: ${progress}%` : '' }, children: [] })) },
      { type: 'div', props: { className: 'story-header' }, children: [{ type: 'img', props: { src: story.userAvatar, className: 'story-avatar' }, children: [] }, { type: 'span', props: {}, children: [story.username] }, { type: 'button', props: { className: 'close-btn' }, children: ['X'] }] },
      { type: 'div', props: { className: 'story-content' }, children: [
        story.mediaType === 'image' ? { type: 'img', props: { src: story.mediaUrl, className: 'story-media' }, children: [] } : { type: 'video', props: { src: story.mediaUrl, className: 'story-media', autoplay: true }, children: [] },
        { type: 'div', props: { className: 'story-stickers' }, children: story.stickers.map(s => ({ type: 'div', props: { className: `sticker sticker--${s.type}`, style: `left: ${s.position.x * 100}%; top: ${s.position.y * 100}%` }, children: [] })) },
      ]},
      { type: 'div', props: { className: 'story-footer' }, children: [{ type: 'input', props: { placeholder: 'Reply to story...' }, children: [] }, { type: 'button', props: {}, children: ['Send'] }] },
    ],
  };
}
export default StoriesPage;
