import { describe, it, expect } from 'vitest';
import { ToolAuditTrail } from '../audit.js';
import type { AuditEntry } from '../types.js';

function createMockAuditEntry(overrides: Partial<AuditEntry> = {}): AuditEntry {
  return {
    id: 'audit_001',
    toolId: 'test.tool',
    userId: 'user_001',
    input: { value: 'test' },
    output: { result: 'ok' },
    timestamp: Date.now(),
    undoStatus: 'none',
    ...overrides,
  };
}

describe('ToolAuditTrail', () => {
  it('should log an entry', () => {
    const trail = new ToolAuditTrail();
    const entry = createMockAuditEntry();
    trail.log(entry);
    const all = trail.getAll();
    expect(all).toHaveLength(1);
    expect(all[0]!.id).toBe('audit_001');
  });

  it('should get entries by tool', () => {
    const trail = new ToolAuditTrail();
    trail.log(createMockAuditEntry({ id: 'a1', toolId: 'tool_a' }));
    trail.log(createMockAuditEntry({ id: 'a2', toolId: 'tool_b' }));
    trail.log(createMockAuditEntry({ id: 'a3', toolId: 'tool_a' }));
    expect(trail.getByTool('tool_a')).toHaveLength(2);
    expect(trail.getByTool('tool_b')).toHaveLength(1);
  });

  it('should get entries by user', () => {
    const trail = new ToolAuditTrail();
    trail.log(createMockAuditEntry({ id: 'a1', userId: 'alice' }));
    trail.log(createMockAuditEntry({ id: 'a2', userId: 'bob' }));
    trail.log(createMockAuditEntry({ id: 'a3', userId: 'alice' }));
    expect(trail.getByUser('alice')).toHaveLength(2);
    expect(trail.getByUser('bob')).toHaveLength(1);
  });

  it('should get recent entries with limit', () => {
    const trail = new ToolAuditTrail();
    trail.log(createMockAuditEntry({ id: 'a1', timestamp: 1000 }));
    trail.log(createMockAuditEntry({ id: 'a2', timestamp: 3000 }));
    trail.log(createMockAuditEntry({ id: 'a3', timestamp: 2000 }));
    const recent = trail.getRecent(2);
    expect(recent).toHaveLength(2);
    expect(recent[0]!.id).toBe('a2');
    expect(recent[1]!.id).toBe('a3');
  });

  it('should validate entries with Zod schema', () => {
    const trail = new ToolAuditTrail();
    expect(() => {
      trail.log({
        id: 'a1',
        toolId: 'tool',
        userId: 'user',
        input: null,
        output: null,
        timestamp: 12345,
        undoStatus: 'none',
      });
    }).not.toThrow();
  });

  it('should reject invalid undoStatus', () => {
    const trail = new ToolAuditTrail();
    expect(() => {
      trail.log({
        id: 'a1',
        toolId: 'tool',
        userId: 'user',
        input: null,
        output: null,
        timestamp: 12345,
        undoStatus: 'invalid' as 'none',
      });
    }).toThrow();
  });

  it('should evict oldest entries when maxEntries is exceeded', () => {
    const trail = new ToolAuditTrail(3);
    trail.log(createMockAuditEntry({ id: 'a1', timestamp: 1000 }));
    trail.log(createMockAuditEntry({ id: 'a2', timestamp: 2000 }));
    trail.log(createMockAuditEntry({ id: 'a3', timestamp: 3000 }));
    trail.log(createMockAuditEntry({ id: 'a4', timestamp: 4000 }));
    const all = trail.getAll();
    expect(all).toHaveLength(3);
    expect(all[0]!.id).toBe('a2');
    expect(all[2]!.id).toBe('a4');
  });
});
