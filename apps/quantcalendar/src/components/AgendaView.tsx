'use client';

import { useMemo } from 'react';
import { EmptyState } from '@quant/shared-ui';
import type { CalendarEvent } from '../hooks/useEvents';
import { EventCard } from './EventCard';

interface AgendaViewProps {
  events: CalendarEvent[];
  currentDate: Date;
  onEventClick?: (event: CalendarEvent) => void;
}

export function AgendaView({ events, currentDate, onEventClick }: AgendaViewProps) {
  const groupedEvents = useMemo(() => {
    const upcoming = events
      .filter((event) => new Date(event.start) >= new Date(currentDate.toDateString()))
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

    const groups: Record<string, CalendarEvent[]> = {};
    for (const event of upcoming) {
      const dateKey = new Date(event.start).toDateString();
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(event);
    }
    return groups;
  }, [events, currentDate]);

  const dateKeys = Object.keys(groupedEvents);

  if (dateKeys.length === 0) {
    return (
      <EmptyState
        title="No upcoming events"
        description="Your schedule is clear. Create a new event to get started."
      />
    );
  }

  return (
    <div className="h-full overflow-auto p-4 space-y-6" role="list" aria-label="Agenda view">
      {dateKeys.map((dateKey) => {
        const date = new Date(dateKey);
        const dayEvents = groupedEvents[dateKey];
        const isToday = date.toDateString() === new Date().toDateString();

        return (
          <section key={dateKey} role="listitem" aria-label={`Events for ${dateKey}`}>
            <header className="flex items-center gap-3 mb-3">
              <div
                className={`flex flex-col items-center justify-center w-12 h-12 rounded-lg ${
                  isToday ? 'bg-quant-primary text-white' : 'bg-[var(--quant-muted)]'
                }`}
              >
                <span className="text-xs font-medium uppercase">
                  {date.toLocaleString('default', { weekday: 'short' })}
                </span>
                <span className="text-lg font-bold leading-none">{date.getDate()}</span>
              </div>
              <div>
                <h3 className="text-sm font-semibold">
                  {date.toLocaleDateString('default', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                  })}
                </h3>
                <p className="text-xs text-[var(--quant-muted-foreground)]">
                  {dayEvents.length} event{dayEvents.length !== 1 ? 's' : ''}
                </p>
              </div>
            </header>
            <div className="space-y-2 pl-15">
              {dayEvents.map((event) => (
                <EventCard key={event.id} event={event} onClick={onEventClick} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
