import { describe, it, expect, beforeEach } from 'vitest';
import { ComputeService } from '../services/compute.service';
import type { CreateVMInput } from '../services/compute.service';

describe('ComputeService', () => {
  let service: ComputeService;

  const defaultInput: CreateVMInput = {
    name: 'test-vm',
    config: {
      cpu: 4,
      memory: 8192,
      disk: 100,
      os: 'ubuntu-22.04',
      region: 'us-east-1',
    },
  };

  beforeEach(() => {
    service = new ComputeService();
  });

  describe('createVM', () => {
    it('creates a VM with generated id and running status', () => {
      const vm = service.createVM(defaultInput);

      expect(vm.id).toBeDefined();
      expect(vm.name).toBe('test-vm');
      expect(vm.config.cpu).toBe(4);
      expect(vm.config.memory).toBe(8192);
      expect(vm.config.disk).toBe(100);
      expect(vm.config.os).toBe('ubuntu-22.04');
      expect(vm.config.region).toBe('us-east-1');
      expect(vm.status).toBe('running');
      expect(vm.ipAddress).toBeDefined();
      expect(vm.createdAt).toBeInstanceOf(Date);
    });

    it('generates unique ids for multiple VMs', () => {
      const vm1 = service.createVM(defaultInput);
      const vm2 = service.createVM(defaultInput);

      expect(vm1.id).not.toBe(vm2.id);
    });
  });

  describe('startVM', () => {
    it('starts a stopped VM', () => {
      const vm = service.createVM(defaultInput);
      service.stopVM(vm.id);

      const started = service.startVM(vm.id);

      expect(started.status).toBe('running');
    });

    it('throws if VM is already running', () => {
      const vm = service.createVM(defaultInput);

      expect(() => service.startVM(vm.id)).toThrow('VM is already running');
    });

    it('throws if VM does not exist', () => {
      expect(() => service.startVM('non-existent')).toThrow('VM not found');
    });
  });

  describe('stopVM', () => {
    it('stops a running VM', () => {
      const vm = service.createVM(defaultInput);

      const stopped = service.stopVM(vm.id);

      expect(stopped.status).toBe('stopped');
    });

    it('throws if VM is already stopped', () => {
      const vm = service.createVM(defaultInput);
      service.stopVM(vm.id);

      expect(() => service.stopVM(vm.id)).toThrow('VM is already stopped');
    });

    it('throws if VM does not exist', () => {
      expect(() => service.stopVM('non-existent')).toThrow('VM not found');
    });
  });

  describe('deleteVM', () => {
    it('removes VM from the store', () => {
      const vm = service.createVM(defaultInput);
      service.deleteVM(vm.id);

      expect(() => service.startVM(vm.id)).toThrow('VM not found');
    });

    it('throws if VM does not exist', () => {
      expect(() => service.deleteVM('non-existent')).toThrow('VM not found');
    });
  });

  describe('listVMs', () => {
    it('returns all VMs when no filters', () => {
      service.createVM(defaultInput);
      service.createVM({ ...defaultInput, name: 'vm-2' });

      const vms = service.listVMs();

      expect(vms).toHaveLength(2);
    });

    it('filters by region', () => {
      service.createVM(defaultInput);
      service.createVM({
        name: 'eu-vm',
        config: { ...defaultInput.config, region: 'eu-west-1' },
      });

      const vms = service.listVMs({ region: 'eu-west-1' });

      expect(vms).toHaveLength(1);
      expect(vms[0]!.name).toBe('eu-vm');
    });

    it('filters by status', () => {
      const vm1 = service.createVM(defaultInput);
      service.createVM({ ...defaultInput, name: 'vm-2' });
      service.stopVM(vm1.id);

      const vms = service.listVMs({ status: 'stopped' });

      expect(vms).toHaveLength(1);
      expect(vms[0]!.name).toBe('test-vm');
    });
  });

  describe('resizeVM', () => {
    it('resizes a stopped VM', () => {
      const vm = service.createVM(defaultInput);
      service.stopVM(vm.id);

      const resized = service.resizeVM(vm.id, { cpu: 8, memory: 16384 });

      expect(resized.config.cpu).toBe(8);
      expect(resized.config.memory).toBe(16384);
      expect(resized.config.disk).toBe(100);
    });

    it('throws if VM is running', () => {
      const vm = service.createVM(defaultInput);

      expect(() => service.resizeVM(vm.id, { cpu: 8 })).toThrow('VM must be stopped to resize');
    });

    it('throws if trying to shrink disk', () => {
      const vm = service.createVM(defaultInput);
      service.stopVM(vm.id);

      expect(() => service.resizeVM(vm.id, { disk: 50 })).toThrow('Cannot shrink disk size');
    });

    it('allows increasing disk size', () => {
      const vm = service.createVM(defaultInput);
      service.stopVM(vm.id);

      const resized = service.resizeVM(vm.id, { disk: 200 });

      expect(resized.config.disk).toBe(200);
    });
  });

  describe('getVMMetrics', () => {
    it('returns metrics for a running VM', () => {
      const vm = service.createVM(defaultInput);

      const metrics = service.getVMMetrics(vm.id);

      expect(metrics.vmId).toBe(vm.id);
      expect(metrics.cpuUsage).toBeGreaterThanOrEqual(0);
      expect(metrics.memoryUsage).toBeGreaterThanOrEqual(0);
      expect(metrics.diskUsage).toBeGreaterThanOrEqual(0);
      expect(metrics.timestamp).toBeInstanceOf(Date);
    });

    it('throws if VM is not running', () => {
      const vm = service.createVM(defaultInput);
      service.stopVM(vm.id);

      expect(() => service.getVMMetrics(vm.id)).toThrow('VM must be running to get metrics');
    });
  });

  describe('createSnapshot', () => {
    it('creates a snapshot for a VM', () => {
      const vm = service.createVM(defaultInput);

      const snapshot = service.createSnapshot(vm.id, 'my-snapshot');

      expect(snapshot.id).toBeDefined();
      expect(snapshot.vmId).toBe(vm.id);
      expect(snapshot.name).toBe('my-snapshot');
      expect(snapshot.status).toBe('available');
      expect(snapshot.size).toBeGreaterThan(0);
      expect(snapshot.createdAt).toBeInstanceOf(Date);
    });

    it('throws if VM does not exist', () => {
      expect(() => service.createSnapshot('non-existent', 'snap')).toThrow('VM not found');
    });
  });
});
