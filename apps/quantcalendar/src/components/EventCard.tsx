'use client';

import type { CalendarEvent } from '../hooks/useEvents';

interface EventCardProps {
  event: CalendarEvent;
  onClick?: (event: CalendarEvent) => void;
  compact?: boolean;
}

export function EventCard({ event, onClick, compact = false }: EventCardProps) {
  const startTime = new Date(event.start).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
  const endTime = new Date(event.end).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  if (compact) {
    return (
      <button
        onClick={() => onClick?.(event)}
        className="w-full text-left text-xs px-1.5 py-0.5 rounded truncate transition-opacity hover:opacity-80"
        style={{ backgroundColor: `${event.color}20`, borderLeft: `3px solid ${event.color}` }}
        aria-label={`${event.title} at ${startTime}`}
      >
        <span className="font-medium">{event.title}</span>
      </button>
    );
  }

  return (
    <button
      onClick={() => onClick?.(event)}
      className="w-full text-left p-2 rounded-lg border border-[var(--quant-border)] hover:shadow-sm transition-shadow cursor-pointer"
      style={{ borderLeftWidth: '4px', borderLeftColor: event.color }}
      aria-label={`${event.title}, ${startTime} to ${endTime}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium truncate">{event.title}</p>
          <p className="text-xs text-[var(--quant-muted-foreground)]">
            {startTime} - {endTime}
          </p>
          {event.location && (
            <p className="text-xs text-[var(--quant-muted-foreground)] truncate mt-0.5">
              {event.location}
            </p>
          )}
        </div>
        {event.isRecurring && (
          <span
            className="text-xs text-[var(--quant-muted-foreground)] flex-shrink-0"
            aria-label="Recurring event"
          >
            &#x1F501;
          </span>
        )}
      </div>
    </button>
  );
}
