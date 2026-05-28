import { z } from 'zod';
import type { QuantTool } from '../types.js';

export const calendarTools: QuantTool[] = [
  {
    id: 'quant_calendar.create_event',
    app: 'QuantCalendar',
    name: 'create_event',
    description: 'Create a new calendar event',
    inputSchema: z.object({
      title: z.string(),
      startTime: z.string(),
      endTime: z.string(),
      attendees: z.array(z.string()).optional(),
    }),
    outputSchema: z.object({
      eventId: z.string(),
      title: z.string(),
    }),
    permissionTier: 2,
    execute: async () => ({
      success: true,
      data: { eventId: 'evt_001', title: 'Meeting' },
      auditId: crypto.randomUUID(),
    }),
  },
  {
    id: 'quant_calendar.update_event',
    app: 'QuantCalendar',
    name: 'update_event',
    description: 'Update an existing calendar event',
    inputSchema: z.object({
      eventId: z.string(),
      title: z.string().optional(),
      startTime: z.string().optional(),
      endTime: z.string().optional(),
    }),
    outputSchema: z.object({
      updated: z.boolean(),
    }),
    permissionTier: 2,
    execute: async () => ({
      success: true,
      data: { updated: true },
      auditId: crypto.randomUUID(),
    }),
  },
  {
    id: 'quant_calendar.delete_event',
    app: 'QuantCalendar',
    name: 'delete_event',
    description: 'Delete a calendar event permanently',
    inputSchema: z.object({
      eventId: z.string(),
    }),
    outputSchema: z.object({
      deleted: z.boolean(),
    }),
    permissionTier: 3,
    execute: async () => ({
      success: true,
      data: { deleted: true },
      auditId: crypto.randomUUID(),
    }),
  },
  {
    id: 'quant_calendar.find_free_time',
    app: 'QuantCalendar',
    name: 'find_free_time',
    description: 'Find available time slots for scheduling',
    inputSchema: z.object({
      date: z.string(),
      durationMinutes: z.number(),
    }),
    outputSchema: z.object({
      slots: z.array(z.object({ start: z.string(), end: z.string() })),
    }),
    permissionTier: 1,
    execute: async () => ({
      success: true,
      data: { slots: [{ start: '09:00', end: '10:00' }] },
      auditId: crypto.randomUUID(),
    }),
  },
  {
    id: 'quant_calendar.send_invite',
    app: 'QuantCalendar',
    name: 'send_invite',
    description: 'Send calendar invite to attendees',
    inputSchema: z.object({
      eventId: z.string(),
      attendees: z.array(z.string().email()),
    }),
    outputSchema: z.object({
      sent: z.boolean(),
      count: z.number(),
    }),
    permissionTier: 2,
    execute: async () => ({
      success: true,
      data: { sent: true, count: 1 },
      auditId: crypto.randomUUID(),
    }),
  },
];
