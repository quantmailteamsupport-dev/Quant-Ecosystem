// ============================================================================
// QuantSync - CommunityCard Component
// Community preview card for discovery
// ============================================================================

import type { Community } from '../types';

interface CommunityCardProps {
  community: Community;
  onJoin?: (communityId: string) => void;
  onClick?: (communityId: string) => void;
}

export function CommunityCard({ community, onJoin, onClick }: CommunityCardProps) {
  return {
    type: 'div',
    className: 'community-card',
    onClick: () => onClick?.(community.id),
    children: [
      community.banner && { type: 'div', className: 'community-banner', style: { backgroundImage: `url(${community.banner})` } },
      {
        type: 'div',
        className: 'community-info',
        children: [
          { type: 'img', className: 'community-icon', src: community.icon || '/default-community.png', alt: community.displayName },
          { type: 'h4', className: 'community-name', text: community.displayName },
          { type: 'span', className: 'community-handle', text: `r/${community.name}` },
          { type: 'p', className: 'community-description', text: community.description.substring(0, 150) },
          {
            type: 'div',
            className: 'community-stats',
            children: [
              { type: 'span', text: `${formatCount(community.memberCount)} members` },
              { type: 'span', text: `${community.onlineCount} online` },
            ],
          },
          { type: 'span', className: 'community-category', text: community.category },
          !community.isJoined && {
            type: 'button',
            className: 'join-btn',
            onClick: (e: any) => { e.stopPropagation(); onJoin?.(community.id); },
            text: 'Join',
          },
          community.isJoined && { type: 'span', className: 'joined-badge', text: 'Joined' },
        ].filter(Boolean),
      },
    ].filter(Boolean),
  };
}

function formatCount(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return String(num);
}

export default CommunityCard;
