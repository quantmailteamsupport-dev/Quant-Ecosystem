// ============================================================================
// QuantMail - Calendar Page
// ============================================================================

import React, { useState } from 'react';
import type { CalendarEvent, Calendar, EventType } from '../types';

export interface CalendarPageProps {
  calendars: Calendar[];
  events: CalendarEvent[];
  todayEvents: CalendarEvent[];
  upcomingEvents: CalendarEvent[];
  isLoading: boolean;
  onCreateEvent: (data: { title: string; startTime: string; endTime: string; type: EventType; description?: string; location?: string }) => Promise<void>;
  onUpdateEvent: (id: string, data: Partial<CalendarEvent>) => Promise<void>;
  onDeleteEvent: (id: string) => void;
  onDateChange: (start: string, end: string) => void;
}

type ViewMode = 'month' | 'week' | 'day' | 'agenda';

export function CalendarPage(props: CalendarPageProps): React.ReactElement {
  const { calendars, events, todayEvents, upcomingEvents, isLoading, onCreateEvent, onUpdateEvent, onDeleteEvent, onDateChange } = props;

  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newEvent, setNewEvent] = useState({
    title: '', startTime: '', endTime: '', type: 'meeting' as EventType, description: '', location: '',
  });

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEvent.title || !newEvent.startTime || !newEvent.endTime) return;
    await onCreateEvent(newEvent);
    setShowCreateModal(false);
    setNewEvent({ title: '', startTime: '', endTime: '', type: 'meeting', description: '', location: '' });
  };

  const navigateDate = (direction: number) => {
    const newDate = new Date(currentDate);
    if (viewMode === 'month') newDate.setMonth(newDate.getMonth() + direction);
    else if (viewMode === 'week') newDate.setDate(newDate.getDate() + 7 * direction);
    else newDate.setDate(newDate.getDate() + direction);
    setCurrentDate(newDate);
  };

  const formatTime = (date: Date): string => {
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getWeekDays = (): Date[] => {
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(startOfWeek);
      d.setDate(d.getDate() + i);
      return d;
    });
  };

  const getEventsForDate = (date: Date): CalendarEvent[] => {
    return events.filter((event) => {
      const eventDate = new Date(event.startTime);
      return eventDate.toDateString() === date.toDateString();
    });
  };

  return (
    <div className="calendar-page">
      <div className="calendar-header">
        <div className="calendar-nav">
          <button className="btn btn-sm" onClick={() => navigateDate(-1)}>&lt;</button>
          <h2>{currentDate.toLocaleDateString([], { month: 'long', year: 'numeric' })}</h2>
          <button className="btn btn-sm" onClick={() => navigateDate(1)}>&gt;</button>
          <button className="btn btn-sm btn-outline" onClick={() => setCurrentDate(new Date())}>Today</button>
        </div>
        <div className="calendar-actions">
          <div className="view-selector">
            {(['day', 'week', 'month', 'agenda'] as ViewMode[]).map((mode) => (
              <button key={mode} className={`btn btn-sm ${viewMode === mode ? 'btn-primary' : 'btn-outline'}`} onClick={() => setViewMode(mode)}>
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </button>
            ))}
          </div>
          <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
            New Event
          </button>
        </div>
      </div>

      <div className="calendar-layout">
        {/* Sidebar with upcoming */}
        <aside className="calendar-sidebar">
          <div className="sidebar-section">
            <h3>Today</h3>
            {todayEvents.length === 0 && <p className="empty-text">No events today</p>}
            {todayEvents.map((event) => (
              <div key={event.id} className="mini-event" style={{ borderLeftColor: event.color || '#4285f4' }}>
                <span className="event-time">{formatTime(event.startTime)}</span>
                <span className="event-title">{event.title}</span>
              </div>
            ))}
          </div>
          <div className="sidebar-section">
            <h3>Upcoming</h3>
            {upcomingEvents.slice(0, 5).map((event) => (
              <div key={event.id} className="mini-event">
                <span className="event-date">{new Date(event.startTime).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                <span className="event-title">{event.title}</span>
              </div>
            ))}
          </div>
          <div className="sidebar-section">
            <h3>Calendars</h3>
            {calendars.map((cal) => (
              <label key={cal.id} className="calendar-toggle">
                <span className="cal-dot" style={{ backgroundColor: cal.color }} />
                {cal.name}
              </label>
            ))}
          </div>
        </aside>

        {/* Main calendar view */}
        <div className="calendar-main">
          {isLoading && <div className="loading-indicator">Loading events...</div>}

          {viewMode === 'week' && (
            <div className="week-view">
              <div className="week-header">
                {getWeekDays().map((day) => (
                  <div key={day.toISOString()} className={`week-day-header ${day.toDateString() === new Date().toDateString() ? 'today' : ''}`}>
                    <span className="day-name">{day.toLocaleDateString([], { weekday: 'short' })}</span>
                    <span className="day-number">{day.getDate()}</span>
                  </div>
                ))}
              </div>
              <div className="week-body">
                {getWeekDays().map((day) => (
                  <div key={day.toISOString()} className="week-day-col">
                    {getEventsForDate(day).map((event) => (
                      <div key={event.id} className="event-block" style={{ backgroundColor: event.color || '#4285f4' }}>
                        <span className="event-time">{formatTime(event.startTime)}</span>
                        <span className="event-title">{event.title}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}

          {viewMode === 'agenda' && (
            <div className="agenda-view">
              {events.length === 0 && <div className="empty-state"><p>No events in this period</p></div>}
              {events.map((event) => (
                <div key={event.id} className="agenda-event">
                  <div className="event-date-col">
                    <span className="event-date">{new Date(event.startTime).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                    <span className="event-time">{formatTime(event.startTime)} - {formatTime(event.endTime)}</span>
                  </div>
                  <div className="event-details" style={{ borderLeftColor: event.color || '#4285f4' }}>
                    <h4>{event.title}</h4>
                    {event.location && <span className="event-location">{event.location}</span>}
                    {event.description && <p className="event-desc">{event.description}</p>}
                    {event.attendees.length > 0 && (
                      <span className="event-attendees">{event.attendees.length} attendees</span>
                    )}
                  </div>
                  <div className="event-actions">
                    <button className="btn btn-sm btn-outline" onClick={() => onDeleteEvent(event.id)}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create Event Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>New Event</h2>
            <form onSubmit={handleCreateEvent}>
              <div className="form-group">
                <label>Title *</label>
                <input type="text" value={newEvent.title} onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })} required />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Start *</label>
                  <input type="datetime-local" value={newEvent.startTime} onChange={(e) => setNewEvent({ ...newEvent, startTime: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label>End *</label>
                  <input type="datetime-local" value={newEvent.endTime} onChange={(e) => setNewEvent({ ...newEvent, endTime: e.target.value })} required />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Type</label>
                  <select value={newEvent.type} onChange={(e) => setNewEvent({ ...newEvent, type: e.target.value as EventType })}>
                    <option value="meeting">Meeting</option>
                    <option value="reminder">Reminder</option>
                    <option value="task">Task</option>
                    <option value="focus">Focus time</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Location</label>
                  <input type="text" value={newEvent.location} onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })} />
                </div>
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea value={newEvent.description} onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })} rows={3} />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-outline" onClick={() => setShowCreateModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Create Event</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default CalendarPage;
