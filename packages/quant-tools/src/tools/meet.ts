import { z } from 'zod';
import type { QuantTool } from '../types.js';

export const meetTools: QuantTool[] = [
  {
    id: 'quant_meet.create_meeting',
    app: 'QuantMeet',
    name: 'create_meeting',
    description: 'Create a new video meeting',
    inputSchema: z.object({
      title: z.string(),
      scheduledAt: z.string().optional(),
      participants: z.array(z.string()).optional(),
    }),
    outputSchema: z.object({
      meetingId: z.string(),
      joinUrl: z.string(),
    }),
    permissionTier: 2,
    execute: async () => ({
      success: true,
      data: { meetingId: 'meet_001', joinUrl: 'https://meet.quant.app/meet_001' },
      auditId: crypto.randomUUID(),
    }),
  },
  {
    id: 'quant_meet.join_meeting',
    app: 'QuantMeet',
    name: 'join_meeting',
    description: 'Join an existing meeting',
    inputSchema: z.object({
      meetingId: z.string(),
    }),
    outputSchema: z.object({
      joined: z.boolean(),
      participantCount: z.number(),
    }),
    permissionTier: 2,
    execute: async () => ({
      success: true,
      data: { joined: true, participantCount: 3 },
      auditId: crypto.randomUUID(),
    }),
  },
  {
    id: 'quant_meet.start_recording',
    app: 'QuantMeet',
    name: 'start_recording',
    description: 'Start recording a meeting',
    inputSchema: z.object({
      meetingId: z.string(),
    }),
    outputSchema: z.object({
      recording: z.boolean(),
      recordingId: z.string(),
    }),
    permissionTier: 2,
    execute: async () => ({
      success: true,
      data: { recording: true, recordingId: 'rec_001' },
      auditId: crypto.randomUUID(),
    }),
  },
  {
    id: 'quant_meet.end_meeting',
    app: 'QuantMeet',
    name: 'end_meeting',
    description: 'End an active meeting for all participants',
    inputSchema: z.object({
      meetingId: z.string(),
    }),
    outputSchema: z.object({
      ended: z.boolean(),
    }),
    permissionTier: 3,
    execute: async () => ({
      success: true,
      data: { ended: true },
      auditId: crypto.randomUUID(),
    }),
  },
  {
    id: 'quant_meet.invite_participant',
    app: 'QuantMeet',
    name: 'invite_participant',
    description: 'Invite a participant to an active meeting',
    inputSchema: z.object({
      meetingId: z.string(),
      userId: z.string(),
    }),
    outputSchema: z.object({
      invited: z.boolean(),
    }),
    permissionTier: 2,
    execute: async () => ({
      success: true,
      data: { invited: true },
      auditId: crypto.randomUUID(),
    }),
  },
];
