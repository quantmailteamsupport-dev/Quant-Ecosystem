import { z } from 'zod';
import type { QuantTool } from '../types.js';

export const neonTools: QuantTool[] = [
  {
    id: 'quant_neon.create_post',
    app: 'QuantNeon',
    name: 'create_post',
    description: 'Create a new social media post',
    inputSchema: z.object({
      content: z.string(),
      mediaUrls: z.array(z.string()).optional(),
    }),
    outputSchema: z.object({
      postId: z.string(),
      url: z.string(),
    }),
    permissionTier: 2,
    execute: async () => ({
      success: true,
      data: { postId: 'post_001', url: 'https://neon.quant.app/post_001' },
      auditId: crypto.randomUUID(),
    }),
  },
  {
    id: 'quant_neon.upload_reel',
    app: 'QuantNeon',
    name: 'upload_reel',
    description: 'Upload a short-form video reel',
    inputSchema: z.object({
      videoUrl: z.string(),
      caption: z.string().optional(),
    }),
    outputSchema: z.object({
      reelId: z.string(),
      url: z.string(),
    }),
    permissionTier: 2,
    execute: async () => ({
      success: true,
      data: { reelId: 'reel_001', url: 'https://neon.quant.app/reel_001' },
      auditId: crypto.randomUUID(),
    }),
  },
  {
    id: 'quant_neon.like_post',
    app: 'QuantNeon',
    name: 'like_post',
    description: 'Like a social media post',
    inputSchema: z.object({
      postId: z.string(),
    }),
    outputSchema: z.object({
      liked: z.boolean(),
    }),
    permissionTier: 1,
    execute: async () => ({
      success: true,
      data: { liked: true },
      auditId: crypto.randomUUID(),
    }),
  },
  {
    id: 'quant_neon.comment_on_post',
    app: 'QuantNeon',
    name: 'comment_on_post',
    description: 'Add a comment to a post',
    inputSchema: z.object({
      postId: z.string(),
      content: z.string(),
    }),
    outputSchema: z.object({
      commentId: z.string(),
    }),
    permissionTier: 2,
    execute: async () => ({
      success: true,
      data: { commentId: 'cmt_001' },
      auditId: crypto.randomUUID(),
    }),
  },
  {
    id: 'quant_neon.follow_user',
    app: 'QuantNeon',
    name: 'follow_user',
    description: 'Follow another user on QuantNeon',
    inputSchema: z.object({
      userId: z.string(),
    }),
    outputSchema: z.object({
      following: z.boolean(),
    }),
    permissionTier: 2,
    execute: async () => ({
      success: true,
      data: { following: true },
      auditId: crypto.randomUUID(),
    }),
  },
];
