export enum IoTProtocol {
  matter = 'matter',
  homekit = 'homekit',
  google_home = 'google_home',
  mi_home = 'mi_home',
  mqtt = 'mqtt',
  wifi = 'wifi',
}

export enum DeviceCategory {
  light = 'light',
  switch = 'switch',
  thermostat = 'thermostat',
  sensor = 'sensor',
  camera = 'camera',
  lock = 'lock',
  appliance = 'appliance',
  motor = 'motor',
  geyser = 'geyser',
  inverter = 'inverter',
}

export enum DeviceStatus {
  online = 'online',
  offline = 'offline',
  error = 'error',
}

export interface IoTDevice {
  id: string;
  name: string;
  protocol: IoTProtocol;
  category: DeviceCategory;
  roomId: string | null;
  status: DeviceStatus;
  properties: Record<string, unknown>;
  lastSeen: number;
}

export interface Room {
  id: string;
  name: string;
  deviceIds: string[];
}

export interface SceneDeviceState {
  deviceId: string;
  properties: Record<string, unknown>;
}

export interface Scene {
  id: string;
  name: string;
  deviceStates: SceneDeviceState[];
  active: boolean;
}

export interface AutomationTrigger {
  type: 'time' | 'device_state' | 'location' | 'sensor';
  config: Record<string, unknown>;
}

export interface AutomationCondition {
  type: 'time_range' | 'device_state';
  config: Record<string, unknown>;
}

export interface AutomationAction {
  type: 'control_device' | 'notification' | 'run_scene';
  config: Record<string, unknown>;
}

export interface Automation {
  id: string;
  name: string;
  enabled: boolean;
  triggers: AutomationTrigger[];
  conditions: AutomationCondition[];
  actions: AutomationAction[];
}

export interface RoutineStep {
  deviceId: string;
  command: string;
  properties: Record<string, unknown>;
  delayMs: number;
}

export interface Routine {
  id: string;
  name: string;
  steps: RoutineStep[];
}

export interface EnergyReading {
  deviceId: string;
  watts: number;
  timestamp: number;
  costPerKwh: number;
}
