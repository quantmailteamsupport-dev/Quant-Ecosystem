import type { SandboxConfig, Permission } from '../types.js';
import { PermissionGate } from '../sdk/permission-gate.js';
import { CSPBuilder } from './csp.js';
import { IPCBridge } from './ipc-bridge.js';

export class SandboxRuntime {
  private readonly config: SandboxConfig;
  private readonly gate: PermissionGate;
  private readonly cspBuilder: CSPBuilder;
  readonly ipc: IPCBridge;

  constructor(permissions: Permission[], config?: Partial<SandboxConfig>) {
    this.config = {
      maxCPU: config?.maxCPU ?? 80,
      maxMemory: config?.maxMemory ?? 256,
      maxNetworkRequests: config?.maxNetworkRequests ?? 100,
    };
    this.gate = new PermissionGate(permissions);
    this.cspBuilder = new CSPBuilder(permissions);
    this.ipc = new IPCBridge();
  }

  generateCSP(): string {
    return this.cspBuilder.generate();
  }

  getResourceLimits(): SandboxConfig {
    return { ...this.config };
  }

  checkPermission(permission: Permission): boolean {
    return this.gate.check(permission);
  }

  enforcePermission(permission: Permission): void {
    this.gate.enforce(permission);
  }

  destroy(): void {
    this.ipc.destroy();
  }
}
