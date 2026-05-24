// ============================================================================
// QuantMail API - Calendar Routes
// Calendar with scheduling, events, reminders
// ============================================================================

import { CalendarController } from '../controllers/calendar-controller';
import type { RouteDefinition } from './auth';

// Initialize
const calendarController = new CalendarController();

export const calendarRoutes: RouteDefinition[] = [
  // Calendars
  {
    method: 'GET',
    path: '/calendars',
    handler: (req, res) => calendarController.listCalendars(req, res),
    requiresAuth: true,
  },
  {
    method: 'POST',
    path: '/calendars',
    handler: (req, res) => calendarController.createCalendar(req, res),
    requiresAuth: true,
  },
  {
    method: 'DELETE',
    path: '/calendars/:id',
    handler: (req, res) => calendarController.deleteCalendar(req, res),
    requiresAuth: true,
  },
  {
    method: 'POST',
    path: '/calendars/:id/share',
    handler: (req, res) => calendarController.shareCalendar(req, res),
    requiresAuth: true,
  },

  // Events
  {
    method: 'GET',
    path: '/events',
    handler: (req, res) => calendarController.listEvents(req, res),
    requiresAuth: true,
  },
  {
    method: 'GET',
    path: '/events/upcoming',
    handler: (req, res) => calendarController.getUpcoming(req, res),
    requiresAuth: true,
  },
  {
    method: 'GET',
    path: '/events/today',
    handler: (req, res) => calendarController.getToday(req, res),
    requiresAuth: true,
  },
  {
    method: 'GET',
    path: '/events/:id',
    handler: (req, res) => calendarController.getEvent(req, res),
    requiresAuth: true,
  },
  {
    method: 'POST',
    path: '/events',
    handler: (req, res) => calendarController.createEvent(req, res),
    requiresAuth: true,
  },
  {
    method: 'PUT',
    path: '/events/:id',
    handler: (req, res) => calendarController.updateEvent(req, res),
    requiresAuth: true,
  },
  {
    method: 'DELETE',
    path: '/events/:id',
    handler: (req, res) => calendarController.deleteEvent(req, res),
    requiresAuth: true,
  },

  // RSVP
  {
    method: 'POST',
    path: '/events/:id/rsvp',
    handler: (req, res) => calendarController.respondToEvent(req, res),
    requiresAuth: true,
  },

  // Scheduling
  {
    method: 'POST',
    path: '/calendar/available-slots',
    handler: (req, res) => calendarController.findAvailableSlots(req, res),
    requiresAuth: true,
  },
];

export { calendarController };
