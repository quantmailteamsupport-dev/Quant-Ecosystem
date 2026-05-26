import { describe, it, expect, beforeEach } from 'vitest';
import { CodeSandboxService } from '../services/code-sandbox.service';

describe('CodeSandboxService', () => {
  let service: CodeSandboxService;

  beforeEach(() => {
    service = new CodeSandboxService();
  });

  describe('createSandbox', () => {
    it('creates a sandbox with correct properties', () => {
      const sandbox = service.createSandbox('user-1', 'javascript');

      expect(sandbox.id).toBeDefined();
      expect(sandbox.userId).toBe('user-1');
      expect(sandbox.language).toBe('javascript');
      expect(sandbox.code).toBe('');
      expect(sandbox.output).toEqual([]);
      expect(sandbox.status).toBe('active');
    });

    it('supports multiple languages', () => {
      const jsSandbox = service.createSandbox('user-1', 'javascript');
      const tsSandbox = service.createSandbox('user-1', 'typescript');
      const pySandbox = service.createSandbox('user-1', 'python');

      expect(jsSandbox.language).toBe('javascript');
      expect(tsSandbox.language).toBe('typescript');
      expect(pySandbox.language).toBe('python');
    });

    it('throws for unsupported language', () => {
      expect(() => service.createSandbox('user-1', 'brainfuck')).toThrow('Unsupported language');
    });
  });

  describe('executeCode', () => {
    it('executes code successfully', () => {
      const sandbox = service.createSandbox('user-1', 'javascript');
      const result = service.executeCode(sandbox.id, 'console.log("hello")');

      expect(result.id).toBeDefined();
      expect(result.sandboxId).toBe(sandbox.id);
      expect(result.success).toBe(true);
      expect(result.output).toBeDefined();
      expect(result.error).toBeNull();
    });

    it('records execution in output history', () => {
      const sandbox = service.createSandbox('user-1', 'typescript');
      service.executeCode(sandbox.id, 'const x = 1');

      const history = service.getOutput(sandbox.id);
      expect(history.entries).toHaveLength(1);
    });

    it('detects errors in code', () => {
      const sandbox = service.createSandbox('user-1', 'javascript');
      const result = service.executeCode(sandbox.id, 'throw new Error("test")');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('throws for non-existent sandbox', () => {
      expect(() => service.executeCode('fake-id', 'code')).toThrow('Sandbox not found');
    });
  });

  describe('getOutput', () => {
    it('returns empty output for new sandbox', () => {
      const sandbox = service.createSandbox('user-1', 'python');
      const output = service.getOutput(sandbox.id);

      expect(output.sandboxId).toBe(sandbox.id);
      expect(output.entries).toEqual([]);
    });

    it('returns all execution outputs', () => {
      const sandbox = service.createSandbox('user-1', 'javascript');
      service.executeCode(sandbox.id, 'const a = 1');
      service.executeCode(sandbox.id, 'const b = 2');
      service.executeCode(sandbox.id, 'const c = 3');

      const output = service.getOutput(sandbox.id);
      expect(output.entries).toHaveLength(3);
    });
  });

  describe('resetSandbox', () => {
    it('resets sandbox code and output', () => {
      const sandbox = service.createSandbox('user-1', 'javascript');
      service.executeCode(sandbox.id, 'const x = 1');

      const reset = service.resetSandbox(sandbox.id);

      expect(reset.code).toBe('');
      expect(reset.output).toEqual([]);
    });
  });

  describe('submitSolution', () => {
    it('submits solution for an exercise', () => {
      const sandbox = service.createSandbox('user-1', 'typescript');
      service.executeCode(sandbox.id, 'function add(a, b) { return a + b; }');

      const result = service.submitSolution(sandbox.id, 'exercise-1');

      expect(result.id).toBeDefined();
      expect(result.sandboxId).toBe(sandbox.id);
      expect(result.exerciseId).toBe('exercise-1');
      expect(result.passed).toBe(true);
      expect(result.score).toBe(100);
    });

    it('throws when no code to submit', () => {
      const sandbox = service.createSandbox('user-1', 'javascript');

      expect(() => service.submitSolution(sandbox.id, 'exercise-1')).toThrow('No code to submit');
    });
  });

  describe('runTests', () => {
    it('runs test cases and returns results', () => {
      const sandbox = service.createSandbox('user-1', 'javascript');
      service.executeCode(sandbox.id, 'function add(a, b) { return a + b; }');

      const testCases = [
        { name: 'adds two numbers', input: '1, 2', expectedOutput: '3' },
        { name: 'adds negatives', input: '-1, -2', expectedOutput: '-3' },
      ];

      const results = service.runTests(sandbox.id, testCases);

      expect(results).toHaveLength(2);
      expect(results[0]!.name).toBe('adds two numbers');
      expect(results[0]!.passed).toBe(true);
      expect(results[1]!.name).toBe('adds negatives');
    });
  });

  describe('getLanguages', () => {
    it('returns list of supported languages', () => {
      const languages = service.getLanguages();

      expect(languages.length).toBeGreaterThan(0);
      expect(languages.some((l) => l.id === 'javascript')).toBe(true);
      expect(languages.some((l) => l.id === 'typescript')).toBe(true);
      expect(languages.some((l) => l.id === 'python')).toBe(true);

      for (const lang of languages) {
        expect(lang.name).toBeDefined();
        expect(lang.version).toBeDefined();
        expect(lang.extensions.length).toBeGreaterThan(0);
      }
    });
  });

  describe('destroySandbox', () => {
    it('destroys a sandbox', () => {
      const sandbox = service.createSandbox('user-1', 'javascript');
      service.destroySandbox(sandbox.id);

      expect(() => service.getOutput(sandbox.id)).toThrow('Sandbox not found');
    });

    it('throws for non-existent sandbox', () => {
      expect(() => service.destroySandbox('fake-id')).toThrow('Sandbox not found');
    });
  });
});
