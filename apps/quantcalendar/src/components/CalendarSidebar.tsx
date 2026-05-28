'use client';

import { Button, Sidebar } from '@quant/shared-ui';
import type { SidebarItem } from '@quant/shared-ui';
import { MiniCalendar } from './MiniCalendar';
import type { Calendar } from '../hooks/useCalendars';

interface CalendarSidebarProps {
  calendars: Calendar[];
  currentDate: Date;
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  onMonthChange: (date: Date) => void;
  onNewEvent: () => void;
  onToggleCalendarVisibility?: (calendarId: string) => void;
}

export function CalendarSidebar({
  calendars,
  currentDate,
  selectedDate,
  onDateSelect,
  onMonthChange,
  onNewEvent,
  onToggleCalendarVisibility,
}: CalendarSidebarProps) {
  const sidebarItems: SidebarItem[] = calendars.map((cal) => ({
    id: cal.id,
    label: cal.name,
    icon: (
      <span
        className="inline-block w-3 h-3 rounded-full"
        style={{ backgroundColor: cal.color }}
        aria-hidden="true"
      />
    ),
    active: cal.isVisible,
    onClick: () => onToggleCalendarVisibility?.(cal.id),
  }));

  return (
    <Sidebar
      items={sidebarItems}
      header={
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">QuantCalendar</h2>
          <Button variant="primary" fullWidth onClick={onNewEvent} aria-label="Create new event">
            New Event
          </Button>
          <MiniCalendar
            currentDate={currentDate}
            selectedDate={selectedDate}
            onDateSelect={onDateSelect}
            onMonthChange={onMonthChange}
          />
        </div>
      }
      footer={
        <Button variant="secondary" fullWidth aria-label="Smart schedule with AI">
          Smart Schedule
        </Button>
      }
      aria-label="Calendar navigation"
    />
  );
}
