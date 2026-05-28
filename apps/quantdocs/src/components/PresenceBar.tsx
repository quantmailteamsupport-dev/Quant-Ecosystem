'use client';

import { Avatar } from '@quant/shared-ui';

interface Viewer {
  id: string;
  name: string;
  avatarUrl?: string;
}

interface PresenceBarProps {
  viewers?: Viewer[];
}

export function PresenceBar({ viewers = [] }: PresenceBarProps) {
  return (
    <div
      className="flex items-center gap-2 px-4 py-2 border-b border-[var(--quant-border)]"
      aria-label={`${viewers.length} ${viewers.length === 1 ? 'person' : 'people'} viewing`}
    >
      <div className="flex -space-x-2">
        {viewers.map((viewer) => (
          <Avatar
            key={viewer.id}
            src={viewer.avatarUrl}
            name={viewer.name}
            size="xs"
            showStatus
            status="online"
          />
        ))}
      </div>
      {viewers.length > 0 && (
        <span className="text-xs text-[var(--quant-muted-foreground)]">
          {viewers.length} viewing
        </span>
      )}
    </div>
  );
}
