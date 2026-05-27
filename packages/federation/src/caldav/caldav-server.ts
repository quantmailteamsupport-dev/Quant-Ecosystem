import { z } from 'zod';
import { VCalSerializer, CalendarEventSchema } from './vcal-serializer.js';
import type { CalendarEvent } from './vcal-serializer.js';

export const CalendarCollectionSchema = z.object({
  id: z.string(),
  displayName: z.string(),
  description: z.string().optional(),
  color: z.string().optional(),
  ownerPrincipal: z.string(),
});

export type CalendarCollection = z.infer<typeof CalendarCollectionSchema>;

export interface CalDAVResponse {
  status: number;
  body: string;
  headers: Record<string, string>;
}

export interface CalDAVRequest {
  method: 'PROPFIND' | 'REPORT' | 'PUT' | 'DELETE' | 'GET';
  path: string;
  body?: string;
  headers?: Record<string, string>;
}

export class CalDAVServer {
  private calendars: Map<string, CalendarCollection> = new Map();
  private events: Map<string, Map<string, CalendarEvent>> = new Map();
  private serializer: VCalSerializer;

  constructor() {
    this.serializer = new VCalSerializer();
  }

  createCalendar(calendar: CalendarCollection): void {
    const parsed = CalendarCollectionSchema.parse(calendar);
    this.calendars.set(parsed.id, parsed);
    this.events.set(parsed.id, new Map());
  }

  handle(request: CalDAVRequest): CalDAVResponse {
    switch (request.method) {
      case 'PROPFIND':
        return this.handlePropfind(request.path);
      case 'REPORT':
        return this.handleReport(request.path, request.body);
      case 'PUT':
        return this.handlePut(request.path, request.body);
      case 'DELETE':
        return this.handleDelete(request.path);
      case 'GET':
        return this.handleGet(request.path);
      default:
        return { status: 405, body: 'Method Not Allowed', headers: {} };
    }
  }

  private handlePropfind(path: string): CalDAVResponse {
    const calId = this.extractCalendarId(path);

    if (!calId) {
      const collections = [...this.calendars.values()].map((c) => ({
        href: `/calendars/${c.ownerPrincipal}/${c.id}/`,
        displayName: c.displayName,
        resourceType: 'calendar',
      }));

      return {
        status: 207,
        body: JSON.stringify({ multistatus: { responses: collections } }),
        headers: { 'content-type': 'application/xml; charset=utf-8' },
      };
    }

    const calendar = this.calendars.get(calId);
    if (!calendar) {
      return { status: 404, body: 'Calendar not found', headers: {} };
    }

    const calEvents = this.events.get(calId) ?? new Map();
    const resources = [...calEvents.keys()].map((uid) => ({
      href: `/calendars/${calendar.ownerPrincipal}/${calId}/${uid}.ics`,
      etag: `"${uid}-${Date.now()}"`,
    }));

    return {
      status: 207,
      body: JSON.stringify({
        multistatus: {
          calendar: { displayName: calendar.displayName, color: calendar.color },
          responses: resources,
        },
      }),
      headers: { 'content-type': 'application/xml; charset=utf-8' },
    };
  }

  private handleReport(path: string, body?: string): CalDAVResponse {
    const calId = this.extractCalendarId(path);
    if (!calId) {
      return { status: 400, body: 'Calendar ID required', headers: {} };
    }

    const calEvents = this.events.get(calId);
    if (!calEvents) {
      return { status: 404, body: 'Calendar not found', headers: {} };
    }

    let filteredEvents = [...calEvents.values()];

    if (body) {
      try {
        const filter = JSON.parse(body) as { timeRange?: { start: string; end: string } };
        if (filter.timeRange) {
          filteredEvents = filteredEvents.filter(
            (e) => e.dtstart >= filter.timeRange!.start && e.dtend <= filter.timeRange!.end,
          );
        }
      } catch {
        // no filter applied
      }
    }

    const results = filteredEvents.map((event) => ({
      href: `/calendars/${calId}/${event.uid}.ics`,
      data: this.serializer.serialize(event),
    }));

    return {
      status: 207,
      body: JSON.stringify({ multistatus: { responses: results } }),
      headers: { 'content-type': 'application/xml; charset=utf-8' },
    };
  }

  private handlePut(path: string, body?: string): CalDAVResponse {
    if (!body) {
      return { status: 400, body: 'Request body required', headers: {} };
    }

    const calId = this.extractCalendarId(path);
    if (!calId) {
      return { status: 400, body: 'Calendar ID required', headers: {} };
    }

    const calEvents = this.events.get(calId);
    if (!calEvents) {
      return { status: 404, body: 'Calendar not found', headers: {} };
    }

    const event = this.serializer.parse(body);
    if (!event) {
      return { status: 400, body: 'Invalid iCalendar data', headers: {} };
    }

    const parsed = CalendarEventSchema.safeParse(event);
    if (!parsed.success) {
      return { status: 400, body: 'Validation failed', headers: {} };
    }

    const isNew = !calEvents.has(parsed.data.uid);
    calEvents.set(parsed.data.uid, parsed.data);

    return {
      status: isNew ? 201 : 204,
      body: '',
      headers: { etag: `"${parsed.data.uid}-${Date.now()}"` },
    };
  }

  private handleDelete(path: string): CalDAVResponse {
    const calId = this.extractCalendarId(path);
    const eventUid = this.extractEventUid(path);

    if (!calId) {
      return { status: 400, body: 'Calendar ID required', headers: {} };
    }

    const calEvents = this.events.get(calId);
    if (!calEvents) {
      return { status: 404, body: 'Calendar not found', headers: {} };
    }

    if (!eventUid || !calEvents.has(eventUid)) {
      return { status: 404, body: 'Event not found', headers: {} };
    }

    calEvents.delete(eventUid);
    return { status: 204, body: '', headers: {} };
  }

  private handleGet(path: string): CalDAVResponse {
    const calId = this.extractCalendarId(path);
    const eventUid = this.extractEventUid(path);

    if (!calId || !eventUid) {
      return { status: 400, body: 'Calendar and event ID required', headers: {} };
    }

    const calEvents = this.events.get(calId);
    if (!calEvents) {
      return { status: 404, body: 'Calendar not found', headers: {} };
    }

    const event = calEvents.get(eventUid);
    if (!event) {
      return { status: 404, body: 'Event not found', headers: {} };
    }

    return {
      status: 200,
      body: this.serializer.serialize(event),
      headers: { 'content-type': 'text/calendar; charset=utf-8' },
    };
  }

  private extractCalendarId(path: string): string | null {
    const match = /\/calendars\/[^/]+\/([^/]+)/.exec(path);
    return match?.[1] ?? null;
  }

  private extractEventUid(path: string): string | null {
    const match = /\/calendars\/[^/]+\/[^/]+\/([^/]+)\.ics/.exec(path);
    return match?.[1] ?? null;
  }

  getCalendars(): CalendarCollection[] {
    return [...this.calendars.values()];
  }

  getEvents(calendarId: string): CalendarEvent[] {
    const calEvents = this.events.get(calendarId);
    return calEvents ? [...calEvents.values()] : [];
  }
}
