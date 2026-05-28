import type { QuantTool, ToolContext, ToolResult, PlannedExecution } from './types.js';

export class ToolPlanner {
  plan(intent: string, availableTools: QuantTool[]): PlannedExecution[] {
    const words = intent.toLowerCase().split(/\s+/);
    const matched: PlannedExecution[] = [];
    const seen = new Set<string>();

    for (const tool of availableTools) {
      const toolWords = [
        ...tool.name.toLowerCase().split(/[_\s]+/),
        ...tool.description.toLowerCase().split(/\s+/),
      ];

      let matchCount = 0;
      for (const word of words) {
        if (word.length < 3) continue;
        for (const tw of toolWords) {
          if (tw.includes(word) || word.includes(tw)) {
            matchCount++;
            break;
          }
        }
      }

      if (matchCount > 0 && !seen.has(tool.id)) {
        seen.add(tool.id);
        matched.push({
          toolId: tool.id,
          tool,
          estimatedInput: {},
          reason: `Matched ${matchCount} keyword(s) from intent`,
        });
      }
    }

    return matched.sort((a, b) => {
      const aCount = this.extractMatchCount(a.reason);
      const bCount = this.extractMatchCount(b.reason);
      return bCount - aCount;
    });
  }

  async executePlan(steps: PlannedExecution[], context: ToolContext): Promise<ToolResult[]> {
    const results: ToolResult[] = [];
    for (const step of steps) {
      const result = await step.tool.execute(step.estimatedInput, context);
      results.push(result);
      if (!result.success) {
        break;
      }
    }
    return results;
  }

  private extractMatchCount(reason: string): number {
    const match = reason.match(/Matched (\d+)/);
    return match && match[1] ? parseInt(match[1], 10) : 0;
  }
}
