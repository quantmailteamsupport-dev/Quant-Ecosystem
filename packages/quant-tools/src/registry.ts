import type {
  QuantTool,
  ToolContext,
  ToolRegistry,
  ToolResult,
  ToolSearchResult,
} from './types.js';
import { PermissionEngine } from './permissions.js';
import { ToolAuditTrail } from './audit.js';
import { UndoManager } from './undo.js';

export class ToolRegistryImpl implements ToolRegistry {
  private tools = new Map<string, QuantTool>();
  private permissionEngine = new PermissionEngine();
  private auditTrail = new ToolAuditTrail();
  private undoManager = new UndoManager();

  register(tool: QuantTool): void {
    if (this.tools.has(tool.id)) {
      throw new Error(`Tool already registered: ${tool.id}`);
    }
    this.tools.set(tool.id, tool);
  }

  get(id: string): QuantTool | undefined {
    return this.tools.get(id);
  }

  listByApp(app: string): QuantTool[] {
    const results: QuantTool[] = [];
    for (const tool of this.tools.values()) {
      if (tool.app === app) {
        results.push(tool);
      }
    }
    return results;
  }

  listAll(): QuantTool[] {
    return [...this.tools.values()];
  }

  search(query: string): ToolSearchResult[] {
    const lower = query.toLowerCase();
    const results: ToolSearchResult[] = [];
    for (const tool of this.tools.values()) {
      const nameMatch = tool.name.toLowerCase().includes(lower);
      const descMatch = tool.description.toLowerCase().includes(lower);
      if (nameMatch || descMatch) {
        let score: number;
        if (nameMatch && descMatch) {
          score = 1.0;
        } else if (nameMatch) {
          score = 0.8;
        } else {
          score = 0.5;
        }
        results.push({ tool, score });
      }
    }
    return results.sort((a, b) => b.score - a.score);
  }

  async execute(toolId: string, input: unknown, context: ToolContext): Promise<ToolResult> {
    const tool = this.tools.get(toolId);
    if (!tool) {
      return {
        success: false,
        error: `Tool not found: ${toolId}`,
        auditId: '',
      };
    }

    // Validate input against schema
    const parseResult = tool.inputSchema.safeParse(input);
    if (!parseResult.success) {
      return {
        success: false,
        error: `Input validation failed: ${parseResult.error.message}`,
        auditId: '',
      };
    }

    // Check permissions
    const allowed = await this.permissionEngine.evaluateTier(tool, context);
    if (!allowed) {
      return {
        success: false,
        error: `Permission denied: tier ${tool.permissionTier} action requires confirmation`,
        auditId: '',
      };
    }

    // Execute the tool
    const result = await tool.execute(parseResult.data, context);

    // Log audit entry
    const auditId = result.auditId || crypto.randomUUID();

    // Register undo recipe if the tool defines one and execution succeeded
    let undoId: string | undefined;
    if (tool.undoRecipe && result.success) {
      undoId = crypto.randomUUID();
      this.undoManager.registerUndo(undoId, context.userId, tool.undoRecipe);
    }

    this.auditTrail.log({
      id: auditId,
      toolId: tool.id,
      userId: context.userId,
      input: parseResult.data,
      output: result.data,
      timestamp: Date.now(),
      cost: result.cost,
      undoStatus: tool.undoRecipe ? 'available' : 'none',
    });

    return { ...result, auditId, undoId };
  }

  getAuditTrail(): ToolAuditTrail {
    return this.auditTrail;
  }

  getUndoManager(): UndoManager {
    return this.undoManager;
  }
}
