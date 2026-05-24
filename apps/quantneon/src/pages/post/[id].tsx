// ============================================================================
// QuantNeon - Single Post Page
// ============================================================================

import type { Post, Comment } from '../../types';

interface PostPageProps { post: Post | null; comments: Comment[]; }

export function PostPage({ post, comments }: PostPageProps) {
  if (!post) return { type: 'div', props: { className: 'loading' }, children: ['Loading...'] };
  return {
    type: 'div', props: { className: 'post-page' }, children: [
      { type: 'div', props: { className: 'post-media-section' }, children: post.media.map(m => ({ type: 'img', props: { src: m.url, alt: m.altText || '' }, children: [] })) },
      { type: 'div', props: { className: 'post-details' }, children: [
        { type: 'div', props: { className: 'post-header' }, children: [{ type: 'img', props: { src: post.userAvatar, className: 'avatar' }, children: [] }, { type: 'span', props: {}, children: [post.username] }] },
        { type: 'div', props: { className: 'comments-list' }, children: comments.map(c => ({ type: 'div', props: { className: 'comment' }, children: [{ type: 'span', props: { className: 'comment-user' }, children: [c.username] }, { type: 'span', props: {}, children: [` ${c.text}`] }] })) },
        { type: 'div', props: { className: 'post-actions' }, children: [{ type: 'button', props: {}, children: ['Like'] }, { type: 'button', props: {}, children: ['Comment'] }, { type: 'button', props: {}, children: ['Share'] }] },
        { type: 'p', props: {}, children: [`${post.likes} likes`] },
        { type: 'div', props: { className: 'add-comment' }, children: [{ type: 'input', props: { placeholder: 'Add a comment...' }, children: [] }, { type: 'button', props: {}, children: ['Post'] }] },
      ]},
    ],
  };
}
export default PostPage;
