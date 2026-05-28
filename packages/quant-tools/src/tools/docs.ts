import { z } from 'zod';
import type { QuantTool } from '../types.js';

export const docsTools: QuantTool[] = [
  {
    id: 'quant_docs.create_document',
    app: 'QuantDocs',
    name: 'create_document',
    description: 'Create a new document',
    inputSchema: z.object({
      title: z.string(),
      content: z.string().optional(),
    }),
    outputSchema: z.object({
      documentId: z.string(),
      title: z.string(),
    }),
    permissionTier: 2,
    execute: async () => ({
      success: true,
      data: { documentId: 'doc_001', title: 'Untitled' },
      auditId: crypto.randomUUID(),
    }),
  },
  {
    id: 'quant_docs.update_document',
    app: 'QuantDocs',
    name: 'update_document',
    description: 'Update document content',
    inputSchema: z.object({
      documentId: z.string(),
      content: z.string(),
    }),
    outputSchema: z.object({
      updated: z.boolean(),
      version: z.number(),
    }),
    permissionTier: 2,
    execute: async () => ({
      success: true,
      data: { updated: true, version: 2 },
      auditId: crypto.randomUUID(),
    }),
  },
  {
    id: 'quant_docs.share_document',
    app: 'QuantDocs',
    name: 'share_document',
    description: 'Share a document with users',
    inputSchema: z.object({
      documentId: z.string(),
      users: z.array(z.string()),
      permission: z.enum(['view', 'edit', 'comment']),
    }),
    outputSchema: z.object({
      shared: z.boolean(),
    }),
    permissionTier: 2,
    execute: async () => ({
      success: true,
      data: { shared: true },
      auditId: crypto.randomUUID(),
    }),
  },
  {
    id: 'quant_docs.add_comment',
    app: 'QuantDocs',
    name: 'add_comment',
    description: 'Add a comment to a document',
    inputSchema: z.object({
      documentId: z.string(),
      content: z.string(),
      position: z.number().optional(),
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
    id: 'quant_docs.export_document',
    app: 'QuantDocs',
    name: 'export_document',
    description: 'Export a document to PDF or other formats',
    inputSchema: z.object({
      documentId: z.string(),
      format: z.enum(['pdf', 'docx', 'html', 'md']),
    }),
    outputSchema: z.object({
      url: z.string(),
      format: z.string(),
    }),
    permissionTier: 1,
    execute: async () => ({
      success: true,
      data: { url: 'https://files.quant.app/export/doc_001.pdf', format: 'pdf' },
      auditId: crypto.randomUUID(),
    }),
  },
];
