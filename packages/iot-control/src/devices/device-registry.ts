import { DeviceCategory, DeviceStatus, IoTDevice, IoTProtocol, Room } from '../types.js';

export class DeviceRegistry {
  private devices = new Map<string, IoTDevice>();
  private rooms = new Map<string, Room>();

  registerDevice(device: IoTDevice): void {
    this.devices.set(device.id, device);
  }

  removeDevice(id: string): boolean {
    return this.devices.delete(id);
  }

  discoverDevices(protocol: IoTProtocol): IoTDevice[] {
    return [
      {
        id: `discovered-${protocol}-1`,
        name: `${protocol} Device 1`,
        protocol,
        category: DeviceCategory.light,
        roomId: null,
        status: DeviceStatus.online,
        properties: {},
        lastSeen: Date.now(),
      },
    ];
  }

  getDevice(id: string): IoTDevice | undefined {
    return this.devices.get(id);
  }

  getDevicesByRoom(roomId: string): IoTDevice[] {
    return [...this.devices.values()].filter((d) => d.roomId === roomId);
  }

  setDeviceStatus(id: string, status: DeviceStatus): void {
    const device = this.devices.get(id);
    if (device) device.status = status;
  }

  updateDeviceProperties(id: string, properties: Record<string, unknown>): void {
    const device = this.devices.get(id);
    if (device) device.properties = { ...device.properties, ...properties };
  }

  addRoom(room: Room): void {
    this.rooms.set(room.id, room);
  }

  getRoom(id: string): Room | undefined {
    return this.rooms.get(id);
  }

  getAllDevices(): IoTDevice[] {
    return [...this.devices.values()];
  }
}
