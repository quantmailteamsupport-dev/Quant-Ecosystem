import { describe, it, expect, vi } from 'vitest';
import { z } from 'zod';
import { ToolPlanner } from '../planner.js';
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
    const plan = planner.plan('find tax document and email it', tools);
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
});
