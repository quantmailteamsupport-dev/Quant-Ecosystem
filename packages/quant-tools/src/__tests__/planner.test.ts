import { describe, it, expect, vi } from 'vitest';
import { z } from 'zod';
import { ToolPlanner } from '../planner.js';
import { ToolRegistryImpl } from '../registry.js';
import type { QuantTool, ToolContext } from '../types.js';

function createMockTool(overrides: Partial<QuantTool> = {}): QuantTool {
  return {
    id: 'test.tool',
    app: 'TestApp',
    name: 'test_tool',
    description: 'A generic tool',
    inputSchema: z.object({}),
    outputSchema: z.object({}),
    permissionTier: 1,
    execute: vi.fn().mockResolvedValue({
      success: true,
      data: { result: 'ok' },
      auditId: 'audit_001',
    }),
    ...overrides,
  };
}

function createMockContext(): ToolContext {
  return {
    userId: 'user_001',
    sessionId: 'sess_001',
    requestedBy: 'user',
  };
}

describe('ToolPlanner', () => {
  const planner = new ToolPlanner();

  it('should plan a single-tool intent', () => {
    const tools = [
      createMockTool({
        id: 'mail.send',
        name: 'send_email',
        description: 'Send an email to recipients',
      }),
      createMockTool({ id: 'chat.send', name: 'send_message', description: 'Send a chat message' }),
    ];
    const plan = planner.plan('send email to boss', tools);
    expect(plan.length).toBeGreaterThan(0);
    expect(plan.some((p) => p.toolId === 'mail.send')).toBe(true);
  });

  it('should plan multi-tool intent', () => {
    const tools = [
      createMockTool({
        id: 'drive.search',
        name: 'search_files',
        description: 'Search files in drive',
      }),
      createMockTool({
        id: 'mail.send',
        name: 'send_email',
        description: 'Send an email to recipients',
      }),
    ];
    const plan = planner.plan('search files then send email', tools);
    expect(plan.length).toBe(2);
  });

  it('should return empty for unknown intent', () => {
    const tools = [
      createMockTool({ id: 'mail.send', name: 'send_email', description: 'Send an email' }),
    ];
    const plan = planner.plan('xyz qqq zzz', tools);
    expect(plan).toHaveLength(0);
  });

  it('should execute plan in sequence', async () => {
    const executeFn1 = vi.fn().mockResolvedValue({ success: true, data: { r: 1 }, auditId: 'a1' });
    const executeFn2 = vi.fn().mockResolvedValue({ success: true, data: { r: 2 }, auditId: 'a2' });
    const tool1 = createMockTool({ id: 't1', execute: executeFn1 });
    const tool2 = createMockTool({ id: 't2', execute: executeFn2 });
    const steps = [
      { toolId: 't1', tool: tool1, estimatedInput: {}, reason: 'step 1' },
      { toolId: 't2', tool: tool2, estimatedInput: {}, reason: 'step 2' },
    ];
    const context = createMockContext();
    const results = await planner.executePlan(steps, context);
    expect(results).toHaveLength(2);
    expect(executeFn1).toHaveBeenCalled();
    expect(executeFn2).toHaveBeenCalled();
  });

  it('should stop execution on failure', async () => {
    const executeFn1 = vi.fn().mockResolvedValue({ success: false, error: 'fail', auditId: 'a1' });
    const executeFn2 = vi.fn().mockResolvedValue({ success: true, data: {}, auditId: 'a2' });
    const tool1 = createMockTool({ id: 't1', execute: executeFn1 });
    const tool2 = createMockTool({ id: 't2', execute: executeFn2 });
    const steps = [
      { toolId: 't1', tool: tool1, estimatedInput: {}, reason: 'step 1' },
      { toolId: 't2', tool: tool2, estimatedInput: {}, reason: 'step 2' },
    ];
    const context = createMockContext();
    const results = await planner.executePlan(steps, context);
    expect(results).toHaveLength(1);
    expect(executeFn2).not.toHaveBeenCalled();
  });

  it('should match based on description keywords', () => {
    const tools = [
      createMockTool({
        id: 'calendar.create',
        name: 'create_event',
        description: 'Create a calendar event for scheduling',
      }),
      createMockTool({
        id: 'mail.send',
        name: 'send_email',
        description: 'Send an email to recipients',
      }),
    ];
    const plan = planner.plan('schedule a calendar meeting', tools);
    expect(plan.some((p) => p.toolId === 'calendar.create')).toBe(true);
  });

  it('should route through registry when provided', async () => {
    const registry = new ToolRegistryImpl();
    const tool = createMockTool({
      id: 'mail.send',
      name: 'send_email',
      description: 'Send email',
      inputSchema: z.object({}),
      permissionTier: 1,
    });
    registry.register(tool);
    const steps = [{ toolId: 'mail.send', tool, estimatedInput: {}, reason: 'test' }];
    const context = createMockContext();
    const results = await planner.executePlan(steps, context, registry);
    expect(results).toHaveLength(1);
    expect(results[0]!.success).toBe(true);
    expect(results[0]!.auditId).toBeDefined();
    // Verify audit trail was populated through registry
    const audit = registry.getAuditTrail().getAll();
    expect(audit).toHaveLength(1);
  });

  it('should not match short words via substring', () => {
    const tools = [
      createMockTool({
        id: 'news.read',
        name: 'read_news',
        description: 'Read the latest news articles',
      }),
    ];
    // "new" is only 3 chars, should not match "news" via substring
    const plan = planner.plan('new document creation', tools);
    expect(plan.some((p) => p.toolId === 'news.read')).toBe(false);
  });

  it('should require minimum matches for long intents', () => {
    const tools = [
      createMockTool({
        id: 'drive.upload',
        name: 'upload_file',
        description: 'Upload a file to cloud storage drive',
      }),
    ];
    // Intent with >3 words requires at least 2 keyword matches
    // "please help organize documents nicely" - only "documents" is not in this tool
    const plan = planner.plan('please help organize documents nicely', tools);
    expect(plan.some((p) => p.toolId === 'drive.upload')).toBe(false);
  });
});
