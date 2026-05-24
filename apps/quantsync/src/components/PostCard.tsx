// ============================================================================
// QuantSync - PostCard Component
// Post display with actions (upvote, comment, share, repost)
// ============================================================================

import type { Post } from '../types';

interface PostCardProps {
  post: Post;
  expanded?: boolean;
  onVote?: (direction: 'up' | 'down') => void;
  onComment?: () => void;
  onShare?: () => void;
  onRepost?: () => void;
  onBookmark?: () => void;
  onClick?: (postId: string) => void;
}

export function PostCard({ post, expanded = false, onVote, onComment, onShare, onRepost, onBookmark, onClick }: PostCardProps) {
  const timeAgo = getTimeAgo(post.createdAt);
  const isThread = post.type === 'thread' && post.threadPosts && post.threadPosts.length > 0;
  const isRepost = post.type === 'repost' && post.repostOf;
  const isQuote = post.type === 'quote' && post.quotedPost;
  const hasPoll = post.type === 'poll' && post.poll;
  const hasMedia = post.mediaAttachments.length > 0;

  return {
    type: 'article',
    className: `post-card ${expanded ? 'expanded' : ''} ${post.isAnonymous ? 'anonymous' : ''}`,
    onClick: () => onClick?.(post.id),
    children: [
      // Repost header
      isRepost && {
        type: 'div',
        className: 'repost-header',
        children: [{ type: 'span', text: 'Reposted' }],
      },
      // Author info
      {
        type: 'header',
        className: 'post-header',
        children: [
          { type: 'img', className: 'avatar', src: post.isAnonymous ? '/anon-avatar.png' : post.author?.avatar },
          {
            type: 'div',
            className: 'author-info',
            children: [
              { type: 'span', className: 'display-name', text: post.isAnonymous ? post.anonymousAlias : post.author?.displayName },
              { type: 'span', className: 'username', text: post.isAnonymous ? 'Anonymous' : `@${post.author?.username}` },
              { type: 'span', className: 'time', text: timeAgo },
            ],
          },
          post.flair && { type: 'span', className: 'flair', style: { backgroundColor: post.flair.backgroundColor, color: post.flair.color }, text: post.flair.text },
        ],
      },
      // Content
      {
        type: 'div',
        className: 'post-content',
        children: [
          post.content && { type: 'p', text: post.content, className: expanded ? 'full' : 'truncated' },
          // Media gallery
          hasMedia && {
            type: 'div',
            className: `media-grid media-count-${post.mediaAttachments.length}`,
            children: post.mediaAttachments.map(media => ({
              type: media.type === 'video' ? 'video' : 'img',
              src: media.url,
              alt: media.altText || '',
              className: 'media-item',
            })),
          },
          // Poll
          hasPoll && {
            type: 'div',
            className: 'poll-container',
            children: [
              { type: 'h4', text: post.poll!.question },
              ...post.poll!.options.map(option => ({
                type: 'div',
                className: 'poll-option',
                children: [
                  { type: 'span', text: option.text },
                  { type: 'div', className: 'poll-bar', style: { width: `${option.percentage}%` } },
                  { type: 'span', text: `${option.percentage.toFixed(1)}%` },
                ],
              })),
              { type: 'span', className: 'poll-total', text: `${post.poll!.totalVotes} votes` },
            ],
          },
          // Quoted post
          isQuote && {
            type: 'div',
            className: 'quoted-post',
            children: [{ type: 'PostCard', props: { post: post.quotedPost!, expanded: false } }],
          },
          // Thread indicator
          isThread && {
            type: 'div',
            className: 'thread-indicator',
            text: `Thread (${post.threadPosts!.length + 1} posts)`,
          },
        ],
      },
      // Action bar
      {
        type: 'footer',
        className: 'post-actions',
        children: [
          // Vote buttons
          {
            type: 'div',
            className: 'vote-group',
            children: [
              { type: 'button', className: `upvote ${post.userVote === 'up' ? 'active' : ''}`, onClick: () => onVote?.('up'), text: String(post.upvotes) },
              { type: 'button', className: `downvote ${post.userVote === 'down' ? 'active' : ''}`, onClick: () => onVote?.('down'), text: String(post.downvotes) },
            ],
          },
          { type: 'button', className: 'comment-btn', onClick: onComment, text: `${post.commentCount}` },
          { type: 'button', className: 'repost-btn', onClick: onRepost, text: `${post.repostCount}` },
          { type: 'button', className: 'share-btn', onClick: onShare, text: `${post.shareCount}` },
          { type: 'button', className: `bookmark-btn ${post.userBookmarked ? 'active' : ''}`, onClick: onBookmark },
        ],
      },
      // NSFW/Spoiler overlay
      (post.isNSFW || post.isSpoiler) && !expanded && {
        type: 'div',
        className: 'content-warning',
        text: post.isNSFW ? 'NSFW Content' : 'Spoiler',
      },
    ].filter(Boolean),
  };
}

function getTimeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d`;
  return new Date(dateStr).toLocaleDateString();
}

export default PostCard;
