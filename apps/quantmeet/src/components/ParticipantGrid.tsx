'use client';

import type { ParticipantGridProps } from '../types/components';
import { VideoTile } from './VideoTile';

export function ParticipantGrid({
  participants,
  layout,
  activeSpeakerId,
  pinnedParticipantId,
}: ParticipantGridProps) {
  const activeSpeaker = participants.find((p) => p.participantId === activeSpeakerId);
  const pinnedParticipant = participants.find((p) => p.participantId === pinnedParticipantId);
  const featuredParticipant = pinnedParticipant || activeSpeaker;

  if (layout === 'speaker' && featuredParticipant) {
    const others = participants.filter(
      (p) => p.participantId !== featuredParticipant.participantId,
    );
    return (
      <div className="flex flex-col h-full gap-2 p-2" role="region" aria-label="Participant grid">
        <div className="flex-1 min-h-0">
          <VideoTile {...featuredParticipant} />
        </div>
        {others.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-2">
            {others.map((p) => (
              <div key={p.participantId} className="w-40 flex-shrink-0">
                <VideoTile {...p} />
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (layout === 'sidebar' && featuredParticipant) {
    const others = participants.filter(
      (p) => p.participantId !== featuredParticipant.participantId,
    );
    return (
      <div className="flex h-full gap-2 p-2" role="region" aria-label="Participant grid">
        <div className="flex-1 min-w-0">
          <VideoTile {...featuredParticipant} />
        </div>
        {others.length > 0 && (
          <div className="w-48 flex flex-col gap-2 overflow-y-auto">
            {others.map((p) => (
              <div key={p.participantId} className="flex-shrink-0">
                <VideoTile {...p} />
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  const columnCount =
    participants.length <= 1 ? 1 : participants.length <= 4 ? 2 : participants.length <= 9 ? 3 : 4;

  return (
    <div
      className={`grid gap-2 p-2 h-full auto-rows-fr`}
      style={{ gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))` }}
      role="region"
      aria-label="Participant grid"
    >
      {participants.map((p) => (
        <VideoTile key={p.participantId} {...p} />
      ))}
    </div>
  );
}
