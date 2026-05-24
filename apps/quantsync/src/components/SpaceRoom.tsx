// ============================================================================
// QuantSync - SpaceRoom Component
// Live audio space UI with speakers and listeners
// ============================================================================

import type { Space, SpaceParticipant } from '../types';

interface SpaceRoomProps {
  space: Space;
  currentUserId: string;
  onLeave?: () => void;
  onRaiseHand?: () => void;
  onMuteToggle?: () => void;
  onEndSpace?: () => void;
}

export function SpaceRoom({ space, currentUserId, onLeave, onRaiseHand, onMuteToggle, onEndSpace }: SpaceRoomProps) {
  const isHost = space.hostId === currentUserId;
  const currentParticipant = [...space.speakers, ...space.listeners].find(p => p.userId === currentUserId);
  const isSpeaker = space.speakers.some(s => s.userId === currentUserId);

  return {
    type: 'div',
    className: `space-room ${space.status}`,
    children: [
      // Header
      {
        type: 'header',
        className: 'space-header',
        children: [
          { type: 'h2', className: 'space-title', text: space.title },
          space.description && { type: 'p', className: 'space-description', text: space.description },
          {
            type: 'div',
            className: 'space-meta',
            children: [
              { type: 'span', className: 'listener-count', text: `${space.listenerCount} listening` },
              space.isRecording && { type: 'span', className: 'recording-badge', text: 'Recording' },
              { type: 'span', className: 'status-badge', text: space.status },
            ].filter(Boolean),
          },
          space.topics.length > 0 && {
            type: 'div',
            className: 'space-topics',
            children: space.topics.map(t => ({ type: 'span', className: 'topic-chip', text: t })),
          },
        ].filter(Boolean),
      },
      // Speakers grid
      {
        type: 'section',
        className: 'speakers-section',
        children: [
          { type: 'h3', text: 'Speakers' },
          {
            type: 'div',
            className: 'speakers-grid',
            children: space.speakers.map(speaker => renderParticipant(speaker, true)),
          },
        ],
      },
      // Listeners
      {
        type: 'section',
        className: 'listeners-section',
        children: [
          { type: 'h3', text: `Listeners (${space.listeners.length})` },
          {
            type: 'div',
            className: 'listeners-grid',
            children: space.listeners.slice(0, 20).map(listener => renderParticipant(listener, false)),
          },
          space.listeners.length > 20 && { type: 'span', text: `+${space.listeners.length - 20} more` },
        ].filter(Boolean),
      },
      // Controls
      {
        type: 'footer',
        className: 'space-controls',
        children: [
          isSpeaker && {
            type: 'button',
            className: `mute-btn ${currentParticipant?.isMuted ? 'muted' : ''}`,
            onClick: onMuteToggle,
            text: currentParticipant?.isMuted ? 'Unmute' : 'Mute',
          },
          !isSpeaker && {
            type: 'button',
            className: `hand-btn ${currentParticipant?.raisedHand ? 'raised' : ''}`,
            onClick: onRaiseHand,
            text: currentParticipant?.raisedHand ? 'Lower hand' : 'Raise hand',
          },
          { type: 'button', className: 'leave-btn', onClick: onLeave, text: isHost ? 'End Space' : 'Leave' },
          isHost && { type: 'button', className: 'end-btn', onClick: onEndSpace, text: 'End for all' },
        ].filter(Boolean),
      },
    ],
  };
}

function renderParticipant(participant: SpaceParticipant, isSpeaker: boolean) {
  return {
    type: 'div',
    className: `participant ${participant.role} ${participant.isMuted ? 'muted' : 'speaking'}`,
    children: [
      { type: 'div', className: 'participant-avatar', children: [
        { type: 'img', src: participant.user?.avatar || '/default-avatar.png' },
        !participant.isMuted && isSpeaker && { type: 'div', className: 'speaking-indicator' },
      ].filter(Boolean) },
      { type: 'span', className: 'participant-name', text: participant.user?.displayName || participant.userId },
      participant.role === 'host' && { type: 'span', className: 'host-badge', text: 'Host' },
      participant.raisedHand && { type: 'span', className: 'hand-icon', text: 'Hand raised' },
    ].filter(Boolean),
  };
}

export default SpaceRoom;
