export type RobotCapability = 'clean' | 'patrol' | 'deliver' | 'monitor' | 'speak';
export type RobotStatus = 'idle' | 'active' | 'charging' | 'error' | 'stopped';
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';
export type DeviceProtocol = 'matter' | 'zigbee' | 'zwave' | 'bluetooth' | 'wifi';

export interface Robot {
  id: string;
  name: string;
  type: 'vacuum' | 'companion' | 'humanoid' | 'patrol';
  status: RobotStatus;
  capabilities: RobotCapability[];
}
export interface RobotCommand {
  robotId: string;
  action: string;
  params: Record<string, unknown>;
  timestamp: number;
  priority?: number;
}
export interface AuditEntry {
  robotId: string;
  action: string;
  timestamp: number;
  result: 'allowed' | 'blocked' | 'killed';
}
export interface SafetyRule {
  id: string;
  description: string;
  condition: (cmd: RobotCommand) => boolean;
  riskLevel: RiskLevel;
}
export interface CommandQueueEntry {
  id: string;
  command: RobotCommand;
  priority: number;
  retries: number;
  maxRetries: number;
  status: 'pending' | 'executing' | 'done' | 'failed';
}
export interface DiscoveryResult {
  deviceId: string;
  name: string;
  protocol: DeviceProtocol;
  capabilities: string[];
  lastSeen: number;
  connected: boolean;
}
