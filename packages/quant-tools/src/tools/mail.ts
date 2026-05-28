import { z } from 'zod';
import type { QuantTool } from '../types.js';

export const mailTools: QuantTool[] = [
  {
    id: 'quant_mail.send_email',
    app: 'QuantMail',
    name: 'send_email',
    description: 'Send an email to one or more recipients',
    inputSchema: z.object({
      to: z.array(z.string().email()),
      subject: z.string(),
      body: z.string(),
      cc: z.array(z.string().email()).optional(),
    }),
    outputSchema: z.object({
      messageId: z.string(),
      status: z.literal('sent'),
    }),
    permissionTier: 2,
    execute: async () => ({
      success: true,
      data: { messageId: 'msg_001', status: 'sent' },
      auditId: crypto.randomUUID(),
    }),
  },
  {
    id: 'quant_mail.search_emails',
    app: 'QuantMail',
    name: 'search_emails',
    description: 'Search emails by query string',
    inputSchema: z.object({
      query: z.string(),
      limit: z.number().optional(),
    }),
    outputSchema: z.object({
      results: z.array(z.object({ id: z.string(), subject: z.string() })),
    }),
    permissionTier: 1,
    execute: async () => ({
      success: true,
      data: { results: [{ id: 'email_1', subject: 'Test email' }] },
      auditId: crypto.randomUUID(),
    }),
  },
  {
    id: 'quant_mail.archive_email',
    app: 'QuantMail',
    name: 'archive_email',
    description: 'Archive an email by its ID',
    inputSchema: z.object({
      emailId: z.string(),
    }),
    outputSchema: z.object({
      archived: z.boolean(),
    }),
    permissionTier: 2,
    execute: async () => ({
      success: true,
      data: { archived: true },
      auditId: crypto.randomUUID(),
    }),
  },
  {
    id: 'quant_mail.create_label',
    app: 'QuantMail',
    name: 'create_label',
    description: 'Create a new email label',
    inputSchema: z.object({
      name: z.string(),
      color: z.string().optional(),
    }),
    outputSchema: z.object({
      labelId: z.string(),
      name: z.string(),
    }),
    permissionTier: 2,
    execute: async () => ({
      success: true,
      data: { labelId: 'label_1', name: 'Work' },
      auditId: crypto.randomUUID(),
    }),
  },
  {
    id: 'quant_mail.move_to_folder',
    app: 'QuantMail',
    name: 'move_to_folder',
    description: 'Move an email to a specified folder',
    inputSchema: z.object({
      emailId: z.string(),
      folderId: z.string(),
    }),
    outputSchema: z.object({
      moved: z.boolean(),
    }),
    permissionTier: 2,
    execute: async () => ({
      success: true,
      data: { moved: true },
      auditId: crypto.randomUUID(),
    }),
  },
  {
    id: 'quant_mail.star_email',
    app: 'QuantMail',
    name: 'star_email',
    description: 'Star or unstar an email',
    inputSchema: z.object({
      emailId: z.string(),
      starred: z.boolean(),
    }),
    outputSchema: z.object({
      starred: z.boolean(),
    }),
    permissionTier: 1,
    execute: async () => ({
      success: true,
      data: { starred: true },
      auditId: crypto.randomUUID(),
    }),
  },
];
