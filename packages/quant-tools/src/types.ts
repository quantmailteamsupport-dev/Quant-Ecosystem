import { z } from 'zod';

export type PermissionTier = 1 | 2 | 3;

export interface CostEstimate {
  tokens?: number;
  money?: { amount: number; currency: string };
  timeMs?: number;
}

export interface ToolContext {
  userId: string;
  sessionId: string;
  requestedBy: 'user' | 'ai' | 'automation';
  confirmationCallback?: (message: string) => Promise<boolean>;
}

export interface UndoRecipe {
  description: string;
  handler: (undoId: string, context: ToolContext) => Promise<void>;
}

export interface QuantTool {
  id: string;
  app: string;
  name: string;
  description: string;
  inputSchema: z.ZodSchema<unknown>;
  outputSchema: z.ZodSchema<unknown>;
  permissionTier: PermissionTier;
  costEstimate?: CostEstimate;
  undoRecipe?: UndoRecipe;
  execute: (input: unknown, context: ToolContext) => Promise<ToolResult>;
}

export interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
  undoId?: string;
  auditId: string;
  cost?: CostEstimate;
}

export interface AuditEntry {
  id: string;
  toolId: string;
  userId: string;
  input: unknown;
  output: unknown;
  timestamp: number;
  cost?: CostEstimate;
  undoStatus: 'available' | 'expired' | 'executed' | 'none';
}

export const AuditEntrySchema = z.object({
  id: z.string(),
  toolId: z.string(),
  userId: z.string(),
  input: z.unknown(),
  output: z.unknown(),
  timestamp: z.number(),
  cost: z
    .object({
      tokens: z.number().optional(),
      money: z.object({ amount: z.number(), currency: z.string() }).optional(),
      timeMs: z.number().optional(),
    })
    .optional(),
  undoStatus: z.enum(['available', 'expired', 'executed', 'none']),
});

export interface ToolSearchResult {
  tool: QuantTool;
  score: number;
}

export interface ToolRegistry {
  register(tool: QuantTool): void;
  get(id: string): QuantTool | undefined;
  listByApp(app: string): QuantTool[];
  listAll(): QuantTool[];
  search(query: string): ToolSearchResult[];
  execute(toolId: string, input: unknown, context: ToolContext): Promise<ToolResult>;
}

export interface PlannedExecution {
  toolId: string;
  tool: QuantTool;
  estimatedInput: Record<string, unknown>;
  reason: string;
}

export interface UndoEntry {
  undoId: string;
  userId: string;
  recipe: UndoRecipe;
  createdAt: number;
  expiresAt: number;
  executed: boolean;
}
