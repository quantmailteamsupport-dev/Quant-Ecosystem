import type { QuantTool, ToolContext, PermissionTier } from './types.js';

export function isSafeAction(tier: PermissionTier): boolean {
  return tier === 1;
}

export function requiresConfirmation(tier: PermissionTier): boolean {
  return tier >= 2;
}

export function requiresDoubleConfirmation(tier: PermissionTier): boolean {
  return tier === 3;
}

export class PermissionEngine {
  async evaluateTier(tool: QuantTool, context: ToolContext): Promise<boolean> {
    const tier = tool.permissionTier;

    if (isSafeAction(tier)) {
      return true;
    }

    if (requiresConfirmation(tier)) {
      return this.requestConfirmation(tier, tool, context);
    }

    return false;
  }

  async requestConfirmation(
    tier: PermissionTier,
    tool: QuantTool,
    context: ToolContext,
  ): Promise<boolean> {
    if (!context.confirmationCallback) {
      return false;
    }

    const firstConfirm = await context.confirmationCallback(
      `Confirm execution of "${tool.name}" (tier ${tier})?`,
    );

    if (!firstConfirm) {
      return false;
    }

    if (requiresDoubleConfirmation(tier)) {
      const secondConfirm = await context.confirmationCallback(
        `DOUBLE CONFIRM: "${tool.name}" is a high-risk action (tier ${tier}). Are you sure?`,
      );
      return secondConfirm;
    }

    return true;
  }
}
