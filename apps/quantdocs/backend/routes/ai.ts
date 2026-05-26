import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { createAppError } from '@quant/server-core';
import type { AIEngine } from '@quant/ai';

const writeFromOutlineSchema = z.object({
  outline: z.array(z.string().min(1)).min(1),
  tone: z.enum(['formal', 'casual', 'academic', 'technical']).optional(),
  length: z.enum(['short', 'medium', 'long']).optional(),
});

const expandSectionSchema = z.object({
  section: z.string().min(1),
  context: z.string().optional(),
  targetLength: z.enum(['short', 'medium', 'long']).optional(),
});

const simplifySchema = z.object({
  text: z.string().min(1),
  targetAudience: z.enum(['general', 'technical', 'children', 'executive']).optional(),
});

const translateSchema = z.object({
  text: z.string().min(1),
  targetLanguage: z.string().min(1),
  sourceLanguage: z.string().optional(),
});

const grammarCheckSchema = z.object({
  text: z.string().min(1),
});

const tableFromTextSchema = z.object({
  text: z.string().min(1),
  format: z.enum(['markdown', 'html']).optional(),
});

const diagramFromTextSchema = z.object({
  text: z.string().min(1),
  diagramType: z.enum(['flowchart', 'sequence', 'class', 'entity-relationship']).optional(),
});

export default async function aiRoutes(fastify: FastifyInstance) {
  // POST /ai/write-from-outline
  fastify.post('/write-from-outline', async (request, reply) => {
    const parseResult = writeFromOutlineSchema.safeParse(request.body);
    if (!parseResult.success) {
      throw parseResult.error;
    }

    const userId = (request as unknown as { auth: { userId: string } }).auth?.userId;
    if (!userId) {
      throw createAppError('Authentication required', 401, 'UNAUTHORIZED');
    }

    const ai = (fastify as unknown as { ai: AIEngine }).ai;
    const { outline, tone, length } = parseResult.data;

    const response = await ai.infer({
      prompt: `Write a document based on this outline:\n${outline.map((item) => `- ${item}`).join('\n')}\n\nTone: ${tone ?? 'formal'}\nTarget length: ${length ?? 'medium'}\n\nRespond with valid JSON: { "title": "string", "content": "HTML content string" }`,
      systemPrompt:
        'You are a professional document writer. Generate well-structured documents from outlines. Always respond with valid JSON only.',
      userId,
      app: 'quantdocs',
      feature: 'write-from-outline',
      temperature: 0.7,
      maxTokens: 2048,
    });

    let parsed: unknown;
    try {
      parsed = JSON.parse(response.content);
    } catch {
      throw createAppError('Failed to parse AI response', 500, 'AI_PARSE_ERROR');
    }

    return reply.send({ success: true, data: parsed });
  });

  // POST /ai/expand-section
  fastify.post('/expand-section', async (request, reply) => {
    const parseResult = expandSectionSchema.safeParse(request.body);
    if (!parseResult.success) {
      throw parseResult.error;
    }

    const userId = (request as unknown as { auth: { userId: string } }).auth?.userId;
    if (!userId) {
      throw createAppError('Authentication required', 401, 'UNAUTHORIZED');
    }

    const ai = (fastify as unknown as { ai: AIEngine }).ai;
    const { section, context, targetLength } = parseResult.data;

    const response = await ai.infer({
      prompt: `Expand this section into more detailed content:\n\nSection: ${section}\n${context ? `Context: ${context}\n` : ''}Target length: ${targetLength ?? 'medium'}\n\nRespond with valid JSON: { "expanded": "expanded HTML content string" }`,
      systemPrompt:
        'You are a professional document writer. Expand sections with relevant detail while maintaining the original intent. Always respond with valid JSON only.',
      userId,
      app: 'quantdocs',
      feature: 'expand-section',
      temperature: 0.7,
      maxTokens: 2048,
    });

    let parsed: unknown;
    try {
      parsed = JSON.parse(response.content);
    } catch {
      throw createAppError('Failed to parse AI response', 500, 'AI_PARSE_ERROR');
    }

    return reply.send({ success: true, data: parsed });
  });

  // POST /ai/simplify
  fastify.post('/simplify', async (request, reply) => {
    const parseResult = simplifySchema.safeParse(request.body);
    if (!parseResult.success) {
      throw parseResult.error;
    }

    const userId = (request as unknown as { auth: { userId: string } }).auth?.userId;
    if (!userId) {
      throw createAppError('Authentication required', 401, 'UNAUTHORIZED');
    }

    const ai = (fastify as unknown as { ai: AIEngine }).ai;
    const { text, targetAudience } = parseResult.data;

    const response = await ai.infer({
      prompt: `Simplify the following text for a ${targetAudience ?? 'general'} audience:\n\n${text}\n\nRespond with valid JSON: { "simplified": "simplified text string" }`,
      systemPrompt:
        'You are a text simplification expert. Make complex content accessible while preserving key information. Always respond with valid JSON only.',
      userId,
      app: 'quantdocs',
      feature: 'simplify',
      temperature: 0.5,
      maxTokens: 1024,
    });

    let parsed: unknown;
    try {
      parsed = JSON.parse(response.content);
    } catch {
      throw createAppError('Failed to parse AI response', 500, 'AI_PARSE_ERROR');
    }

    return reply.send({ success: true, data: parsed });
  });

  // POST /ai/translate
  fastify.post('/translate', async (request, reply) => {
    const parseResult = translateSchema.safeParse(request.body);
    if (!parseResult.success) {
      throw parseResult.error;
    }

    const userId = (request as unknown as { auth: { userId: string } }).auth?.userId;
    if (!userId) {
      throw createAppError('Authentication required', 401, 'UNAUTHORIZED');
    }

    const ai = (fastify as unknown as { ai: AIEngine }).ai;
    const { text, targetLanguage, sourceLanguage } = parseResult.data;

    const response = await ai.infer({
      prompt: `Translate the following text${sourceLanguage ? ` from ${sourceLanguage}` : ''} to ${targetLanguage}:\n\n${text}\n\nRespond with valid JSON: { "translated": "translated text string", "detectedLanguage": "source language if detected" }`,
      systemPrompt:
        'You are a professional translator. Provide accurate translations while preserving tone and meaning. Always respond with valid JSON only.',
      userId,
      app: 'quantdocs',
      feature: 'translate',
      temperature: 0.3,
      maxTokens: 2048,
    });

    let parsed: unknown;
    try {
      parsed = JSON.parse(response.content);
    } catch {
      throw createAppError('Failed to parse AI response', 500, 'AI_PARSE_ERROR');
    }

    return reply.send({ success: true, data: parsed });
  });

  // POST /ai/grammar-check
  fastify.post('/grammar-check', async (request, reply) => {
    const parseResult = grammarCheckSchema.safeParse(request.body);
    if (!parseResult.success) {
      throw parseResult.error;
    }

    const userId = (request as unknown as { auth: { userId: string } }).auth?.userId;
    if (!userId) {
      throw createAppError('Authentication required', 401, 'UNAUTHORIZED');
    }

    const ai = (fastify as unknown as { ai: AIEngine }).ai;
    const { text } = parseResult.data;

    const response = await ai.infer({
      prompt: `Check the following text for grammar, spelling, and punctuation errors. List all corrections:\n\n${text}\n\nRespond with valid JSON: { "corrected": "corrected text", "issues": [{ "original": "string", "correction": "string", "explanation": "string" }] }`,
      systemPrompt:
        'You are a professional editor and proofreader. Identify and correct grammar, spelling, and punctuation issues. Always respond with valid JSON only.',
      userId,
      app: 'quantdocs',
      feature: 'grammar-check',
      temperature: 0.2,
      maxTokens: 2048,
    });

    let parsed: unknown;
    try {
      parsed = JSON.parse(response.content);
    } catch {
      throw createAppError('Failed to parse AI response', 500, 'AI_PARSE_ERROR');
    }

    return reply.send({ success: true, data: parsed });
  });

  // POST /ai/table-from-text
  fastify.post('/table-from-text', async (request, reply) => {
    const parseResult = tableFromTextSchema.safeParse(request.body);
    if (!parseResult.success) {
      throw parseResult.error;
    }

    const userId = (request as unknown as { auth: { userId: string } }).auth?.userId;
    if (!userId) {
      throw createAppError('Authentication required', 401, 'UNAUTHORIZED');
    }

    const ai = (fastify as unknown as { ai: AIEngine }).ai;
    const { text, format } = parseResult.data;

    const response = await ai.infer({
      prompt: `Extract structured data from the following text and format it as a ${format ?? 'html'} table:\n\n${text}\n\nRespond with valid JSON: { "table": "table in requested format", "headers": ["column names"], "rows": [["cell values"]] }`,
      systemPrompt:
        'You are a data extraction expert. Convert unstructured text into well-organized tables. Always respond with valid JSON only.',
      userId,
      app: 'quantdocs',
      feature: 'table-from-text',
      temperature: 0.3,
      maxTokens: 2048,
    });

    let parsed: unknown;
    try {
      parsed = JSON.parse(response.content);
    } catch {
      throw createAppError('Failed to parse AI response', 500, 'AI_PARSE_ERROR');
    }

    return reply.send({ success: true, data: parsed });
  });

  // POST /ai/diagram-from-text
  fastify.post('/diagram-from-text', async (request, reply) => {
    const parseResult = diagramFromTextSchema.safeParse(request.body);
    if (!parseResult.success) {
      throw parseResult.error;
    }

    const userId = (request as unknown as { auth: { userId: string } }).auth?.userId;
    if (!userId) {
      throw createAppError('Authentication required', 401, 'UNAUTHORIZED');
    }

    const ai = (fastify as unknown as { ai: AIEngine }).ai;
    const { text, diagramType } = parseResult.data;

    const response = await ai.infer({
      prompt: `Generate a ${diagramType ?? 'flowchart'} diagram in Mermaid syntax from the following text:\n\n${text}\n\nRespond with valid JSON: { "mermaid": "mermaid diagram code", "description": "brief description of the diagram" }`,
      systemPrompt:
        'You are a diagram generation expert. Convert text descriptions into clear Mermaid diagram syntax. Always respond with valid JSON only.',
      userId,
      app: 'quantdocs',
      feature: 'diagram-from-text',
      temperature: 0.4,
      maxTokens: 2048,
    });

    let parsed: unknown;
    try {
      parsed = JSON.parse(response.content);
    } catch {
      throw createAppError('Failed to parse AI response', 500, 'AI_PARSE_ERROR');
    }

    return reply.send({ success: true, data: parsed });
  });
}
