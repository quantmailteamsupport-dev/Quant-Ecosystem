import { describe, it, expect, vi } from 'vitest';
import { z } from 'zod';
import { ToolRegistryImpl } from '../registry.js';
import type { QuantTool, ToolContext } from '../types.js';

function createMockTool(overrides: Partial<QuantTool> = {}): QuantTool {
  return {
    id: 'test.tool',
    app: 'TestApp',
    name: 'test_tool',
    description: 'A test tool for unit testing',
    inputSchema: z.object({ value: z.string() }),
    outputSchema: z.object({ result: z.string() }),
    permissionTier: 1,
    execute: vi.fn().mockResolvedValue({
      success: true,
      data: { result: 'ok' },
      auditId: 'audit_001',
    }),
    ...overrides,
  };
}

function createMockContext(overrides: Partial<ToolContext> = {}): ToolContext {
  return {
    userId: 'user_001',
    sessionId: 'sess_001',
    requestedBy: 'user',
    ...overrides,
  };
}

describe('ToolRegistryImpl', () => {
  it('should register a tool', () => {
    const registry = new ToolRegistryImpl();
    const tool = createMockTool();
    registry.register(tool);
    expect(registry.get('test.tool')).toBe(tool);
  });

  it('should throw when registering duplicate tool', () => {
    const registry = new ToolRegistryImpl();
    const tool = createMockTool();
    registry.register(tool);
    expect(() => registry.register(tool)).toThrow('Tool already registered: test.tool');
  });

  it('should get tool by id', () => {
    const registry = new ToolRegistryImpl();
    const tool = createMockTool();
    registry.register(tool);
    expect(registry.get('test.tool')).toBe(tool);
    expect(registry.get('nonexistent')).toBeUndefined();
  });

  it('should list tools by app', () => {
    const registry = new ToolRegistryImpl();
    registry.register(createMockTool({ id: 'app1.t1', app: 'App1' }));
    registry.register(createMockTool({ id: 'app1.t2', app: 'App1' }));
    registry.register(createMockTool({ id: 'app2.t1', app: 'App2' }));
    expect(registry.listByApp('App1')).toHaveLength(2);
    expect(registry.listByApp('App2')).toHaveLength(1);
    expect(registry.listByApp('App3')).toHaveLength(0);
  });

  it('should list all tools', () => {
    const registry = new ToolRegistryImpl();
    registry.register(createMockTool({ id: 'tool1' }));
    registry.register(createMockTool({ id: 'tool2' }));
    registry.register(createMockTool({ id: 'tool3' }));
    expect(registry.listAll()).toHaveLength(3);
  });

  it('should search tools by query', () => {
    const registry = new ToolRegistryImpl();
    registry.register(
      createMockTool({ id: 'email.send', name: 'send_email', description: 'Send email' }),
    );
    registry.register(
      createMockTool({ id: 'chat.send', name: 'send_message', description: 'Send chat message' }),
    );
    const results = registry.search('email');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]!.tool.id).toBe('email.send');
  });

  it('should execute tool with valid input', async () => {
    const registry = new ToolRegistryImpl();
    const tool = createMockTool({ permissionTier: 1 });
    registry.register(tool);
    const context = createMockContext();
    const result = await registry.execute('test.tool', { value: 'hello' }, context);
    expect(result.success).toBe(true);
    expect(result.auditId).toBeDefined();
  });

  it('should fail execution with invalid input', async () => {
    const registry = new ToolRegistryImpl();
    const tool = createMockTool({ permissionTier: 1 });
    registry.register(tool);
    const context = createMockContext();
    const result = await registry.execute('test.tool', { value: 123 }, context);
    expect(result.success).toBe(false);
    expect(result.error).toContain('Input validation failed');
  });

  it('should deny execution without permission for tier 2', async () => {
    const registry = new ToolRegistryImpl();
    const tool = createMockTool({ permissionTier: 2 });
    registry.register(tool);
    const context = createMockContext(); // no confirmationCallback
    const result = await registry.execute('test.tool', { value: 'hello' }, context);
    expect(result.success).toBe(false);
    expect(result.error).toContain('Permission denied');
  });

  it('should return error for nonexistent tool', async () => {
    const registry = new ToolRegistryImpl();
    const context = createMockContext();
    const result = await registry.execute('nonexistent', {}, context);
    expect(result.success).toBe(false);
    expect(result.error).toContain('Tool not found');
  });
});
