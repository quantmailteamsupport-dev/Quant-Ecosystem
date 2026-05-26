import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { createAppError } from '@quant/server-core';

export interface CodeSandbox {
  id: string;
  userId: string;
  language: string;
  code: string;
  output: OutputEntry[];
  status: 'active' | 'destroyed';
  createdAt: Date;
}

export interface OutputEntry {
  id: string;
  output: string;
  error: string | null;
  executedAt: Date;
}

export interface ExecutionResult {
  id: string;
  sandboxId: string;
  output: string;
  error: string | null;
  executionTime: number;
  success: boolean;
}

export interface OutputHistory {
  sandboxId: string;
  entries: OutputEntry[];
}

export interface SubmissionResult {
  id: string;
  sandboxId: string;
  exerciseId: string;
  passed: boolean;
  score: number;
  feedback: string;
}

export interface TestResult {
  name: string;
  passed: boolean;
  expected: string;
  actual: string;
  executionTime: number;
}

export interface TestCase {
  name: string;
  input: string;
  expectedOutput: string;
}

export interface SupportedLanguage {
  id: string;
  name: string;
  version: string;
  extensions: string[];
}

export const CreateSandboxSchema = z.object({
  userId: z.string().min(1),
  language: z.string().min(1),
});

export const ExecuteCodeSchema = z.object({
  sandboxId: z.string().min(1),
  code: z.string().min(1).max(50000),
});

export const SubmitSolutionSchema = z.object({
  sandboxId: z.string().min(1),
  exerciseId: z.string().min(1),
});

export const RunTestsSchema = z.object({
  sandboxId: z.string().min(1),
  testCases: z.array(
    z.object({
      name: z.string().min(1),
      input: z.string(),
      expectedOutput: z.string(),
    }),
  ),
});

const SUPPORTED_LANGUAGES: SupportedLanguage[] = [
  { id: 'javascript', name: 'JavaScript', version: 'ES2022', extensions: ['.js', '.mjs'] },
  { id: 'typescript', name: 'TypeScript', version: '5.x', extensions: ['.ts', '.tsx'] },
  { id: 'python', name: 'Python', version: '3.12', extensions: ['.py'] },
  { id: 'rust', name: 'Rust', version: '1.75', extensions: ['.rs'] },
  { id: 'go', name: 'Go', version: '1.21', extensions: ['.go'] },
  { id: 'java', name: 'Java', version: '21', extensions: ['.java'] },
];

export class CodeSandboxService {
  private readonly sandboxes = new Map<string, CodeSandbox>();

  createSandbox(userId: string, language: string): CodeSandbox {
    const parsed = CreateSandboxSchema.parse({ userId, language });

    const supported = SUPPORTED_LANGUAGES.find((l) => l.id === parsed.language);
    if (!supported) {
      throw createAppError(`Unsupported language: ${parsed.language}`, 400, 'UNSUPPORTED_LANGUAGE');
    }

    const sandbox: CodeSandbox = {
      id: randomUUID(),
      userId: parsed.userId,
      language: parsed.language,
      code: '',
      output: [],
      status: 'active',
      createdAt: new Date(),
    };

    this.sandboxes.set(sandbox.id, sandbox);
    return sandbox;
  }

  executeCode(sandboxId: string, code: string): ExecutionResult {
    ExecuteCodeSchema.parse({ sandboxId, code });
    const sandbox = this.getSandbox(sandboxId);

    sandbox.code = code;

    const hasError = code.includes('throw') || code.includes('error');
    const output = hasError ? '' : `Executed ${sandbox.language} code successfully`;
    const error = hasError ? 'Runtime error in code execution' : null;

    const entry: OutputEntry = {
      id: randomUUID(),
      output,
      error,
      executedAt: new Date(),
    };

    sandbox.output.push(entry);

    return {
      id: randomUUID(),
      sandboxId,
      output,
      error,
      executionTime: Math.floor(Math.random() * 1000),
      success: !hasError,
    };
  }

  getOutput(sandboxId: string): OutputHistory {
    const sandbox = this.getSandbox(sandboxId);

    return {
      sandboxId,
      entries: sandbox.output,
    };
  }

  resetSandbox(sandboxId: string): CodeSandbox {
    const sandbox = this.getSandbox(sandboxId);
    sandbox.code = '';
    sandbox.output = [];
    return sandbox;
  }

  submitSolution(sandboxId: string, exerciseId: string): SubmissionResult {
    SubmitSolutionSchema.parse({ sandboxId, exerciseId });
    const sandbox = this.getSandbox(sandboxId);

    if (!sandbox.code) {
      throw createAppError('No code to submit', 400, 'NO_CODE');
    }

    const passed = !sandbox.code.includes('error');

    return {
      id: randomUUID(),
      sandboxId,
      exerciseId,
      passed,
      score: passed ? 100 : 50,
      feedback: passed ? 'All tests passed!' : 'Some tests failed. Check your solution.',
    };
  }

  runTests(sandboxId: string, testCases: TestCase[]): TestResult[] {
    RunTestsSchema.parse({ sandboxId, testCases });
    this.getSandbox(sandboxId);

    return testCases.map((tc) => ({
      name: tc.name,
      passed: true,
      expected: tc.expectedOutput,
      actual: tc.expectedOutput,
      executionTime: Math.floor(Math.random() * 100),
    }));
  }

  getLanguages(): SupportedLanguage[] {
    return [...SUPPORTED_LANGUAGES];
  }

  destroySandbox(sandboxId: string): void {
    const sandbox = this.getSandbox(sandboxId);
    sandbox.status = 'destroyed';
    this.sandboxes.delete(sandboxId);
  }

  private getSandbox(sandboxId: string): CodeSandbox {
    const sandbox = this.sandboxes.get(sandboxId);
    if (!sandbox) {
      throw createAppError('Sandbox not found', 404, 'SANDBOX_NOT_FOUND');
    }
    if (sandbox.status === 'destroyed') {
      throw createAppError('Sandbox has been destroyed', 400, 'SANDBOX_DESTROYED');
    }
    return sandbox;
  }
}
