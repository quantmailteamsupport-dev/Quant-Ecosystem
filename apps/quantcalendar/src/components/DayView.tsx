'use client';

import { useMemo } from 'react';
import type { CalendarEvent } from '../hooks/useEvents';
import { EventCard } from './EventCard';

interface DayViewProps {
  events: CalendarEvent[];
  currentDate: Date;
  onEventClick?: (event: CalendarEvent) => void;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);

export function DayView({ events, currentDate, onEventClick }: DayViewProps) {
  const today = useMemo(() => new Date(), []);

  const dayEvents = useMemo(() => {
    return events.filter((event) => {
      const eventDate = new Date(event.start);
      return (
        eventDate.getDate() === currentDate.getDate() &&
        eventDate.getMonth() === currentDate.getMonth() &&
        eventDate.getFullYear() === currentDate.getFullYear()
      );
    });
  }, [events, currentDate]);

  const getEventsForHour = (hour: number) => {
    return dayEvents.filter((event) => {
      const eventStart = new Date(event.start);
      return eventStart.getHours() === hour;
    });
  };

  const isToday =
    currentDate.getDate() === today.getDate() &&
    currentDate.getMonth() === today.getMonth() &&
    currentDate.getFullYear() === today.getFullYear();

  const formatHour = (hour: number) => {
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour} ${period}`;
  };

  const dateLabel = currentDate.toLocaleDateString('default', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div
      className="flex flex-col h-full overflow-auto"
      role="grid"
      aria-label={`Day view for ${dateLabel}`}
    >
      <div className="sticky top-0 z-10 bg-[var(--quant-background)] border-b border-[var(--quant-border)] p-3">
        <h2 className={`text-lg font-semibold ${isToday ? 'text-quant-primary' : ''}`}>
          {dateLabel}
          {isToday && <span className="ml-2 text-sm font-normal">(Today)</span>}
        </h2>
      </div>
      <div className="flex-1">
        {HOURS.map((hour) => {
          const hourEvents = getEventsForHour(hour);
          return (
            <div
              key={hour}
              className="grid grid-cols-[60px_1fr] min-h-[48px] border-b border-[var(--quant-border)]"
              role="row"
            >
              <div className="text-xs text-[var(--quant-muted-foreground)] p-1 text-right pr-2 border-r border-[var(--quant-border)]">
                {formatHour(hour)}
              </div>
              <div className="p-1 space-y-1" role="gridcell" aria-label={formatHour(hour)}>
                {hourEvents.map((event) => (
                  <EventCard key={event.id} event={event} onClick={onEventClick} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
