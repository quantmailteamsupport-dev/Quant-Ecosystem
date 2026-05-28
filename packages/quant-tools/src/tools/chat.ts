import { z } from 'zod';
import type { QuantTool } from '../types.js';

export const chatTools: QuantTool[] = [
  {
    id: 'quant_chat.send_message',
    app: 'QuantChat',
    name: 'send_message',
    description: 'Send a message in a chat conversation',
    inputSchema: z.object({
      conversationId: z.string(),
      content: z.string(),
    }),
    outputSchema: z.object({
      messageId: z.string(),
      timestamp: z.number(),
    }),
    permissionTier: 2,
    execute: async () => ({
      success: true,
      data: { messageId: 'msg_001', timestamp: Date.now() },
      auditId: crypto.randomUUID(),
    }),
  },
  {
    id: 'quant_chat.create_group',
    app: 'QuantChat',
    name: 'create_group',
    description: 'Create a new group conversation',
    inputSchema: z.object({
      name: z.string(),
      members: z.array(z.string()),
    }),
    outputSchema: z.object({
      groupId: z.string(),
      name: z.string(),
    }),
    permissionTier: 2,
    execute: async () => ({
      success: true,
      data: { groupId: 'grp_001', name: 'New Group' },
      auditId: crypto.randomUUID(),
    }),
  },
  {
    id: 'quant_chat.search_messages',
    app: 'QuantChat',
    name: 'search_messages',
    description: 'Search messages across conversations',
    inputSchema: z.object({
      query: z.string(),
      limit: z.number().optional(),
    }),
    outputSchema: z.object({
      results: z.array(z.object({ id: z.string(), content: z.string() })),
    }),
    permissionTier: 1,
    execute: async () => ({
      success: true,
      data: { results: [{ id: 'msg_1', content: 'Hello' }] },
      auditId: crypto.randomUUID(),
    }),
  },
  {
    id: 'quant_chat.pin_message',
    app: 'QuantChat',
    name: 'pin_message',
    description: 'Pin a message in a conversation',
    inputSchema: z.object({
      messageId: z.string(),
      conversationId: z.string(),
    }),
    outputSchema: z.object({
      pinned: z.boolean(),
    }),
    permissionTier: 2,
    execute: async () => ({
      success: true,
      data: { pinned: true },
      auditId: crypto.randomUUID(),
    }),
  },
  {
    id: 'quant_chat.mute_conversation',
    app: 'QuantChat',
    name: 'mute_conversation',
    description: 'Mute notifications for a conversation',
    inputSchema: z.object({
      conversationId: z.string(),
      duration: z.number().optional(),
    }),
    outputSchema: z.object({
      muted: z.boolean(),
    }),
    permissionTier: 2,
    execute: async () => ({
      success: true,
      data: { muted: true },
      auditId: crypto.randomUUID(),
    }),
  },
];
