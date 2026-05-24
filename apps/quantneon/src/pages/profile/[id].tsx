// ============================================================================
// QuantNeon - User Profile Page
// ============================================================================

import type { Profile, Post, Highlight } from '../../types';

interface ProfilePageProps { profile: Profile | null; posts: Post[]; highlights: Highlight[]; tab: 'posts' | 'reels' | 'tagged'; }

export function ProfilePage({ profile, posts, highlights, tab }: ProfilePageProps) {
  if (!profile) return { type: 'div', props: { className: 'loading' }, children: ['Loading...'] };
  return {
    type: 'div', props: { className: 'profile-page' }, children: [
      { type: 'div', props: { className: 'profile-header' }, children: [
        { type: 'img', props: { src: profile.avatarUrl, className: 'profile-avatar' }, children: [] },
        { type: 'div', props: { className: 'profile-stats' }, children: [
          { type: 'span', props: {}, children: [`${profile.postCount} posts`] },
          { type: 'span', props: {}, children: [`${profile.followerCount} followers`] },
          { type: 'span', props: {}, children: [`${profile.followingCount} following`] },
        ]},
      ]},
      { type: 'div', props: { className: 'profile-info' }, children: [
        { type: 'h2', props: {}, children: [profile.displayName, profile.isVerified ? ' (Verified)' : ''] },
        { type: 'p', props: { className: 'bio' }, children: [profile.bio] },
        profile.website ? { type: 'a', props: { href: profile.website }, children: [profile.website] } : null,
        { type: 'button', props: { className: profile.isFollowing ? 'following-btn' : 'follow-btn' }, children: [profile.isFollowing ? 'Following' : 'Follow'] },
      ].filter(Boolean) },
      { type: 'div', props: { className: 'highlights-scroll' }, children: highlights.map(h => ({ type: 'div', props: { className: 'highlight-circle' }, children: [{ type: 'img', props: { src: h.coverUrl }, children: [] }, { type: 'span', props: {}, children: [h.title] }] })) },
      { type: 'nav', props: { className: 'profile-tabs' }, children: [
        { type: 'button', props: { className: tab === 'posts' ? 'active' : '' }, children: ['Grid'] },
        { type: 'button', props: { className: tab === 'reels' ? 'active' : '' }, children: ['Reels'] },
        { type: 'button', props: { className: tab === 'tagged' ? 'active' : '' }, children: ['Tagged'] },
      ]},
      { type: 'div', props: { className: 'post-grid' }, children: posts.map(p => ({ type: 'div', props: { className: 'grid-item' }, children: [{ type: 'img', props: { src: p.media[0]?.url || '' }, children: [] }] })) },
    ],
  };
}
export default ProfilePage;
