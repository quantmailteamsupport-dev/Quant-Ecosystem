import type { CapabilityRegistry } from '../registry.js';
import type { DeviceCapability } from '../capabilities/types.js';
import { CAPABILITY_TIER_MAP } from '../permissions/permission-types.js';
import type { DeviceIntent, CustomShortcut, ExecutionResult } from './types.js';

export class CommandExecutor {
  constructor(private registry: CapabilityRegistry) {}

  async execute(intent: DeviceIntent, confirmed?: boolean): Promise<ExecutionResult> {
    const cap = intent.capability as DeviceCapability;
    const tier = CAPABILITY_TIER_MAP[cap];
    if (tier && tier >= 3 && !confirmed) {
      return { success: false, results: [{ intent, success: false }], requiresConfirmation: true };
    }
    const provider = this.registry.get(cap);
    const success = !!provider;
    return {
      success,
      results: [{ intent, success, error: success ? undefined : `No provider for ${cap}` }],
    };
  }

  async executeSequence(
    intents: DeviceIntent[],
    opts?: { stopOnFailure?: boolean },
  ): Promise<ExecutionResult> {
    const results: ExecutionResult['results'] = [];
    for (const intent of intents) {
      const r = await this.execute(intent, true);
      results.push(...r.results);
      if (!r.success && opts?.stopOnFailure) {
        return { success: false, results };
      }
    }
    return { success: results.every((r) => r.success), results };
  }

  async executeShortcut(shortcut: CustomShortcut): Promise<ExecutionResult> {
    return this.executeSequence(shortcut.actions, { stopOnFailure: shortcut.stopOnFailure });
  }
}
