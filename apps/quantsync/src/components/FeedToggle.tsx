// ============================================================================
// QuantSync - FeedToggle Component
// Feed mode switcher (For You / Following / Anonymous / Trending)
// ============================================================================

import type { FeedMode } from '../types';

interface FeedToggleProps {
  activeMode: FeedMode;
  onModeChange: (mode: FeedMode) => void;
}

const FEED_MODES: { mode: FeedMode; label: string; icon: string }[] = [
  { mode: 'for-you', label: 'For You', icon: 'sparkles' },
  { mode: 'following', label: 'Following', icon: 'users' },
  { mode: 'chronological', label: 'Latest', icon: 'clock' },
  { mode: 'anonymous', label: 'Anonymous', icon: 'mask' },
  { mode: 'trending', label: 'Trending', icon: 'fire' },
];

export function FeedToggle({ activeMode, onModeChange }: FeedToggleProps) {
  return {
    type: 'nav',
    className: 'feed-toggle',
    role: 'tablist',
    children: FEED_MODES.map(({ mode, label, icon }) => ({
      type: 'button',
      className: `feed-tab ${activeMode === mode ? 'active' : ''}`,
      role: 'tab',
      'aria-selected': activeMode === mode,
      onClick: () => onModeChange(mode),
      children: [
        { type: 'span', className: `icon icon-${icon}` },
        { type: 'span', className: 'label', text: label },
        activeMode === mode && { type: 'div', className: 'active-indicator' },
      ].filter(Boolean),
    })),
  };
}

export default FeedToggle;
