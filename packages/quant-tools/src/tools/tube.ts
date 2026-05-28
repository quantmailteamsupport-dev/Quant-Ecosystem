import { z } from 'zod';
import type { QuantTool } from '../types.js';

export const tubeTools: QuantTool[] = [
  {
    id: 'quant_tube.upload_video',
    app: 'QuantTube',
    name: 'upload_video',
    description: 'Upload a video to QuantTube',
    inputSchema: z.object({
      title: z.string(),
      description: z.string().optional(),
      videoUrl: z.string(),
    }),
    outputSchema: z.object({
      videoId: z.string(),
      url: z.string(),
    }),
    permissionTier: 2,
    execute: async () => ({
      success: true,
      data: { videoId: 'vid_001', url: 'https://tube.quant.app/vid_001' },
      auditId: crypto.randomUUID(),
    }),
  },
  {
    id: 'quant_tube.create_playlist',
    app: 'QuantTube',
    name: 'create_playlist',
    description: 'Create a new video playlist',
    inputSchema: z.object({
      name: z.string(),
      visibility: z.enum(['public', 'private', 'unlisted']).optional(),
    }),
    outputSchema: z.object({
      playlistId: z.string(),
      name: z.string(),
    }),
    permissionTier: 2,
    execute: async () => ({
      success: true,
      data: { playlistId: 'pl_001', name: 'My Playlist' },
      auditId: crypto.randomUUID(),
    }),
  },
  {
    id: 'quant_tube.like_video',
    app: 'QuantTube',
    name: 'like_video',
    description: 'Like a video on QuantTube',
    inputSchema: z.object({
      videoId: z.string(),
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
    id: 'quant_tube.comment',
    app: 'QuantTube',
    name: 'comment',
    description: 'Comment on a video',
    inputSchema: z.object({
      videoId: z.string(),
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
    id: 'quant_tube.go_live',
    app: 'QuantTube',
    name: 'go_live',
    description: 'Start a live stream on QuantTube',
    inputSchema: z.object({
      title: z.string(),
      category: z.string().optional(),
    }),
    outputSchema: z.object({
      streamId: z.string(),
      streamKey: z.string(),
    }),
    permissionTier: 3,
    execute: async () => ({
      success: true,
      data: { streamId: 'stream_001', streamKey: 'sk_live_001' },
      auditId: crypto.randomUUID(),
    }),
  },
];
