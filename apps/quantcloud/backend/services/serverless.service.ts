import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { createAppError } from '@quant/server-core';

export interface ServerlessFunction {
  id: string;
  name: string;
  runtime: string;
  code: string;
  handler: string;
  memory: number;
  timeout: number;
  environment: Record<string, string>;
  triggers: Trigger[];
  status: 'active' | 'inactive' | 'deploying' | 'error';
  invocationCount: number;
  lastInvoked: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface InvocationResult {
  id: string;
  functionId: string;
  status: 'success' | 'error';
  result: unknown;
  duration: number;
  memoryUsed: number;
  timestamp: Date;
}

export interface Trigger {
  id: string;
  type: 'http' | 'schedule' | 'event' | 'queue';
  config: Record<string, string>;
  createdAt: Date;
}

export interface LogEntry {
  timestamp: Date;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  requestId: string;
}

export interface FunctionMetrics {
  functionId: string;
  invocations: number;
  errors: number;
  avgDuration: number;
  p95Duration: number;
  coldStarts: number;
  timestamp: Date;
}

export const DeployFunctionSchema = z.object({
  name: z.string().min(1).max(100),
  runtime: z.string().min(1),
  code: z.string().min(1),
  handler: z.string().optional().default('index.handler'),
  memory: z.number().int().min(128).max(10240).optional().default(256),
  timeout: z.number().int().min(1).max(900).optional().default(30),
  environment: z.record(z.string()).optional().default({}),
});

export type DeployFunctionInput = z.infer<typeof DeployFunctionSchema>;

export const SetTriggerSchema = z.object({
  type: z.enum(['http', 'schedule', 'event', 'queue']),
  config: z.record(z.string()),
});

export type SetTriggerInput = z.infer<typeof SetTriggerSchema>;

export class ServerlessService {
  private readonly functions = new Map<string, ServerlessFunction>();
  private readonly logs = new Map<string, LogEntry[]>();

  deployFunction(input: DeployFunctionInput): ServerlessFunction {
    const parsed = DeployFunctionSchema.parse(input);

    const fn: ServerlessFunction = {
      id: randomUUID(),
      name: parsed.name,
      runtime: parsed.runtime,
      code: parsed.code,
      handler: parsed.handler,
      memory: parsed.memory,
      timeout: parsed.timeout,
      environment: parsed.environment,
      triggers: [],
      status: 'active',
      invocationCount: 0,
      lastInvoked: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.functions.set(fn.id, fn);
    this.logs.set(fn.id, []);
    return fn;
  }

  invokeFunction(funcId: string, payload: unknown): InvocationResult {
    const fn = this.getFunction(funcId);

    if (fn.status !== 'active') {
      throw createAppError('Function is not active', 400, 'FUNCTION_NOT_ACTIVE');
    }

    fn.invocationCount++;
    fn.lastInvoked = new Date();

    const result: InvocationResult = {
      id: randomUUID(),
      functionId: fn.id,
      status: 'success',
      result: { payload, output: 'executed' },
      duration: Math.floor(Math.random() * 1000),
      memoryUsed: Math.floor(Math.random() * fn.memory),
      timestamp: new Date(),
    };

    const fnLogs = this.logs.get(fn.id) ?? [];
    fnLogs.push({
      timestamp: new Date(),
      level: 'info',
      message: `Function ${fn.name} invoked successfully`,
      requestId: result.id,
    });

    return result;
  }

  deleteFunction(funcId: string): void {
    const fn = this.getFunction(funcId);
    fn.status = 'inactive';
    fn.updatedAt = new Date();
    this.functions.delete(funcId);
    this.logs.delete(funcId);
  }

  listFunctions(): ServerlessFunction[] {
    return Array.from(this.functions.values());
  }

  getFunctionLogs(funcId: string): LogEntry[] {
    this.getFunction(funcId);
    return this.logs.get(funcId) ?? [];
  }

  setTrigger(funcId: string, input: SetTriggerInput): Trigger {
    const fn = this.getFunction(funcId);
    const parsed = SetTriggerSchema.parse(input);

    const trigger: Trigger = {
      id: randomUUID(),
      type: parsed.type,
      config: parsed.config,
      createdAt: new Date(),
    };

    fn.triggers.push(trigger);
    fn.updatedAt = new Date();
    return trigger;
  }

  getInvocationMetrics(funcId: string): FunctionMetrics {
    const fn = this.getFunction(funcId);

    return {
      functionId: fn.id,
      invocations: fn.invocationCount,
      errors: Math.floor(fn.invocationCount * 0.01),
      avgDuration: Math.floor(Math.random() * 500),
      p95Duration: Math.floor(Math.random() * 1000),
      coldStarts: Math.floor(fn.invocationCount * 0.05),
      timestamp: new Date(),
    };
  }

  private getFunction(funcId: string): ServerlessFunction {
    const fn = this.functions.get(funcId);
    if (!fn) {
      throw createAppError('Function not found', 404, 'FUNCTION_NOT_FOUND');
    }
    return fn;
  }
}
