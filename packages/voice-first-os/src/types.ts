export interface VoiceFirstConfig {
  enabled: boolean;
  lockScreenActive: boolean;
  ambientContext: AmbientContext | null;
}
export interface AmbientContext {
  type: 'walking' | 'driving' | 'home' | 'meeting';
  confidence: number;
}
export interface NotificationAction {
  id: string;
  action: 'read' | 'dismiss' | 'reply' | 'snooze';
  payload: string;
}
export interface ElderModeConfig {
  enabled: boolean;
  fontSize: 'large' | 'xlarge';
  emergencyContact: string;
  familyRemoteEnabled: boolean;
}
export interface VoiceCommand {
  id: string;
  phrase: string;
  category: string;
  handler: string;
  aliases?: string[];
  contexts?: string[];
}

export type WakeWordState = 'idle' | 'listening' | 'confirming' | 'active' | 'cooldown';

export interface WakeWordTransition {
  from: WakeWordState;
  to: WakeWordState;
  confidence: number;
  timestamp: number;
}

export interface PrivacyConfig {
  recordingConsent: boolean;
  dataRetentionDays: number;
  privacyLampOn: boolean;
  muteZones: string[];
  appPermissions: Map<string, boolean>;
}

export interface PhoneFreeConfig {
  screenOff: boolean;
  allowedCommands: string[];
  audioOutput: 'speaker' | 'bluetooth' | 'watch';
  sessionTimeoutMs: number;
  sessionStartedAt: number | null;
}

export interface ContextTransition {
  from: AmbientContext | null;
  to: AmbientContext;
  timestamp: number;
  triggeredBy: string;
}

export interface CommandResult {
  commandId: string;
  success: boolean;
  output: string;
  timestamp: number;
}
