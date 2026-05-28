'use client';

import type { CalendarEvent } from '../hooks/useEvents';
import { MonthView } from './MonthView';
import { WeekView } from './WeekView';
import { DayView } from './DayView';
import { AgendaView } from './AgendaView';

export type CalendarViewType = 'month' | 'week' | 'day' | 'agenda';

interface CalendarGridProps {
  view: CalendarViewType;
  events: CalendarEvent[];
  currentDate: Date;
  onEventClick?: (event: CalendarEvent) => void;
}

export function CalendarGrid({ view, events, currentDate, onEventClick }: CalendarGridProps) {
  switch (view) {
    case 'month':
      return <MonthView events={events} currentDate={currentDate} onEventClick={onEventClick} />;
    case 'week':
      return <WeekView events={events} currentDate={currentDate} onEventClick={onEventClick} />;
    case 'day':
      return <DayView events={events} currentDate={currentDate} onEventClick={onEventClick} />;
    case 'agenda':
      return <AgendaView events={events} currentDate={currentDate} onEventClick={onEventClick} />;
  }
}
