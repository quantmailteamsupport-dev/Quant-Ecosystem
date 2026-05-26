import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { createAppError } from '@quant/server-core';

export interface VMConfig {
  cpu: number;
  memory: number;
  disk: number;
  os: string;
  region: string;
}

export interface VM {
  id: string;
  name: string;
  config: VMConfig;
  status: 'provisioning' | 'running' | 'stopped' | 'terminated';
  createdAt: Date;
  updatedAt: Date;
  ipAddress: string | null;
}

export interface VMMetrics {
  vmId: string;
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  networkIn: number;
  networkOut: number;
  uptime: number;
  timestamp: Date;
}

export interface Snapshot {
  id: string;
  vmId: string;
  name: string;
  size: number;
  createdAt: Date;
  status: 'creating' | 'available' | 'error';
}

export const CreateVMSchema = z.object({
  name: z.string().min(1).max(100),
  config: z.object({
    cpu: z.number().int().min(1).max(128),
    memory: z.number().int().min(512).max(524288),
    disk: z.number().int().min(10).max(10000),
    os: z.string().min(1),
    region: z.string().min(1),
  }),
});

export type CreateVMInput = z.infer<typeof CreateVMSchema>;

export const ResizeVMSchema = z.object({
  cpu: z.number().int().min(1).max(128).optional(),
  memory: z.number().int().min(512).max(524288).optional(),
  disk: z.number().int().min(10).max(10000).optional(),
});

export type ResizeVMInput = z.infer<typeof ResizeVMSchema>;

export class ComputeService {
  private readonly vms = new Map<string, VM>();
  private readonly snapshots = new Map<string, Snapshot>();

  createVM(input: CreateVMInput): VM {
    const parsed = CreateVMSchema.parse(input);

    const vm: VM = {
      id: randomUUID(),
      name: parsed.name,
      config: { ...parsed.config },
      status: 'running',
      createdAt: new Date(),
      updatedAt: new Date(),
      ipAddress: `10.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
    };

    this.vms.set(vm.id, vm);
    return vm;
  }

  deleteVM(vmId: string): void {
    const vm = this.getVM(vmId);
    vm.status = 'terminated';
    vm.updatedAt = new Date();
    this.vms.delete(vmId);
  }

  startVM(vmId: string): VM {
    const vm = this.getVM(vmId);

    if (vm.status === 'running') {
      throw createAppError('VM is already running', 400, 'VM_ALREADY_RUNNING');
    }

    if (vm.status === 'terminated') {
      throw createAppError('Cannot start a terminated VM', 400, 'VM_TERMINATED');
    }

    vm.status = 'running';
    vm.updatedAt = new Date();
    return vm;
  }

  stopVM(vmId: string): VM {
    const vm = this.getVM(vmId);

    if (vm.status === 'stopped') {
      throw createAppError('VM is already stopped', 400, 'VM_ALREADY_STOPPED');
    }

    if (vm.status === 'terminated') {
      throw createAppError('Cannot stop a terminated VM', 400, 'VM_TERMINATED');
    }

    vm.status = 'stopped';
    vm.updatedAt = new Date();
    return vm;
  }

  listVMs(filters?: { region?: string; status?: string }): VM[] {
    let vms = Array.from(this.vms.values());

    if (filters?.region) {
      vms = vms.filter((vm) => vm.config.region === filters.region);
    }

    if (filters?.status) {
      vms = vms.filter((vm) => vm.status === filters.status);
    }

    return vms;
  }

  resizeVM(vmId: string, newConfig: ResizeVMInput): VM {
    const vm = this.getVM(vmId);
    const parsed = ResizeVMSchema.parse(newConfig);

    if (vm.status !== 'stopped') {
      throw createAppError('VM must be stopped to resize', 400, 'VM_MUST_BE_STOPPED');
    }

    if (parsed.cpu !== undefined) {
      vm.config.cpu = parsed.cpu;
    }
    if (parsed.memory !== undefined) {
      vm.config.memory = parsed.memory;
    }
    if (parsed.disk !== undefined) {
      if (parsed.disk < vm.config.disk) {
        throw createAppError('Cannot shrink disk size', 400, 'CANNOT_SHRINK_DISK');
      }
      vm.config.disk = parsed.disk;
    }

    vm.updatedAt = new Date();
    return vm;
  }

  getVMMetrics(vmId: string): VMMetrics {
    const vm = this.getVM(vmId);

    if (vm.status !== 'running') {
      throw createAppError('VM must be running to get metrics', 400, 'VM_NOT_RUNNING');
    }

    return {
      vmId: vm.id,
      cpuUsage: Math.random() * 100,
      memoryUsage: Math.random() * 100,
      diskUsage: Math.random() * 100,
      networkIn: Math.floor(Math.random() * 1000000),
      networkOut: Math.floor(Math.random() * 1000000),
      uptime: Date.now() - vm.createdAt.getTime(),
      timestamp: new Date(),
    };
  }

  createSnapshot(vmId: string, name: string): Snapshot {
    this.getVM(vmId);

    const snapshot: Snapshot = {
      id: randomUUID(),
      vmId,
      name,
      size: Math.floor(Math.random() * 10000) + 100,
      createdAt: new Date(),
      status: 'available',
    };

    this.snapshots.set(snapshot.id, snapshot);
    return snapshot;
  }

  private getVM(vmId: string): VM {
    const vm = this.vms.get(vmId);
    if (!vm) {
      throw createAppError('VM not found', 404, 'VM_NOT_FOUND');
    }
    return vm;
  }
}
