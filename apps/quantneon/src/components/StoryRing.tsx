// ============================================================================
// QuantNeon - StoryRing Component
// ============================================================================

interface StoryRingProps { userId: string; username: string; avatarUrl: string; hasUnviewed: boolean; isCloseFriend: boolean; onClick?: () => void; }

export function StoryRing({ userId, username, avatarUrl, hasUnviewed, isCloseFriend }: StoryRingProps) {
  const ringClass = hasUnviewed ? (isCloseFriend ? 'ring-close-friends' : 'ring-unviewed') : 'ring-viewed';
  return { type: 'div', props: { className: `story-ring ${ringClass}`, 'data-user': userId }, children: [{ type: 'div', props: { className: 'ring-border' }, children: [{ type: 'img', props: { src: avatarUrl, alt: username, className: 'ring-avatar' }, children: [] }] }, { type: 'span', props: { className: 'ring-username' }, children: [username.length > 10 ? username.substring(0, 9) + '...' : username] }] };
}
export default StoryRing;
