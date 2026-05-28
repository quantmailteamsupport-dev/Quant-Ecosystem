import { z } from 'zod';
import type { QuantTool } from '../types.js';

export const syncTools: QuantTool[] = [
  {
    id: 'quant_sync.create_post',
    app: 'QuantSync',
    name: 'create_post',
    description: 'Create a post in a community',
    inputSchema: z.object({
      title: z.string(),
      content: z.string(),
      communityId: z.string(),
    }),
    outputSchema: z.object({
      postId: z.string(),
      url: z.string(),
    }),
    permissionTier: 2,
    execute: async () => ({
      success: true,
      data: { postId: 'spost_001', url: 'https://sync.quant.app/post/spost_001' },
      auditId: crypto.randomUUID(),
    }),
  },
  {
    id: 'quant_sync.join_community',
    app: 'QuantSync',
    name: 'join_community',
    description: 'Join a community on QuantSync',
    inputSchema: z.object({
      communityId: z.string(),
    }),
    outputSchema: z.object({
      joined: z.boolean(),
    }),
    permissionTier: 2,
    execute: async () => ({
      success: true,
      data: { joined: true },
      auditId: crypto.randomUUID(),
    }),
  },
  {
    id: 'quant_sync.upvote',
    app: 'QuantSync',
    name: 'upvote',
    description: 'Upvote a post or comment',
    inputSchema: z.object({
      targetId: z.string(),
      targetType: z.enum(['post', 'comment']),
    }),
    outputSchema: z.object({
      upvoted: z.boolean(),
    }),
    permissionTier: 1,
    execute: async () => ({
      success: true,
      data: { upvoted: true },
      auditId: crypto.randomUUID(),
    }),
  },
  {
    id: 'quant_sync.create_space',
    app: 'QuantSync',
    name: 'create_space',
    description: 'Create a new community space',
    inputSchema: z.object({
      name: z.string(),
      description: z.string(),
      visibility: z.enum(['public', 'private']).optional(),
    }),
    outputSchema: z.object({
      spaceId: z.string(),
      name: z.string(),
    }),
    permissionTier: 2,
    execute: async () => ({
      success: true,
      data: { spaceId: 'space_001', name: 'New Space' },
      auditId: crypto.randomUUID(),
    }),
  },
];
