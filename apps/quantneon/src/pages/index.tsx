// ============================================================================
// QuantNeon - Main Feed Page
// Posts from following with stories at top
// ============================================================================

import type { Post, Story } from '../types';

interface FeedPageProps {
  posts: Post[];
  stories: { userId: string; username: string; avatar: string; hasUnviewed: boolean }[];
  isLoading: boolean;
}

export function FeedPage({ posts, stories, isLoading }: FeedPageProps) {
  return {
    type: 'div',
    props: { className: 'feed-page' },
    children: [
      { type: 'header', props: { className: 'feed-header' }, children: [
        { type: 'h1', props: { className: 'logo' }, children: ['QuantNeon'] },
        { type: 'div', props: { className: 'header-actions' }, children: [
          { type: 'button', props: { className: 'create-btn' }, children: ['+'] },
          { type: 'button', props: { className: 'messages-btn' }, children: ['DM'] },
        ]},
      ]},
      renderStoriesBar(stories),
      { type: 'div', props: { className: 'posts-feed' }, children: posts.map(post => renderPostCard(post)) },
    ],
  };
}

function renderStoriesBar(stories: { userId: string; username: string; avatar: string; hasUnviewed: boolean }[]) {
  return {
    type: 'div',
    props: { className: 'stories-bar' },
    children: [
      { type: 'div', props: { className: 'story-add' }, children: [{ type: 'span', props: {}, children: ['Your Story'] }] },
      ...stories.map(s => ({
        type: 'div', props: { className: `story-ring ${s.hasUnviewed ? 'unviewed' : 'viewed'}` }, children: [
          { type: 'img', props: { src: s.avatar, alt: s.username, className: 'story-avatar' }, children: [] },
          { type: 'span', props: { className: 'story-username' }, children: [s.username] },
        ],
      })),
    ],
  };
}

function renderPostCard(post: Post) {
  return {
    type: 'article',
    props: { className: 'post-card', 'data-id': post.id },
    children: [
      { type: 'div', props: { className: 'post-header' }, children: [
        { type: 'img', props: { src: post.userAvatar, className: 'post-avatar' }, children: [] },
        { type: 'div', props: {}, children: [
          { type: 'span', props: { className: 'post-username' }, children: [post.username] },
          post.location ? { type: 'span', props: { className: 'post-location' }, children: [post.location.name] } : null,
        ].filter(Boolean) },
        { type: 'button', props: { className: 'post-menu' }, children: ['...'] },
      ]},
      { type: 'div', props: { className: 'post-media' }, children: post.media.map(m => ({ type: 'img', props: { src: m.url, alt: m.altText || '', className: 'post-image' }, children: [] })) },
      { type: 'div', props: { className: 'post-actions' }, children: [
        { type: 'button', props: { className: `like-btn ${post.isLiked ? 'liked' : ''}` }, children: ['Heart'] },
        { type: 'button', props: { className: 'comment-btn' }, children: ['Comment'] },
        { type: 'button', props: { className: 'share-btn' }, children: ['Share'] },
        { type: 'button', props: { className: `save-btn ${post.isSaved ? 'saved' : ''}` }, children: ['Save'] },
      ]},
      { type: 'div', props: { className: 'post-likes' }, children: [`${post.likes} likes`] },
      { type: 'div', props: { className: 'post-caption' }, children: [
        { type: 'span', props: { className: 'caption-username' }, children: [post.username] },
        { type: 'span', props: { className: 'caption-text' }, children: [` ${post.caption}`] },
      ]},
      { type: 'a', props: { className: 'view-comments' }, children: [`View all ${post.commentCount} comments`] },
      { type: 'span', props: { className: 'post-time' }, children: [post.createdAt] },
    ],
  };
}

export default FeedPage;
