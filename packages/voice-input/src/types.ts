export interface VoiceConfig {
  language: string;
  sampleRate: number;
  channels: number;
  noiseCancellation: boolean;
  autoGainControl: boolean;
  echoCancellation: boolean;
  vadEnabled: boolean;
  vadThreshold: number;
  continuous: boolean;
  interimResults: boolean;
}

export interface TranscriptionResult {
  id: string;
  text: string;
  confidence: number;
  language: string;
  isFinal: boolean;
  startTime: number;
  endTime: number;
  words: WordResult[];
  alternatives: AlternativeResult[];
}

export interface WordResult {
  word: string;
  confidence: number;
  startTime: number;
  endTime: number;
}

export interface AlternativeResult {
  text: string;
  confidence: number;
}

export interface VoiceCommand {
  id: string;
  phrase: string;
  aliases: string[];
  action: string;
  parameters?: Record<string, string>;
  language: string;
  confidence: number;
  enabled: boolean;
}

export interface VoiceSession {
  id: string;
  status: VoiceSessionStatus;
  startedAt: Date;
  endedAt: Date | null;
  duration: number;
  transcriptions: TranscriptionResult[];
  commands: VoiceCommand[];
  language: string;
  config: VoiceConfig;
}

export type VoiceSessionStatus = 'idle' | 'listening' | 'processing' | 'paused' | 'ended' | 'error';

export interface SupportedLanguage {
  code: string;
  name: string;
  nativeName: string;
  supported: boolean;
}
