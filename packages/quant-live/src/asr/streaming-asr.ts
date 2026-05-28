import type { ASRProvider } from '../types.js';
import { WhisperServerProvider, type WhisperServerConfig } from './whisper-provider.js';
import { WebGPUWhisperProvider } from './webgpu-whisper-provider.js';

export type ASRProviderType = 'whisper-server' | 'whisper-webgpu';

export class ASRProviderFactory {
  static create(type: ASRProviderType, config: WhisperServerConfig): ASRProvider {
    switch (type) {
      case 'whisper-server':
        return new WhisperServerProvider(config);
      case 'whisper-webgpu':
        return new WebGPUWhisperProvider(config);
      default:
        throw new Error(`Unknown ASR provider type: ${type as string}`);
    }
  }
}
