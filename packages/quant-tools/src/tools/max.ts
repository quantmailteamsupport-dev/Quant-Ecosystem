import { z } from 'zod';
import type { QuantTool } from '../types.js';

export const maxTools: QuantTool[] = [
  {
    id: 'quant_max.start_video_chat',
    app: 'QuantMax',
    name: 'start_video_chat',
    description: 'Start a random video chat session',
    inputSchema: z.object({
      preferences: z
        .object({
          interests: z.array(z.string()).optional(),
          language: z.string().optional(),
        })
        .optional(),
    }),
    outputSchema: z.object({
      sessionId: z.string(),
      matchedUserId: z.string(),
    }),
    permissionTier: 2,
    execute: async () => ({
      success: true,
      data: { sessionId: 'sess_001', matchedUserId: 'user_match_001' },
      auditId: crypto.randomUUID(),
    }),
  },
  {
    id: 'quant_max.skip_match',
    app: 'QuantMax',
    name: 'skip_match',
    description: 'Skip current match and find a new one',
    inputSchema: z.object({
      sessionId: z.string(),
    }),
    outputSchema: z.object({
      skipped: z.boolean(),
      newMatchId: z.string(),
    }),
    permissionTier: 1,
    execute: async () => ({
      success: true,
      data: { skipped: true, newMatchId: 'user_match_002' },
      auditId: crypto.randomUUID(),
    }),
  },
  {
    id: 'quant_max.send_super_like',
    app: 'QuantMax',
    name: 'send_super_like',
    description: 'Send a super like to a matched user',
    inputSchema: z.object({
      userId: z.string(),
    }),
    outputSchema: z.object({
      sent: z.boolean(),
    }),
    permissionTier: 2,
    execute: async () => ({
      success: true,
      data: { sent: true },
      auditId: crypto.randomUUID(),
    }),
  },
  {
    id: 'quant_max.report_user',
    app: 'QuantMax',
    name: 'report_user',
    description: 'Report a user for inappropriate behavior',
    inputSchema: z.object({
      userId: z.string(),
      reason: z.string(),
      details: z.string().optional(),
    }),
    outputSchema: z.object({
      reportId: z.string(),
      status: z.string(),
    }),
    permissionTier: 2,
    execute: async () => ({
      success: true,
      data: { reportId: 'rpt_001', status: 'submitted' },
      auditId: crypto.randomUUID(),
    }),
  },
];
