import { describe, it, expect, vi } from 'vitest';
import { z } from 'zod';
import {
  PermissionEngine,
  isSafeAction,
  requiresConfirmation,
  requiresDoubleConfirmation,
} from '../permissions.js';
import type { QuantTool, ToolContext } from '../types.js';

function createMockTool(tier: 1 | 2 | 3): QuantTool {
  return {
    id: `test.tier${tier}`,
    app: 'TestApp',
    name: `tier${tier}_tool`,
    description: `A tier ${tier} tool`,
    inputSchema: z.object({}),
    outputSchema: z.object({}),
    permissionTier: tier,
    execute: vi.fn().mockResolvedValue({ success: true, auditId: 'a1' }),
  };
}

function createMockContext(callback?: (msg: string) => Promise<boolean>): ToolContext {
  return {
    userId: 'user_001',
    sessionId: 'sess_001',
    requestedBy: 'user',
    confirmationCallback: callback,
  };
}

describe('PermissionEngine', () => {
  const engine = new PermissionEngine();

  it('should auto-approve tier 1 actions', async () => {
    const tool = createMockTool(1);
    const context = createMockContext();
    const result = await engine.evaluateTier(tool, context);
    expect(result).toBe(true);
  });

  it('should call confirmation callback once for tier 2', async () => {
    const callback = vi.fn().mockResolvedValue(true);
    const tool = createMockTool(2);
    const context = createMockContext(callback);
    const result = await engine.evaluateTier(tool, context);
    expect(result).toBe(true);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('should call confirmation callback twice for tier 3 (double confirm)', async () => {
    const callback = vi.fn().mockResolvedValue(true);
    const tool = createMockTool(3);
    const context = createMockContext(callback);
    const result = await engine.evaluateTier(tool, context);
    expect(result).toBe(true);
    expect(callback).toHaveBeenCalledTimes(2);
  });

  it('should deny tier 2 when callback returns false', async () => {
    const callback = vi.fn().mockResolvedValue(false);
    const tool = createMockTool(2);
    const context = createMockContext(callback);
    const result = await engine.evaluateTier(tool, context);
    expect(result).toBe(false);
  });

  it('should deny tier 3 when second confirmation returns false', async () => {
    const callback = vi.fn().mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    const tool = createMockTool(3);
    const context = createMockContext(callback);
    const result = await engine.evaluateTier(tool, context);
    expect(result).toBe(false);
  });

  it('should deny gracefully when no callback provided for tier 2+', async () => {
    const tool = createMockTool(2);
    const context = createMockContext(); // no callback
    const result = await engine.evaluateTier(tool, context);
    expect(result).toBe(false);
  });

  it('should correctly identify safe actions with helper functions', () => {
    expect(isSafeAction(1)).toBe(true);
    expect(isSafeAction(2)).toBe(false);
    expect(isSafeAction(3)).toBe(false);
    expect(requiresConfirmation(1)).toBe(false);
    expect(requiresConfirmation(2)).toBe(true);
    expect(requiresConfirmation(3)).toBe(true);
    expect(requiresDoubleConfirmation(1)).toBe(false);
    expect(requiresDoubleConfirmation(2)).toBe(false);
    expect(requiresDoubleConfirmation(3)).toBe(true);
  });
});
