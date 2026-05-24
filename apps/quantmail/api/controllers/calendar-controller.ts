// ============================================================================
// QuantMail API - Calendar Controller
// Business logic for calendar, scheduling, events, and reminders
// ============================================================================

import type { Request, Response } from '../middleware';
import type {
  CalendarEvent,
  Calendar,
  EventType,
  EventRecurrence,
  EventAttendee,
  EventReminder,
  RSVPStatus,
} from '../../src/types';

// In-memory stores
const calendars = new Map<string, Calendar>();
const events = new Map<string, CalendarEvent>();

function generateId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 10)}`;
}

export class CalendarController {
  // --------------------------------------------------------------------------
  // Calendars
  // --------------------------------------------------------------------------

  async listCalendars(req: Request, res: Response): Promise<void> {
    const userId = req.userId;
    if (!userId) { res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required', statusCode: 401 } }); return; }

    const results: Calendar[] = [];
    for (const cal of calendars.values()) {
      if (cal.userId === userId || cal.sharedWith.includes(userId)) {
        results.push(cal);
      }
    }

    // Create default calendar if none exists
    if (results.length === 0) {
      const defaultCal: Calendar = {
        id: generateId('cal'),
        userId,
        name: 'My Calendar',
        color: '#4285f4',
        isDefault: true,
        isShared: false,
        sharedWith: [],
        timezone: 'UTC',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      calendars.set(defaultCal.id, defaultCal);
      results.push(defaultCal);
    }

    res.status(200).json({ success: true, data: results });
  }

  async createCalendar(req: Request, res: Response): Promise<void> {
    const userId = req.userId;
    if (!userId) { res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required', statusCode: 401 } }); return; }

    const { name, color, timezone } = req.body as { name: string; color?: string; timezone?: string };
    if (!name) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Calendar name is required', statusCode: 400 } });
      return;
    }

    const calendar: Calendar = {
      id: generateId('cal'),
      userId,
      name,
      color: color || '#4285f4',
      isDefault: false,
      isShared: false,
      sharedWith: [],
      timezone: timezone || 'UTC',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    calendars.set(calendar.id, calendar);
    res.status(201).json({ success: true, data: calendar });
  }

  async deleteCalendar(req: Request, res: Response): Promise<void> {
    const userId = req.userId;
    if (!userId) { res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required', statusCode: 401 } }); return; }

    const calId = req.params['id'];
    const cal = calendars.get(calId);
    if (!cal || cal.userId !== userId) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Calendar not found', statusCode: 404 } });
      return;
    }

    if (cal.isDefault) {
      res.status(400).json({ success: false, error: { code: 'CANNOT_DELETE', message: 'Cannot delete default calendar', statusCode: 400 } });
      return;
    }

    // Delete all events in calendar
    for (const [eventId, event] of events) {
      if (event.calendarId === calId) events.delete(eventId);
    }

    calendars.delete(calId);
    res.status(200).json({ success: true, data: { message: 'Calendar deleted' } });
  }

  async shareCalendar(req: Request, res: Response): Promise<void> {
    const userId = req.userId;
    if (!userId) { res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required', statusCode: 401 } }); return; }

    const calId = req.params['id'];
    const { userIds } = req.body as { userIds: string[] };
    const cal = calendars.get(calId);
    if (!cal || cal.userId !== userId) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Calendar not found', statusCode: 404 } });
      return;
    }

    cal.isShared = true;
    cal.sharedWith = [...new Set([...cal.sharedWith, ...userIds])];
    cal.updatedAt = new Date();

    res.status(200).json({ success: true, data: cal });
  }

  // --------------------------------------------------------------------------
  // Events
  // --------------------------------------------------------------------------

  async listEvents(req: Request, res: Response): Promise<void> {
    const userId = req.userId;
    if (!userId) { res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required', statusCode: 401 } }); return; }

    const calendarId = req.query['calendar_id'] as string;
    const startDate = req.query['start'] as string;
    const endDate = req.query['end'] as string;
    const type = req.query['type'] as EventType;

    let results: CalendarEvent[] = [];
    for (const event of events.values()) {
      if (event.userId !== userId) continue;
      if (calendarId && event.calendarId !== calendarId) continue;
      if (type && event.type !== type) continue;
      if (startDate && event.endTime < new Date(startDate)) continue;
      if (endDate && event.startTime > new Date(endDate)) continue;
      results.push(event);
    }

    results.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
    res.status(200).json({ success: true, data: results });
  }

  async getEvent(req: Request, res: Response): Promise<void> {
    const userId = req.userId;
    if (!userId) { res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required', statusCode: 401 } }); return; }

    const eventId = req.params['id'];
    const event = events.get(eventId);
    if (!event || event.userId !== userId) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Event not found', statusCode: 404 } });
      return;
    }

    res.status(200).json({ success: true, data: event });
  }

  async createEvent(req: Request, res: Response): Promise<void> {
    const userId = req.userId;
    if (!userId) { res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required', statusCode: 401 } }); return; }

    const body = req.body as {
      calendarId?: string; title: string; description?: string; type?: EventType;
      startTime: string; endTime: string; isAllDay?: boolean; location?: string;
      meetingUrl?: string; recurrence?: EventRecurrence; recurrenceEnd?: string;
      attendees?: EventAttendee[]; reminders?: EventReminder[];
      color?: string; isPrivate?: boolean; attachments?: string[];
    };

    if (!body.title || !body.startTime || !body.endTime) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Title, startTime, and endTime are required', statusCode: 400 } });
      return;
    }

    const startTime = new Date(body.startTime);
    const endTime = new Date(body.endTime);

    if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid date format', statusCode: 400 } });
      return;
    }

    if (endTime <= startTime) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'End time must be after start time', statusCode: 400 } });
      return;
    }

    // Get default calendar if not specified
    let calendarId = body.calendarId;
    if (!calendarId) {
      for (const cal of calendars.values()) {
        if (cal.userId === userId && cal.isDefault) {
          calendarId = cal.id;
          break;
        }
      }
      if (!calendarId) {
        calendarId = generateId('cal');
        calendars.set(calendarId, {
          id: calendarId, userId, name: 'My Calendar', color: '#4285f4',
          isDefault: true, isShared: false, sharedWith: [], timezone: 'UTC',
          createdAt: new Date(), updatedAt: new Date(),
        });
      }
    }

    const event: CalendarEvent = {
      id: generateId('event'),
      userId,
      calendarId,
      title: body.title,
      description: body.description || '',
      type: body.type || 'meeting',
      startTime,
      endTime,
      isAllDay: body.isAllDay || false,
      location: body.location,
      meetingUrl: body.meetingUrl,
      recurrence: body.recurrence || 'none',
      recurrenceEnd: body.recurrenceEnd ? new Date(body.recurrenceEnd) : undefined,
      attendees: body.attendees || [],
      reminders: body.reminders || [{ type: 'push', minutesBefore: 15 }],
      color: body.color,
      isPrivate: body.isPrivate || false,
      attachments: body.attachments || [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    events.set(event.id, event);
    res.status(201).json({ success: true, data: event });
  }

  async updateEvent(req: Request, res: Response): Promise<void> {
    const userId = req.userId;
    if (!userId) { res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required', statusCode: 401 } }); return; }

    const eventId = req.params['id'];
    const event = events.get(eventId);
    if (!event || event.userId !== userId) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Event not found', statusCode: 404 } });
      return;
    }

    const updates = req.body as Partial<CalendarEvent & { startTime: string; endTime: string }>;
    if (updates.title) event.title = updates.title;
    if (updates.description !== undefined) event.description = updates.description;
    if (updates.type) event.type = updates.type;
    if (updates.startTime) event.startTime = new Date(updates.startTime as unknown as string);
    if (updates.endTime) event.endTime = new Date(updates.endTime as unknown as string);
    if (updates.isAllDay !== undefined) event.isAllDay = updates.isAllDay;
    if (updates.location !== undefined) event.location = updates.location;
    if (updates.meetingUrl !== undefined) event.meetingUrl = updates.meetingUrl;
    if (updates.recurrence) event.recurrence = updates.recurrence;
    if (updates.attendees) event.attendees = updates.attendees;
    if (updates.reminders) event.reminders = updates.reminders;
    if (updates.color !== undefined) event.color = updates.color;
    if (updates.isPrivate !== undefined) event.isPrivate = updates.isPrivate;
    event.updatedAt = new Date();

    res.status(200).json({ success: true, data: event });
  }

  async deleteEvent(req: Request, res: Response): Promise<void> {
    const userId = req.userId;
    if (!userId) { res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required', statusCode: 401 } }); return; }

    const eventId = req.params['id'];
    const event = events.get(eventId);
    if (!event || event.userId !== userId) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Event not found', statusCode: 404 } });
      return;
    }

    events.delete(eventId);
    res.status(200).json({ success: true, data: { message: 'Event deleted' } });
  }

  // --------------------------------------------------------------------------
  // RSVP
  // --------------------------------------------------------------------------

  async respondToEvent(req: Request, res: Response): Promise<void> {
    const userId = req.userId;
    if (!userId) { res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required', statusCode: 401 } }); return; }

    const eventId = req.params['id'];
    const { response: rsvpResponse } = req.body as { response: RSVPStatus };

    if (!rsvpResponse || !['accepted', 'declined', 'tentative'].includes(rsvpResponse)) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Valid response (accepted/declined/tentative) is required', statusCode: 400 } });
      return;
    }

    const event = events.get(eventId);
    if (!event) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Event not found', statusCode: 404 } });
      return;
    }

    // Find attendee and update RSVP
    const attendee = event.attendees.find((a) => a.email.includes(userId));
    if (attendee) {
      attendee.rsvp = rsvpResponse;
    } else {
      event.attendees.push({
        email: `${userId}@quantmail.app`,
        rsvp: rsvpResponse,
        isOrganizer: false,
        isOptional: false,
      });
    }
    event.updatedAt = new Date();

    res.status(200).json({ success: true, data: { eventId, rsvp: rsvpResponse } });
  }

  // --------------------------------------------------------------------------
  // Scheduling
  // --------------------------------------------------------------------------

  async findAvailableSlots(req: Request, res: Response): Promise<void> {
    const userId = req.userId;
    if (!userId) { res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required', statusCode: 401 } }); return; }

    const { date, duration, participants } = req.body as { date: string; duration: number; participants?: string[] };
    if (!date || !duration) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Date and duration are required', statusCode: 400 } });
      return;
    }

    const targetDate = new Date(date);
    const dayStart = new Date(targetDate);
    dayStart.setHours(9, 0, 0, 0);
    const dayEnd = new Date(targetDate);
    dayEnd.setHours(17, 0, 0, 0);

    // Get existing events for the day
    const existingEvents: CalendarEvent[] = [];
    for (const event of events.values()) {
      if (event.userId === userId) {
        if (event.startTime >= dayStart && event.startTime < dayEnd) {
          existingEvents.push(event);
        }
      }
    }

    existingEvents.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

    // Find available slots
    const slots: Array<{ start: Date; end: Date }> = [];
    let current = dayStart;

    for (const event of existingEvents) {
      if (event.startTime.getTime() - current.getTime() >= duration * 60 * 1000) {
        slots.push({ start: new Date(current), end: new Date(event.startTime) });
      }
      if (event.endTime > current) {
        current = new Date(event.endTime);
      }
    }

    // Check slot after last event
    if (dayEnd.getTime() - current.getTime() >= duration * 60 * 1000) {
      slots.push({ start: new Date(current), end: dayEnd });
    }

    res.status(200).json({ success: true, data: { date, duration, slots } });
  }

  // --------------------------------------------------------------------------
  // Upcoming & Reminders
  // --------------------------------------------------------------------------

  async getUpcoming(req: Request, res: Response): Promise<void> {
    const userId = req.userId;
    if (!userId) { res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required', statusCode: 401 } }); return; }

    const now = new Date();
    const limit = Number(req.query['limit']) || 10;
    const results: CalendarEvent[] = [];

    for (const event of events.values()) {
      if (event.userId === userId && event.startTime > now) {
        results.push(event);
      }
    }

    results.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
    res.status(200).json({ success: true, data: results.slice(0, limit) });
  }

  async getToday(req: Request, res: Response): Promise<void> {
    const userId = req.userId;
    if (!userId) { res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required', statusCode: 401 } }); return; }

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

    const results: CalendarEvent[] = [];
    for (const event of events.values()) {
      if (event.userId === userId) {
        if ((event.startTime >= todayStart && event.startTime < todayEnd) ||
            (event.endTime > todayStart && event.startTime < todayEnd)) {
          results.push(event);
        }
      }
    }

    results.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
    res.status(200).json({ success: true, data: results });
  }
}
